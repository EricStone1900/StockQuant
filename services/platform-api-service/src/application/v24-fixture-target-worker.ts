import type { V24FixtureTargetJobRepository } from "../ports/v24-fixture-target-jobs.js";
import type { V24FixtureDailyCoordinator } from "./v24-fixture-daily-coordinator.js";

/** Explicitly enabled isolated Fixture preparation only; never authorizes or sends orders. */
export class V24FixtureTargetWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  constructor(private readonly jobs: V24FixtureTargetJobRepository, private readonly coordinator: Pick<V24FixtureDailyCoordinator, "materialize">, private readonly clock: { now(): Date }, private readonly workerId: string) {}
  async tick(): Promise<"IDLE" | "BUSY" | "COMPLETED" | "RETRY"> {
    if (this.ticking) return "BUSY";
    this.ticking = true;
    try {
      const job = await this.jobs.claim(this.workerId, this.clock.now(), 30_000);
      if (!job) return "IDLE";
      try {
        const result = await this.coordinator.materialize(job.input);
        if (result.target.decision.action !== "PAUSED" || result.target.clientOrderId !== null) throw new Error("C5_FIXTURE_TARGET_NOT_PAUSED");
        await this.jobs.complete(job, this.workerId, this.clock.now(), result.target.targetId);
        return "COMPLETED";
      } catch (error) {
        await this.jobs.retry(job, this.workerId, this.clock.now(), error instanceof Error ? error.message : "C5_FIXTURE_TARGET_UNKNOWN_ERROR", 5000);
        return "RETRY";
      }
    } finally { this.ticking = false; }
  }
  start(intervalMs = 1000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60000) throw new Error("C5_FIXTURE_TARGET_WORKER_INTERVAL_INVALID");
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("C5 Fixture target worker failed", error)); }, intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("C5 Fixture target worker failed", error));
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
