import type { V32PromotionRequestResult } from "../contracts/generated-types.js";
import { parsePromotionRequest, promotionRequestFingerprint } from "../domain/promotion-request.js";
import type { PromotionRequestRepository, PromotionRequestRecord } from "../ports/promotion-request-repository.js";

export type PromotionRequestResponse = { status: number; body: unknown };
const resultBody = (record: PromotionRequestRecord, idempotent: boolean): V32PromotionRequestResult => ({ schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: record.promotionRequestId, testRunId: record.request.testRunId, status: record.status, createdAt: record.createdAt.toISOString(), idempotent });

export class PromotionRequestService {
  constructor(private readonly repository: PromotionRequestRepository) {}

  async submit(input: unknown): Promise<PromotionRequestResponse> {
    const parsed = parsePromotionRequest(input);
    if (!parsed.ok) return { status: 422, body: { status: "REJECTED", reason: parsed.reason } };
    const request = parsed.request;
    const fingerprint = promotionRequestFingerprint(request);
    try {
      const created = await this.repository.create(request, fingerprint);
      if (created) return { status: 201, body: resultBody(created, false) };
      const existing = await this.repository.findByIdempotencyKey(request.idempotencyKey);
      if (!existing) return { status: 409, body: { status: "CONFLICT", reason: "promotion request identifier is already assigned to another idempotency key" } };
      if (existing.requestFingerprint !== fingerprint) return { status: 409, body: { status: "CONFLICT", reason: "idempotency key is already bound to a different immutable PromotionRequest" } };
      return { status: 200, body: resultBody(existing, true) };
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return { status: 409, body: { status: "CONFLICT", reason: "promotion request identifier is already assigned to another idempotency key" } };
      return { status: 422, body: { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid PromotionRequest" } };
    }
  }

  async get(id: string): Promise<PromotionRequestResponse> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const record = await this.repository.findById(id);
    if (!record) return { status: 404, body: { status: "NOT_FOUND" } };
    return { status: 200, body: resultBody(record, false) };
  }
}
