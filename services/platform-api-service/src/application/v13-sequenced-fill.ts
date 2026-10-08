import { createHash } from "node:crypto";

export type V13SequencedFillProposal = {
  ownerId: string;
  testRunId: string;
  accountId: string;
  status: string;
  approvalMode: string;
  market: string;
  legs: Array<{ securityId: string; side: string; quantity: number }>;
};

export type V13SequencedFillReport = {
  externalFillId: string;
  sequence: number;
  cumulativeQuantity: number;
  price: string;
  fee: string;
  effectiveAt: string;
  evidenceRef: string;
};

export type V13SequencedFillOrder = {
  order?: { order_id?: string; status?: string };
  authorization?: Record<string, unknown>;
};

export class V13SequencedFillError extends Error {
  constructor(readonly status: 403 | 404 | 409 | 422 | 503, message: string, readonly body?: unknown) {
    super(message);
    this.name = "V13SequencedFillError";
  }
}

export interface V13SequencedFillPorts {
  findRun(testRunId: string, ownerId: string): Promise<{ stageId: string; namespace: string; evidence: Record<string, unknown> } | null>;
  readProposal(proposalId: string, ownerId: string): Promise<{ status: number; body?: V13SequencedFillProposal }>;
  readOrder(namespace: string, clientOrderId: string): Promise<{ status: number; body?: unknown }>;
  recordFill(orderId: string, report: V13SequencedFillReport): Promise<{ status: number; body?: unknown }>;
  readOrderProjection(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string }): Promise<unknown>;
}

export type V13CancelProposal = V13SequencedFillProposal;
export type V13CancelFacts = {
  order?: { order_id?: string; status?: string };
  authorization?: Record<string, unknown>;
  fill?: { quantity?: number; externalFillId?: string };
  fills?: Array<{ quantity?: number; brokerSequence?: number }>;
};
export type V13CancelAccount = { reservations?: Array<{ clientOrderId: string; status: string }> };
export type V13CancelPorts = Pick<V13SequencedFillPorts, "findRun" | "readProposal" | "readOrder" | "readOrderProjection"> & {
  readAccount(accountId: string, ownerId: string): Promise<V13CancelAccount>;
  requestCancel(orderId: string): Promise<{ status: number; body?: unknown }>;
  resolveCancel(orderId: string, input: { outcome: "ACCEPTED"; reason: string; sequence: number }): Promise<{ status: number; body?: unknown }>;
};

export class V13OrderCancelError extends Error {
  constructor(readonly status: 403 | 404 | 409 | 422 | 503, message: string, readonly body?: unknown) {
    super(message);
    this.name = "V13OrderCancelError";
  }
}

async function loadCancelContext(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string }, ports: V13CancelPorts, fixture: "L07" | "L08") {
  const run = await ports.findRun(input.testRunId, input.ownerId);
  if (!run || run.stageId !== "V1.3") throw new V13OrderCancelError(404, "V1.3 TestRun was not found in user scope");
  const proposalResponse = await ports.readProposal(input.proposalId, input.ownerId);
  if (proposalResponse.status !== 200 || !proposalResponse.body) throw new V13OrderCancelError(404, "proposal was not found in user scope");
  const proposal = proposalResponse.body;
  const leg = proposal.legs[0];
  const validProposal = proposal.ownerId === input.ownerId && proposal.testRunId === input.testRunId
    && proposal.status === "APPROVED_MANUAL" && proposal.approvalMode === "MANUAL_APPROVAL"
    && proposal.market === "CN_A" && leg?.securityId === "600000.SH" && leg.side === "BUY"
    && (fixture === "L07" ? leg.quantity === 200 && input.clientOrderId === `v13-${input.proposalId}` : [100, 200].includes(leg.quantity));
  if (!validProposal) throw new V13OrderCancelError(403, `order is outside the fixed owner-scoped ${fixture} cancellation Fixture`);
  const read = await ports.readOrder(run.namespace, input.clientOrderId);
  if (read.status !== 200 || !read.body || typeof read.body !== "object") throw new V13OrderCancelError(404, `${fixture} FakeBroker order was not found`);
  return { run, proposal, leg: leg!, facts: read.body as V13CancelFacts };
}

function assertOrderScope(input: { ownerId: string; testRunId: string; proposalId: string }, proposal: V13CancelProposal, facts: V13CancelFacts) {
  if (facts.authorization?.ownerId !== input.ownerId || facts.authorization.testRunId !== input.testRunId
    || facts.authorization.proposalId !== input.proposalId || facts.authorization.accountId !== proposal.accountId) {
    throw new V13OrderCancelError(403, "FakeBroker order is outside the exact owner/TestRun/Proposal scope");
  }
  if (!facts.order?.order_id) throw new V13OrderCancelError(404, "FakeBroker order identifier is missing");
}

