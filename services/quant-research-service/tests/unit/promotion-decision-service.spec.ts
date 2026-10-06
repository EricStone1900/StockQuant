import { describe, expect, it, vi } from "vitest";
import { PromotionDecisionService } from "../../src/application/promotion-decision-service.js";

const id = "11111111-1111-4111-8111-111111111111";
const hash = "a".repeat(64);
const request = { schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: id, testRunId: "22222222-2222-4222-8222-222222222222", experimentId: "33333333-3333-4333-8333-333333333333", candidateSource: "FIXTURE", candidateArtifact: { artifactId: "candidate.json", namespace: "research/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/outputs", sha256: hash }, codeSha256: hash, dataManifestSha256: hash, metricsManifestSha256: hash, validationPlanSha256: hash, budget: { allocationId: "budget-1", currency: "USD", reservedMinor: 100, consumedMinor: 10 }, idempotencyKey: "promotion-key-1" } as const;
const command = { schemaVersion: "v3.2-promotion-decision-command-v1", decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint: hash, actorId: "reviewer-1" };

describe("PromotionDecisionService", () => {
  it("rejects malformed command and identity before opening a transaction", async () => {
    const repository = { withTransaction: vi.fn() };
    const service = new PromotionDecisionService(repository);
    await expect(service.decide("bad", command)).resolves.toMatchObject({ status: 422 });
    await expect(service.decide(id, { ...command, unexpected: true })).resolves.toMatchObject({ status: 422 });
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });

  it("binds approval to a locked request/report and records a disabled Registry version", async () => {
    const tx = {
      findRequestForUpdate: vi.fn().mockResolvedValue({ request, requestFingerprint: "b".repeat(64) }),
      findReportForUpdate: vi.fn().mockResolvedValue({ report: { promotionRequestId: id, testRunId: request.testRunId, sourceMode: "FIXTURE", disposition: "ELIGIBLE_FOR_REVIEW", checks: Array.from({ length: 5 }, () => ({ status: "PASS" })) }, reportFingerprint: hash }),
      createDecision: vi.fn(async (_id, row) => row), findDecision: vi.fn(), registerApprovedVersion: vi.fn(),
    };
    const repository = { withTransaction: vi.fn(async (operation) => operation(tx)) };
    const result = await new PromotionDecisionService(repository).decide(id, command);
    expect(result).toMatchObject({ status: 201, body: { decision: "APPROVE", registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" } });
    expect(tx.registerApprovedVersion).toHaveBeenCalledOnce();
  });

  it("rejects stale report fingerprints without creating a decision", async () => {
    const tx = { findRequestForUpdate: vi.fn().mockResolvedValue({ request, requestFingerprint: "b".repeat(64) }), findReportForUpdate: vi.fn().mockResolvedValue({ report: {}, reportFingerprint: "c".repeat(64) }), createDecision: vi.fn(), findDecision: vi.fn(), registerApprovedVersion: vi.fn() };
    const repository = { withTransaction: vi.fn(async (operation) => operation(tx)) };
    await expect(new PromotionDecisionService(repository).decide(id, command)).resolves.toMatchObject({ status: 409 });
    expect(tx.createDecision).not.toHaveBeenCalled();
  });
});
