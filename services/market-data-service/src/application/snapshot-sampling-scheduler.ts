import { decideCnAShareSamplingTick } from "./cn-a-share-calendar.js";

export interface SnapshotSchedule {
  scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string };
  sourceId: "tencent-quote" | "sina-quote";
}

/** Timer only enqueues versioned tasks. Providers run in the independent durable worker. */
export class SnapshotSamplingScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private busy = false;
  constructor(
    private readonly schedules: () => Promise<SnapshotSchedule[]>,
    private readonly configuration: () => Promise<{ intervalMinutes: 20 | 30; version: number }>,
    private readonly enqueue: (schedule: SnapshotSchedule, tick: { scheduledAt: string; intervalMinutes: 20 | 30; version: number; calendarVersion: string; window: "morning" | "afternoon" }) => Promise<{ created: boolean }>,
    private readonly clock: { now(): Date },
  ) {}
  async tick(): Promise<{ state: string; enqueued: number }> {
    if (this.busy) return { state: "BUSY", enqueued: 0 };
    this.busy = true;
    try {
      const now = this.clock.now();
      const scheduledAt = new Date(Math.floor(now.getTime() / 60_000) * 60_000).toISOString();
      const config = await this.configuration();
      const decision = decideCnAShareSamplingTick(scheduledAt, config.intervalMinutes);
      if (decision.status !== "ELIGIBLE" || !decision.window) return { state: decision.status, enqueued: 0 };
      let enqueued = 0;
      for (const schedule of await this.schedules()) {
        const result = await this.enqueue(schedule, { scheduledAt, ...config, calendarVersion: decision.calendarVersion, window: decision.window });
        if (result.created) enqueued += 1;
      }
      return { state: enqueued ? "SCHEDULED" : "NO_NEW_TASK", enqueued };
    } finally { this.busy = false; }
  }
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("snapshot scheduler failed", error)); }, 30_000);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("snapshot scheduler initial tick failed", error));
  }
}
