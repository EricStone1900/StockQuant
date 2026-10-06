export type ManualProposal = {
  proposalId: string;
  proposalVersion: number;
  contentHash: string;
  status: string;
  operation: "HOLD" | "REBALANCE";
  environmentMode: string;
  brokerMode: string;
  expiresAt: string;
  legs: Array<{ legId: string; securityId: string; side: "BUY" | "SELL"; quantity: number }>;
};

export type ManualProposalDecision = {
  action: "APPROVE" | "REJECT";
  expectedVersion: number;
  expectedContentHash: string;
  actorId: string;
  reason: string;
};

export type ManualProposalDecisionResult =
  | { status: "APPROVED_MANUAL" | "REJECTED_MANUAL"; proposalId: string; proposalVersion: number; contentHash: string; decidedBy: string; reason: string }
  | { status: "REJECTED"; reasonCode: "INVALID_PROPOSAL" | "INVALID_DECISION" | "NOT_PENDING" | "VERSION_CONFLICT" | "CONTENT_CONFLICT" | "EXPIRED" | "MODE_NOT_ALLOWED" | "INVALID_HOLD" };

const SHA256 = /^[a-f0-9]{64}$/u;
const timestamp = (value: string) => /(?:Z|[+-]\d{2}:\d{2})$/u.test(value) ? Date.parse(value) : Number.NaN;

/** Pure, run-clock-scoped decision gate. Persistence and risk re-evaluation remain application responsibilities. */
export function decideManualProposal(
  proposal: ManualProposal,
  decision: ManualProposalDecision,
  now: string,
): ManualProposalDecisionResult {
  if (!proposal || typeof proposal !== "object" || !proposal.proposalId ||
      !Number.isSafeInteger(proposal.proposalVersion) || proposal.proposalVersion < 1 ||
      !SHA256.test(proposal.contentHash) || !Array.isArray(proposal.legs) ||
      !Number.isFinite(timestamp(proposal.expiresAt)) || !Number.isFinite(timestamp(now))) {
    return { status: "REJECTED", reasonCode: "INVALID_PROPOSAL" };
  }
  if (!decision || (decision.action !== "APPROVE" && decision.action !== "REJECT") ||
      !Number.isSafeInteger(decision.expectedVersion) || !SHA256.test(decision.expectedContentHash) ||
      typeof decision.actorId !== "string" || !decision.actorId.trim() ||
      typeof decision.reason !== "string" || !decision.reason.trim() || decision.reason.trim().length > 250) {
    return { status: "REJECTED", reasonCode: "INVALID_DECISION" };
  }
  if (proposal.status !== "MANUAL_APPROVAL_PENDING") return { status: "REJECTED", reasonCode: "NOT_PENDING" };
  if (decision.expectedVersion !== proposal.proposalVersion) return { status: "REJECTED", reasonCode: "VERSION_CONFLICT" };
  if (decision.expectedContentHash !== proposal.contentHash) return { status: "REJECTED", reasonCode: "CONTENT_CONFLICT" };
  if (timestamp(now) >= timestamp(proposal.expiresAt)) return { status: "REJECTED", reasonCode: "EXPIRED" };
  if (proposal.environmentMode !== "PAPER" || proposal.brokerMode !== "FAKE") return { status: "REJECTED", reasonCode: "MODE_NOT_ALLOWED" };
  if (proposal.operation === "HOLD" && proposal.legs.length !== 0) return { status: "REJECTED", reasonCode: "INVALID_HOLD" };
  if (proposal.operation === "REBALANCE" && (proposal.legs.length === 0 || proposal.legs.some((leg) =>
    !leg.legId || !leg.securityId || !Number.isSafeInteger(leg.quantity) || leg.quantity <= 0))) {
    return { status: "REJECTED", reasonCode: "INVALID_PROPOSAL" };
  }
  return {
    status: decision.action === "APPROVE" ? "APPROVED_MANUAL" : "REJECTED_MANUAL",
    proposalId: proposal.proposalId,
    proposalVersion: proposal.proposalVersion,
    contentHash: proposal.contentHash,
    decidedBy: decision.actorId.trim(),
    reason: decision.reason.trim(),
  };
}
