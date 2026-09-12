import { createHash } from "node:crypto";
import { CollectionRunRepository } from "./collection-run-repository.js";
import { CollectionScheduleRepository, type CollectionSchedule } from "./collection-schedule-repository.js";
import { CollectionScheduler } from "./collection-scheduler.js";

export class PersistentCollectionSchedulerWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly schedules: CollectionScheduleRepository, private readonly runs: CollectionRunRepository, private readonly planner: CollectionScheduler, private readonly ownerId: string) {}

  async tick(): Promise<{ leaseAcquired: boolean; schedules: number; submitted: number }> {
    const lease = await this.schedules.acquireLease(this.ownerId, 90);
    if (!lease) return { leaseAcquired: false, schedules: 0, submitted: 0 };
    let submitted = 0;
    const active = await this.schedules.enabled();
    this.planner.enable();
    for (const schedule of active) {
      const plan = this.planner.plan(schedule.subscriptionId, schedule.fromDate, schedule.toDate, new Set(), schedule.watermarkEnd);
      let lastWindowEnd: string | null = null;
      for (const window of plan.windows) {
        const requestHash = createHash("sha256").update(window.idempotencyKey).digest("hex");
        await this.runs.create({ subscriptionId: schedule.subscriptionId, subscriptionVersion: schedule.subscriptionVersion, windowStart: window.windowStart, windowEnd: window.windowEnd, jobKind: window.jobKind === "GAP_REPAIR" ? "GAP_REPAIR" : "INTRADAY_WINDOW", idempotencyKey: window.idempotencyKey, requestHash });
        submitted += 1;
        lastWindowEnd = window.windowEnd;
      }
      if (lastWindowEnd) await this.schedules.advanceWatermark(schedule.subscriptionId, schedule.version, lastWindowEnd);
    }
    return { leaseAcquired: true, schedules: active.length, submitted };
  }

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick(); }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export type PersistentScheduleSnapshot = CollectionSchedule;
