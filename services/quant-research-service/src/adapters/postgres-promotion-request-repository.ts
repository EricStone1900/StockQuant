import type { Pool } from "pg";
import type { V32PromotionRequest } from "../contracts/generated-types.js";
import type { PromotionRequestRecord, PromotionRequestRepository } from "../ports/promotion-request-repository.js";

type Row = { promotion_request_id: string; request_fingerprint: string; request_payload: V32PromotionRequest; status: "AWAITING_INDEPENDENT_VALIDATION"; created_at: Date };
const map = (row: Row): PromotionRequestRecord => ({ promotionRequestId: row.promotion_request_id, requestFingerprint: row.request_fingerprint.trim(), request: row.request_payload, status: row.status, createdAt: row.created_at });

export class PostgresPromotionRequestRepository implements PromotionRequestRepository {
  constructor(private readonly pool: Pool) {}
  async create(request: V32PromotionRequest, fingerprint: string): Promise<PromotionRequestRecord | null> {
    const result = await this.pool.query<Row>(`INSERT INTO promotion_requests (promotion_request_id, idempotency_key, request_fingerprint, request_payload, status)
      VALUES ($1,$2,$3,$4::jsonb,'AWAITING_INDEPENDENT_VALIDATION')
      ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
    [request.promotionRequestId, request.idempotencyKey, fingerprint, JSON.stringify(request)]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async findByIdempotencyKey(key: string): Promise<PromotionRequestRecord | null> {
    const result = await this.pool.query<Row>("SELECT * FROM promotion_requests WHERE idempotency_key=$1", [key]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async findById(id: string): Promise<PromotionRequestRecord | null> {
    const result = await this.pool.query<Row>("SELECT promotion_request_id, request_fingerprint, request_payload, status, created_at FROM promotion_requests WHERE promotion_request_id=$1", [id]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
}
