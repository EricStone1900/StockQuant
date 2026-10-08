import type { V13ProposalCommand } from "../contracts/generated-types.js";

export type V13ProposalRevisionCommand = {
  ownerId: string; testRunId: string; proposalId: string; expectedVersion: number; expectedContentHash: string;
  operation: string; expiresAt: string; legs: V13ProposalCommand["legs"]; reason: string;
};
type Run = { stageId: string; evidence: Record<string, unknown> };
type Proposal = { ownerId: string; testRunId: string };
export type V13ProposalRevisionPorts = {
  findRun(testRunId: string, ownerId: string): Promise<Run | null>;
  readProposal(proposalId: string, ownerId: string): Promise<{ status: number; body?: Proposal }>;
  reviseProposal(proposalId: string, actorId: string, input: { expectedVersion: number; expectedContentHash: string; operation: "HOLD" | "REBALANCE"; expiresAt: string; legs: V13ProposalCommand["legs"]; reason: string; now: string }): Promise<{ status: number; body?: unknown }>;
};

export class V13ProposalRevisionError extends Error {
  constructor(readonly status: number, message: string, readonly body?: unknown) { super(message); this.name = "V13ProposalRevisionError"; }
}

/** Owner-scoped append-only Proposal revision using the persisted TestRun clock. */
export async function reviseV13Proposal(command: V13ProposalRevisionCommand, ports: V13ProposalRevisionPorts): Promise<unknown> {
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1 || !/^[a-f0-9]{64}$/u.test(command.expectedContentHash)
    || !command.reason.trim() || !Number.isFinite(Date.parse(command.expiresAt)) || !Array.isArray(command.legs)
    || (command.operation !== "HOLD" && command.operation !== "REBALANCE")) {
    throw new V13ProposalRevisionError(422, "expected version/hash, operation, expiry, legs and reason are required");
  }
  const run = await ports.findRun(command.testRunId, command.ownerId);
  if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new V13ProposalRevisionError(404, "V1.3 TestRun or its injected clock was not found");
  const response = await ports.readProposal(command.proposalId, command.ownerId);
  if (response.status !== 200 || !response.body || response.body.ownerId !== command.ownerId || response.body.testRunId !== command.testRunId) throw new V13ProposalRevisionError(404, "proposal was not found in this TestRun scope");
  const result = await ports.reviseProposal(command.proposalId, command.ownerId, {
    expectedVersion: command.expectedVersion, expectedContentHash: command.expectedContentHash, operation: command.operation,
    expiresAt: command.expiresAt, legs: command.legs, reason: command.reason.trim(), now: run.evidence.runClockNow,
  });
  if (result.status === 200 && result.body !== undefined) return result.body;
  if (result.status === 404) throw new V13ProposalRevisionError(404, "Proposal was not found", result.body);
  if (result.status === 409) throw new V13ProposalRevisionError(409, "Proposal version conflicts with persisted state", result.body);
  if (result.status === 422) throw new V13ProposalRevisionError(422, "Proposal revision is invalid", result.body);
  throw new V13ProposalRevisionError(503, `Decision Governance proposal revision failed (${result.status})`);
}
