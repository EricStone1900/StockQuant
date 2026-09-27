import { describe, expect, it } from "vitest";
import { parsePromotionDecisionCommand, promotionVersionFingerprint, reportIsApprovable } from "../../src/promotion-decision.js";
import type { V32PromotionRequest } from "../../src/contracts/generated-types.js";

const sha = "a".repeat(64);
const command = { schemaVersion: "v3.2-promotion-decision-command-v1", decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint: sha, actorId: "owner@example.test" };
const request: V32PromotionRequest = {
  schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: "11111111-1111-4111-8111-111111111111", testRunId: "22222222-2222-4222-8222-222222222222", experimentId: "33333333-3333-4333-8333-333333333333", candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate.json", namespace: "research/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/outputs", sha256: sha }, codeSha256: sha, dataManifestSha256: "b".repeat(64), metricsManifestSha256: "c".repeat(64), validationPlanSha256: "d".repeat(64), budget: { allocationId: "budget-1", currency: "USD", reservedMinor: 10, consumedMinor: 10 }, idempotencyKey: "promotion-key-1",
};

describe("V3.2 exact-version promotion decision", () => {
  it("accepts explicit decisions with an authenticated actor identity", () => {
    expect(parsePromotionDecisionCommand(command)).toEqual({ ok: true, command });
    expect(parsePromotionDecisionCommand({ ...command, decision: "REJECT" }).ok).toBe(true);
  });
  it("rejects missing confirmation, self-reported extra fields, and malformed hashes", () => {
    expect(parsePromotionDecisionCommand({ ...command, confirmation: "" }).ok).toBe(false);
    expect(parsePromotionDecisionCommand({ ...command, actorId: "owner@example.test", approvedBy: "owner@example.test" }).ok).toBe(false);
    expect(parsePromotionDecisionCommand({ ...command, reportFingerprint: "bad" }).ok).toBe(false);
  });
  it("binds approval identity to the exact request and report, so changed code or report has a new version", () => {
    const first = promotionVersionFingerprint(request, sha, sha);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
    expect(promotionVersionFingerprint({ ...request, codeSha256: "e".repeat(64) }, sha, sha)).not.toBe(first);
    expect(promotionVersionFingerprint(request, sha, "f".repeat(64))).not.toBe(first);
  });
  it("allows approval only when every required validation check passed", () => {
    const checks = Array.from({ length: 5 }, () => ({ status: "PASS" }));
    expect(reportIsApprovable({ disposition: "ELIGIBLE_FOR_REVIEW", checks })).toBe(true);
    expect(reportIsApprovable({ disposition: "ELIGIBLE_FOR_REVIEW", checks: [...checks.slice(0, 4), { status: "NOT_RUN" }] })).toBe(false);
    expect(reportIsApprovable({ disposition: "INCOMPLETE", checks })).toBe(false);
  });
});
