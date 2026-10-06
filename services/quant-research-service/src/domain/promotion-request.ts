import { createHash } from "node:crypto";
import type { V32PromotionRequest } from "../contracts/generated-types.js";
import { canonicalJson } from "./canonical-json.js";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sha256 = /^[a-f0-9]{64}$/;
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function parsePromotionRequest(value: unknown): { ok: true; request: V32PromotionRequest } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "request must be an object" };
  const body = value as Record<string, unknown>;
  if (!exactKeys(body, ["schemaVersion", "promotionRequestId", "testRunId", "experimentId", "candidateSource", "candidateArtifact", "codeSha256", "dataManifestSha256", "metricsManifestSha256", "validationPlanSha256", "budget", "idempotencyKey"])) return { ok: false, reason: "request has missing or unknown properties" };
  if (body.schemaVersion !== "v3.2-promotion-request-v1" || typeof body.promotionRequestId !== "string" || !uuid.test(body.promotionRequestId) || typeof body.testRunId !== "string" || !uuid.test(body.testRunId) || typeof body.experimentId !== "string" || !uuid.test(body.experimentId)) return { ok: false, reason: "request schema version or identity is invalid" };
  if (body.candidateSource !== "RD_AGENT" && body.candidateSource !== "FIXTURE") return { ok: false, reason: "candidateSource is invalid" };
  if (typeof body.candidateArtifact !== "object" || body.candidateArtifact === null || Array.isArray(body.candidateArtifact)) return { ok: false, reason: "candidateArtifact is invalid" };
  const artifact = body.candidateArtifact as Record<string, unknown>;
  if (!exactKeys(artifact, ["artifactId", "namespace", "sha256"]) || typeof artifact.artifactId !== "string" || artifact.artifactId.length < 1 || typeof artifact.namespace !== "string" || artifact.namespace !== "research/" + body.testRunId + "/" + body.experimentId + "/outputs" || typeof artifact.sha256 !== "string" || !sha256.test(artifact.sha256)) return { ok: false, reason: "candidateArtifact reference is invalid or outside the request scope" };
  for (const key of ["codeSha256", "dataManifestSha256", "metricsManifestSha256", "validationPlanSha256"]) if (typeof body[key] !== "string" || !sha256.test(body[key] as string)) return { ok: false, reason: key + " must be a lowercase SHA-256" };
  if (typeof body.budget !== "object" || body.budget === null || Array.isArray(body.budget)) return { ok: false, reason: "budget is invalid" };
  const budget = body.budget as Record<string, unknown>;
  if (!exactKeys(budget, ["allocationId", "currency", "reservedMinor", "consumedMinor"]) || typeof budget.allocationId !== "string" || budget.allocationId.length < 1 || budget.currency !== "USD" || !Number.isSafeInteger(budget.reservedMinor) || (budget.reservedMinor as number) < 0 || !Number.isSafeInteger(budget.consumedMinor) || (budget.consumedMinor as number) < 0 || (budget.consumedMinor as number) > (budget.reservedMinor as number)) return { ok: false, reason: "budget allocation is invalid" };
  if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 128) return { ok: false, reason: "idempotencyKey length is invalid" };
  return { ok: true, request: body as unknown as V32PromotionRequest };
}

export function promotionRequestFingerprint(request: V32PromotionRequest): string {
  return createHash("sha256").update(canonicalJson(request)).digest("hex");
}
