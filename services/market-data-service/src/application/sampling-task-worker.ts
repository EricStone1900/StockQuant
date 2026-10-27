export type SamplingTaskClaim = { taskId: string; attempt: number; maxAttempts: number; executionAt?: string };
export type SamplingTaskOutcome = { state: "COMPLETED" | "BLOCKED_SOURCE_AUTHORIZATION"; reason?: string };

export interface SamplingTaskLifecyclePort {
  claim(workerId: string, now: Date, leaseMs: number): Promise<SamplingTaskClaim | null>;
  finish(taskId: string, workerId: string, now: Date, state: SamplingTaskOutcome["state"], reason?: string | null): Promise<unknown>;
  retry(taskId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<{ state: string }>;
}

export interface SamplingTaskExecutorPort {
  execute(task: SamplingTaskClaim): Promise<SamplingTaskOutcome>;
  failed?(taskId: string, reason: string): Promise<void>;
}

export interface SamplingWorkerClock { now(): Date }

/** Processes at most one durable sampling task per tick with a run-scoped clock and lease owner. */
export class SamplingTaskWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private lastTickAt: string | null = null;
  private lastResult: string | null = null;
  constructor(
    private readonly lifecycle: SamplingTaskLifecyclePort,
    private readonly executor: SamplingTaskExecutorPort,
    private readonly clock: SamplingWorkerClock,
    private readonly workerId: string,
    private readonly leaseMs = 30_000,
    private readonly retryDelayMs = 5_000,
  ) {
    if (!workerId.trim() || workerId.length > 128) throw new Error("INVALID_SAMPLING_WORKER_ID");
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) throw new Error("INVALID_SAMPLING_WORKER_LEASE");
    if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 300_000) throw new Error("INVALID_SAMPLING_WORKER_RETRY_DELAY");
  }

  async tick(): Promise<{ claimed: boolean; taskId: string | null; state: "IDLE" | "BUSY" | "COMPLETED" | "BLOCKED_SOURCE_AUTHORIZATION" | "RETRY_WAIT" | "FAILED" }> {
    if (this.ticking) return { claimed: false, taskId: null, state: "BUSY" };
    this.ticking = true;
    try {
      const claimedAt = this.clock.now();
      const task = await this.lifecycle.claim(this.workerId, claimedAt, this.leaseMs);
      this.lastTickAt = claimedAt.toISOString();
      if (!task) { this.lastResult = "IDLE"; return { claimed: false, taskId: null, state: "IDLE" }; }
      try {
        const outcome = await this.executor.execute({ ...task, executionAt: this.clock.now().toISOString() });
        await this.lifecycle.finish(task.taskId, this.workerId, this.clock.now(), outcome.state, outcome.reason ?? null);
        this.lastResult = outcome.state;
        return { claimed: true, taskId: task.taskId, state: outcome.state };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const retry = await this.lifecycle.retry(task.taskId, this.workerId, this.clock.now(), this.retryDelayMs, reason);
        const state = retry.state === "FAILED" ? "FAILED" : "RETRY_WAIT";
        if (state === "FAILED") await this.executor.failed?.(task.taskId, reason);
        this.lastResult = state;
        return { claimed: true, taskId: task.taskId, state };
      }
    } finally { this.ticking = false; }
  }

  status(): { enabled: boolean; workerId: string; lastTickAt: string | null; lastResult: string | null } {
    return { enabled: this.timer !== null, workerId: this.workerId, lastTickAt: this.lastTickAt, lastResult: this.lastResult };
  }

  start(intervalMs = 1_000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60_000) throw new Error("INVALID_SAMPLING_WORKER_INTERVAL");
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("sampling task worker tick failed", error)); }, intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("sampling task worker initial tick failed", error));
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
