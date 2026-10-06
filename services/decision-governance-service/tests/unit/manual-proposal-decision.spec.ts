import { describe, expect, it } from "vitest";
import { decideManualProposal, type ManualProposal, type ManualProposalDecision } from "../../src/domain/manual-proposal-decision.js";

const proposal: ManualProposal = {
  proposalId: "proposal-1", proposalVersion: 2, contentHash: "a".repeat(64),
  status: "MANUAL_APPROVAL_PENDING", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE",
  expiresAt: "2026-10-06T12:00:00.000Z",
  legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }],
};
const decision: ManualProposalDecision = {
  action: "APPROVE", expectedVersion: 2, expectedContentHash: proposal.contentHash,
  actorId: "owner-1", reason: "Reviewed fixed proposal",
};
const now = "2026-10-06T11:00:00.000Z";

describe("manual proposal decision domain gate", () => {
  it("accepts an exact, current PAPER/FAKE proposal decision without issuing execution authorization", () => {
    expect(decideManualProposal(proposal, decision, now)).toEqual({
      status: "APPROVED_MANUAL", proposalId: proposal.proposalId, proposalVersion: 2,
      contentHash: proposal.contentHash, decidedBy: "owner-1", reason: "Reviewed fixed proposal",
    });
  });

  it("records an explicit manual rejection", () => {
    expect(decideManualProposal(proposal, { ...decision, action: "REJECT", reason: "Risk concern" }, now))
      .toMatchObject({ status: "REJECTED_MANUAL", reason: "Risk concern" });
  });

  it.each([
    [{ ...proposal, status: "APPROVED_MANUAL" }, decision, "NOT_PENDING"],
    [proposal, { ...decision, expectedVersion: 1 }, "VERSION_CONFLICT"],
    [proposal, { ...decision, expectedContentHash: "b".repeat(64) }, "CONTENT_CONFLICT"],
    [proposal, decision, "EXPIRED", "2026-10-06T12:00:00.000Z"],
    [{ ...proposal, environmentMode: "LIVE" }, decision, "MODE_NOT_ALLOWED"],
  ] as const)("fails closed for stale or ineligible decisions", (candidate, command, reasonCode, clock = now) => {
    expect(decideManualProposal(candidate as ManualProposal, command as ManualProposalDecision, clock))
      .toEqual({ status: "REJECTED", reasonCode });
  });

  it("rejects HOLD proposals that contain legs and requires explicit actor and reason", () => {
    expect(decideManualProposal({ ...proposal, operation: "HOLD" }, decision, now))
      .toEqual({ status: "REJECTED", reasonCode: "INVALID_HOLD" });
    expect(decideManualProposal(proposal, { ...decision, actorId: " " }, now))
      .toEqual({ status: "REJECTED", reasonCode: "INVALID_DECISION" });
  });

  it("uses the supplied run clock and rejects malformed timestamps", () => {
    expect(decideManualProposal({ ...proposal, expiresAt: "not-a-time" }, decision, now))
      .toEqual({ status: "REJECTED", reasonCode: "INVALID_PROPOSAL" });
    expect(decideManualProposal(proposal, decision, "not-a-time"))
      .toEqual({ status: "REJECTED", reasonCode: "INVALID_PROPOSAL" });
  });
});
