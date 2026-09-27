import { linkSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { collectRunnerOutputArtifacts, validateLeasedRunnerOutputPublication } from "../../src/application/v31-runner-output.js";
import type { RunnerJob } from "../../src/application/v31-runtime-guards.js";

const job: RunnerJob = { schemaVersion: "v3.1-runner-job-v1", testRunId: "run-1", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-1/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
const roots: string[] = [];
function tempRoot(): string { const root = mkdtempSync(join(tmpdir(), "stockquant-runner-output-")); roots.push(root); return root; }
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("V3.1 Runner output collection", () => {
  it("collects regular output files as content-addressed OUTPUT refs under the exact job namespace", async () => {
    const root = tempRoot();
    mkdirSync(join(root, "nested"));
    writeFileSync(join(root, "metrics.json"), "{\"sharpe\":0.5}");
    writeFileSync(join(root, "nested", "run.log"), "complete");
    const outputs = await collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 2, outputRoot: root });
    expect(outputs.map(({ relativePath }) => relativePath)).toEqual(["metrics.json", "nested/run.log"]);
    expect(outputs).toMatchObject([{ ref: { kind: "OUTPUT", namespace: job.outputNamespace, status: "PENDING" }, relativePath: "metrics.json" }, { ref: { kind: "OUTPUT", namespace: job.outputNamespace, status: "PENDING" }, relativePath: "nested/run.log" }]);
    expect(outputs[0].ref.artifactId).toMatch(/^output-[a-f0-9]{32}-[a-f0-9]{16}$/u);
    const laterFence = await collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 3, outputRoot: root });
    expect(laterFence[0].ref.artifactId).not.toBe(outputs[0].ref.artifactId);
    expect(laterFence[0].ref.sourceRef).not.toBe(outputs[0].ref.sourceRef);
  });

  it("binds Runner output publication to the active worker, namespace and fencing token", () => {
    const ref = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "output-1", kind: "OUTPUT", namespace: job.outputNamespace, sha256: "c".repeat(64), status: "PENDING", sourceRef: "runner:job-1:fence:5" } as const;
    const record = { jobId: "job-1", job, status: "RUNNING", submittedAt: "", startedAt: "", completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: { workerId: "worker-1", fencingToken: 5, expiresAt: "2026-09-25T00:00:30.000Z" } };
    const valid = { record, jobId: "job-1", workerId: "worker-1", fencingToken: 5, now: new Date("2026-09-25T00:00:20.000Z"), ref };
    expect(() => validateLeasedRunnerOutputPublication(valid)).not.toThrow();
    expect(() => validateLeasedRunnerOutputPublication({ ...valid, fencingToken: 4 })).toThrow("current unexpired lease");
    expect(() => validateLeasedRunnerOutputPublication({ ...valid, now: new Date("2026-09-25T00:00:31.000Z") })).toThrow("current unexpired lease");
    expect(() => validateLeasedRunnerOutputPublication({ ...valid, ref: { ...ref, namespace: "research/other/exp/outputs" } })).toThrow("must match the leased job");
  });

  it("rejects symlinks, hard links and unsafe filenames", async () => {
    const symlinkRoot = tempRoot();
    const outside = join(symlinkRoot, "outside");
    const symlinkOutput = join(symlinkRoot, "symlink-output");
    mkdirSync(symlinkOutput);
    writeFileSync(outside, "outside");
    symlinkSync(outside, join(symlinkOutput, "link"));
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: symlinkOutput })).rejects.toThrow("symlinks");

    const hardlinkRoot = tempRoot();
    writeFileSync(join(hardlinkRoot, "one"), "shared");
    linkSync(join(hardlinkRoot, "one"), join(hardlinkRoot, "two"));
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: hardlinkRoot })).rejects.toThrow("hard links");

    const unsafeRoot = tempRoot();
    writeFileSync(join(unsafeRoot, "bad\\name"), "outside");
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: unsafeRoot })).rejects.toThrow("unsafe path segment");
  });

  it("enforces per-file and total file-count bounds and rejects a symlink root", async () => {
    const oversizedRoot = tempRoot();
    writeFileSync(join(oversizedRoot, "large.bin"), Buffer.alloc(8 * 1024 * 1024 + 1));
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: oversizedRoot })).rejects.toThrow("exceeds 8 MiB");

    const manyRoot = tempRoot();
    for (let index = 0; index < 65; index += 1) writeFileSync(join(manyRoot, `file-${index}`), "x");
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: manyRoot })).rejects.toThrow("64 files");

    const root = tempRoot();
    const target = join(root, "target");
    const alias = join(root, "alias");
    mkdirSync(target);
    symlinkSync(target, alias);
    await expect(collectRunnerOutputArtifacts({ jobId: "run-1:exp-1", job, fencingToken: 1, outputRoot: alias })).rejects.toThrow("regular directory");
  });
});
