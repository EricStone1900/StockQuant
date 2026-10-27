import { describe, expect, it, vi } from "vitest";
import { SnapshotSamplingScheduler } from "../../src/application/snapshot-sampling-scheduler.js";

describe("independent snapshot schedule", () => {
  it("uses the current 20/30 policy and calendar without Provider or order execution", async () => {
    let instant = new Date("2026-10-16T01:50:15Z"); let intervalMinutes: 20 | 30 = 20;
    const enqueue = vi.fn().mockResolvedValue({ created: true });
    const schedule = { scope: { market: "CN_A" as const, ownerId: "owner", accountId: "a", namespace: "ns", testRunId: "r" }, sourceId: "tencent-quote" as const };
    const scheduler = new SnapshotSamplingScheduler(async () => [schedule], async () => ({ intervalMinutes, version: 2 }), enqueue, { now: () => instant });
    expect(await scheduler.tick()).toEqual({ state: "SCHEDULED", enqueued: 1 });
    expect(enqueue).toHaveBeenCalledWith(schedule, expect.objectContaining({ scheduledAt: "2026-10-16T01:50:00.000Z", intervalMinutes: 20, version: 2 }));
    intervalMinutes = 30; expect((await scheduler.tick()).state).toBe("NOT_SAMPLING_TICK");
    instant = new Date("2026-10-16T02:00:15Z"); expect((await scheduler.tick()).state).toBe("SCHEDULED");
    instant = new Date("2026-10-16T04:00:00Z"); expect((await scheduler.tick()).state).toBe("CLOSED");
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
});
