import type { Pool, PoolClient } from "pg";
import type { V32IndependentValidationReport, V32PromotionRequest } from "../contracts/generated-types.js";
import type { LockedPromotionRequest, LockedValidationReport, PromotionDecisionRecord, PromotionDecisionRepository, PromotionDecisionTransaction } from "../ports/promotion-decision-repository.js";

type DecisionRow = { decision: "APPROVE" | "REJECT"; report_fingerprint: string; version_fingerprint: string; actor_id: string; created_at: Date };
const decisionRecord = (row: DecisionRow): PromotionDecisionRecord => ({ decision: row.decision, reportFingerprint: row.report_fingerprint.trim(), versionFingerprint: row.version_fingerprint.trim(), actorId: row.actor_id, createdAt: row.created_at });

class PostgresPromotionDecisionTransaction implements PromotionDecisionTransaction {
  constructor(private readonly client: PoolClient) {}
  async findRequestForUpdate(id: string): Promise<LockedPromotionRequest | null> {
    const result = await this.client.query<{ request_payload: V32PromotionRequest; request_fingerprint: string }>("SELECT request_payload, request_fingerprint FROM promotion_requests WHERE promotion_request_id=$1 FOR UPDATE", [id]);
    const row = result.rows[0]; return row ? { request: row.request_payload, requestFingerprint: row.request_fingerprint.trim() } : null;
  }
  async findReportForUpdate(id: string): Promise<LockedValidationReport | null> {
    const result = await this.client.query<{ report_payload: V32IndependentValidationReport; report_fingerprint: string }>("SELECT report_payload, report_fingerprint FROM promotion_validation_reports WHERE promotion_request_id=$1 FOR UPDATE", [id]);
    const row = result.rows[0]; return row ? { report: row.report_payload, reportFingerprint: row.report_fingerprint.trim() } : null;
  }
  async createDecision(id: string, row: PromotionDecisionRecord): Promise<PromotionDecisionRecord | null> {
    const result = await this.client.query<DecisionRow>(`INSERT INTO promotion_decisions (promotion_request_id, decision, report_fingerprint, version_fingerprint, actor_id)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT (promotion_request_id) DO NOTHING RETURNING decision, report_fingerprint, version_fingerprint, actor_id, created_at`,
    [id, row.decision, row.reportFingerprint, row.versionFingerprint, row.actorId]);
    return result.rows[0] ? decisionRecord(result.rows[0]) : null;
  }
  async findDecision(id: string): Promise<PromotionDecisionRecord | null> {
    const result = await this.client.query<DecisionRow>("SELECT decision, report_fingerprint, version_fingerprint, actor_id, created_at FROM promotion_decisions WHERE promotion_request_id=$1", [id]);
    return result.rows[0] ? decisionRecord(result.rows[0]) : null;
  }
  async registerApprovedVersion(id: string, request: V32PromotionRequest, versionFingerprint: string, actorId: string): Promise<void> {
    await this.client.query(`INSERT INTO promotion_registry_versions (promotion_request_id, version_fingerprint, candidate_source, candidate_artifact_id, candidate_namespace, candidate_sha256, code_sha256, data_manifest_sha256, metrics_manifest_sha256, validation_plan_sha256, approved_by, status, activation)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'CANDIDATE_APPROVED','DISABLED_UNTIL_MANDATE')`,
    [id, versionFingerprint, request.candidateSource, request.candidateArtifact.artifactId, request.candidateArtifact.namespace, request.candidateArtifact.sha256, request.codeSha256, request.dataManifestSha256, request.metricsManifestSha256, request.validationPlanSha256, actorId]);
  }
}

export class PostgresPromotionDecisionRepository implements PromotionDecisionRepository {
  constructor(private readonly pool: Pool) {}
  async withTransaction<T>(operation: (transaction: PromotionDecisionTransaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await operation(new PostgresPromotionDecisionTransaction(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
