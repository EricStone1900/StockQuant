import { describe, expect, it, vi } from "vitest";
import { decideV13Proposal, V13ProposalDecisionError, type V13ProposalDecisionPorts } from "../../src/application/v13-proposal-decision.js";

const cmd = { ownerId: "owner-a", testRunId: "run-a", proposalId: "proposal-a", action: "approve" as const, expectedVersion: 1, expectedContentHash: "a".repeat(64), reason: "approve fixed proposal" };
function ports(overrides: Partial<V13ProposalDecisionPorts> = {}): V13ProposalDecisionPorts {
  return {
    findRun: vi.fn(async () => ({ stageId: "V1.3", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } })),
    readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: cmd.ownerId, testRunId: cmd.testRunId } })),
    decideProposal: vi.fn(async () => ({ status: 200, body: { status: "APPROVED_MANUAL" } })),
    ...overrides,
  };
}

describe("V1.3 proposal decision application service", () => {
  it("checks owner scope and forwards exact version, reason, action and TestRun clock", async () => {
    const p = ports();
    await expect(decideV13Proposal(cmd, p)).resolves.toEqual({ status: "APPROVED_MANUAL" });
    expect(p.decideProposal).toHaveBeenCalledWith("proposal-a", "approve", "owner-a", { expectedVersion: 1, expectedContentHash: "a".repeat(64), reason: "approve fixed proposal", now: "2026-09-28T09:31:00+08:00" });
  });
  it("hides cross-owner and cross-run proposals before the decision call", async () => {
    const p = ports({ readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: "other", testRunId: cmd.testRunId } })) });
    await expect(decideV13Proposal(cmd, p)).rejects.toMatchObject<V13ProposalDecisionError>({ status: 404 });
    expect(p.decideProposal).not.toHaveBeenCalled();
  });
  it("validates decision payload before any port call", async () => {
    const p = ports();
    await expect(decideV13Proposal({ ...cmd, expectedContentHash: "bad" }, p)).rejects.toMatchObject({ status: 422 });
    await expect(decideV13Proposal({ ...cmd, action: "delete" }, p)).rejects.toMatchObject({ status: 404 });
    expect(p.findRun).not.toHaveBeenCalled();
  });
  it("maps version conflict and invalid transition distinctly", async () => {
    const conflict = ports({ decideProposal: vi.fn(async () => ({ status: 409, body: { reason: "stale version" } })) });
    await expect(decideV13Proposal(cmd, conflict)).rejects.toMatchObject({ status: 409, body: { reason: "stale version" } });
    const invalid = ports({ decideProposal: vi.fn(async () => ({ status: 422 })) });
    await expect(decideV13Proposal(cmd, invalid)).rejects.toMatchObject({ status: 422 });
  });
  it("requires the persisted injected clock", async () => {
    const p = ports({ findRun: vi.fn(async () => ({ stageId: "V1.3", evidence: {} })) });
    await expect(decideV13Proposal(cmd, p)).rejects.toMatchObject({ status: 404 });
    expect(p.readProposal).not.toHaveBeenCalled();
  });
});
