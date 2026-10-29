import { describe, expect, it, vi } from "vitest";
import { V24FixtureTargetWorker } from "../../src/application/v24-fixture-target-worker.js";
import type { V24FixtureTargetJob, V24FixtureTargetJobRepository } from "../../src/ports/v24-fixture-target-jobs.js";

const now = new Date("2026-10-15T07:10:00Z");
const job: V24FixtureTargetJob = { jobId: "fixture-job", state: "CLAIMED", attempt: 1, leaseOwner: "worker", leaseUntil: "2026-10-15T07:10:30Z", targetId: null, input: { scope: { ownerId: "owner", accountId: "account", namespace: "v24-paper-v2-run", testRunId: "run" }, sourceId: "fixture:daily", dataVersion: "v1", asOf: "2026-10-15T15:10:00+08:00", evaluatedAt: "2026-10-16T09:31:00+08:00" } };

describe("C5 Fixture target worker", () => {
  it("records a bounded retry when required daily data are unavailable", async () => {
    const jobs: V24FixtureTargetJobRepository = { claim: vi.fn(async () => job), complete: vi.fn(), retry: vi.fn(async () => undefined) };
    const materialize = vi.fn(async () => { throw new Error("C5_COORDINATOR_DAILY_INPUT_UNAVAILABLE"); });
    const worker = new V24FixtureTargetWorker(jobs, { materialize }, { now: () => now }, "worker");
    expect(await worker.tick()).toBe("RETRY");
    expect(jobs.retry).toHaveBeenCalledWith(job, "worker", now, "C5_COORDINATOR_DAILY_INPUT_UNAVAILABLE", 5000);
    expect(jobs.complete).not.toHaveBeenCalled();
  });
  it("does not overlap ticks in the same process", async () => {
    let release!: (value: null) => void;
    const jobs: V24FixtureTargetJobRepository = { claim: vi.fn(() => new Promise((resolve) => { release = resolve; })), complete: vi.fn(), retry: vi.fn() };
    const worker = new V24FixtureTargetWorker(jobs, { materialize: vi.fn() }, { now: () => now }, "worker");
    const first = worker.tick();
    expect(await worker.tick()).toBe("BUSY");
    release(null); expect(await first).toBe("IDLE");
    expect(jobs.claim).toHaveBeenCalledTimes(1);
  });
});
