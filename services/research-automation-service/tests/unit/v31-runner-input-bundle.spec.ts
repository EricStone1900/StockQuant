import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { materializeRunnerInputBundle, parseRunnerInputBundle } from "../../src/application/v31-runner-input-bundle.js";
import { hashPromotionDataFiles } from "../../src/application/v32-promotion-producer.js";
import { sha256, type RunnerJob } from "../../src/application/v31-runtime-guards.js";

const bundle = (overrides: Record<string, unknown> = {}) => Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [{ path: "code/main.py", contentBase64: Buffer.from("print('ok')\n").toString("base64") }, { path: "data/sample.json", contentBase64: Buffer.from("{}\n").toString("base64") }], ...overrides }));
const jobFor = (content: Uint8Array, networkPolicy: RunnerJob["networkPolicy"] = { mode: "DENY", allowlist: [] }): RunnerJob => ({ schemaVersion: "v3.1-runner-job-v1", testRunId: "test-run", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/test-run/exp-1/inputs/${sha256(content)}`, outputNamespace: "research/test-run/exp-1/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 }, networkPolicy });
const tempRoots: string[] = [];

async function tempRoot(): Promise<string> { const path = await mkdtemp(join(tmpdir(), "stockquant-runner-input-")); tempRoots.push(path); return path; }
afterEach(async () => { await Promise.all(tempRoots.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("V3.1 Runner input bundle", () => {
  it("parses a bounded bundle and derives the runner job file from trusted job fields", () => {
    const content = bundle();
    const parsed = parseRunnerInputBundle(content, jobFor(content));
    expect(parsed.files.map((file) => file.path)).toEqual(["code/main.py", "data/sample.json"]);
    expect(parsed.runtimeJob).toEqual({ artifact_namespace: "v31/test-run/exp-1", network_policy: "DENY", script: "main.py", timeout_seconds: 30 });
  });

  it("requires the bytes to match the immutable input Artifact digest in the job", () => {
    const content = bundle();
    const mismatched = { ...jobFor(content), inputArtifact: `research/test-run/exp-1/inputs/${"b".repeat(64)}` };
    expect(() => parseRunnerInputBundle(content, mismatched)).toThrow("hash does not match the job inputArtifact");
  });

  it("binds V3.2 sidecars to the exact job and verifies data-file bytes from the input bundle", () => {
    const testRunId = "ff979c31-6f72-492d-8091-89cde9f05494";
    const experimentId = "275a9fe1-651f-444a-a6c2-c7f008509127";
    const payload = [{ path: "data/market.json", content: Buffer.from('{"close":[10,11]}') }];
    const manifest = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "FIXTURE", dataVersion: "fixture-v1", dataContentSha256: hashPromotionDataFiles(payload) }));
    const plan = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: sha256(manifest), candidateOutputPath: "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" }));
    const files = [
      { path: "code/main.py", contentBase64: Buffer.from("print('ok')\n").toString("base64") },
      ...payload.map((file) => ({ path: file.path, contentBase64: file.content.toString("base64") })),
      { path: "data/v3.2-data-manifest.json", contentBase64: manifest.toString("base64") },
      { path: "data/v3.2-validation-plan.json", contentBase64: plan.toString("base64") },
    ];
    const content = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files }));
    const job: RunnerJob = { ...jobFor(content), testRunId, experimentId, inputArtifact: `research/${testRunId}/${experimentId}/inputs/${sha256(content)}`, outputNamespace: `research/${testRunId}/${experimentId}/outputs` };
    const parsed = parseRunnerInputBundle(content, job);
    expect(parsed.promotionData?.dataManifest).toEqual(manifest);
    expect(parsed.promotionData?.validationPlan).toEqual(plan);
    expect(parsed.promotionData?.dataFiles.map((file) => file.path)).toEqual(["data/market.json"]);

    const tampered = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [
      files[0], { path: "data/market.json", contentBase64: Buffer.from('{"close":[10,99]}').toString("base64") }, files[2], files[3],
    ] }));
    expect(() => parseRunnerInputBundle(tampered, { ...job, inputArtifact: `research/${testRunId}/${experimentId}/inputs/${sha256(tampered)}` })).toThrow("content hash does not match");
  });

  it("materializes only code/data files under a new input root", async () => {
    const root = await tempRoot();
    const input = join(root, "inputs", "test-run", "exp-1");
    await mkdir(join(root, "inputs", "test-run"), { recursive: true });
    const content = bundle();
    await materializeRunnerInputBundle(parseRunnerInputBundle(content, jobFor(content)), input);
    await expect(readFile(join(input, "code/main.py"), "utf8")).resolves.toBe("print('ok')\n");
    await expect(readFile(join(input, "data/sample.json"), "utf8")).resolves.toBe("{}\n");
    await expect(JSON.parse(await readFile(join(input, "job.json"), "utf8"))).toEqual({ artifact_namespace: "v31/test-run/exp-1", network_policy: "DENY", script: "main.py", timeout_seconds: 30 });
  });

  it.each([
    { label: "parent traversal", changes: { files: [{ path: "code/../escape.py", contentBase64: "eA==" }] } },
    { label: "absolute path", changes: { files: [{ path: "/tmp/escape.py", contentBase64: "eA==" }] } },
    { label: "backslash path", changes: { files: [{ path: "code\\escape.py", contentBase64: "eA==" }] } },
    { label: "duplicate path", changes: { files: [{ path: "code/main.py", contentBase64: "eA==" }, { path: "code/main.py", contentBase64: "eA==" }] } },
    { label: "missing entrypoint", changes: { files: [{ path: "code/other.py", contentBase64: "eA==" }] } },
    { label: "invalid base64", changes: { files: [{ path: "code/main.py", contentBase64: "%%%" }] } },
  ])("rejects $label", ({ changes }) => {
    const content = bundle(changes);
    expect(() => parseRunnerInputBundle(content, jobFor(content))).toThrow();
  });

  it("rejects allowlisted execution and does not overwrite an existing directory", async () => {
    const content = bundle();
    expect(() => parseRunnerInputBundle(content, jobFor(content, { mode: "ALLOWLIST", allowlist: ["example.com"] }))).toThrow("requires network policy DENY");
    const root = await tempRoot();
    const input = join(root, "already-exists");
    await mkdir(input);
    await expect(materializeRunnerInputBundle(parseRunnerInputBundle(content, jobFor(content)), input)).rejects.toThrow();
  });
});
