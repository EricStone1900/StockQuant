import { describe, expect, it } from "vitest";
import { parsePromotionRequest, promotionRequestFingerprint } from "../../src/promotion-request.js";

const valid = {
  schemaVersion: "v3.2-promotion-request-v1",
  promotionRequestId: "9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2",
  testRunId: "ff979c31-6f72-492d-8091-89cde9f05494",
  experimentId: "275a9fe1-651f-444a-a6c2-c7f008509127",
  candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate-sma-fixed-v1", namespace: "research/ff979c31-6f72-492d-8091-89cde9f05494/275a9fe1-651f-444a-a6c2-c7f008509127/outputs", sha256: "a".repeat(64) },
  codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64),
  budget: { allocationId: "fixture-budget", currency: "USD", reservedMinor: 500, consumedMinor: 120 }, idempotencyKey: "v32-eligible-fixture-v1"
};

describe("V3.2 PromotionRequest contract", () => {
  it("accepts the frozen request and fingerprints property order canonically", () => {
    const parsed = parsePromotionRequest(valid);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(promotionRequestFingerprint(parsed.request)).toBe(promotionRequestFingerprint(Object.fromEntries(Object.entries(valid).reverse()) as typeof parsed.request));
  });
  it.each([
    ["unknown property", { ...valid, approved: true }],
    ["artifact outside run", { ...valid, candidateArtifact: { ...valid.candidateArtifact, namespace: "research/other/run/outputs" } }],
    ["consumed budget above reservation", { ...valid, budget: { ...valid.budget, consumedMinor: 501 } }],
    ["invalid hash", { ...valid, codeSha256: "not-a-hash" }],
    ["invalid idempotency key", { ...valid, idempotencyKey: "short" }]
  ])("rejects %s", (_name, request) => expect(parsePromotionRequest(request).ok).toBe(false));
});
