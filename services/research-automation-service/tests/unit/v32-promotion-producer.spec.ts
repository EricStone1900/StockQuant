import { describe, expect, it } from "vitest";
import { buildPromotionRequest, hashPromotionDataFiles, type PromotionEvidence } from "../../src/application/v32-promotion-producer.js";
import { sha256 } from "../../src/application/v31-runtime-guards.js";

const testRunId = "ff979c31-6f72-492d-8091-89cde9f05494";
const experimentId = "275a9fe1-651f-444a-a6c2-c7f008509127";
const jobId = `${testRunId}:${experimentId}`;
const dataFiles = [{ path: "data/market.json", content: Buffer.from('{"close":[10,11]}') }];
const dataManifest = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "FIXTURE", dataVersion: "fixture-market-v1", dataContentSha256: hashPromotionDataFiles(dataFiles) }));
const validationPlan = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: sha256(dataManifest), candidateOutputPath: "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" }));
const output = (_label: string, path: string, contentHash: string) => ({ schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: `output-${sha256(`${path}\0${5}`).slice(0, 32)}-${contentHash.slice(0, 16)}`, kind: "OUTPUT" as const, namespace: `research/${testRunId}/${experimentId}/outputs`, sha256: contentHash, status: "PUBLISHED" as const, sourceRef: `runner:${jobId}:fence:5` });
const candidateArtifact = output("candidate", "candidate.json", "a".repeat(64));
const generatedCodeArtifact = output("generated-code", "generated.py", "b".repeat(64));
const metricsArtifact = output("metrics", "metrics.json", "d".repeat(64));
const evidence: PromotionEvidence = {
  promotionRequestId: "9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2",
  testRunId,
  experimentId,
  runnerJob: {
    jobId,
    status: "COMPLETED",
    testRunId,
    experimentId,
    artifacts: [],
  },
  candidate: candidateArtifact,
  generatedCode: generatedCodeArtifact,
  dataManifest,
  dataFiles,
  metrics: metricsArtifact,
  validationPlan,
  budget: { allocationId: "fixture-budget", currency: "USD", reservedMinor: 500, consumedMinor: 120, status: "SETTLED" },
  idempotencyKey: "v32-fixture-producer-v1",
};
evidence.runnerJob.artifacts = [evidence.candidate, evidence.generatedCode, evidence.metrics];

describe("V3.2 research PromotionRequest producer", () => {
  it("binds immutable evidence, exact run scope and settled budget without granting Registry authority", () => {
    const request = buildPromotionRequest(evidence);
    expect(request).toMatchObject({
      schemaVersion: "v3.2-promotion-request-v1",
      promotionRequestId: evidence.promotionRequestId,
      testRunId,
      experimentId,
      candidateSource: "FIXTURE",
      candidateArtifact: { artifactId: evidence.candidate.artifactId, namespace: evidence.candidate.namespace, sha256: evidence.candidate.sha256 },
      codeSha256: evidence.generatedCode.sha256,
      dataManifestSha256: sha256(evidence.dataManifest),
      metricsManifestSha256: evidence.metrics.sha256,
      validationPlanSha256: sha256(evidence.validationPlan),
      budget: { allocationId: "fixture-budget", currency: "USD", reservedMinor: 500, consumedMinor: 120 },
      idempotencyKey: evidence.idempotencyKey,
    });
    expect(request).not.toHaveProperty("approvedBy");
    expect(request).not.toHaveProperty("registryStatus");
  });

  it.each([
    ["wrong run namespace", { candidate: { ...evidence.candidate, namespace: "research/other/run/outputs" } }],
    ["unfinished Runner Job", { runnerJob: { ...evidence.runnerJob, status: "RUNNING" as const } }],
    ["mismatched Runner Job identity", { runnerJob: { ...evidence.runnerJob, testRunId: "02474225-daee-4333-ab12-4e9bda5e6d48" } }],
    ["unbound candidate ref", { runnerJob: { ...evidence.runnerJob, artifacts: [] } }],
    ["unpublished candidate", { candidate: { ...evidence.candidate, status: "PENDING" as const } }],
    ["wrong artifact kind", { candidate: { ...evidence.candidate, kind: "METRICS" as const } }],
    ["candidate path relabeled as a different output", { validationPlan: Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: sha256(dataManifest), candidateOutputPath: "other.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" })) }],
    ["unknown budget spend", { budget: { ...evidence.budget, status: "UNKNOWN" as const } }],
    ["overspent budget", { budget: { ...evidence.budget, consumedMinor: 501 } }],
    ["malformed validation plan JSON", { validationPlan: Buffer.from("not-json") }],
    ["mismatched data manifest identity", { dataManifest: Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId: "02474225-daee-4333-ab12-4e9bda5e6d48", experimentId, dataMode: "FIXTURE", dataVersion: "v1", dataContentSha256: "c".repeat(64) })) }],
    ["dataset bytes changed after manifest creation", { dataFiles: [{ path: "data/market.json", content: Buffer.from('{"close":[10,99]}') }] }],
    ["duplicate dataset path", { dataFiles: [{ path: "data/market.json", content: Buffer.from("a") }, { path: "data/market.json", content: Buffer.from("b") }] }],
    ["unsafe dataset path", { dataFiles: [{ path: "data/../market.json", content: Buffer.from("a") }] }],
    ["plan with a different data hash", { validationPlan: Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: "f".repeat(64) })) }],
    ["real input marked as fixture candidate", { dataManifest: Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "REAL", dataVersion: "real-v1", dataContentSha256: "c".repeat(64) })) }],
    ["blank budget allocation", { budget: { ...evidence.budget, allocationId: "   " } }],
    ["short idempotency key", { idempotencyKey: "short" }],
  ])("rejects %s before any submission", (_name, patch) => {
    expect(() => buildPromotionRequest({ ...evidence, ...patch })).toThrow();
  });
});
