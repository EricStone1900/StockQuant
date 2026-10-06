import type { Pool } from "pg";
import type { V32IndependentValidationReport, V32IndependentValidationSubmission, V32PromotionRequest } from "../contracts/generated-types.js";
import type { PromotionRequestRecord } from "../ports/promotion-request-repository.js";
import type { SaveValidationReportResult, ValidationReportRecord, ValidationReportRepository } from "../ports/validation-report-repository.js";

type RequestRow = { promotion_request_id: string; request_fingerprint: string; request_payload: V32PromotionRequest; status: "AWAITING_INDEPENDENT_VALIDATION"; created_at: Date };
type ReportRow = { report_fingerprint: string; report_payload: V32IndependentValidationReport; evidence_payload: V32IndependentValidationSubmission["evidence"]; created_at: Date };
const reportRecord = (row: ReportRow): ValidationReportRecord => ({ reportFingerprint: row.report_fingerprint.trim(), report: row.report_payload, evidence: row.evidence_payload, createdAt: row.created_at });
const requestRecord = (row: RequestRow): PromotionRequestRecord => ({ promotionRequestId: row.promotion_request_id, requestFingerprint: row.request_fingerprint.trim(), request: row.request_payload, status: row.status, createdAt: row.created_at });

export class PostgresValidationReportRepository implements ValidationReportRepository {
  constructor(private readonly pool: Pool) {}

  async findRequest(id: string): Promise<PromotionRequestRecord | null> {
    const result = await this.pool.query<RequestRow>("SELECT promotion_request_id, request_fingerprint, request_payload, status, created_at FROM promotion_requests WHERE promotion_request_id=$1", [id]);
    return result.rows[0] ? requestRecord(result.rows[0]) : null;
  }

  async findReport(requestId: string): Promise<ValidationReportRecord | null> {
    const result = await this.pool.query<ReportRow>("SELECT report_fingerprint, report_payload, evidence_payload, created_at FROM promotion_validation_reports WHERE promotion_request_id=$1", [requestId]);
    return result.rows[0] ? reportRecord(result.rows[0]) : null;
  }

  async saveImmutable(requestId: string, fingerprint: string, submission: V32IndependentValidationSubmission): Promise<SaveValidationReportResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const parent = await client.query<{ request_payload: V32PromotionRequest }>("SELECT request_payload FROM promotion_requests WHERE promotion_request_id=$1 FOR UPDATE", [requestId]);
      if (parent.rowCount !== 1) { await client.query("ROLLBACK"); return { kind: "REQUEST_NOT_FOUND" }; }
      const request = parent.rows[0].request_payload;
      if (submission.report.promotionRequestId !== request.promotionRequestId || submission.report.testRunId !== request.testRunId || submission.report.sourceMode !== (request.candidateSource === "FIXTURE" ? "FIXTURE" : "REAL_CANDIDATE")) {
        await client.query("ROLLBACK"); return { kind: "REQUEST_MISMATCH" };
      }
      const created = await client.query<ReportRow>(`INSERT INTO promotion_validation_reports (promotion_request_id, report_fingerprint, report_payload, evidence_payload)
        VALUES ($1,$2,$3::jsonb,$4::jsonb) ON CONFLICT (promotion_request_id) DO NOTHING RETURNING report_fingerprint, report_payload, evidence_payload, created_at`,
      [requestId, fingerprint, JSON.stringify(submission.report), JSON.stringify(submission.evidence)]);
      if (created.rows[0]) {
        await client.query("COMMIT");
        return { kind: "SAVED", record: reportRecord(created.rows[0]) };
      }
      const existing = await client.query<ReportRow>("SELECT report_fingerprint, report_payload, evidence_payload, created_at FROM promotion_validation_reports WHERE promotion_request_id=$1", [requestId]);
      if (existing.rowCount !== 1) throw new Error("validation report raced with a concurrent state change");
      const row = reportRecord(existing.rows[0]);
      if (row.reportFingerprint !== fingerprint) { await client.query("ROLLBACK"); return { kind: "CONTENT_CONFLICT" }; }
      await client.query("COMMIT");
      return { kind: "REPLAY", record: row };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally { client.release(); }
  }
}
