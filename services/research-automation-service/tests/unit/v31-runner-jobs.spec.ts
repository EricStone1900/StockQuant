import { describe, expect, it } from "vitest";
import { InMemoryRunnerJobStore, RunnerJobCoordinator } from "../../src/application/v31-runner-jobs.js";

const job = { schemaVersion: "v3.1-runner-job-v1" as const, testRunId: "run-1", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-1/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 }, networkPolicy: { mode: "DENY" as const, allowlist: [] } };
const outputArtifact = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "run-log-1", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: "c".repeat(64), status: "PUBLISHED" as const, sourceRef: "runner:run-1" };

describe("V3.1 runner job state", () => {
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
