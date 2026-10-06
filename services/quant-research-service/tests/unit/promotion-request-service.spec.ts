import { describe, expect, it, vi } from "vitest";
import { PromotionRequestService } from "../../src/application/promotion-request-service.js";
import { promotionRequestFingerprint } from "../../src/domain/promotion-request.js";

const sha = "a".repeat(64);
const request = {
  schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: "11111111-1111-4111-8111-111111111111",
  testRunId: "22222222-2222-4222-8222-222222222222", experimentId: "33333333-3333-4333-8333-333333333333", candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate.json", namespace: "research/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333/outputs", sha256: sha },
  codeSha256: sha, dataManifestSha256: sha, metricsManifestSha256: sha, validationPlanSha256: sha,
  budget: { allocationId: "budget-1", currency: "USD", reservedMinor: 100, consumedMinor: 10 }, idempotencyKey: "promotion-key-1",
} as const;
const record = { promotionRequestId: request.promotionRequestId, requestFingerprint: promotionRequestFingerprint(request as never), request, status: "AWAITING_INDEPENDENT_VALIDATION" as const, createdAt: new Date("2026-01-01T00:00:00Z") };

describe("PromotionRequestService", () => {
  it("creates and replays the immutable request through its repository port", async () => {
    const repository = { create: vi.fn().mockResolvedValueOnce(record).mockResolvedValueOnce(null), findByIdempotencyKey: vi.fn().mockResolvedValue(record), findById: vi.fn() };
    const service = new PromotionRequestService(repository);
    await expect(service.submit(request)).resolves.toMatchObject({ status: 201, body: { promotionRequestId: request.promotionRequestId, idempotent: false } });
    await expect(service.submit(request)).resolves.toMatchObject({ status: 200, body: { promotionRequestId: request.promotionRequestId, idempotent: true } });
  });

  it("rejects an idempotency key rebound to different immutable content", async () => {
    const repository = { create: vi.fn().mockResolvedValue(null), findByIdempotencyKey: vi.fn().mockResolvedValue({ ...record, requestFingerprint: "b".repeat(64) }), findById: vi.fn() };
    await expect(new PromotionRequestService(repository).submit(request)).resolves.toMatchObject({ status: 409 });
  });

  it("validates IDs and returns the persisted request projection", async () => {
    const repository = { create: vi.fn(), findByIdempotencyKey: vi.fn(), findById: vi.fn().mockResolvedValue(record) };
    const service = new PromotionRequestService(repository);
    await expect(service.get("bad-id")).resolves.toMatchObject({ status: 422 });
    await expect(service.get(request.promotionRequestId)).resolves.toMatchObject({ status: 200, body: { testRunId: request.testRunId, idempotent: false } });
  });
});
