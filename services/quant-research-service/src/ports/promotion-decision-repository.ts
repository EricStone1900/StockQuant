import type { V32IndependentValidationReport, V32PromotionRequest } from "../contracts/generated-types.js";

export type LockedPromotionRequest = { request: V32PromotionRequest; requestFingerprint: string };
export type LockedValidationReport = { report: V32IndependentValidationReport; reportFingerprint: string };
export type PromotionDecisionRecord = { decision: "APPROVE" | "REJECT"; reportFingerprint: string; versionFingerprint: string; actorId: string; createdAt: Date };
export interface PromotionDecisionTransaction {
  findRequestForUpdate(id: string): Promise<LockedPromotionRequest | null>;
  findReportForUpdate(id: string): Promise<LockedValidationReport | null>;
  createDecision(id: string, record: PromotionDecisionRecord): Promise<PromotionDecisionRecord | null>;
  findDecision(id: string): Promise<PromotionDecisionRecord | null>;
  registerApprovedVersion(id: string, request: V32PromotionRequest, versionFingerprint: string, actorId: string): Promise<void>;
}
export interface PromotionDecisionRepository {
  withTransaction<T>(operation: (transaction: PromotionDecisionTransaction) => Promise<T>): Promise<T>;
}