async function heldReservation(input: { ownerId: string; clientOrderId: string }, accountId: string, ports: V13CancelPorts, fixture: "L07" | "L08") {
  const account = await ports.readAccount(accountId, input.ownerId);
  const reservation = account.reservations?.find((item) => item.clientOrderId === input.clientOrderId);
  if (reservation?.status !== "HELD") throw new V13OrderCancelError(409, `Portfolio released ${fixture} resources before an authoritative cancellation result`);
  return reservation;
}

async function validateCancellationResolved(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string }, ports: V13CancelPorts, fixture: "L07" | "L08") {
  const order = await ports.readOrderProjection(input);
  const facts = order as { order?: { status?: string }; reconciliation?: { portfolio?: { reservations?: Array<{ clientOrderId: string; status: string }> } } } | null;
  const reservation = facts?.reconciliation?.portfolio?.reservations?.find((item) => item.clientOrderId === input.clientOrderId);
  if (facts?.order?.status !== "CANCELLED" || reservation?.status !== "RELEASED") {
    throw new V13OrderCancelError(409, `${fixture} accepted cancellation did not reach terminal order and released-reservation facts`);
  }
  return order;
}

export async function requestV13L07SequencedCancel(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string }, ports: V13CancelPorts) {
  const context = await loadCancelContext(input, ports, "L07");
  assertOrderScope(input, context.proposal, context.facts);
  const fills = context.facts.fills ?? [];
  if (fills.map((fill) => `${fill.brokerSequence}:${fill.quantity}`).join(",") !== "1:100,2:50") {
    throw new V13OrderCancelError(409, "L07 cancellation requires the exact persisted 100/50-share causal Fill sequence");
  }
  if (context.facts.order?.status === "PARTIALLY_FILLED") {
    const requested = await ports.requestCancel(context.facts.order.order_id!);
    if (![200, 202].includes(requested.status)) throw new V13OrderCancelError(409, "FakeBroker rejected L07 cancellation request", requested.body);
  } else if (context.facts.order?.status !== "CANCEL_REQUESTED") {
    throw new V13OrderCancelError(409, "L07 cancellation requires a working partially-filled order");
  }
  const pending = await ports.readOrder(context.run.namespace, input.clientOrderId);
  if (pending.status !== 200 || (pending.body as V13CancelFacts | undefined)?.order?.status !== "CANCEL_REQUESTED") {
    throw new V13OrderCancelError(409, "FakeBroker did not persist CANCEL_REQUESTED");
  }
  const reservation = await heldReservation(input, context.proposal.accountId, ports, "L07");
  return { status: "CANCEL_REQUESTED", order: pending.body, reservation };
}

export async function resolveV13L07SequencedCancel(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string; sequence: number }, ports: V13CancelPorts) {
  const context = await loadCancelContext(input, ports, "L07");
  assertOrderScope(input, context.proposal, context.facts);
  if (input.sequence !== 3 || context.facts.order?.status !== "CANCEL_REQUESTED") {
    throw new V13OrderCancelError(409, "L07 requires the fixed seq=3 accepted cancel result after a persisted cancel request");
  }
  await heldReservation(input, context.proposal.accountId, ports, "L07");
  const resolved = await ports.resolveCancel(context.facts.order.order_id!, { outcome: "ACCEPTED", reason: `V13_L07_RESTART_CANCEL:${input.testRunId}:${input.proposalId}`, sequence: 3 });
  if (![200, 202].includes(resolved.status)) throw new V13OrderCancelError(409, "FakeBroker rejected the L07 cancellation result", resolved.body);
  return { resolution: resolved.body, order: await validateCancellationResolved(input, ports, "L07") };
}

export async function cancelV13L08PartialFill(input: { ownerId: string; testRunId: string; proposalId: string; clientOrderId: string; cancelSequence: number }, ports: V13CancelPorts) {
  if (input.cancelSequence !== 2 && input.cancelSequence !== 3) throw new V13OrderCancelError(422, "L08 cancelSequence must be 2 or 3");
  const context = await loadCancelContext(input, ports, "L08");
  const { facts, leg } = context;
  assertOrderScope(input, context.proposal, facts);
  const shortFillReady = leg.quantity === 100 && input.cancelSequence === 2 && facts.fill?.quantity === 40;
  const lateCancelReady = leg.quantity === 200 && input.cancelSequence === 3 && Array.isArray(facts.fills)
    && facts.fills.reduce((sum, fill) => sum + (Number.isSafeInteger(fill.quantity) ? fill.quantity! : 0), 0) === 150
    && facts.fills.map((fill) => fill.brokerSequence).join(",") === "1,2";
  if (facts.order?.status !== "PARTIALLY_FILLED" || (!shortFillReady && !lateCancelReady)) {
    throw new V13OrderCancelError(409, "L08 requires the authorized partial Fill sequence to be delivered before cancellation");
  }
  const cancel = await ports.requestCancel(facts.order.order_id!);
  if (cancel.status !== 202) throw new V13OrderCancelError(409, "FakeBroker rejected L08 cancellation request", cancel.body);
  const pending = await ports.readOrder(context.run.namespace, input.clientOrderId);
  if ((pending.body as V13CancelFacts | undefined)?.order?.status !== "CANCEL_REQUESTED") throw new V13OrderCancelError(409, "FakeBroker did not persist CANCEL_REQUESTED before resolution");
  const reservationBeforeResolution = await heldReservation(input, context.proposal.accountId, ports, "L08");
  const resolution = await ports.resolveCancel(facts.order.order_id!, { outcome: "ACCEPTED", reason: `V13_L08_PARTIAL_FILL_CANCEL:${input.testRunId}:${input.proposalId}`, sequence: input.cancelSequence });
  if (![200, 202].includes(resolution.status)) throw new V13OrderCancelError(409, "FakeBroker rejected L08 cancellation result", resolution.body);
  const order = await validateCancellationResolved(input, ports, "L08");
  return { cancel, pending: (pending.body as V13CancelFacts).order, reservationBeforeResolution, resolution: resolution.body, order };
}

