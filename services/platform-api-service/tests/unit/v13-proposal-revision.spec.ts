import { describe, expect, it, vi } from "vitest";
import { reviseV13Proposal, V13ProposalRevisionError, type V13ProposalRevisionPorts } from "../../src/application/v13-proposal-revision.js";

const command = { ownerId: "owner-a", testRunId: "run-a", proposalId: "proposal-a", expectedVersion: 1, expectedContentHash: "a".repeat(64), operation: "REBALANCE" as const, expiresAt: "2026-09-28T12:00:00Z", legs: [{ securityId: "600000.SH" }], reason: "revise proposal" };
function ports(overrides: Partial<V13ProposalRevisionPorts> = {}): V13ProposalRevisionPorts {
  return {
    findRun: vi.fn(async () => ({ stageId: "V1.3", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } })),
    readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: command.ownerId, testRunId: command.testRunId } })),
    reviseProposal: vi.fn(async () => ({ status: 200, body: { proposalVersion: 2 } })), ...overrides,
  };
}

describe("V1.3 proposal revision application service", () => {
  it("checks owner scope and forwards exact revision fields plus TestRun clock", async () => {
    const p = ports();
    await expect(reviseV13Proposal(command, p)).resolves.toEqual({ proposalVersion: 2 });
    expect(p.reviseProposal).toHaveBeenCalledWith("proposal-a", "owner-a", { expectedVersion: 1, expectedContentHash: "a".repeat(64), operation: "REBALANCE", expiresAt: command.expiresAt, legs: command.legs, reason: command.reason, now: "2026-09-28T09:31:00+08:00" });
  });
  it("rejects cross-owner/run proposals before appending a revision", async () => {
    const p = ports({ readProposal: vi.fn(async () => ({ status: 200, body: { ownerId: "other", testRunId: command.testRunId } })) });
    await expect(reviseV13Proposal(command, p)).rejects.toMatchObject<V13ProposalRevisionError>({ status: 404 });
    expect(p.reviseProposal).not.toHaveBeenCalled();
  });
  it("validates expected version, hash, expiry, operation and reason before ports", async () => {
    const p = ports();
    await expect(reviseV13Proposal({ ...command, expectedContentHash: "bad" }, p)).rejects.toMatchObject({ status: 422 });
    await expect(reviseV13Proposal({ ...command, operation: "MARKET_ORDER" as "REBALANCE" }, p)).rejects.toMatchObject({ status: 422 });
    expect(p.findRun).not.toHaveBeenCalled();
  });
  it("maps stale version and invalid transition responses", async () => {
    const conflict = ports({ reviseProposal: vi.fn(async () => ({ status: 409, body: { reason: "stale" } })) });
    await expect(reviseV13Proposal(command, conflict)).rejects.toMatchObject({ status: 409, body: { reason: "stale" } });
    const invalid = ports({ reviseProposal: vi.fn(async () => ({ status: 422 })) });
    await expect(reviseV13Proposal(command, invalid)).rejects.toMatchObject({ status: 422 });
  });
  it("requires the persisted Run clock", async () => {
    const p = ports({ findRun: vi.fn(async () => ({ stageId: "V1.3", evidence: {} })) });
    await expect(reviseV13Proposal(command, p)).rejects.toMatchObject({ status: 404 });
    expect(p.readProposal).not.toHaveBeenCalled();
  });
});
