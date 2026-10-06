import { createHash } from "node:crypto";
import type { CollectionRunPort } from "../ports/collection-run.js";
import type { CollectionSchedulePort } from "../ports/collection-schedule.js";
import type { CollectionSchedule } from "../domain/collection-schedule.js";
import { CollectionScheduler } from "./collection-scheduler.js";

export class PersistentCollectionSchedulerWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSuccessfulTickAt: string | null = null;
  private nextExecutionAt: string | null = null;
  private nextPollAt: string | null = null;
  private lastSubmitted = 0;
  constructor(private readonly schedules: CollectionSchedulePort, private readonly runs: CollectionRunPort, private readonly planner: CollectionScheduler, private readonly ownerId: string) {}

  status(): { enabled: boolean; lastSuccessfulTickAt: string | null; nextPollAt: string | null; nextExecutionAt: string | null; lastSubmitted: number } {
    return { enabled: this.timer !== null, lastSuccessfulTickAt: this.lastSuccessfulTickAt, nextPollAt: this.nextPollAt, nextExecutionAt: this.nextExecutionAt, lastSubmitted: this.lastSubmitted };
  }

  async tick(): Promise<{ leaseAcquired: boolean; schedules: number; submitted: number }> {
    const lease = await this.schedules.acquireLease(this.ownerId, 90);
    if (!lease) return { leaseAcquired: false, schedules: 0, submitted: 0 };
    let submitted = 0;
    const active = await this.schedules.enabled();
    this.planner.enable();
    let nextExecutionAt: string | null = null;
    for (const schedule of active) {
      const plan = this.planner.plan(schedule.subscriptionId, schedule.fromDate, schedule.toDate, new Set(), schedule.watermarkEnd);
      if (plan.nextExecutionAt && (!nextExecutionAt || plan.nextExecutionAt < nextExecutionAt)) nextExecutionAt = plan.nextExecutionAt;
      let lastWindowEnd: string | null = null;
      for (const window of plan.windows) {
        const requestHash = createHash("sha256").update(window.idempotencyKey).digest("hex");
        await this.runs.create({ subscriptionId: schedule.subscriptionId, subscriptionVersion: schedule.subscriptionVersion, windowStart: window.windowStart, windowEnd: window.windowEnd, jobKind: window.jobKind === "GAP_REPAIR" ? "GAP_REPAIR" : "INTRADAY_WINDOW", idempotencyKey: window.idempotencyKey, requestHash });
        submitted += 1;
        lastWindowEnd = window.windowEnd;
      }
      if (lastWindowEnd) await this.schedules.advanceWatermark(schedule.subscriptionId, schedule.version, lastWindowEnd);
    }
    this.lastSuccessfulTickAt = new Date().toISOString();
    this.nextExecutionAt = nextExecutionAt;
    this.lastSubmitted = submitted;
    return { leaseAcquired: true, schedules: active.length, submitted };
  }

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    // Establish a real post-restart health snapshot immediately. Waiting for
    // the first interval made a healthy worker appear stale after every
    // container restart, even though the durable schedule was available.
    this.nextPollAt = new Date(Date.now() + intervalMs).toISOString();
    this.timer = setInterval(() => {
      this.nextPollAt = new Date(Date.now() + intervalMs).toISOString();
      void this.tick();
    }, intervalMs);
    void this.tick();
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.nextPollAt = null;
  }
}

export type PersistentScheduleSnapshot = CollectionSchedule;
