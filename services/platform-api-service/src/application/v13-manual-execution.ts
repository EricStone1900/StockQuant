export type V13ManualExecutionCommand = { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string };
type Run = { stageId: string; namespace: string; evidence: Record<string, unknown> };
type Proposal = { ownerId: string; testRunId: string; accountId: string };
type Account = { testRunId: string; namespace: string; environmentMode: string; brokerMode: string };
export type V13ManualTradeRequest = V13ManualExecutionCommand & { accountId: string; namespace: string; now: string };
export type V13ManualExecutionPorts = {
  findRun(testRunId: string, ownerId: string): Promise<Run | null>;
  readProposal(proposalId: string, ownerId: string): Promise<{ status: number; body?: Proposal }>;
  readAccount(accountId: string, ownerId: string): Promise<Account | null>;
  executeTrade(command: V13ManualTradeRequest): Promise<{ status: number; body?: unknown }>;
};

export class V13ManualExecutionError extends Error {
  constructor(readonly status: number, message: string, readonly body?: unknown) { super(message); this.name = "V13ManualExecutionError"; }
}

/** Reusable owner-scoped application workflow for approved V1.3 manual proposals. */
export async function executeV13ManualProposal(command: V13ManualExecutionCommand, ports: V13ManualExecutionPorts): Promise<unknown> {
  if (!command.clientOrderId.trim() || command.clientOrderId.length > 128) throw new V13ManualExecutionError(422, "a bounded clientOrderId is required for idempotent execution");
  const run = await ports.findRun(command.testRunId, command.ownerId);
  if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new V13ManualExecutionError(404, "V1.3 TestRun or its injected clock was not found");
  const response = await ports.readProposal(command.proposalId, command.ownerId);
  if (response.status !== 200 || !response.body) throw new V13ManualExecutionError(404, "proposal was not found in user scope");
  const proposal = response.body;
  if (proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId) throw new V13ManualExecutionError(404, "proposal was not found in this TestRun scope");
  let account: Account | null;
  try { account = await ports.readAccount(proposal.accountId, command.ownerId); }
  catch { throw new V13ManualExecutionError(503, "could not verify isolated Portfolio account ownership and TestRun scope"); }
  if (!account) throw new V13ManualExecutionError(404, "isolated Portfolio account was not found");
  if (account.testRunId !== command.testRunId || account.namespace !== run.namespace || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") throw new V13ManualExecutionError(403, "Portfolio account is outside this PAPER/FAKE TestRun scope");
  const executed = await ports.executeTrade({ ...command, accountId: proposal.accountId, namespace: run.namespace, now: run.evidence.runClockNow });
  if ([200, 201, 202].includes(executed.status) && executed.body !== undefined) return executed.body;
  if ([403, 409, 422].includes(executed.status)) throw new V13ManualExecutionError(executed.status, "V1.3 Trade Execution was rejected", executed.body);
  throw new V13ManualExecutionError(503, `V1.3 Trade Execution failed (${executed.status})`);
}
