import type { V32PromotionRequest } from "../contracts/generated-types.js";

export type PromotionRequestRecord = {
  promotionRequestId: string;
  requestFingerprint: string;
  request: V32PromotionRequest;
  status: "AWAITING_INDEPENDENT_VALIDATION";
  createdAt: Date;
};

export interface PromotionRequestRepository {
  create(request: V32PromotionRequest, fingerprint: string): Promise<PromotionRequestRecord | null>;
  findByIdempotencyKey(key: string): Promise<PromotionRequestRecord | null>;
  findById(id: string): Promise<PromotionRequestRecord | null>;
}
