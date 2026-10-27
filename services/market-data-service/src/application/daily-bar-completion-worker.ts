import type { DailyBarCompletionResult } from "./v21-daily-bar-completion.js";
import type { DailyBarCompletionQueue, DailyBarCompletionScope, DailyBarCompletionTask, DailyBarCompletionTaskState } from "./daily-bar-completion-queue.js";
export type DailyBarCompletionFixtureLoader = (fixtureVersion: string) => Promise<{ bytes: Uint8Array; manifestVersion: string; expectedSha256: string }>;

/** Runs one durable DAILY_BAR Fixture completion per tick; expired leases can be reclaimed after restart. */
export class DailyBarCompletionWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private lastTickAt: string | null = null;
  private lastResult: string | null = null;
  constructor(
    private readonly queue: DailyBarCompletionQueue,
    private readonly loadFixture: DailyBarCompletionFixtureLoader,
    private readonly validate: (input: { bytes: Uint8Array; manifestVersion: string; expectedSha256: string; scope: DailyBarCompletionScope }) => DailyBarCompletionResult,
    private readonly clock: { now(): Date },
    private readonly workerId: string,
    private readonly leaseMs = 30_000,
    private readonly retryDelayMs = 5_000,
    private readonly loadReal?: (task: DailyBarCompletionTask, executionAt: Date) => Promise<DailyBarCompletionResult>,
  ) {
    if (!workerId.trim() || workerId.length > 128) throw new Error("INVALID_DAILY_BAR_WORKER_ID");
    if (!Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) throw new Error("INVALID_DAILY_BAR_WORKER_LEASE");
    if (!Number.isInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 300_000) throw new Error("INVALID_DAILY_BAR_WORKER_RETRY_DELAY");
  }

  async tick(): Promise<{ claimed: boolean; taskId: string | null; state: "IDLE" | "BUSY" | "COMPLETED" | "RETRY_WAIT" | "FAILED" }> {
    if (this.ticking) return { claimed: false, taskId: null, state: "BUSY" };
    this.ticking = true;
    try {
      const claimTime = this.clock.now();
      const task = await this.queue.claim(this.workerId, claimTime, this.leaseMs);
      this.lastTickAt = claimTime.toISOString();
      if (!task) { this.lastResult = "IDLE"; return { claimed: false, taskId: null, state: "IDLE" }; }
      try {
        let result: DailyBarCompletionResult;
        if (task.sourceRequest) {
          if (!this.loadReal) throw new Error("DAILY_BAR_REAL_EXECUTOR_DISABLED");
          result = await this.loadReal(task, this.clock.now());
        } else {
          if (!task.fixtureVersion) throw new Error("DAILY_BAR_FIXTURE_VERSION_REQUIRED");
          const fixture = await this.loadFixture(task.fixtureVersion);
          result = this.validate({ ...fixture, scope: task.scope });
        }
        if (!["COMPLETED_FIXTURE", "COMPLETED_REAL"].includes(result.status) || result.completionId === null) throw new Error(result.reason ?? result.status);
        await this.queue.complete(task.taskId, this.workerId, this.clock.now(), result);
        this.lastResult = "COMPLETED";
        return { claimed: true, taskId: task.taskId, state: "COMPLETED" };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const state = await this.queue.retry(task.taskId, this.workerId, this.clock.now(), this.retryDelayMs, reason);
        this.lastResult = state;
        return { claimed: true, taskId: task.taskId, state: state === "FAILED" ? "FAILED" : "RETRY_WAIT" };
      }
    } finally { this.ticking = false; }
  }

  status(): { enabled: boolean; workerId: string; lastTickAt: string | null; lastResult: string | null } {
    return { enabled: this.timer !== null, workerId: this.workerId, lastTickAt: this.lastTickAt, lastResult: this.lastResult };
  }
  start(intervalMs = 1_000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60_000) throw new Error("INVALID_DAILY_BAR_WORKER_INTERVAL");
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("daily bar completion worker tick failed", error)); }, intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("daily bar completion worker initial tick failed", error));
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
