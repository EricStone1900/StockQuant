import type { Pool } from "pg";
import type { PromotionDetailRecord, PromotionReadRepository, RegistryVersionRecord } from "../ports/promotion-read-repository.js";
import type { V32PromotionRequest } from "../contracts/generated-types.js";

type RegistryRow = { promotion_request_id: string; version_fingerprint: string; candidate_artifact_id: string; candidate_namespace: string; candidate_sha256: string; code_sha256: string; data_manifest_sha256: string; metrics_manifest_sha256: string; validation_plan_sha256: string; approved_by: string; status: "CANDIDATE_APPROVED"; activation: "DISABLED_UNTIL_MANDATE" };
type DetailRow = { promotion_request_id: string; request_payload: V32PromotionRequest; status: string; created_at: Date; decision: string | null; report_fingerprint: string | null; version_fingerprint: string | null; actor_id: string | null; registry_status: string | null; activation: string | null };
const registry = (r: RegistryRow): RegistryVersionRecord => ({ promotionRequestId: r.promotion_request_id, versionFingerprint: r.version_fingerprint.trim(), candidateArtifactId: r.candidate_artifact_id, candidateNamespace: r.candidate_namespace, candidateSha256: r.candidate_sha256.trim(), codeSha256: r.code_sha256.trim(), dataManifestSha256: r.data_manifest_sha256.trim(), metricsManifestSha256: r.metrics_manifest_sha256.trim(), validationPlanSha256: r.validation_plan_sha256.trim(), approvedBy: r.approved_by, status: r.status, activation: r.activation });

export class PostgresPromotionReadRepository implements PromotionReadRepository {
  constructor(private readonly pool: Pool) {}
  async findRegistryVersion(fingerprint: string): Promise<RegistryVersionRecord | null> {
    const result = await this.pool.query<RegistryRow>(`SELECT promotion_request_id, version_fingerprint, candidate_artifact_id, candidate_namespace, candidate_sha256, code_sha256, data_manifest_sha256, metrics_manifest_sha256, validation_plan_sha256, approved_by, status, activation FROM promotion_registry_versions WHERE version_fingerprint=$1`, [fingerprint]);
    return result.rows[0] ? registry(result.rows[0]) : null;
  }
  async findPromotionDetail(id: string): Promise<PromotionDetailRecord | null> {
    const result = await this.pool.query<DetailRow>(`SELECT p.promotion_request_id, p.request_payload,
      CASE WHEN d.decision='APPROVE' THEN 'CANDIDATE_APPROVED'
           WHEN d.decision='REJECT' OR v.report_payload->>'disposition'='REJECTED' THEN 'REJECTED'
           WHEN v.report_payload->>'disposition'='INCOMPLETE' THEN 'VALIDATION_INCOMPLETE'
           WHEN v.promotion_request_id IS NOT NULL THEN 'AWAITING_REVIEW'
           ELSE 'AWAITING_INDEPENDENT_VALIDATION' END AS status,
      p.created_at, d.decision, d.report_fingerprint, d.version_fingerprint, d.actor_id, r.status AS registry_status, r.activation
      FROM promotion_requests p
      LEFT JOIN promotion_validation_reports v ON v.promotion_request_id=p.promotion_request_id
      LEFT JOIN promotion_decisions d ON d.promotion_request_id=p.promotion_request_id
      LEFT JOIN promotion_registry_versions r ON r.promotion_request_id=p.promotion_request_id
      WHERE p.promotion_request_id=$1`, [id]);
    const r = result.rows[0];
    return r ? { promotionRequestId: r.promotion_request_id, request: r.request_payload, status: r.status, createdAt: r.created_at, decision: r.decision, reportFingerprint: r.report_fingerprint?.trim() ?? null, versionFingerprint: r.version_fingerprint?.trim() ?? null, actorId: r.actor_id, registryStatus: r.registry_status, activation: r.activation } : null;
  }
}
