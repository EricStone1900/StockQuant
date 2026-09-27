import type { V31ResearchArtifactRef, V32PromotionDataManifest, V32PromotionRequest, V32PromotionValidationPlan } from "../contracts/generated-types.js";
import type { RunnerJobStatus } from "./v31-runner-jobs.js";
import { sha256 } from "./v31-runtime-guards.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;

export type SettledExperimentBudget = {
  allocationId: string;
  currency: "USD";
  reservedMinor: number;
  consumedMinor: number;
  status: "SETTLED";
};

export type PromotionEvidence = {
  promotionRequestId: string;
  testRunId: string;
  experimentId: string;
  runnerJob: {
    jobId: string;
    status: RunnerJobStatus;
    testRunId: string;
    experimentId: string;
    artifacts: V31ResearchArtifactRef[];
  };
  candidate: V31ResearchArtifactRef;
  generatedCode: V31ResearchArtifactRef;
  dataManifest: Uint8Array;
  dataFiles: Array<{ path: string; content: Uint8Array }>;
  metrics: V31ResearchArtifactRef;
  validationPlan: Uint8Array;
  budget: SettledExperimentBudget;
  idempotencyKey: string;
};

function parseScopedJson<T extends Record<string, unknown>>(name: string, bytes: Uint8Array, requiredKeys: string[]): T {
  let value: unknown;
  try { value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new Error(`${name} must be valid UTF-8 JSON`); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be a JSON object`);
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== requiredKeys.length || requiredKeys.some((key) => !Object.hasOwn(record, key))) throw new Error(`${name} has missing or unsupported fields`);
  return record as T;
}

function parseDataManifest(bytes: Uint8Array, testRunId: string, experimentId: string): V32PromotionDataManifest {
  const manifest = parseScopedJson<V32PromotionDataManifest>("data manifest", bytes, ["schemaVersion", "testRunId", "experimentId", "dataMode", "dataVersion", "dataContentSha256"]);
  if (manifest.schemaVersion !== "v3.2-data-manifest-v1" || manifest.testRunId !== testRunId || manifest.experimentId !== experimentId) throw new Error("data manifest is not bound to the exact TestRun and experiment");
  if (!["FIXTURE", "RECORDED", "REAL"].includes(manifest.dataMode) || typeof manifest.dataVersion !== "string" || !manifest.dataVersion.trim() || !SHA256.test(manifest.dataContentSha256)) throw new Error("data manifest mode, version, or content hash is invalid");
  return manifest;
}

function parseValidationPlan(bytes: Uint8Array, testRunId: string, experimentId: string, dataManifestSha256: string): V32PromotionValidationPlan {
  const plan = parseScopedJson<V32PromotionValidationPlan>("validation plan", bytes, ["schemaVersion", "testRunId", "experimentId", "candidateSource", "dataManifestSha256", "candidateOutputPath", "generatedCodeOutputPath", "metricsOutputPath"]);
  if (plan.schemaVersion !== "v3.2-validation-plan-v1" || plan.testRunId !== testRunId || plan.experimentId !== experimentId) throw new Error("validation plan is not bound to the exact TestRun and experiment");
  if (plan.candidateSource !== "RD_AGENT" && plan.candidateSource !== "FIXTURE") throw new Error("validation plan candidateSource is invalid");
  if (!SHA256.test(plan.dataManifestSha256) || plan.dataManifestSha256 !== dataManifestSha256) throw new Error("validation plan does not bind the exact data manifest bytes");
  const paths = [plan.candidateOutputPath, plan.generatedCodeOutputPath, plan.metricsOutputPath];
  if (paths.some((path) => typeof path !== "string" || path.length > 512 || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(part))) || new Set(paths).size !== paths.length) throw new Error("validation plan output paths must be unique safe relative paths");
  return plan;
}

/** Hash a deterministic inventory of the exact data files selected for the experiment. */
export function hashPromotionDataFiles(files: Array<{ path: string; content: Uint8Array }>): string {
  if (files.length < 1 || files.length > 256) throw new Error("promotion data files must contain between 1 and 256 files");
  const seen = new Set<string>();
  const inventory = files.map(({ path, content }) => {
    if (!/^data\/(?:[A-Za-z0-9][A-Za-z0-9._-]{0,127}\/)*[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(path) || path.length > 512 || path === "data/v3.2-data-manifest.json" || path === "data/v3.2-validation-plan.json") throw new Error("promotion data file path is invalid or reserved for a sidecar");
    if (seen.has(path)) throw new Error("promotion data files contain a duplicate path");
    if (!(content instanceof Uint8Array)) throw new Error("promotion data file content must be bytes");
    seen.add(path);
    return { path, sha256: sha256(content) };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  return sha256(Buffer.from(JSON.stringify(inventory), "utf8"));
}

export function parsePromotionDataSidecars(input: {
  files: Array<{ path: string; content: Uint8Array }>;
  testRunId: string;
  experimentId: string;
}): { dataManifest: Uint8Array; validationPlan: Uint8Array; dataFiles: Array<{ path: string; content: Uint8Array }> } | undefined {
  const manifestPath = "data/v3.2-data-manifest.json";
  const planPath = "data/v3.2-validation-plan.json";
  const manifestFiles = input.files.filter((file) => file.path === manifestPath);
  const planFiles = input.files.filter((file) => file.path === planPath);
  if (manifestFiles.length === 0 && planFiles.length === 0) return undefined;
  if (manifestFiles.length !== 1 || planFiles.length !== 1) throw new Error("promotion data input requires exactly one manifest and one validation-plan sidecar");
  const dataFiles = input.files.filter((file) => file.path.startsWith("data/") && file.path !== manifestPath && file.path !== planPath);
  const manifest = parseDataManifest(manifestFiles[0].content, input.testRunId, input.experimentId);
  const manifestHash = sha256(manifestFiles[0].content);
  const plan = parseValidationPlan(planFiles[0].content, input.testRunId, input.experimentId, manifestHash);
  if (manifest.dataContentSha256 !== hashPromotionDataFiles(dataFiles)) throw new Error("data manifest content hash does not match the Runner input bundle data files");
  if (manifest.dataMode === "REAL" && plan.candidateSource === "FIXTURE") throw new Error("candidate source cannot be FIXTURE for a REAL input manifest");
  return { dataManifest: manifestFiles[0].content, validationPlan: planFiles[0].content, dataFiles };
}

/** Construct the immutable research-side submission only from a completed, published candidate and settled budget. */
export function buildPromotionRequest(evidence: PromotionEvidence): V32PromotionRequest {
  for (const [name, value] of [["promotionRequestId", evidence.promotionRequestId], ["testRunId", evidence.testRunId], ["experimentId", evidence.experimentId]] as const) {
    if (!UUID.test(value)) throw new Error(`${name} must be a UUID`);
  }
  if (evidence.runnerJob.status !== "COMPLETED" || evidence.runnerJob.testRunId !== evidence.testRunId || evidence.runnerJob.experimentId !== evidence.experimentId || !evidence.runnerJob.jobId) {
    throw new Error("promotion requires a completed Runner Job bound to the exact TestRun and experiment");
  }
  const dataManifest = parseDataManifest(evidence.dataManifest, evidence.testRunId, evidence.experimentId);
  if (hashPromotionDataFiles(evidence.dataFiles) !== dataManifest.dataContentSha256) throw new Error("data manifest content hash does not match the exact experiment data files");
  const dataManifestSha256 = sha256(evidence.dataManifest);
  const validationPlan = parseValidationPlan(evidence.validationPlan, evidence.testRunId, evidence.experimentId, dataManifestSha256);
  if (dataManifest.dataMode === "REAL" && validationPlan.candidateSource === "FIXTURE") throw new Error("candidate source cannot be FIXTURE for a REAL input manifest");
  const expectedNamespace = `research/${evidence.testRunId}/${evidence.experimentId}/outputs`;
  const requirePublishedJobArtifact = (name: string, artifact: V31ResearchArtifactRef, relativePath: string) => {
    const fence = /^runner:(.+):fence:(\d+)$/.exec(artifact.sourceRef);
    if (artifact.schemaVersion !== "v3.1-artifact-ref-v1" || artifact.kind !== "OUTPUT" || artifact.status !== "PUBLISHED" || artifact.namespace !== expectedNamespace || !artifact.artifactId || !SHA256.test(artifact.sha256) || fence?.[1] !== evidence.runnerJob.jobId || !fence[2]) {
      throw new Error(`${name} must be a published output from the exact completed Runner Job`);
    }
    const expectedArtifactId = `output-${sha256(`${relativePath}\0${fence[2]}`).slice(0, 32)}-${artifact.sha256.slice(0, 16)}`;
    if (artifact.artifactId !== expectedArtifactId) throw new Error(`${name} does not identify the output path declared by the validation plan`);
    if (!evidence.runnerJob.artifacts.some((ref) => ref.schemaVersion === artifact.schemaVersion && ref.kind === "OUTPUT" && ref.status === "PUBLISHED" && ref.namespace === artifact.namespace && ref.artifactId === artifact.artifactId && ref.sha256 === artifact.sha256 && ref.sourceRef === artifact.sourceRef)) {
      throw new Error(`${name} is not included in the completed Runner Job artifacts`);
    }
  };
  requirePublishedJobArtifact("candidate", evidence.candidate, validationPlan.candidateOutputPath);
  requirePublishedJobArtifact("generatedCode", evidence.generatedCode, validationPlan.generatedCodeOutputPath);
  requirePublishedJobArtifact("metrics", evidence.metrics, validationPlan.metricsOutputPath);
  const validationPlanSha256 = sha256(evidence.validationPlan);
  const budget = evidence.budget;
  if (budget.status !== "SETTLED" || !budget.allocationId.trim() || budget.currency !== "USD" || !Number.isSafeInteger(budget.reservedMinor) || !Number.isSafeInteger(budget.consumedMinor) || budget.reservedMinor < 0 || budget.consumedMinor < 0 || budget.consumedMinor > budget.reservedMinor) {
    throw new Error("promotion requires a valid, settled USD experiment budget");
  }
  if (typeof evidence.idempotencyKey !== "string" || evidence.idempotencyKey.length < 8 || evidence.idempotencyKey.length > 128) throw new Error("idempotencyKey length is invalid");

  return {
    schemaVersion: "v3.2-promotion-request-v1",
    promotionRequestId: evidence.promotionRequestId,
    testRunId: evidence.testRunId,
    experimentId: evidence.experimentId,
    candidateSource: validationPlan.candidateSource,
    candidateArtifact: { artifactId: evidence.candidate.artifactId, namespace: evidence.candidate.namespace, sha256: evidence.candidate.sha256 },
    codeSha256: evidence.generatedCode.sha256,
    dataManifestSha256,
    metricsManifestSha256: evidence.metrics.sha256,
    validationPlanSha256,
    budget: { allocationId: budget.allocationId, currency: "USD", reservedMinor: budget.reservedMinor, consumedMinor: budget.consumedMinor },
    idempotencyKey: evidence.idempotencyKey,
  };
}
