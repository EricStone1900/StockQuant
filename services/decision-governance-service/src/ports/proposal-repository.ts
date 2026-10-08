import type { ManualProposal, ManualProposalDecisionResult } from "../domain/manual-proposal-decision.js";

export type ProposalInput = Omit<ManualProposal, "proposalId" | "proposalVersion" | "contentHash" | "status"> & {
  ownerId: string;
  testRunId: string;
  idempotencyKey: string;
  accountId: string;
  strategyVersion: string;
  approvalMode?: "MANUAL_APPROVAL" | "AUTO_POLICY";
  market?: "CN_A" | "US_EQUITY";
  currency?: "CNY" | "USD";
};

export type ProposalRevisionCommand = { proposalId: string; ownerId: string; actorId: string; expectedVersion: number; expectedContentHash: string; operation: "HOLD" | "REBALANCE"; expiresAt: string; legs: ManualProposal["legs"]; reason: string; now: string };
export type GovernedProposal = ManualProposal & { ownerId: string; testRunId: string; accountId: string; strategyVersion: string; approvalMode: "MANUAL_APPROVAL" | "AUTO_POLICY"; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD" };

export interface ProposalRepository {
  create(input: ProposalInput): Promise<GovernedProposal & { replayed: boolean }>;
  decide(input: { proposalId: string; expectedVersion: number; expectedContentHash: string; action: "APPROVE" | "REJECT"; actorId: string; reason: string; now: string }): Promise<ManualProposalDecisionResult>;
  revise(input: ProposalRevisionCommand): Promise<{ status: "MANUAL_APPROVAL_PENDING"; proposalId: string; proposalVersion: number; contentHash: string; revisedBy: string; reason: string } | { status: "REJECTED"; reasonCode: "INVALID_PROPOSAL" | "INVALID_REVISION" | "NOT_PENDING" | "VERSION_CONFLICT" | "CONTENT_CONFLICT" | "EXPIRED" }>;
  find(proposalId: string, ownerId: string): Promise<GovernedProposal | null>;
  grantExecution(input: { authorizationId: string; proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; clientOrderId: string; commandHash: string; now: string }): Promise<{ authorizationId: string; expiresAt: string; replayed: boolean } | null>;
  validateExecution(input: { authorizationId: string; proposalId: string; proposalVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; clientOrderId: string; commandHash: string; now: string }): Promise<"VALID" | "REPLAYED" | "INVALID">;
}
