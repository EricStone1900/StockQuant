import { createHash } from "node:crypto";
import type { Experiment } from "../domain/experiment.js";
import type { V31ResearchArtifactRef, V32PromotionRequest, V32PromotionValidationPlan } from "../contracts/generated-types.js";
import type { RunnerJobRecord } from "./v31-runner-jobs.js";
import type { ArtifactRef, BudgetReservation } from "./v31-runtime-guards.js";
import { sha256 } from "./v31-runtime-guards.js";
import { parseRunnerInputBundle } from "./v31-runner-input-bundle.js";
import { buildPromotionRequest } from "./v32-promotion-producer.js";

export type V32PromotionEvidencePorts = {
  experiment: { get(experimentId: string): Promise<Experiment | null> };
  runnerJob: { get(jobId: string): Promise<RunnerJobRecord | null> };
  budget: { get(experimentId: string): Promise<BudgetReservation | null> };
  artifactRefs: { get(namespace: string, artifactId: string): Promise<ArtifactRef | null> };
  artifactContent: { read(ref: ArtifactRef): Promise<Uint8Array> };
};

export type V32PromotionPreparationResult =
  | { status: "WAITING"; blockers: string[]; promotionRequest: null }
  | { status: "READY_FOR_GATE_CHECK"; blockers: []; promotionRequest: V32PromotionRequest };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function stableUuid(seed: string): string {
  const bytes = Buffer.from(createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function inputArtifactAddress(path: string): { namespace: string; artifactId: string } | null {
  const parts = path.split("/");
  if (parts.length !== 5 || parts[0] !== "research" || parts[3] !== "inputs" || !/^[a-f0-9]{64}$/.test(parts[4])) return null;
  return { namespace: parts.slice(0, 4).join("/"), artifactId: parts[4] };
}

function parseValidationPlan(bytes: Uint8Array): V32PromotionValidationPlan {
  try {
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as V32PromotionValidationPlan;
    if (!value || typeof value !== "object" || value.schemaVersion !== "v3.2-validation-plan-v1") throw new Error();
    return value;
  } catch {
    throw new Error("validated Runner input bundle lost its V3.2 validation plan");
  }
}

/** Assemble a PromotionRequest from authoritative persistent research records. */
export class V32PromotionRequestPreparer {
  constructor(private readonly ports: V32PromotionEvidencePorts) {}

  async prepare(testRunId: string, experimentId: string): Promise<V32PromotionPreparationResult> {
    if (!UUID.test(testRunId) || !UUID.test(experimentId)) throw new Error("testRunId and experimentId must be UUIDs");
    const blockers: string[] = [];
    const experiment = await this.ports.experiment.get(experimentId);
    if (!experiment) return { status: "WAITING", blockers: ["experiment record is not persisted"], promotionRequest: null };
    if (experiment.status === "CANCELLED") return { status: "WAITING", blockers: ["experiment is cancelled"], promotionRequest: null };

    const jobId = `${testRunId}:${experimentId}`;
    const jobRecord = await this.ports.runnerJob.get(jobId);
    if (!jobRecord) return { status: "WAITING", blockers: ["Runner Job record is not persisted"], promotionRequest: null };
    if (jobRecord.job.testRunId !== testRunId || jobRecord.job.experimentId !== experimentId || experiment.experimentId !== experimentId) throw new Error("persisted experiment and Runner Job identities do not match the requested scope");
    if (jobRecord.status !== "COMPLETED") blockers.push(`Runner Job is ${jobRecord.status}, not COMPLETED`);

    const address = inputArtifactAddress(jobRecord.job.inputArtifact);
    if (!address) throw new Error("Runner Job inputArtifact address is invalid");
    const inputRef = await this.ports.artifactRefs.get(address.namespace, address.artifactId);
    if (!inputRef || inputRef.status !== "PUBLISHED" || inputRef.kind !== "INPUT" || inputRef.sha256 !== address.artifactId) {
      blockers.push("content-addressed Runner input ArtifactRef is not published");
    }
    let promotionData: ReturnType<typeof parseRunnerInputBundle>["promotionData"];
    if (inputRef?.status === "PUBLISHED" && inputRef.kind === "INPUT" && inputRef.sha256 === address.artifactId) {
      const bytes = await this.ports.artifactContent.read(inputRef);
      if (sha256(bytes) !== inputRef.sha256) throw new Error("stored Runner input bundle does not match its published ArtifactRef");
      promotionData = parseRunnerInputBundle(bytes, jobRecord.job).promotionData;
      if (!promotionData) blockers.push("Runner input bundle has no V3.2 promotion sidecars");
    }

    const budget = await this.ports.budget.get(experimentId);
    if (!budget || budget.status !== "SETTLED") blockers.push("experiment budget is not settled");
    const planBytes = promotionData?.validationPlan;
    const plan = planBytes ? parseValidationPlan(planBytes) : null;
    const publishedOutputs = jobRecord.artifacts.filter((ref) => ref.status === "PUBLISHED" && ref.kind === "OUTPUT");
    const fences = new Set(publishedOutputs.map((ref) => /^runner:(.+):fence:(\d+)$/.exec(ref.sourceRef)?.[2]).filter(Boolean));
    if (fences.size > 1) throw new Error("completed Runner Job contains output artifacts from multiple fencing attempts");
    const fence = [...fences][0];
    if (!plan || !fence) blockers.push("validation plan or published fenced output artifacts are missing");

    if (blockers.length > 0 || !promotionData || !plan || !fence || !budget) return { status: "WAITING", blockers, promotionRequest: null };
    const resolveOutput = (relativePath: string): V31ResearchArtifactRef => {
      const artifactIdForPath = `output-${sha256(`${relativePath}\0${fence}`).slice(0, 32)}`;
      const matches = publishedOutputs.filter((ref) => ref.artifactId.startsWith(`${artifactIdForPath}-`));
      if (matches.length !== 1) throw new Error(`validation plan output ${relativePath} must resolve to exactly one published Runner artifact`);
      return matches[0] as V31ResearchArtifactRef;
    };

    const promotionRequest = buildPromotionRequest({
      promotionRequestId: stableUuid(`v32-promotion-request:${jobId}`),
      testRunId,
      experimentId,
      runnerJob: { jobId, status: jobRecord.status, testRunId: jobRecord.job.testRunId, experimentId: jobRecord.job.experimentId, artifacts: jobRecord.artifacts as V31ResearchArtifactRef[] },
      candidate: resolveOutput(plan.candidateOutputPath),
      generatedCode: resolveOutput(plan.generatedCodeOutputPath),
      dataManifest: promotionData.dataManifest,
      dataFiles: promotionData.dataFiles,
      metrics: resolveOutput(plan.metricsOutputPath),
      validationPlan: promotionData.validationPlan,
      budget: { allocationId: `research-budget:V3.1:${experimentId}`, currency: "USD", reservedMinor: budget.reservedCents, consumedMinor: budget.spentCents, status: "SETTLED" },
      idempotencyKey: `v32-${sha256(jobId)}`,
    });
    return { status: "READY_FOR_GATE_CHECK", blockers: [], promotionRequest };
  }
}
