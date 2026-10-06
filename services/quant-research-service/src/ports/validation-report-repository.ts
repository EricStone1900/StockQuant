import type { V32IndependentValidationReport, V32IndependentValidationSubmission } from "../contracts/generated-types.js";
import type { PromotionRequestRecord } from "./promotion-request-repository.js";

export type ValidationReportRecord = { reportFingerprint: string; report: V32IndependentValidationReport; evidence: V32IndependentValidationSubmission["evidence"]; createdAt: Date };
export type SaveValidationReportResult =
  | { kind: "SAVED"; record: ValidationReportRecord }
  | { kind: "REPLAY"; record: ValidationReportRecord }
  | { kind: "REQUEST_NOT_FOUND" }
  | { kind: "REQUEST_MISMATCH" }
  | { kind: "CONTENT_CONFLICT" };

export interface ValidationReportRepository {
  findRequest(id: string): Promise<PromotionRequestRecord | null>;
  saveImmutable(requestId: string, fingerprint: string, submission: V32IndependentValidationSubmission): Promise<SaveValidationReportResult>;
  findReport(requestId: string): Promise<ValidationReportRecord | null>;
}
