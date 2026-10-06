import { afterEach, describe, expect, it, vi } from "vitest";
import type { CollectionRunPort } from "../../src/ports/collection-run.js";
import type { CollectionSchedulePort } from "../../src/ports/collection-schedule.js";
import { PersistentCollectionSchedulerWorker } from "../../src/application/persistent-collection-scheduler.js";

describe("persistent collection scheduler polling status", () => {
  afterEach(() => vi.useRealTimers());

  it("reports the next scheduler poll separately from the next collection window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-03T00:00:00.000Z"));
    const schedules = { acquireLease: vi.fn().mockResolvedValue(null) } as unknown as CollectionSchedulePort;
    const runs = {} as CollectionRunPort;
    const planner = {} as ConstructorParameters<typeof PersistentCollectionSchedulerWorker>[2];
    const worker = new PersistentCollectionSchedulerWorker(schedules, runs, planner, "worker-test");

    expect(worker.status()).toMatchObject({ enabled: false, nextPollAt: null, nextExecutionAt: null });
    worker.start(60_000);
    expect(worker.status()).toMatchObject({
      enabled: true,
      nextPollAt: "2026-10-03T00:01:00.000Z",
      nextExecutionAt: null,
    });

    await vi.advanceTimersByTimeAsync(60_000);
    expect(worker.status()).toMatchObject({
      enabled: true,
      nextPollAt: "2026-10-03T00:02:00.000Z",
      nextExecutionAt: null,
    });
    expect(schedules.acquireLease).toHaveBeenCalledTimes(2);

    await worker.stop();
    expect(worker.status()).toMatchObject({ enabled: false, nextPollAt: null });
  });
});
