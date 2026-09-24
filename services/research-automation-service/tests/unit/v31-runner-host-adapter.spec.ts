import { describe, expect, it } from "vitest";
import { runRunnerJob } from "../../src/application/v31-runner-host-adapter.js";
import type { RunnerExecutionResult } from "../../src/application/v31-runner-executor.js";
import type { RunnerJob } from "../../src/application/v31-runtime-guards.js";

const job: RunnerJob = {
  schemaVersion: "v3.1-runner-job-v1",
  testRunId: "run-1",
  experimentId: "exp-1",
  imageDigest: `sha256:${"a".repeat(64)}`,
  inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`,
  outputNamespace: "research/run-1/exp-1/outputs",
  resources: { cpuMilli: 500, memoryMiB: 256, timeoutSeconds: 10, pidsLimit: 32 },
  networkPolicy: { mode: "DENY", allowlist: [] },
};

const completed: RunnerExecutionResult = { status: "COMPLETED", exitCode: 0, signal: null, stdout: "ok", stderr: "", durationMs: 4 };

describe("V3.1 trusted Runner host adapter", () => {
  it("writes start, executes once, publishes artifacts, then writes terminal result", async () => {
    const events: string[] = [];
    const artifact = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "run-log", kind: "RUN_LOG" as const, namespace: job.outputNamespace, sha256: "c".repeat(64), status: "PUBLISHED" as const, sourceRef: "runner:run-1:exp-1" };
    const result = await runRunnerJob("run-1:exp-1", job, {} as never, {
      markStarted: () => { events.push("started"); },
      markCompleted: (_jobId, execution, artifacts) => { events.push(`completed:${execution.status}:${artifacts.length}`); },
    }, {
      buildPlan: () => ({ command: "docker", argv: [], environment: {}, timeoutSeconds: 10, execution: "NOT_STARTED" }),
      executePlan: async () => { events.push("executed"); return completed; },
      publishArtifacts: async () => { events.push("published"); return [artifact]; },
    });
    expect(result).toEqual(completed);
    expect(events).toEqual(["started", "executed", "published", "completed:COMPLETED:1"]);
  });

  it("converts an unexpected host executor error into a terminal spawn failure", async () => {
    let terminal: RunnerExecutionResult | undefined;
    const result = await runRunnerJob("run-1:exp-1", job, {} as never, {
      markStarted: () => undefined,
      markCompleted: (_jobId, execution) => { terminal = execution; },
    }, {
      buildPlan: () => ({ command: "docker", argv: [], environment: {}, timeoutSeconds: 10, execution: "NOT_STARTED" }),
      executePlan: async () => { throw new Error("docker unavailable"); },
    });
    expect(result).toMatchObject({ status: "SPAWN_FAILED", exitCode: null, stderr: "docker unavailable" });
    expect(terminal).toEqual(result);
  });

  it("does not write lifecycle callbacks when launch preflight fails", async () => {
    const events: string[] = [];
    await expect(runRunnerJob("run-1:exp-1", job, {} as never, {
      markStarted: () => { events.push("started"); },
      markCompleted: () => { events.push("completed"); },
    }, { buildPlan: () => { throw new Error("unsafe launch plan"); } })).rejects.toThrow("unsafe launch plan");
    expect(events).toEqual([]);
  });
});
