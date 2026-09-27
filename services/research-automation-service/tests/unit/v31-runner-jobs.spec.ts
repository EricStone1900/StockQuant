import { describe, expect, it } from "vitest";
import { InMemoryRunnerJobStore, RunnerJobCoordinator } from "../../src/application/v31-runner-jobs.js";

const job = { schemaVersion: "v3.1-runner-job-v1" as const, testRunId: "run-1", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-1/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 }, networkPolicy: { mode: "DENY" as const, allowlist: [] } };
const outputArtifact = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "run-log-1", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: "c".repeat(64), status: "PUBLISHED" as const, sourceRef: "runner:run-1" };

describe("V3.1 runner job state", () => {
  it("fences expired workers and permits only the current lease holder to complete", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const queued = await coordinator.submit({ ...job, testRunId: "run-lease", inputArtifact: `research/run-lease/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-lease/exp-1/outputs" });
    const t0 = new Date("2026-09-25T00:00:00Z");
    const first = await coordinator.claim("worker-a", t0, 1000);
    expect(first?.lease?.fencingToken).toBe(1);
    await expect(coordinator.claim("worker-b", new Date(t0.getTime() + 500), 1000)).resolves.toBeNull();
    const second = await coordinator.claim("worker-b", new Date(t0.getTime() + 1001), 1000);
    expect(second?.jobId).toBe(queued.jobId);
    expect(second?.lease).toMatchObject({ workerId: "worker-b", fencingToken: 2 });
    await expect(coordinator.heartbeat(queued.jobId, "worker-a", 1, new Date(t0.getTime() + 1100), 1000)).resolves.toBeNull();
    await expect(coordinator.complete(queued.jobId, "worker-a", 1, { status: "COMPLETED", exitCode: 0, signal: null, stdout: "stale", stderr: "", durationMs: 1 }, [], new Date(t0.getTime() + 1100))).resolves.toBeNull();
    const completed = await coordinator.complete(queued.jobId, "worker-b", 2, { status: "COMPLETED", exitCode: 0, signal: null, stdout: "current", stderr: "", durationMs: 1 }, [], new Date(t0.getTime() + 1200));
    expect(completed?.execution?.stdout).toBe("current");
    expect(completed?.lease).toBeNull();
  });
  it("submits idempotently and reports terminal execution status", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const queued = await coordinator.submit(job);
    expect(await coordinator.submit(job)).toEqual(queued);
    const running = await coordinator.markStarted(queued.jobId);
    expect(running.status).toBe("RUNNING");
    const completed = await coordinator.markCompleted(queued.jobId, { status: "COMPLETED", exitCode: 0, signal: null, stdout: "ok", stderr: "", durationMs: 2 }, [outputArtifact]);
    expect(completed.status).toBe("COMPLETED");
    expect((await coordinator.get(queued.jobId))?.execution?.stdout).toBe("ok");
    expect((await coordinator.get(queued.jobId))?.artifacts).toEqual([outputArtifact]);
  });
  it("uses a stable keyset cursor to continue only after the exact TestRun ordering key", async () => {
    const store = new InMemoryRunnerJobStore();
    const first = { ...job, testRunId: "cursor-run", experimentId: "exp-a", inputArtifact: `research/cursor-run/exp-a/inputs/${"b".repeat(64)}`, outputNamespace: "research/cursor-run/exp-a/outputs" };
    const second = { ...first, experimentId: "exp-b", inputArtifact: `research/cursor-run/exp-b/inputs/${"b".repeat(64)}`, outputNamespace: "research/cursor-run/exp-b/outputs" };
    const otherRun = { ...first, testRunId: "other-run", experimentId: "exp-c", inputArtifact: `research/other-run/exp-c/inputs/${"b".repeat(64)}`, outputNamespace: "research/other-run/exp-c/outputs" };
    for (const [index, value] of [first, second, otherRun].entries()) await store.save({ jobId: `${value.testRunId}:${value.experimentId}`, job: value, status: "QUEUED", submittedAt: new Date(Date.parse("2026-09-27T00:00:00.000Z") + index).toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: null });
    const page = store.listAfterTestRun("cursor-run", null, 1);
    const next = store.listAfterTestRun("cursor-run", { submittedAt: page[0].submittedAt, jobId: page[0].jobId }, 1);
    expect(page.map((record) => record.jobId)).toEqual(["cursor-run:exp-a"]);
    expect(next.map((record) => record.jobId)).toEqual(["cursor-run:exp-b"]);
  });
  it("lists queue records by exact TestRun with stable pagination", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const forRun = (testRunId: string, experimentId: string) => ({ ...job, testRunId, experimentId, inputArtifact: `research/${testRunId}/${experimentId}/inputs/${"b".repeat(64)}`, outputNamespace: `research/${testRunId}/${experimentId}/outputs` });
    await coordinator.submit(forRun("run-list-b", "exp-1"));
    await coordinator.submit(forRun("run-list-a", "exp-2"));
    await coordinator.submit(forRun("run-list-a", "exp-1"));
    const firstPage = await coordinator.listForTestRun("run-list-a", 0, 1);
    expect(firstPage).toHaveLength(1);
    expect(firstPage[0]?.job.testRunId).toBe("run-list-a");
    expect((await coordinator.listForTestRun("run-list-a", 1, 1))).toHaveLength(1);
    expect(await coordinator.listForTestRun("run-list-b", 0, 50)).toHaveLength(1);
    expect(await coordinator.listForTestRun("not-a-run", 0, 50)).toEqual([]);
  });

  it("cancels queued or leased work idempotently and fences its worker from completion", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const queued = await coordinator.submit({ ...job, testRunId: "run-cancel", inputArtifact: `research/run-cancel/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-cancel/exp-1/outputs" });
    const now = new Date("2026-09-25T00:00:00Z");
    const leased = await coordinator.claim("worker-cancel", now, 30_000);
    expect(leased?.jobId).toBe(queued.jobId);
    const cancelled = await coordinator.cancel(queued.jobId, new Date(now.getTime() + 1));
    expect(cancelled).toMatchObject({ status: "CANCELLED", execution: null, artifacts: [], lease: null, completedAt: "2026-09-25T00:00:00.001Z" });
    expect(await coordinator.cancel(queued.jobId, new Date(now.getTime() + 2))).toEqual(cancelled);
    await expect(coordinator.heartbeat(queued.jobId, "worker-cancel", 1, new Date(now.getTime() + 3), 30_000)).resolves.toBeNull();
    await expect(coordinator.complete(queued.jobId, "worker-cancel", 1, { status: "COMPLETED", exitCode: 0, signal: null, stdout: "late", stderr: "", durationMs: 1 }, [outputArtifact], new Date(now.getTime() + 4))).resolves.toBeNull();
    await expect(coordinator.retry(queued.jobId)).rejects.toThrow("only a terminal runner job can be retried");
  });

  it("rejects invalid transitions and retains failure results", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const queued = await coordinator.submit({ ...job, testRunId: "run-failure", inputArtifact: `research/run-failure/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-failure/exp-1/outputs" });
    await expect(coordinator.markCompleted(queued.jobId, { status: "FAILED", exitCode: 1, signal: null, stdout: "", stderr: "boom", durationMs: 4 })).rejects.toThrow("not running");
    await coordinator.markStarted(queued.jobId);
    const failed = await coordinator.markCompleted(queued.jobId, { status: "FAILED", exitCode: 1, signal: null, stdout: "", stderr: "boom", durationMs: 4 });
    expect(failed.status).toBe("FAILED");
    expect(failed.execution?.stderr).toBe("boom");
    await expect(coordinator.markStarted(queued.jobId)).rejects.toThrow("not queued");
    await expect(coordinator.markCompleted(queued.jobId, { status: "FAILED", exitCode: 1, signal: null, stdout: "", stderr: "again", durationMs: 4 })).rejects.toThrow("not running");
  });

  it("retains output references from earlier fences when the current worker completes", async () => {
    const store = new InMemoryRunnerJobStore();
    const coordinator = new RunnerJobCoordinator(store);
    const queued = await coordinator.submit({ ...job, testRunId: "run-artifact-fences", inputArtifact: `research/run-artifact-fences/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-artifact-fences/exp-1/outputs" });
    const lease = await coordinator.claim("current-worker", new Date(), 30_000);
    const earlier = { ...outputArtifact, artifactId: "fence-one-output", namespace: "research/run-artifact-fences/exp-1/outputs", sourceRef: `runner:${queued.jobId}:fence:1` };
    const current = { ...outputArtifact, artifactId: "fence-two-output", namespace: "research/run-artifact-fences/exp-1/outputs", sourceRef: `runner:${queued.jobId}:fence:2` };
    const runningWithEarlier = { ...lease!, artifacts: [earlier] };
    store.save(runningWithEarlier);
    const completed = await coordinator.complete(queued.jobId, "current-worker", lease!.lease!.fencingToken, { status: "COMPLETED", exitCode: 0, signal: null, stdout: "ok", stderr: "", durationMs: 1 }, [current]);
    expect(completed?.artifacts).toEqual([earlier, current]);
  });

  it("creates an idempotent queued retry while retaining the failed attempt", async () => {
    const coordinator = new RunnerJobCoordinator(new InMemoryRunnerJobStore());
    const queued = await coordinator.submit({ ...job, testRunId: "run-retry", inputArtifact: `research/run-retry/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-retry/exp-1/outputs" });
    await coordinator.markStarted(queued.jobId);
    await coordinator.markCompleted(queued.jobId, { status: "TIMED_OUT", exitCode: null, signal: "SIGKILL", stdout: "", stderr: "timeout", durationMs: 10 });
    const retry = await coordinator.retry(queued.jobId);
    expect(retry).toMatchObject({ status: "QUEUED", attempt: 2, retryOf: queued.jobId, artifacts: [] });
    expect(await coordinator.retry(queued.jobId)).toEqual(retry);
    expect((await coordinator.get(queued.jobId))?.status).toBe("TIMED_OUT");
  });
});
