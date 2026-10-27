import { describe, expect, it, vi } from "vitest";
import { SamplingTaskWorker, type SamplingTaskClaim, type SamplingTaskLifecyclePort } from "../../src/application/sampling-task-worker.js";

const fixedNow = new Date("2026-10-16T01:30:00.000Z");
function setup(task: SamplingTaskClaim | null, execute: () => Promise<{ state: "COMPLETED" | "BLOCKED_SOURCE_AUTHORIZATION"; reason?: string }>) {
  const lifecycle: SamplingTaskLifecyclePort = {
    claim: vi.fn(async () => task),
    finish: vi.fn(async () => undefined),
    retry: vi.fn(async (_id, _owner, _now, _delay, _reason) => ({ state: task && task.attempt >= task.maxAttempts ? "FAILED" : "RETRY_WAIT" })),
  };
  const executor = { execute: vi.fn(execute) };
  const clock = { now: vi.fn(() => new Date(fixedNow)) };
  return { lifecycle, executor, clock, worker: new SamplingTaskWorker(lifecycle, executor, clock, "sampling-worker", 10_000, 2_000) };
}

describe("SamplingTaskWorker", () => {
  it("returns idle without executing when no durable task is available", async () => {
    const state = setup(null, async () => ({ state: "COMPLETED" }));
    await expect(state.worker.tick()).resolves.toEqual({ claimed: false, taskId: null, state: "IDLE" });
    expect(state.executor.execute).not.toHaveBeenCalled();
  });

  it("submits a successful result under the active lease", async () => {
    const state = setup({ taskId: "snapshot-1", attempt: 1, maxAttempts: 3 }, async () => ({ state: "COMPLETED" }));
    await expect(state.worker.tick()).resolves.toEqual({ claimed: true, taskId: "snapshot-1", state: "COMPLETED" });
    expect(state.lifecycle.finish).toHaveBeenCalledWith("snapshot-1", "sampling-worker", fixedNow, "COMPLETED", null);
  });

  it("persists the source authorization block without retrying or invoking a provider", async () => {
    const state = setup({ taskId: "snapshot-2", attempt: 1, maxAttempts: 3 }, async () => ({ state: "BLOCKED_SOURCE_AUTHORIZATION", reason: "OD-008 is not authorized" }));
    await expect(state.worker.tick()).resolves.toEqual({ claimed: true, taskId: "snapshot-2", state: "BLOCKED_SOURCE_AUTHORIZATION" });
    expect(state.lifecycle.finish).toHaveBeenCalledWith("snapshot-2", "sampling-worker", fixedNow, "BLOCKED_SOURCE_AUTHORIZATION", "OD-008 is not authorized");
    expect(state.lifecycle.retry).not.toHaveBeenCalled();
  });

  it("moves transient executor errors into bounded retry state", async () => {
    const state = setup({ taskId: "snapshot-3", attempt: 2, maxAttempts: 3 }, async () => { throw new Error("temporary database error"); });
    await expect(state.worker.tick()).resolves.toEqual({ claimed: true, taskId: "snapshot-3", state: "RETRY_WAIT" });
    expect(state.lifecycle.retry).toHaveBeenCalledWith("snapshot-3", "sampling-worker", fixedNow, 2_000, "temporary database error");
  });

  it("reports terminal failure when the retry bound is reached", async () => {
    const state = setup({ taskId: "snapshot-4", attempt: 3, maxAttempts: 3 }, async () => { throw new Error("still unavailable"); });
    await expect(state.worker.tick()).resolves.toMatchObject({ state: "FAILED" });
  });
});
