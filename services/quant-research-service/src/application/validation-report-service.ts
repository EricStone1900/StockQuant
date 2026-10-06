import { parseValidationSubmission, validationSubmissionFingerprint } from "../domain/validation-submission.js";
import type { ValidationReportRepository } from "../ports/validation-report-repository.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type ValidationReportResponse = { status: number; body: unknown };

export class ValidationReportService {
  constructor(private readonly repository: ValidationReportRepository) {}

  async getInput(requestId: string): Promise<ValidationReportResponse> {
    if (!UUID.test(requestId)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const request = await this.repository.findRequest(requestId);
    if (!request) return { status: 404, body: { status: "NOT_FOUND", reason: "PromotionRequest not found" } };
    return { status: 200, body: { schemaVersion: "v3.2-independent-validation-input-v1", promotionRequestId: request.promotionRequestId, requestFingerprint: request.requestFingerprint, request: request.request } };
  }

  async submit(requestId: string, input: unknown): Promise<ValidationReportResponse> {
    if (!UUID.test(requestId)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const parsed = parseValidationSubmission(input);
    if (!parsed.ok) return { status: 422, body: { status: "REJECTED", reason: parsed.reason } };
    if (parsed.submission.report.promotionRequestId !== requestId) return { status: 422, body: { status: "REJECTED", reason: "route PromotionRequest ID differs from report identity" } };
    const saved = await this.repository.saveImmutable(requestId, validationSubmissionFingerprint(parsed.submission), parsed.submission);
    if (saved.kind === "REQUEST_NOT_FOUND") return { status: 404, body: { status: "NOT_FOUND", reason: "PromotionRequest not found" } };
    if (saved.kind === "REQUEST_MISMATCH") return { status: 422, body: { status: "REJECTED", reason: "report identity or source mode does not match the immutable PromotionRequest" } };
    if (saved.kind === "CONTENT_CONFLICT") return { status: 409, body: { status: "CONFLICT", reason: "an immutable validation report already exists with different content" } };
    return { status: saved.kind === "REPLAY" ? 200 : 201, body: { schemaVersion: "v3.2-independent-validation-result-v1", promotionRequestId: requestId, reportFingerprint: saved.record.reportFingerprint, report: saved.record.report, evidence: saved.record.evidence, createdAt: saved.record.createdAt.toISOString(), idempotent: saved.kind === "REPLAY" } };
  }

  async getReport(requestId: string): Promise<ValidationReportResponse> {
    if (!UUID.test(requestId)) return { status: 422, body: { status: "REJECTED", reason: "promotionRequestId must be a UUID" } };
    const report = await this.repository.findReport(requestId);
    if (!report) return { status: 404, body: { status: "NOT_FOUND", reason: "validation report not found" } };
    return { status: 200, body: { schemaVersion: "v3.2-independent-validation-result-v1", promotionRequestId: requestId, reportFingerprint: report.reportFingerprint, report: report.report, evidence: report.evidence, createdAt: report.createdAt.toISOString(), idempotent: false } };
  }
}
