export type V13AutoExecutionCommand = {
  ownerId: string;
  testRunId: string;
  proposalId: string;
  mandateId: string;
  mandateVersion: number;
  clientOrderId: string;
};

type V13AutoRun = {
  stageId: string;
  namespace: string;
  evidence: Record<string, unknown>;
};

type V13AutoProposal = {
  ownerId: string;
  testRunId: string;
  approvalMode: string;
  status: string;
  accountId: string;
};

type V13AutoAccount = {
  testRunId: string;
  namespace: string;
  environmentMode: string;
  brokerMode: string;
};

export type V13AutoTradeRequest = V13AutoExecutionCommand & {
  accountId: string;
  namespace: string;
  now: string;
};

export type V13AutoExecutionPorts = {
  findRun(testRunId: string, ownerId: string): Promise<V13AutoRun | null>;
  readProposal(proposalId: string, ownerId: string): Promise<{ status: number; body?: V13AutoProposal }>;
  readAccount(accountId: string, ownerId: string): Promise<V13AutoAccount | null>;
  executeTrade(command: V13AutoTradeRequest): Promise<{ status: number; body?: unknown }>;
  readMandateBudget(mandateId: string, testRunId: string, mandateVersion: number, ownerId: string): Promise<{ status: number; body?: Record<string, unknown> }>;
};

export class V13AutoExecutionError extends Error {
  constructor(readonly status: number, message: string, readonly body?: unknown) {
    super(message);
    this.name = "V13AutoExecutionError";
  }
}

/** Reusable owner-scoped application workflow for V1.3 AUTO_POLICY dispatch. */
export async function executeV13AutoProposal(command: V13AutoExecutionCommand, ports: V13AutoExecutionPorts): Promise<unknown> {
  if (!command.clientOrderId.trim() || command.clientOrderId.length > 128
    || !/^[0-9a-f-]{36}$/iu.test(command.mandateId)
    || !Number.isSafeInteger(command.mandateVersion) || command.mandateVersion < 1) {
    throw new V13AutoExecutionError(422, "a bounded clientOrderId and exact Mandate ID/version are required");
  }

  const run = await ports.findRun(command.testRunId, command.ownerId);
  if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") {
    throw new V13AutoExecutionError(404, "V1.3 TestRun or its injected clock was not found");
  }
  const response = await ports.readProposal(command.proposalId, command.ownerId);
  if (response.status !== 200 || !response.body) throw new V13AutoExecutionError(404, "proposal was not found in user scope");
  const proposal = response.body;
  if (proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId
    || proposal.approvalMode !== "AUTO_POLICY" || proposal.status !== "AUTO_POLICY_PENDING") {
    throw new V13AutoExecutionError(403, "proposal is not a pending AUTO_POLICY proposal in this TestRun");
  }

  let account: V13AutoAccount | null;
  try { account = await ports.readAccount(proposal.accountId, command.ownerId); }
  catch { throw new V13AutoExecutionError(503, "could not verify AUTO_POLICY Mandate account ownership and TestRun scope"); }
  if (!account) throw new V13AutoExecutionError(404, "isolated Portfolio account was not found");
  if (account.testRunId !== command.testRunId || account.namespace !== run.namespace
    || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") {
    throw new V13AutoExecutionError(403, "Portfolio account is outside this PAPER/FAKE TestRun scope");
  }

  const executed = await ports.executeTrade({ ...command, accountId: proposal.accountId, namespace: run.namespace, now: run.evidence.runClockNow });
  if ([200, 201, 202].includes(executed.status) && executed.body !== undefined) {
    // Trade may already have committed an order. A failed readback must remain
    // visible as incomplete evidence, never turn a completed trade into a retry.
    let budgetRead: { status: number; body?: Record<string, unknown> } | undefined;
    try { budgetRead = await ports.readMandateBudget(command.mandateId, command.testRunId, command.mandateVersion, command.ownerId); }
    catch { budgetRead = undefined; }
    const budget = budgetRead?.body;
    const verified = budgetRead?.status === 200 && budget !== undefined
      && budget.ownerId === command.ownerId && budget.testRunId === command.testRunId
      && budget.mandateId === command.mandateId && budget.mandateVersion === command.mandateVersion
      && budget.reservedAmount === "0.00" && budget.consumedAmount !== undefined
      && budget.releasedAmount === "0.00" && budget.reservationCount === 1
      && budget.consumedCount === 1 && budget.releasedCount === 0;
    return { ...(executed.body as Record<string, unknown>), mandateBudgetVerification: {
      status: verified ? "VERIFIED" : "NOT_VERIFIED",
      readStatus: budgetRead?.status ?? "UNAVAILABLE",
      snapshot: budget ?? null,
    } };
  }
  if ([403, 409, 422].includes(executed.status)) throw new V13AutoExecutionError(executed.status, "V1.3 AUTO Trade Execution was rejected", executed.body);
  throw new V13AutoExecutionError(503, `V1.3 AUTO Trade Execution failed (${executed.status})`);
}
