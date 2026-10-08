import { createHash } from "node:crypto";
import { IdempotencyConflictError } from "../domain/historical-execution.js";
import { PortfolioAccountClientError } from "../contracts/generated-portfolio-account-client.js";
import type { GeneratedPortfolioAccountClient } from "../contracts/generated-portfolio-account-client.js";
import type { GeneratedTradeV13GovernanceClient } from "../contracts/generated-v13-governance-client.js";
import type { V13ProposalResult } from "../contracts/generated-types.js";
import type { FillOutboxDelivery } from "./fill-outbox-delivery.js";
import { buildV13FixedPaperOrder, buildV13FixedSequencedPaperOrder } from "./v13-manual-execution.js";
import { buildV13FixedAutoPaperOrder } from "./v13-manual-execution.js";
import type { GeneratedTradeV13AutoMandateClient } from "../contracts/generated-v13-auto-mandate-client.js";

type Command = { proposalId: string; ownerId: string; testRunId: string; accountId: string; namespace: string; clientOrderId: string; now: string };
type Broker = {
  executeV13ManualPaper(command: ReturnType<typeof buildV13FixedPaperOrder> & { reservation: { reservationId: string; ownerId: string; testRunId: string; clientOrderId: string } }): Promise<{ result: { orderId: string; status: string; brokerMode: "FAKE"; fill?: { externalFillId: string; quantity: number; price: string; fee: string; effectiveAt: string } }; replayed: boolean }>;
  find(orderId: string): Promise<Record<string, unknown> | null>;
  findByNamespaceClientOrderId(namespace: string, clientOrderId: string): Promise<any>;
  pendingFill(orderId: string): Promise<any>;
  outboxStatus(orderId: string): Promise<any>;
  independentAssetSnapshot(namespace: string, accountId: string): Promise<any>;
  reconciliationSummary(namespace: string): Promise<any>;
};

export class V13ManualPaperExecutionError extends Error {
  constructor(readonly statusCode: number, message: string, readonly detail?: unknown) { super(message); this.name = "V13ManualPaperExecutionError"; }
}

/** Application coordinator for the V1.3 approved-Proposal → reserve → authorize → FakeBroker → Portfolio flow. */
export class V13ManualPaperExecutionService {
  constructor(private readonly broker: Broker, private readonly portfolio: GeneratedPortfolioAccountClient, private readonly governance: GeneratedTradeV13GovernanceClient, private readonly outbox: FillOutboxDelivery) {}

  async execute(command: Command) { return this.executeWithMode(command, false); }
  async executeSequenced(command: Command) { return this.executeWithMode(command, true); }