/** Coordinates the fixed, deterministic L07/L08 Fill report through domain-service ports. */
export async function recordV13SequencedProposalFill(input: {
  ownerId: string;
  testRunId: string;
  proposalId: string;
  clientOrderId: string;
  sequence: number;
}, ports: V13SequencedFillPorts): Promise<{ report: unknown; order: unknown }> {
  const { ownerId, testRunId, proposalId, clientOrderId, sequence } = input;
  if (sequence !== 1 && sequence !== 2) throw new V13SequencedFillError(404, "V1.3 sequenced TestRun or fixed sequence was not found");
  const run = await ports.findRun(testRunId, ownerId);
  if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") {
    throw new V13SequencedFillError(404, "V1.3 sequenced TestRun or its injected Clock was not found");
  }
  const proposalResponse = await ports.readProposal(proposalId, ownerId);
  if (proposalResponse.status !== 200 || !proposalResponse.body) throw new V13SequencedFillError(404, "proposal was not found in user scope");
  const proposal = proposalResponse.body;
  const leg = proposal.legs[0];
  if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId || proposal.status !== "APPROVED_MANUAL"
    || proposal.approvalMode !== "MANUAL_APPROVAL" || proposal.market !== "CN_A" || leg?.securityId !== "600000.SH"
    || leg.side !== "BUY" || ![100, 200].includes(leg.quantity)) {
    throw new V13SequencedFillError(403, "proposal is outside the fixed V1.3 sequenced Fixture");
  }
  const read = await ports.readOrder(run.namespace, clientOrderId);
  if (read.status !== 200 || !read.body) throw new V13SequencedFillError(404, "sequenced FakeBroker order was not found in this TestRun");
  if (!read.body || typeof read.body !== "object") throw new V13SequencedFillError(404, "sequenced FakeBroker order was not found in this TestRun");
  const facts = read.body as V13SequencedFillOrder;
  if (facts.authorization?.ownerId !== ownerId || facts.authorization.testRunId !== testRunId
    || facts.authorization.proposalId !== proposalId || facts.authorization.accountId !== proposal.accountId
    || facts.order?.status === "REJECTED") {
    throw new V13SequencedFillError(403, "FakeBroker order is outside the exact owner/TestRun/Proposal scope");
  }
  const orderId = facts.order?.order_id;
  if (!orderId) throw new V13SequencedFillError(404, "sequenced FakeBroker order identifier is missing");

  const fillHash = createHash("sha256").update(`${orderId}:v13-sequence-${sequence}`).digest("hex").slice(0, 32);
  const externalFillId = `${fillHash.slice(0, 8)}-${fillHash.slice(8, 12)}-4${fillHash.slice(13, 16)}-a${fillHash.slice(17, 20)}-${fillHash.slice(20, 32)}`;
  const partialCancelFixture = leg.quantity === 100;
  const report: V13SequencedFillReport = {
    externalFillId,
    sequence,
    cumulativeQuantity: partialCancelFixture ? 40 : sequence === 1 ? 100 : 150,
    price: "10.0000",
    fee: partialCancelFixture ? "1.0000" : "2.5000",
    effectiveAt: new Date(Date.parse(String(run.evidence.runClockNow)) + sequence * 1000).toISOString(),
    evidenceRef: `v13-fixed-sequenced-fill:${testRunId}:${proposalId}:sequence-${sequence}`,
  };
  const result = await ports.recordFill(orderId, report);
  if (![200, 202].includes(result.status)) {
    if (result.status === 409 || result.status === 422) throw new V13SequencedFillError(result.status, "FakeBroker rejected the sequenced Fill report", result.body);
    throw new V13SequencedFillError(503, `V1.3 FakeBroker sequenced Fill report failed (${result.status})`);
  }
  return {
    report: result.body,
    order: await ports.readOrderProjection({ ownerId, testRunId, proposalId, clientOrderId }),
  };
}
