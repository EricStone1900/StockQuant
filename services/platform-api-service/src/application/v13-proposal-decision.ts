export type V13ProposalDecisionCommand = { ownerId: string; testRunId: string; proposalId: string; action: string; expectedVersion: number; expectedContentHash: string; reason: string };
type Run = { stageId: string; evidence: Record<string, unknown> };
type Proposal = { ownerId: string; testRunId: string };
export type V13ProposalDecisionPorts = {
  findRun(testRunId: string, ownerId: string): Promise<Run | null>;
  readProposal(proposalId: string, ownerId: string): Promise<{ status: number; body?: Proposal }>;
  decideProposal(proposalId: string, action: "approve" | "reject", ownerId: string, input: { expectedVersion: number; expectedContentHash: string; reason: string; now: string }): Promise<{ status: number; body?: unknown }>;
};

export class V13ProposalDecisionError extends Error {
  constructor(readonly status: number, message: string, readonly body?: unknown) { super(message); this.name = "V13ProposalDecisionError"; }
}

/** Owner-scoped MANUAL_APPROVAL decision orchestration using the TestRun clock. */
export async function decideV13Proposal(command: V13ProposalDecisionCommand, ports: V13ProposalDecisionPorts): Promise<unknown> {
  if (command.action !== "approve" && command.action !== "reject") throw new V13ProposalDecisionError(404, "proposal decision route was not found");
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 1 || !/^[a-f0-9]{64}$/u.test(command.expectedContentHash) || !command.reason.trim()) throw new V13ProposalDecisionError(422, "expectedVersion, expectedContentHash and reason are required");
  const run = await ports.findRun(command.testRunId, command.ownerId);
  if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new V13ProposalDecisionError(404, "V1.3 TestRun or its injected clock was not found");
  const response = await ports.readProposal(command.proposalId, command.ownerId);
  if (response.status !== 200 || !response.body) throw new V13ProposalDecisionError(404, "proposal was not found in user scope");
  if (response.body.ownerId !== command.ownerId || response.body.testRunId !== command.testRunId) throw new V13ProposalDecisionError(404, "proposal was not found in this TestRun scope");
  const result = await ports.decideProposal(command.proposalId, command.action, command.ownerId, { expectedVersion: command.expectedVersion, expectedContentHash: command.expectedContentHash, reason: command.reason.trim(), now: run.evidence.runClockNow });
  if (result.status === 200 && result.body !== undefined) return result.body;
  if (result.status === 409) throw new V13ProposalDecisionError(409, "Proposal version or decision conflicts with persisted state", result.body);
  if (result.status === 422) throw new V13ProposalDecisionError(422, "Proposal decision is invalid", result.body);
  throw new V13ProposalDecisionError(503, `Decision Governance decision failed (${result.status})`);
}