  private async executeWithMode(command: Command, sequenced: boolean) {
    const read = await this.governance.readProposal(command.proposalId, command.ownerId);
    if (read.status !== 200 || !read.body || !("proposalId" in read.body)) throw new V13ManualPaperExecutionError(read.status === 404 ? 404 : 503, "approved V1.3 Proposal could not be read");
    const proposal = read.body as V13ProposalResult;
    if (proposal.proposalId !== command.proposalId || proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId || proposal.accountId !== command.accountId) throw new V13ManualPaperExecutionError(403, "Proposal is outside the requested owner, TestRun or account scope");
    const plan = sequenced
      ? buildV13FixedSequencedPaperOrder({ proposal, namespace: command.namespace, clientOrderId: command.clientOrderId, now: command.now })
      : buildV13FixedPaperOrder({ proposal, namespace: command.namespace, clientOrderId: command.clientOrderId, now: command.now });
    let reservation: Awaited<ReturnType<GeneratedPortfolioAccountClient["reserveAccountResources"]>>;
    try {
      reservation = await this.portfolio.reserveAccountResources(command.accountId, { namespace: command.namespace, testRunId: command.testRunId, ownerId: command.ownerId, idempotencyKey: `${command.clientOrderId}-v13-reservation`, clientOrderId: command.clientOrderId, side: plan.side, currency: plan.currency, cashAmount: plan.side === "BUY" ? plan.reservedCash : null, security: plan.side === "SELL" ? plan.security : null, quantity: plan.side === "SELL" ? plan.quantity : null, ...(plan.side === "SELL" ? { asOf: command.now } : {}) });
    } catch (error) {
      if (error instanceof PortfolioAccountClientError) throw new V13ManualPaperExecutionError(error.status === 409 ? 409 : error.status === 403 ? 403 : 503, "V1.3 Portfolio risk/resource reservation failed", error.body);
      throw error;
    }
    const authorizationCommand = { proposalVersion: plan.proposalVersion, contentHash: plan.contentHash, ownerId: command.ownerId, testRunId: command.testRunId, accountId: command.accountId, clientOrderId: command.clientOrderId, commandHash: plan.commandHash, now: command.now };
    const grantResponse = await this.governance.authorizeExecution(command.proposalId, authorizationCommand);
    if (grantResponse.status !== 200 || !grantResponse.body || !("authorizationId" in grantResponse.body)) throw new V13ManualPaperExecutionError(grantResponse.status === 403 ? 403 : 503, "V1.3 Proposal execution authorization was denied");
    const grant = grantResponse.body as { authorizationId: string };
    const validation = await this.governance.validateExecution(command.proposalId, { ...authorizationCommand, authorizationId: grant.authorizationId });
    if (validation.status !== 200 || !validation.body || !("valid" in validation.body) || validation.body.valid !== true) throw new V13ManualPaperExecutionError(403, "V1.3 one-time execution authorization is invalid");
    if (validation.body.replayed === true) {
      const original = await this.broker.findByNamespaceClientOrderId(command.namespace, command.clientOrderId);
      if (!original) throw new V13ManualPaperExecutionError(409, "consumed authorization has no original order; never resubmit blindly");
      return { replayed: true, proposal: { proposalId: command.proposalId, proposalVersion: plan.proposalVersion, contentHash: plan.contentHash, status: proposal.status }, order: { orderId: original.order_id, status: original.status, clientOrderId: command.clientOrderId }, fill: original.external_fill_id ? { externalFillId: original.external_fill_id, quantity: Number(original.fill_quantity), price: original.fill_price, fee: original.fill_fee, effectiveAt: original.effective_at.toISOString() } : null, outbox: await this.broker.outboxStatus(original.order_id), independentAssets: await this.broker.independentAssetSnapshot(command.namespace, command.accountId) };
    }
    let executed;
    try { executed = await this.broker.executeV13ManualPaper({ ...plan, reservation: { reservationId: reservation.reservation.reservationId, ownerId: command.ownerId, testRunId: command.testRunId, clientOrderId: command.clientOrderId } }); }
    catch (error) { if (error instanceof IdempotencyConflictError) throw new V13ManualPaperExecutionError(409, error.message); throw error; }
    const pending = await this.broker.pendingFill(executed.result.orderId);
    if (pending) await this.outbox.deliver(pending.event_id);
    const order = await this.broker.find(executed.result.orderId); const outbox = await this.broker.outboxStatus(executed.result.orderId);
    return { replayed: executed.replayed, proposal: { proposalId: command.proposalId, proposalVersion: plan.proposalVersion, contentHash: plan.contentHash, status: proposal.status }, riskEvaluation: { status: "PASS_RISK_CHECK", rule: "fixed-fixture-budget-and-portfolio-resource-reservation" }, resourceReservation: reservation.reservation, order: { ...order, clientOrderId: command.clientOrderId }, fill: executed.result.fill ?? null, outbox, independentAssets: await this.broker.independentAssetSnapshot(command.namespace, command.accountId), reconciliation: await this.broker.reconciliationSummary(command.namespace) };
  }
}

type AutoCommand = Command & { mandateId: string; mandateVersion: number };
type AutoBroker = Pick<Broker, "executeV13ManualPaper" | "findByNamespaceClientOrderId" | "pendingFill" | "outboxStatus" | "independentAssetSnapshot" | "reconciliationSummary" | "find">;
export type V13AutoFaultSequence = {
  afterFakeBrokerCommit(command: AutoCommand): Promise<void>;
  beforeOriginalOrderRead(command: AutoCommand): Promise<void>;
};
const noV13AutoFaults: V13AutoFaultSequence = { afterFakeBrokerCommit: async () => {}, beforeOriginalOrderRead: async () => {} };

