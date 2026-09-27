import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { V32PromotionRequest } from "../contracts/generated-types.js";
import type { V32PromotionSubmissionJournalPort } from "../application/v32-promotion-submission.js";

export type PromotionSubmissionJournalState = "SUBMITTING" | "SUBMITTED" | "UNKNOWN";
export type PromotionSubmissionBegin =
  | { action: "SUBMIT" }
  | { action: "EXISTING_SUBMISSION"; state: "SUBMITTED"; quantStatus: "AWAITING_INDEPENDENT_VALIDATION" }
  | { action: "RECONCILE"; state: "SUBMITTING" | "UNKNOWN" };

function fingerprint(request: V32PromotionRequest): string {
  // JSONB does not preserve object insertion order. Hash the schema-defined field
  // order so the same immutable request has the same fingerprint after reload.
  const stable = {
    schemaVersion: request.schemaVersion,
    promotionRequestId: request.promotionRequestId,
    testRunId: request.testRunId,
    experimentId: request.experimentId,
    candidateSource: request.candidateSource,
    candidateArtifact: { artifactId: request.candidateArtifact.artifactId, namespace: request.candidateArtifact.namespace, sha256: request.candidateArtifact.sha256 },
    codeSha256: request.codeSha256,
    dataManifestSha256: request.dataManifestSha256,
    metricsManifestSha256: request.metricsManifestSha256,
    validationPlanSha256: request.validationPlanSha256,
    budget: { allocationId: request.budget.allocationId, currency: request.budget.currency, reservedMinor: request.budget.reservedMinor, consumedMinor: request.budget.consumedMinor },
    idempotencyKey: request.idempotencyKey,
  };
  return createHash("sha256").update(JSON.stringify(stable), "utf8").digest("hex");
}

/** Durable outbound idempotency journal. Uncertain attempts are never automatically reposted. */
export class PgV32PromotionSubmissionJournal implements V32PromotionSubmissionJournalPort {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS v32_promotion_submission_attempts (
      idempotency_key TEXT PRIMARY KEY,
      promotion_request_id UUID NOT NULL UNIQUE,
      test_run_id UUID NOT NULL,
      experiment_id UUID NOT NULL,
      v31_gate_evidence_sha256 CHAR(64) NOT NULL CHECK (v31_gate_evidence_sha256 ~ '^[0-9a-f]{64}$'),
      request_fingerprint CHAR(64) NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
      request_payload JSONB NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('SUBMITTING','SUBMITTED','UNKNOWN')),
      quant_status TEXT CHECK (quant_status IS NULL OR quant_status = 'AWAITING_INDEPENDENT_VALIDATION'),
      response_payload JSONB,
      error_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }

  async begin(request: V32PromotionRequest, gateEvidenceSha256: string): Promise<PromotionSubmissionBegin> {
    if (!/^[a-f0-9]{64}$/.test(gateEvidenceSha256)) throw new Error("V3.1 acceptance evidence hash is invalid");
    const created = await this.pool.query(`INSERT INTO v32_promotion_submission_attempts
      (idempotency_key,promotion_request_id,test_run_id,experiment_id,v31_gate_evidence_sha256,request_fingerprint,request_payload,state)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'SUBMITTING') ON CONFLICT DO NOTHING RETURNING idempotency_key`,
    [request.idempotencyKey, request.promotionRequestId, request.testRunId, request.experimentId, gateEvidenceSha256, fingerprint(request), JSON.stringify(request)]);
    if (created.rowCount === 1) return { action: "SUBMIT" };

    const existing = await this.pool.query<{
      promotion_request_id: string; test_run_id: string; experiment_id: string; v31_gate_evidence_sha256: string; request_fingerprint: string;
      state: PromotionSubmissionJournalState; quant_status: "AWAITING_INDEPENDENT_VALIDATION" | null;
    }>(`SELECT promotion_request_id,test_run_id,experiment_id,v31_gate_evidence_sha256,request_fingerprint,state,quant_status
      FROM v32_promotion_submission_attempts WHERE idempotency_key=$1`, [request.idempotencyKey]);
    const row = existing.rows[0];
    if (!row) throw new Error("PromotionRequest ID is already bound to a different submission idempotency key");
    if (row.promotion_request_id !== request.promotionRequestId || row.test_run_id !== request.testRunId || row.experiment_id !== request.experimentId || row.v31_gate_evidence_sha256.trim() !== gateEvidenceSha256 || row.request_fingerprint.trim() !== fingerprint(request)) {
      throw new Error("submission idempotency key is already bound to a different immutable PromotionRequest");
    }
    if (row.state === "SUBMITTED" && row.quant_status === "AWAITING_INDEPENDENT_VALIDATION") return { action: "EXISTING_SUBMISSION", state: "SUBMITTED", quantStatus: row.quant_status };
    if (row.state === "SUBMITTED") throw new Error("submitted journal row has no valid Quant status");
    return { action: "RECONCILE", state: row.state };
  }

  async getSubmittedRequest(promotionRequestId: string): Promise<V32PromotionRequest | null> {
    const result = await this.pool.query<{ request_payload: V32PromotionRequest; request_fingerprint: string; state: PromotionSubmissionJournalState; quant_status: string | null }>(
      `SELECT request_payload,request_fingerprint,state,quant_status FROM v32_promotion_submission_attempts WHERE promotion_request_id=$1`, [promotionRequestId]);
    const row = result.rows[0];
    if (!row || row.state !== "SUBMITTED" || row.quant_status !== "AWAITING_INDEPENDENT_VALIDATION") return null;
    if (fingerprint(row.request_payload) !== row.request_fingerprint.trim() || row.request_payload.promotionRequestId !== promotionRequestId) throw new Error("persisted PromotionRequest failed immutable fingerprint verification");
    return row.request_payload;
  }

  async markSubmitted(request: V32PromotionRequest, response: { promotionRequestId: string; testRunId: string; quantStatus: "AWAITING_INDEPENDENT_VALIDATION"; idempotent: boolean }): Promise<void> {
    const result = await this.pool.query(`UPDATE v32_promotion_submission_attempts SET state='SUBMITTED',quant_status='AWAITING_INDEPENDENT_VALIDATION',response_payload=$2::jsonb,error_code=NULL,updated_at=now()
      WHERE idempotency_key=$1 AND promotion_request_id=$3 AND request_fingerprint=$4 AND state='SUBMITTING'`,
    [request.idempotencyKey, JSON.stringify(response), request.promotionRequestId, fingerprint(request)]);
    if (result.rowCount !== 1) throw new Error("submission journal state changed before successful Quant response could be persisted");
  }

  async markUnknown(request: V32PromotionRequest, reason: string): Promise<void> {
    const safeReason = reason.replace(/[^A-Za-z0-9_.-]/gu, "_").slice(0, 120) || "unknown";
    const result = await this.pool.query(`UPDATE v32_promotion_submission_attempts SET state='UNKNOWN',error_code=$2,updated_at=now()
      WHERE idempotency_key=$1 AND promotion_request_id=$3 AND request_fingerprint=$4 AND state='SUBMITTING'`,
    [request.idempotencyKey, safeReason, request.promotionRequestId, fingerprint(request)]);
    if (result.rowCount !== 1) throw new Error("submission journal state changed before UNKNOWN outcome could be persisted");
  }
}
