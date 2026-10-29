import type { AutoMandate, AutoMandateDecision, AutoMandateResult } from "../domain/auto-mandate.js";

export type AutoMandateCreate = Omit<AutoMandate, "contentHash" | "status">;
export interface AutoMandateRepository {
  create(input: AutoMandateCreate, actorId: string, reason: string, now: string): Promise<{ status: "PENDING" | "ACTIVE" | "PAUSED" | "REVOKED" | "CONFLICT"; mandateId?: string; mandateVersion?: number; contentHash?: string; replayed?: boolean }>;
  find(mandateId: string, ownerId: string, testRunId: string): Promise<{ mandateId: string; mandateVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; strategyVersion: string; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; securityScope: string[]; maxOrderAmount: string; maxTotalAmount: string; maxOrderCount: number; validFrom: string; expiresAt: string; status: "PENDING" | "ACTIVE" | "PAUSED" | "REVOKED" } | null>;
  readBudget(mandateId: string, mandateVersion: number, ownerId: string, testRunId: string): Promise<{ reservedAmount: string; consumedAmount: string; releasedAmount: string; reservationCount: number; consumedCount: number; releasedCount: number } | null>;
  readLocalOrderReservation?(input: { reservationId: string; mandateId: string; mandateVersion: number; ownerId: string; accountId: string; testRunId: string; clientOrderId: string; commandHash: string; proposalId: string; proposalVersion: number; proposalHash: string; amount: string }): Promise<{ reservationId: string; status: "RESERVED" | "CONSUMED"; amount: string } | null>;
  activate(input: { mandateId: string; mandateVersion: number; contentHash: string; ownerId: string; testRunId: string; actorId: string; reason: string; now: string }): Promise<{ status: "ACTIVE" | "REJECTED" | "CONFLICT"; mandateId?: string; mandateVersion?: number; contentHash?: string }>;
  pause(input: { mandateId: string; mandateVersion: number; ownerId: string; testRunId: string; actorId: string; reason: string; now: string }): Promise<boolean>;
  authorizeOrder(input: { mandateId: string; mandateVersion: number; ownerId: string; clientOrderId: string; commandHash: string; proposal: AutoMandateDecision; now: string }): Promise<{ decision: AutoMandateResult; reservationId?: string; replayed?: boolean }>;
  settleReservation(input: { reservationId: string; status: "CONSUMED" | "RELEASED"; now: string }): Promise<boolean>;
}