/** Application coordinator for exact AUTO_POLICY proposal → mandate budget → portfolio resources → FakeBroker. */
export class V13AutoPaperExecutionService {
  constructor(private readonly broker: AutoBroker, private readonly portfolio: GeneratedPortfolioAccountClient, private readonly governance: GeneratedTradeV13GovernanceClient, private readonly mandates: GeneratedTradeV13AutoMandateClient, private readonly outbox: FillOutboxDelivery, private readonly faults: V13AutoFaultSequence = noV13AutoFaults) {}

  private async settle(reservationId: string, outcome: "CONSUMED" | "RELEASED", now: string) {
    const result = await this.mandates.settleReservation(reservationId, { outcome, now });
    if (result.status !== 200) throw new V13ManualPaperExecutionError(503, `AUTO_POLICY budget reservation ${outcome.toLowerCase()} settlement is pending`);
  }

  async execute(command: AutoCommand) {
    const read = await this.governance.readProposal(command.proposalId, command.ownerId);
    if (read.status !== 200 || !read.body || !("proposalId" in read.body)) throw new V13ManualPaperExecutionError(read.status === 404 ? 404 : 503, "AUTO_POLICY Proposal could not be read");
    const proposal = read.body as V13ProposalResult;
    if (proposal.proposalId !== command.proposalId || proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId || proposal.accountId !== command.accountId || proposal.status !== "AUTO_POLICY_PENDING" || proposal.approvalMode !== "AUTO_POLICY" || proposal.strategyVersion !== "fixture-auto-policy-test-v1") throw new V13ManualPaperExecutionError(403, "Proposal is not a pending AUTO_POLICY proposal in the requested owner/TestRun/account scope");

    const market = proposal.market;
    const currency = proposal.currency;
    if ((market !== "CN_A" && market !== "US_EQUITY") || (currency !== "CNY" && currency !== "USD") || (market === "CN_A") !== (currency === "CNY")) throw new V13ManualPaperExecutionError(422, "AUTO_POLICY Proposal market/currency facts are missing or inconsistent");
    const prices: Record<string, string> = { "600000.SH": "10.00", AAPL: "25.00" };
    const fees: Record<string, string> = { "600000.SH": "5.00", AAPL: "0.05" };
    const legs = proposal.legs.map((leg) => ({ securityId: leg.securityId, side: leg.side, quantity: leg.quantity, limitPrice: prices[leg.securityId] ?? "", estimatedFee: fees[leg.securityId] ?? "" }));
    if (legs.some((leg) => (market === "CN_A") !== (leg.securityId.endsWith(".SH") || leg.securityId.endsWith(".SZ")))) throw new V13ManualPaperExecutionError(422, "AUTO_POLICY proposal mixes or uses unsupported Fixture markets");
    if (proposal.operation === "REBALANCE" && (legs.length !== 1 || !legs[0].limitPrice)) throw new V13ManualPaperExecutionError(422, "AUTO_POLICY order is outside the fixed CN/US one-leg Fixture");
    if (proposal.operation === "HOLD" && legs.length !== 0) throw new V13ManualPaperExecutionError(422, "AUTO_POLICY HOLD must contain no order legs");

    const plan = proposal.operation === "REBALANCE" ? buildV13FixedAutoPaperOrder({ proposal, namespace: command.namespace, clientOrderId: command.clientOrderId, now: command.now, mandateId: command.mandateId, mandateVersion: command.mandateVersion }) : null;
    const commandHash = plan?.commandHash ?? createHash("sha256").update(JSON.stringify({ mandateId: command.mandateId, mandateVersion: command.mandateVersion, proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, clientOrderId: command.clientOrderId, operation: "HOLD" })).digest("hex");
    const authorization = await this.mandates.authorizeOrder(command.mandateId, { mandateVersion: command.mandateVersion, ownerId: command.ownerId, clientOrderId: command.clientOrderId, commandHash, proposal: { proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, ownerId: proposal.ownerId, testRunId: proposal.testRunId, accountId: proposal.accountId, strategyVersion: proposal.strategyVersion, operation: proposal.operation, market, currency, legs }, now: command.now });
    if (authorization.status !== 200 || typeof authorization.body !== "object" || authorization.body === null || !("decision" in authorization.body)) throw new V13ManualPaperExecutionError(authorization.status === 409 ? 409 : 403, "AUTO_POLICY Mandate rejected this Proposal");
    const mandateResult = authorization.body as { decision: { status: string; reasonCode?: string }; reservationId?: string; replayed?: boolean };
    if (mandateResult.decision.status === "HOLD") return { replayed: false, proposal: { proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, contentHash: proposal.contentHash, status: proposal.status }, decision: { status: "HOLD", reason: "no order submitted and no budget consumed" }, order: null };
    if (mandateResult.decision.status !== "AUTHORIZED" || !mandateResult.reservationId || !plan) throw new V13ManualPaperExecutionError(403, `AUTO_POLICY Mandate rejected order (${mandateResult.decision.reasonCode ?? "INVALID_ORDER"})`);

    if (mandateResult.replayed) {
      await this.faults.beforeOriginalOrderRead(command);
      const original = await this.broker.findByNamespaceClientOrderId(command.namespace, command.clientOrderId);
      if (!original) throw new V13ManualPaperExecutionError(409, "AUTO_POLICY reservation replay has no authoritative FakeBroker order; never resubmit blindly");
      await this.settle(mandateResult.reservationId, "CONSUMED", command.now);
      const pending = await this.broker.pendingFill(original.order_id);
      if (pending) await this.outbox.deliver(pending.event_id);
      const recovered = await this.broker.find(original.order_id);
      const outbox = await this.broker.outboxStatus(original.order_id);
      return { replayed: true, proposal: { proposalId: proposal.proposalId, proposalVersion: plan.proposalVersion, contentHash: plan.contentHash, status: proposal.status }, mandate: { mandateId: command.mandateId, mandateVersion: command.mandateVersion, reservationId: mandateResult.reservationId, status: "CONSUMED" }, order: { ...(recovered ?? original), clientOrderId: command.clientOrderId }, fill: original.external_fill_id ? { externalFillId: original.external_fill_id, quantity: Number(original.fill_quantity), price: original.fill_price, fee: original.fill_fee, effectiveAt: original.effective_at.toISOString() } : null, outbox, independentAssets: await this.broker.independentAssetSnapshot(command.namespace, command.accountId), reconciliation: await this.broker.reconciliationSummary(command.namespace) };
    }

    let resource: Awaited<ReturnType<GeneratedPortfolioAccountClient["reserveAccountResources"]>>;
    try {
      resource = await this.portfolio.reserveAccountResources(command.accountId, { namespace: command.namespace, testRunId: command.testRunId, ownerId: command.ownerId, idempotencyKey: `${command.clientOrderId}-v13-auto-reservation`, clientOrderId: command.clientOrderId, side: "BUY", currency: plan.currency, cashAmount: plan.reservedCash, security: null, quantity: null });
    } catch (error) {
      await this.settle(mandateResult.reservationId, "RELEASED", command.now);
      if (error instanceof PortfolioAccountClientError) throw new V13ManualPaperExecutionError(error.status === 409 ? 409 : error.status === 403 ? 403 : 503, "AUTO_POLICY Portfolio resource reservation failed", error.body);
      throw error;
    }
    let executed;
    try { executed = await this.broker.executeV13ManualPaper({ ...plan, reservation: { reservationId: resource.reservation.reservationId, ownerId: command.ownerId, testRunId: command.testRunId, clientOrderId: command.clientOrderId } }); }
    catch (error) { if (error instanceof IdempotencyConflictError) throw new V13ManualPaperExecutionError(409, error.message); throw error; }
    if (!executed.replayed) await this.faults.afterFakeBrokerCommit(command);
    await this.settle(mandateResult.reservationId, "CONSUMED", command.now);
    const pending = await this.broker.pendingFill(executed.result.orderId);
    if (pending) await this.outbox.deliver(pending.event_id);
    const order = await this.broker.find(executed.result.orderId); const outbox = await this.broker.outboxStatus(executed.result.orderId);
    return { replayed: executed.replayed, proposal: { proposalId: proposal.proposalId, proposalVersion: plan.proposalVersion, contentHash: plan.contentHash, status: proposal.status }, mandate: { mandateId: command.mandateId, mandateVersion: command.mandateVersion, reservationId: mandateResult.reservationId, status: "CONSUMED" }, resourceReservation: resource.reservation, order: { ...order, clientOrderId: command.clientOrderId }, fill: executed.result.fill ?? null, outbox, independentAssets: await this.broker.independentAssetSnapshot(command.namespace, command.accountId), reconciliation: await this.broker.reconciliationSummary(command.namespace) };
  }
}
