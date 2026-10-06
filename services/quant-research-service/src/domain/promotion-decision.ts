import { createHash } from "node:crypto";
import type { V32PromotionRequest } from "../contracts/generated-types.js";
import { canonicalJson } from "./canonical-json.js";

const SHA256 = /^[a-f0-9]{64}$/;
const ACTOR = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/;

export type PromotionDecisionCommand = {
  schemaVersion: "v3.2-promotion-decision-command-v1";
  decision: "APPROVE" | "REJECT";
  confirmation: "REVIEW_EXACT_PROMOTION_VERSION";
  reportFingerprint: string;
  actorId: string;
};

export function parsePromotionDecisionCommand(input: unknown): { ok: true; command: PromotionDecisionCommand } | { ok: false; reason: string } {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, reason: "decision command must be an object" };
  const body = input as Record<string, unknown>;
  const expected = ["schemaVersion", "decision", "confirmation", "reportFingerprint", "actorId"];
  if (Object.keys(body).length !== expected.length || expected.some((key) => !Object.hasOwn(body, key))) return { ok: false, reason: "decision command has missing or unknown properties" };
  if (body.schemaVersion !== "v3.2-promotion-decision-command-v1" || !["APPROVE", "REJECT"].includes(String(body.decision))) return { ok: false, reason: "decision command version or decision is invalid" };
  if (body.confirmation !== "REVIEW_EXACT_PROMOTION_VERSION") return { ok: false, reason: "explicit exact-version review confirmation is required" };
  if (typeof body.reportFingerprint !== "string" || !SHA256.test(body.reportFingerprint)) return { ok: false, reason: "reportFingerprint must be a lowercase SHA-256" };
  if (typeof body.actorId !== "string" || !ACTOR.test(body.actorId)) return { ok: false, reason: "actorId is invalid" };
  return { ok: true, command: body as PromotionDecisionCommand };
}

export function promotionVersionFingerprint(request: V32PromotionRequest, requestFingerprint: string, reportFingerprint: string): string {
  if (!SHA256.test(requestFingerprint) || !SHA256.test(reportFingerprint)) throw new Error("version fingerprint inputs must be SHA-256 values");
  return createHash("sha256").update(canonicalJson({
    schemaVersion: "v3.2-promotion-version-fingerprint-v1",
    promotionRequestId: request.promotionRequestId,
    candidateArtifact: request.candidateArtifact,
    codeSha256: request.codeSha256,
    dataManifestSha256: request.dataManifestSha256,
    metricsManifestSha256: request.metricsManifestSha256,
    validationPlanSha256: request.validationPlanSha256,
    requestFingerprint,
    reportFingerprint,
  })).digest("hex");
}

export function reportIsApprovable(report: { disposition: string; checks: Array<{ status: string }> }): boolean {
  return report.disposition === "ELIGIBLE_FOR_REVIEW" && report.checks.length === 5 && report.checks.every((check) => check.status === "PASS");
}
