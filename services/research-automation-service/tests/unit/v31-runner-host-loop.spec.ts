import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runRunnerHostOnce } from "../../src/application/v31-runner-host-loop.js";
import { RunnerLeaseLostError } from "../../src/application/v31-runner-host-api-client.js";
import { sha256, type RunnerJob } from "../../src/application/v31-runtime-guards.js";

const digest = `sha256:${"a".repeat(64)}`;
const roots: string[] = [];
async function setup() {
  const managedRoot = await mkdtemp(join(tmpdir(), "stockquant-runner-host-")); roots.push(managedRoot);
  const job: RunnerJob = { schemaVersion: "v3.1-runner-job-v1", testRunId: "run-1", experimentId: "exp-1", imageDigest: digest, inputArtifact: "", outputNamespace: "research/run-1/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
  const bundle = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [{ path: "code/main.py", contentBase64: Buffer.from("print('ok')").toString("base64") }] }));
  job.inputArtifact = `research/run-1/exp-1/inputs/${sha256(bundle)}`;
  const lease = { workerId: "worker-1", fencingToken: 5, expiresAt: new Date(Date.now() + 30_000).toISOString() };
  const claim = { claimStatus: "LEASED" as const, jobId: "run-1:exp-1", job, status: "RUNNING" as const, submittedAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease };
  const api = { claim: vi.fn().mockResolvedValue(claim), readInput: vi.fn().mockResolvedValue({ ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: sha256(bundle), kind: "INPUT", namespace: "research/run-1/exp-1/inputs", sha256: sha256(bundle), status: "PUBLISHED", sourceRef: "fixture" }, contentBase64: bundle.toString("base64") }), heartbeat: vi.fn().mockResolvedValue(claim), complete: vi.fn().mockResolvedValue(claim), publishArtifact: vi.fn().mockResolvedValue({ status: "PUBLISHED", persisted: true }) };
  return { managedRoot, job, bundle, lease, claim, api };
}
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });

describe("V3.1 Runner host loop", () => {
  it("does not perform input, execution or completion work when no job is available", async () => {
    const ctx = await setup();
    ctx.api.claim.mockResolvedValue({ status: "NO_WORK" });
    const execute = vi.fn();
    await expect(runRunnerHostOnce(ctx.api, { workerId: "worker-1", managedRoot: ctx.managedRoot, imageRef: `runner@${digest}`, heartbeatIntervalMs: 1000, execute })).resolves.toEqual({ status: "NO_WORK" });
    expect(ctx.api.readInput).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
    expect(ctx.api.publishArtifact).not.toHaveBeenCalled();
    expect(ctx.api.complete).not.toHaveBeenCalled();
  });

  it("materializes, executes, publishes outputs and completes with the claimed fencing token", async () => {
    const ctx = await setup();
    const result = await runRunnerHostOnce(ctx.api, { workerId: "worker-1", managedRoot: ctx.managedRoot, imageRef: `runner@${digest}`, heartbeatIntervalMs: 1000, execute: async (plan) => {
      expect(plan.argv).toContain("--network");
      const inputFile = join(ctx.managedRoot, "inputs/run-1/exp-1/fence-5/code/main.py");
      expect(await readFile(inputFile, "utf8")).toContain("print");
      await writeFile(join(ctx.managedRoot, "outputs/run-1/exp-1/fence-5/metrics.json"), "{\"ok\":true}");
      return { status: "COMPLETED", exitCode: 0, signal: null, stdout: "", stderr: "", durationMs: 1 };
    } });
    expect(result.status).toBe("COMPLETED");
    expect(ctx.api.publishArtifact).toHaveBeenCalledOnce();
    expect(ctx.api.publishArtifact).toHaveBeenCalledWith(ctx.claim.jobId, ctx.lease, expect.objectContaining({ kind: "OUTPUT" }), expect.any(Uint8Array));
    expect(ctx.api.complete).toHaveBeenCalledWith(ctx.claim.jobId, ctx.lease, expect.objectContaining({ status: "COMPLETED" }), [expect.objectContaining({ kind: "OUTPUT", sourceRef: "runner:run-1:exp-1:fence:5" })]);
  });

  it("aborts and refuses completion when the lease heartbeat is lost", async () => {
    const ctx = await setup();
    ctx.api.heartbeat.mockRejectedValue(new RunnerLeaseLostError());
    const execute = vi.fn((_plan, signal: AbortSignal) => new Promise<never>((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })));
    await expect(runRunnerHostOnce(ctx.api, { workerId: "worker-1", managedRoot: ctx.managedRoot, imageRef: `runner@${digest}`, heartbeatIntervalMs: 1000, execute })).rejects.toBeInstanceOf(RunnerLeaseLostError);
    expect(execute).toHaveBeenCalledOnce();
    expect(ctx.api.publishArtifact).not.toHaveBeenCalled();
    expect(ctx.api.complete).not.toHaveBeenCalled();
  });

  it("rejects a validly encoded but hash-mismatched input before execution", async () => {
    const ctx = await setup();
    ctx.api.readInput.mockResolvedValue({
      ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "0".repeat(64), kind: "INPUT", namespace: "research/run-1/exp-1/inputs", sha256: "0".repeat(64), status: "PUBLISHED", sourceRef: "fixture" },
      contentBase64: Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [{ path: "code/main.py", contentBase64: Buffer.from("print('tampered')").toString("base64") }] })).toString("base64")
    });
    const execute = vi.fn();
    await expect(runRunnerHostOnce(ctx.api, { workerId: "worker-1", managedRoot: ctx.managedRoot, imageRef: `runner@${digest}`, heartbeatIntervalMs: 1000, execute })).rejects.toThrow(/SHA-256|hash/u);
    expect(execute).not.toHaveBeenCalled();
    expect(ctx.api.publishArtifact).not.toHaveBeenCalled();
    expect(ctx.api.complete).not.toHaveBeenCalled();
  });

  it("records a failed execution without collecting or publishing output artifacts", async () => {
    const ctx = await setup();
    const result = await runRunnerHostOnce(ctx.api, { workerId: "worker-1", managedRoot: ctx.managedRoot, imageRef: `runner@${digest}`, heartbeatIntervalMs: 1000, execute: async () => ({ status: "FAILED", exitCode: 17, signal: null, stdout: "", stderr: "fixture failure", durationMs: 2 }) });
    expect(result.status).toBe("COMPLETED");
    expect(ctx.api.publishArtifact).not.toHaveBeenCalled();
    expect(ctx.api.complete).toHaveBeenCalledWith(ctx.claim.jobId, ctx.lease, expect.objectContaining({ status: "FAILED", exitCode: 17 }), []);
  });
});
