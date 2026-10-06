import { describe, expect, it, vi } from "vitest";
import { PromotionReadService } from "../../src/application/promotion-read-service.js";

const id = "11111111-1111-4111-8111-111111111111";
describe("PromotionReadService", () => {
  it("rejects invalid identifiers before querying adapters", async () => {
    const repository = { findRegistryVersion: vi.fn(), findPromotionDetail: vi.fn() };
    const service = new PromotionReadService(repository);
    await expect(service.registryVersion("bad")).resolves.toMatchObject({ status: 422 });
    await expect(service.detail("bad")).resolves.toMatchObject({ status: 422 });
    expect(repository.findRegistryVersion).not.toHaveBeenCalled();
    expect(repository.findPromotionDetail).not.toHaveBeenCalled();
  });

  it("projects immutable Registry and lifecycle detail records", async () => {
    const repository = {
      findRegistryVersion: vi.fn().mockResolvedValue({ promotionRequestId: id, versionFingerprint: "a".repeat(64), candidateArtifactId: "candidate", candidateNamespace: "research/run/exp/outputs", candidateSha256: "b".repeat(64), codeSha256: "c".repeat(64), dataManifestSha256: "d".repeat(64), metricsManifestSha256: "e".repeat(64), validationPlanSha256: "f".repeat(64), approvedBy: "reviewer", status: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" }),
      findPromotionDetail: vi.fn().mockResolvedValue({ promotionRequestId: id, request: { testRunId: id }, status: "AWAITING_REVIEW", createdAt: new Date("2026-01-01T00:00:00Z"), decision: null, reportFingerprint: null, versionFingerprint: null, actorId: null, registryStatus: null, activation: null }),
    };
    const service = new PromotionReadService(repository);
    await expect(service.registryVersion("A".repeat(64))).resolves.toMatchObject({ status: 200, body: { status: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" } });
    await expect(service.detail(id)).resolves.toMatchObject({ status: 200, body: { status: "AWAITING_REVIEW", decision: null } });
  });
});
