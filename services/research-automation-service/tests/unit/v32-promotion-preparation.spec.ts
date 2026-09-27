import { describe, expect, it } from "vitest";
import type { Experiment } from "../../src/domain/experiment.js";
import type { RunnerJobRecord } from "../../src/application/v31-runner-jobs.js";
import { sha256, type ArtifactRef, type RunnerJob } from "../../src/application/v31-runtime-guards.js";
import { hashPromotionDataFiles } from "../../src/application/v32-promotion-producer.js";
import { V32PromotionRequestPreparer, type V32PromotionEvidencePorts } from "../../src/application/v32-promotion-preparation.js";

const testRunId = "ff979c31-6f72-492d-8091-89cde9f05494";
const experimentId = "275a9fe1-651f-444a-a6c2-c7f008509127";
const jobId = `${testRunId}:${experimentId}`;
const outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;

function fixture(overrides: { budgetStatus?: "SETTLED" | "RESERVED"; removeInput?: boolean; tamperInput?: boolean; removeSidecars?: boolean; outputPath?: string; missingJob?: boolean } = {}) {
  const dataset = [{ path: "data/market.json", content: Buffer.from('{"close":[10,11]}') }];
  const dataManifest = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "FIXTURE", dataVersion: "fixture-v1", dataContentSha256: hashPromotionDataFiles(dataset) }));
  const validationPlan = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: sha256(dataManifest), candidateOutputPath: overrides.outputPath ?? "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" }));
  const bundleFiles = [
    { path: "code/main.py", contentBase64: Buffer.from("print('done')").toString("base64") },
    ...dataset.map((file) => ({ path: file.path, contentBase64: file.content.toString("base64") })),
    ...(!overrides.removeSidecars ? [
      { path: "data/v3.2-data-manifest.json", contentBase64: dataManifest.toString("base64") },
      { path: "data/v3.2-validation-plan.json", contentBase64: validationPlan.toString("base64") },
    ] : []),
  ];
  const inputBytes = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: bundleFiles }));
  const actualInputBytes = overrides.tamperInput ? Buffer.from(`${inputBytes.toString("utf8")} `) : inputBytes;
  const inputHash = sha256(inputBytes);
  const inputArtifact: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: inputHash, kind: "INPUT", namespace: inputNamespace, sha256: inputHash, status: "PUBLISHED", sourceRef: "fixture:input" };
  const job: RunnerJob = { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `${inputNamespace}/${inputHash}`, outputNamespace, resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 60, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
  const outputs = [
    { path: "candidate.json", bytes: Buffer.from('{"candidate":"sma-v1"}') },
    { path: "generated.py", bytes: Buffer.from("print('strategy')") },
    { path: "metrics.json", bytes: Buffer.from('{"return":0.1}') },
  ].map(({ path, bytes }) => {
    const digest = sha256(bytes);
    const artifact: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: `output-${sha256(`${path}\0${1}`).slice(0, 32)}-${digest.slice(0, 16)}`, kind: "OUTPUT", namespace: outputNamespace, sha256: digest, status: "PUBLISHED", sourceRef: `runner:${jobId}:fence:1` };
    return artifact;
  });
  const runnerRecord: RunnerJobRecord = { jobId, job, status: "COMPLETED", submittedAt: "2026-09-27T00:00:00.000Z", startedAt: "2026-09-27T00:00:01.000Z", completedAt: "2026-09-27T00:01:00.000Z", execution: { status: "COMPLETED", exitCode: 0, signal: null, stdout: "done", stderr: "", durationMs: 59_000 }, artifacts: outputs, attempt: 1, retryOf: null, lease: null };
  const experiment: Experiment = { experimentId, fixtureId: "fixture-v1", modelProfile: "local", rounds: 1, budgetCurrency: "USD", budgetCents: 500, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "experiment-key-v1", status: "PENDING_PREREQUISITES", reason: "prerequisite gate", createdAt: "2026-09-27T00:00:00.000Z", cancelledAt: null };
  const ports: V32PromotionEvidencePorts = {
    experiment: { get: async (id) => id === experimentId ? experiment : null },
    runnerJob: { get: async (id) => id === jobId && !overrides.missingJob ? runnerRecord : null },
    budget: { get: async () => ({ experimentId, requestedCents: 500, reservedCents: 500, spentCents: 100, status: overrides.budgetStatus ?? "SETTLED" }) },
    artifactRefs: { get: async (namespace, artifactId) => overrides.removeInput || namespace !== inputNamespace || artifactId !== inputHash ? null : inputArtifact },
    artifactContent: { read: async () => actualInputBytes },
  };
  return { preparer: new V32PromotionRequestPreparer(ports), ports };
}

describe("V3.2 persistent PromotionRequest preparation", () => {
  it("assembles a stable request from persisted experiment, job, refs, input bytes and settled budget", async () => {
    const { preparer } = fixture();
    const first = await preparer.prepare(testRunId, experimentId);
    const second = await preparer.prepare(testRunId, experimentId);
    expect(first.status).toBe("READY_FOR_GATE_CHECK");
    expect(first).toEqual(second);
    if (first.status !== "READY_FOR_GATE_CHECK") throw new Error("expected a prepared request");
    expect(first.promotionRequest).toMatchObject({ testRunId, experimentId, candidateSource: "FIXTURE", budget: { allocationId: `research-budget:V3.1:${experimentId}`, reservedMinor: 500, consumedMinor: 100 } });
    expect(first.promotionRequest).not.toHaveProperty("approvedBy");
    expect(first.promotionRequest).not.toHaveProperty("registryStatus");
  });

  it.each([
    ["unknown job", { missingJob: true }],
    ["missing published input", { removeInput: true }],
    ["unsettled budget", { budgetStatus: "RESERVED" as const }],
    ["missing V3.2 sidecars", { removeSidecars: true }],
  ])("reports WAITING for %s", async (_label, options) => {
    const { preparer } = fixture(options as Parameters<typeof fixture>[0]);
    const result = await preparer.prepare(testRunId, experimentId);
    expect(result.status).toBe("WAITING");
    expect(result.blockers.length).toBeGreaterThan(0);
    expect(result.promotionRequest).toBeNull();
  });

  it("rejects content drift and output-role relabeling", async () => {
    await expect(fixture({ tamperInput: true }).preparer.prepare(testRunId, experimentId)).rejects.toThrow("does not match its published ArtifactRef");
    await expect(fixture({ outputPath: "not-candidate.json" }).preparer.prepare(testRunId, experimentId)).rejects.toThrow("resolve to exactly one published Runner artifact");
  });

  it("rejects non-UUID scope before repository reads", async () => {
    const { preparer, ports } = fixture();
    const experimentGet = ports.experiment.get;
    let called = false;
    ports.experiment.get = async (id) => { called = true; return experimentGet(id); };
    await expect(preparer.prepare("run-1", experimentId)).rejects.toThrow("must be UUIDs");
    expect(called).toBe(false);
  });
});
