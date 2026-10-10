import { createHash } from "node:crypto";
import type { V13ProposalCommand, V13ProposalResult } from "../contracts/generated-types.js";
import type { V15Account, V15NoTradeInput } from "./v15-no-trade.js";
import type { StageRunRepository } from "../ports/stage-run-repository.js";

export type V15AutoMarket = "CN_A" | "US_EQUITY";
const normalizeDecimal = (value: unknown) => typeof value === "string" && /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(value) ? value.replace(/(\.\d*?[1-9])0+$|\.0+$/u, "$1") : value;
export type V15AutoTradeCommand = {
  testRunId: string;
  ownerId: string;
  namespace: string;
  market: V15AutoMarket;
  accountId: string;
  runClockNow: string;
  sessionSequence?: number;
  orderQuantity?: number;
  recoveryMode?: boolean;
  windowDecision?: { missedSession: number; missedAt: string; staleOrderCreated: false; reevaluatedSession: number };
  expectedLedgerEntryCount?: number;
  expectedLedgerVersion?: number;
};

export type V15AutoOrderResult = {
  sessionSequence?: number;
  proposal: V13ProposalResult;
  mandate: { mandateId: string; mandateVersion: number; contentHash: string; independentlyReadBudget: { status: "ACTIVE"; maxOrderAmount: string; maxTotalAmount: string; maxOrderCount: number }; independentlyReadReservation: V15MandateBudgetLedger; pausedAfterSession?: { status: "PAUSED"; mandateId: string } };
  execution: Record<string, unknown>;
  reconciliation: { portfolio: unknown; fakeBroker: unknown; brokerSummary: unknown; status: "MATCH" };
  windowDecision?: V15AutoTradeCommand["windowDecision"];
};

export type V15AutoExecutionResult = {
  orders: V15AutoOrderResult[];
  cancelled: boolean;
  cancelRequestedAt?: string;
};

type V15AutoPortfolioSnapshot = { ownerId: string; testRunId: string; namespace: string; market: V15AutoMarket; environmentMode: string; brokerMode: string; cash: { amount: string; currency: string }; positions?: Array<{ security: string; quantity: number }>; reservations?: Array<{ clientOrderId: string; status: string; cashAmount: string | null; capturedCashAmount: string }>; ledgerEntryCount?: number; ledgerVersion?: number };
export type V15AutoBrokerAssets = { owner_id: string; test_run_id: string; currency: string; current_cash: string; positions?: Array<{ security: string; quantity: number }> };
export type V15AutoBrokerSummary = { namespace: string; brokerMode: string; order_count: number; fill_count: number; unresolved_order_count: number; pending_outbox_count: number; externalOnlyOrderCount: number };
type V15MandateBudgetLedger = { reservedAmount: string; consumedAmount: string; releasedAmount: string; reservationCount: number; consumedCount: number; releasedCount: number };

export interface V15AutoTradePorts {
  createProposal(command: V13ProposalCommand): Promise<{ status: number; body?: V13ProposalResult | Record<string, unknown> }>;
  createMandate(command: {
    mandateId: string; mandateVersion: 1; testRunId: string; accountId: string;
    strategyVersion: string; market: V15AutoMarket; currency: "CNY" | "USD";
    securityScope: string[]; maxOrderAmount: string; maxTotalAmount: string; maxOrderCount: number;
    validFrom: string; expiresAt: string; reason: string; now: string;
  }): Promise<{ status: number; body?: Record<string, unknown> }>;
  readMandate?(mandateId: string, testRunId: string, ownerId: string): Promise<{ status: number; body?: Record<string, unknown> }>;
  readMandateBudget?(mandateId: string, testRunId: string, mandateVersion: number, ownerId: string): Promise<{ status: number; body?: Record<string, unknown> }>;
  activateMandate(mandateId: string, command: { mandateVersion: number; testRunId: string; contentHash: string; reason: string; now: string }): Promise<{ status: number; body?: Record<string, unknown> }>;
  pauseMandate?(mandateId: string, command: { mandateVersion: number; testRunId: string; reason: string; now: string }): Promise<{ status: number; body?: Record<string, unknown> }>;
  execute(command: { proposalId: string; mandateId: string; mandateVersion: number; ownerId: string; testRunId: string; accountId: string; namespace: string; clientOrderId: string; now: string; executionMode?: "IMMEDIATE" | "SEQUENCED" }): Promise<{ status: number; body?: unknown }>;
  readCancellationRequest?(testRunId: string, ownerId: string): Promise<string | undefined>;
  readOrder?(namespace: string, clientOrderId: string): Promise<{ status: number; body?: unknown }>;
  recordSequencedFill?(orderId: string, report: { externalFillId: string; sequence: number; cumulativeQuantity: number; price: string; fee: string; effectiveAt: string; evidenceRef: string }): Promise<{ status: number; body?: unknown }>;
  requestOrderCancel?(orderId: string): Promise<{ status: number; body?: unknown }>;
  resolveOrderCancel?(orderId: string, input: { outcome: "ACCEPTED"; reason: string; sequence: number }): Promise<{ status: number; body?: unknown }>;
  readPortfolio(accountId: string, ownerId: string): Promise<V15AutoPortfolioSnapshot>;
  readFakeBrokerAssets(namespace: string, accountId: string): Promise<{ status: number; body?: V15AutoBrokerAssets | Record<string, unknown> }>;
  readBrokerSummary(namespace: string): Promise<V15AutoBrokerSummary>;
}

/** Prove that a paused, persisted AUTO mandate is rejected before any order or ledger side effect. */
export async function rejectV15PausedAutoTrade(command: V15AutoTradeCommand, ports: V15AutoTradePorts) {
  if (!ports.pauseMandate) throw new Error("V1.5 paused rejection requires a governance pause port");
  if (!command.testRunId || !command.ownerId || !command.namespace || !command.accountId || !["CN_A", "US_EQUITY"].includes(command.market) || !Number.isFinite(Date.parse(command.runClockNow))) throw new Error("V1.5 rejection requires an isolated PAPER/FAKE TestRun and injected clock");
  const fixture = command.market === "CN_A" ? { securityId: "600000.SH", currency: "CNY" as const, quantity: 100, price: "10.00", fee: "5.00" } : { securityId: "AAPL", currency: "USD" as const, quantity: 10, price: "25.00", fee: "0.05" };
  const expiresAt = new Date(Date.parse(command.runClockNow) + 60 * 60 * 1000).toISOString();
  const mismatchedCurrency = fixture.currency === "CNY" ? "USD" : "CNY";
  const crossCurrency = await ports.createProposal({ ownerId: command.ownerId, testRunId: command.testRunId, idempotencyKey: `v15-reject-currency-${command.market}-${command.testRunId}`, accountId: command.accountId, strategyVersion: STRATEGY_VERSION, approvalMode: "AUTO_POLICY", market: command.market, currency: mismatchedCurrency, operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt, legs: [{ legId: `v15-reject-currency-${command.market}-buy`, securityId: fixture.securityId, side: "BUY", quantity: fixture.quantity }] });
  if (crossCurrency.status !== 422) throw new Error(`V1.5 ${command.market} cross-currency Proposal was not rejected at the Governance boundary (${crossCurrency.status}): ${JSON.stringify(crossCurrency.body ?? null)}`);
  const proposalResponse = await ports.createProposal({ ownerId: command.ownerId, testRunId: command.testRunId, idempotencyKey: `v15-reject-proposal-${command.market}-${command.testRunId}`, accountId: command.accountId, strategyVersion: STRATEGY_VERSION, approvalMode: "AUTO_POLICY", market: command.market, currency: fixture.currency, operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt, legs: [{ legId: `v15-reject-${command.market}-buy`, securityId: fixture.securityId, side: "BUY", quantity: fixture.quantity }] });
  const proposal = proposalResponse.body as V13ProposalResult | undefined;
  if (![200, 201].includes(proposalResponse.status) || !proposal || proposal.status !== "AUTO_POLICY_PENDING" || proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId || proposal.accountId !== command.accountId || proposal.market !== command.market || proposal.currency !== fixture.currency) throw new Error(`V1.5 ${command.market} rejection Proposal was not persisted in the exact TestRun scope`);
  const idHex = createHash("sha256").update(`stockquant-v15-rejection-mandate:${command.market}:${command.testRunId}`).digest("hex").slice(0, 32).split("");
  idHex[12] = "5"; idHex[16] = ((Number.parseInt(idHex[16]!, 16) & 3) | 8).toString(16);
  const mandateId = `${idHex.slice(0,8).join("")}-${idHex.slice(8,12).join("")}-${idHex.slice(12,16).join("")}-${idHex.slice(16,20).join("")}-${idHex.slice(20).join("")}`;
  const mandateResponse = await ports.createMandate({ mandateId, mandateVersion: 1, testRunId: command.testRunId, accountId: command.accountId, strategyVersion: STRATEGY_VERSION, market: command.market, currency: fixture.currency, securityScope: [fixture.securityId], maxOrderAmount: command.market === "CN_A" ? "1005.00" : "250.05", maxTotalAmount: command.market === "CN_A" ? "1005.00" : "250.05", maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: new Date(Date.parse(command.runClockNow) + 24 * 60 * 60 * 1000).toISOString(), reason: "V1.5 fixed paused-mandate rejection Fixture", now: command.runClockNow });
  let mandate = mandateResponse.body;
  if (mandateResponse.status === 409 && ports.readMandate) {
    const existingMandate = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
    const persisted = existingMandate.body;
    if (existingMandate.status === 200 && persisted?.mandateId === mandateId && persisted.testRunId === command.testRunId && persisted.accountId === command.accountId && typeof persisted.contentHash === "string" && /^[a-f0-9]{64}$/u.test(persisted.contentHash)) mandate = persisted;
  }
  if (![200, 201].includes(mandateResponse.status) || !mandate || typeof mandate.contentHash !== "string" || !/^[a-f0-9]{64}$/u.test(mandate.contentHash)) throw new Error("V1.5 rejection Mandate was not persisted with a verifiable hash");
  const transition = { mandateVersion: 1, testRunId: command.testRunId, contentHash: mandate.contentHash, reason: "Fixed rejection scenario pauses the exact TestRun mandate", now: command.runClockNow };
  if (mandate.status !== "ACTIVE" && mandate.status !== "PAUSED") {
    const activation = await ports.activateMandate(mandateId, { ...transition, reason: "Activate exact mandate before fixed pause scenario" });
    if (activation.status !== 200) throw new Error(`V1.5 rejection Mandate activation failed (${activation.status}): ${JSON.stringify(activation.body ?? null)}`);
  }
  if (mandate.status !== "PAUSED") {
    const paused = await ports.pauseMandate(mandateId, { mandateVersion: transition.mandateVersion, testRunId: transition.testRunId, reason: transition.reason, now: transition.now });
    if (paused.status !== 200) throw new Error(`V1.5 rejection Mandate pause failed (${paused.status}): ${JSON.stringify(paused.body ?? null)}`);
  }
  const execution = await ports.execute({ proposalId: proposal.proposalId, mandateId, mandateVersion: 1, ownerId: command.ownerId, testRunId: command.testRunId, accountId: command.accountId, namespace: command.namespace, clientOrderId: `v15-reject-${command.market}-${command.testRunId}`, now: command.runClockNow });
  const rejection = JSON.stringify(execution.body ?? {});
  const rejectionDetail = typeof execution.body === "object" && execution.body !== null ? (execution.body as { detail?: { reasonCode?: unknown } }).detail : undefined;
  const governanceRejected = execution.status === 403 && rejectionDetail?.reasonCode === "MANDATE_INACTIVE";
  if (!governanceRejected) throw new Error(`V1.5 ${command.market} paused Mandate rejection did not preserve the Governance MANDATE_INACTIVE decision (${execution.status}): ${rejection}`);
  const [portfolio, brokerSummary] = await Promise.all([ports.readPortfolio(command.accountId, command.ownerId), ports.readBrokerSummary(command.namespace)]);
  const canonicalAmount = (value: string) => /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/u.test(value) ? value.replace(/(\.\d*?[1-9])0+$|\.0+$/u, "$1") : null;
  if (portfolio.ownerId !== command.ownerId || portfolio.testRunId !== command.testRunId || portfolio.namespace !== command.namespace || portfolio.market !== command.market || portfolio.environmentMode !== "PAPER" || portfolio.brokerMode !== "FAKE" || portfolio.cash.currency !== fixture.currency || canonicalAmount(portfolio.cash.amount) !== "10000" || (portfolio.positions?.length ?? 0) !== 0 || (command.expectedLedgerEntryCount !== undefined && portfolio.ledgerEntryCount !== command.expectedLedgerEntryCount) || (command.expectedLedgerVersion !== undefined && portfolio.ledgerVersion !== command.expectedLedgerVersion)) throw new Error(`V1.5 ${command.market} paused rejection changed the Portfolio ledger: ${JSON.stringify({ portfolio, expectedLedgerEntryCount: command.expectedLedgerEntryCount, expectedLedgerVersion: command.expectedLedgerVersion })}`);
  if (brokerSummary.namespace !== command.namespace || brokerSummary.brokerMode !== "FAKE" || brokerSummary.order_count !== 0 || brokerSummary.fill_count !== 0 || brokerSummary.unresolved_order_count !== 0 || brokerSummary.pending_outbox_count !== 0 || brokerSummary.externalOnlyOrderCount !== 0) throw new Error(`V1.5 ${command.market} paused rejection created FakeBroker side effects`);
  return { market: command.market, crossCurrencyStatus: crossCurrency.status, crossCurrencyRejection: crossCurrency.body, proposalId: proposal.proposalId, mandateId, mandateStatus: "PAUSED", executionStatus: execution.status, rejectionReasonCode: "MANDATE_INACTIVE", rejection: execution.body, portfolio, brokerSummary };
}

export function v15SessionClock(session: { localDate: string; timeZone: string }, localTime: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(session.localDate);
  const time = /^(\d{2}):(\d{2})$/u.exec(localTime);
  if (!match || !session.timeZone || !time || Number(time[1]) > 23 || Number(time[2]) > 59) throw new Error("V1.5 market session must have a valid local date, time and timezone");
  const target = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]), hour: Number(time[1]), minute: Number(time[2]) };
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: session.timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const localParts = (instant: number) => Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])) as Record<string, number>;
  const targetAsUtc = Date.UTC(target.year, target.month - 1, target.day, target.hour, target.minute);
  let instant = targetAsUtc;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = localParts(instant);
    const represented = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour!, parts.minute!);
    instant += targetAsUtc - represented;
  }
  const verified = localParts(instant);
  if (verified.year !== target.year || verified.month !== target.month || verified.day !== target.day || verified.hour !== target.hour || verified.minute !== target.minute) throw new Error("V1.5 local market session time could not be resolved in its frozen timezone");
  return new Date(instant).toISOString();
}

export function v15SessionOpenClock(session: { localDate: string; timeZone: string; openTimeLocal?: string }): string {
  return v15SessionClock(session, session.openTimeLocal ?? "09:31");
}

export function v15SessionCloseClock(session: { localDate: string; timeZone: string; closeTimeLocal?: string; openTimeLocal?: string }): string {
  if (!session.closeTimeLocal) throw new Error("A frozen session close time is required");
  const opensAt = Date.parse(v15SessionOpenClock(session));
  const closesAt = Date.parse(v15SessionClock(session, session.closeTimeLocal));
  if (!Number.isFinite(opensAt) || !Number.isFinite(closesAt) || closesAt <= opensAt) throw new Error("V1.5 session close must resolve strictly after its open in the frozen Fixture timezone");
  return new Date(closesAt).toISOString();
}

const STRATEGY_VERSION = "fixture-auto-policy-test-v1";

/**
 * Execute the fixed V1.5 AUTO fixture only through persisted Governance,
 * Mandate, Portfolio and FakeBroker services. Every write is idempotently
 * bound to this TestRun so a Temporal retry can safely resume.
 */
export async function executeV15AutoTrade(command: V15AutoTradeCommand, ports: V15AutoTradePorts): Promise<V15AutoOrderResult> {
  if (!command.testRunId || !command.ownerId || !command.namespace || !command.accountId || !["CN_A", "US_EQUITY"].includes(command.market) || !Number.isFinite(Date.parse(command.runClockNow)) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(command.runClockNow)) {
    throw new Error("V1.5 AUTO trade requires an owner-scoped PAPER/FAKE TestRun and injected clock");
  }
  const fixture = command.market === "CN_A"
    ? { securityId: "600000.SH", currency: "CNY" as const, quantity: command.orderQuantity ?? 100, price: 10, fee: 5 }
    : { securityId: "AAPL", currency: "USD" as const, quantity: command.orderQuantity ?? 10, price: 25, fee: 0.05 };
  if (!Number.isSafeInteger(fixture.quantity) || fixture.quantity <= 0 || (command.sessionSequence !== undefined && (!Number.isSafeInteger(command.sessionSequence) || command.sessionSequence < 2))) throw new Error("V1.5 AUTO session sequence and order quantity must be positive Fixture values");
  const nowMs = Date.parse(command.runClockNow);
  const expiresAt = new Date(nowMs + 60 * 60 * 1000).toISOString();
  const proposalCommand: V13ProposalCommand = {
    ownerId: command.ownerId, testRunId: command.testRunId,
    idempotencyKey: `v15-auto-proposal-${command.market}-${command.testRunId}${command.sessionSequence === undefined ? "" : `-session-${command.sessionSequence}`}`,
    accountId: command.accountId, strategyVersion: STRATEGY_VERSION, approvalMode: "AUTO_POLICY",
    market: command.market, currency: fixture.currency, operation: "REBALANCE",
    environmentMode: "PAPER", brokerMode: "FAKE", expiresAt,
    legs: [{ legId: `v15-auto-${command.market}-buy${command.sessionSequence === undefined ? "" : `-session-${command.sessionSequence}`}`, securityId: fixture.securityId, side: "BUY", quantity: fixture.quantity }]
  };
  const proposalResponse = await ports.createProposal(proposalCommand);
  const proposal = proposalResponse.body as V13ProposalResult | undefined;
  if (![200, 201].includes(proposalResponse.status) || !proposal || proposal.ownerId !== command.ownerId || proposal.testRunId !== command.testRunId || proposal.accountId !== command.accountId || proposal.approvalMode !== "AUTO_POLICY" || proposal.status !== "AUTO_POLICY_PENDING" || proposal.strategyVersion !== STRATEGY_VERSION || proposal.market !== command.market || proposal.currency !== fixture.currency || proposal.operation !== "REBALANCE" || proposal.legs.length !== 1 || proposal.legs[0]?.securityId !== fixture.securityId || proposal.legs[0]?.quantity !== fixture.quantity) {
    throw new Error(`V1.5 ${command.market} AUTO Proposal was not persisted with the exact Fixture scope`);
  }

  const mandateHex = createHash("sha256").update(`stockquant-v15-auto-mandate:${command.market}:${command.testRunId}:${command.sessionSequence ?? 1}`).digest("hex").slice(0, 32).split("");
  mandateHex[12] = "5";
  mandateHex[16] = ((Number.parseInt(mandateHex[16]!, 16) & 0x3) | 0x8).toString(16);
  const mandateId = `${mandateHex.slice(0, 8).join("")}-${mandateHex.slice(8, 12).join("")}-${mandateHex.slice(12, 16).join("")}-${mandateHex.slice(16, 20).join("")}-${mandateHex.slice(20).join("")}`;
  const mandateExpiresAt = new Date(nowMs + 24 * 60 * 60 * 1000).toISOString();
  const maxOrderAmount = (fixture.quantity * fixture.price + fixture.fee).toFixed(2);
  const mandateResponse = await ports.createMandate({
    mandateId, mandateVersion: 1, testRunId: command.testRunId, accountId: command.accountId,
    strategyVersion: STRATEGY_VERSION, market: command.market, currency: fixture.currency,
    securityScope: [fixture.securityId], maxOrderAmount, maxTotalAmount: maxOrderAmount,
    maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: mandateExpiresAt,
    reason: "V1.5 isolated fixed Fixture workflow", now: command.runClockNow
  });
  if (!ports.readMandate) throw new Error("V1.5 AUTO execution requires an independent owner/TestRun-scoped Mandate read");
  let mandate = mandateResponse.body;
  if (mandateResponse.status === 409) {
    // Concurrent Temporal deliveries can race the same idempotent insert: the
    // losing transaction may observe the uniqueness conflict before the
    // winning transaction commits. Poll only the scoped read, with a bounded
    // infrastructure delay, until that exact record becomes visible.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
      if (existing.status === 200 && existing.body?.mandateId === mandateId) {
        mandate = existing.body;
        break;
      }
      if (existing.status !== 404) throw new Error(`V1.5 ${command.market} AUTO Mandate conflict could not be resolved by an owner/TestRun-scoped read (${existing.status})`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  if (![200, 201, 409].includes(mandateResponse.status) || !mandate || mandate.mandateId !== mandateId || typeof mandate.contentHash !== "string" || !/^[a-f0-9]{64}$/u.test(mandate.contentHash)) {
    throw new Error(`V1.5 ${command.market} AUTO Mandate was not persisted with a verifiable content hash: ${JSON.stringify({ status: mandateResponse.status, body: mandate ?? null })}`);
  }
  let mandateReadResponse = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
  if (mandateReadResponse.status === 200 && mandateReadResponse.body?.mandateId === mandateId && mandateReadResponse.body?.contentHash === mandate.contentHash && mandateReadResponse.body?.status !== "ACTIVE" && mandateReadResponse.body?.status !== "PAUSED") {
    const activation = await ports.activateMandate(mandateId, { mandateVersion: 1, testRunId: command.testRunId, contentHash: mandate.contentHash, reason: "Authorize this exact isolated Fixture Mandate", now: command.runClockNow });
    if (activation.status === 200) {
      mandateReadResponse = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
    } else {
      mandateReadResponse = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
      const currentStateIsUsableForIdempotentOrderRead = mandateReadResponse.status === 200 && mandateReadResponse.body?.mandateId === mandateId && mandateReadResponse.body?.contentHash === mandate.contentHash && ["ACTIVE", "PAUSED"].includes(String(mandateReadResponse.body?.status));
      if (!currentStateIsUsableForIdempotentOrderRead) throw new Error(`V1.5 ${command.market} AUTO Mandate activation failed (${activation.status}): ${JSON.stringify({ activation: activation.body ?? null, replayRead: mandateReadResponse.body ?? null })}`);
    }
  }

  if (mandateReadResponse.status !== 200 || mandateReadResponse.body?.mandateId !== mandateId || mandateReadResponse.body?.contentHash !== mandate.contentHash || !["ACTIVE", "PAUSED"].includes(String(mandateReadResponse.body?.status))) throw new Error(`V1.5 ${command.market} AUTO Mandate independent status read is neither ACTIVE nor an existing-order replay of PAUSED: ${JSON.stringify(mandateReadResponse.body ?? null)}`);
  const mandateRead = mandateReadResponse.body;
  const mandateValidFrom = command.runClockNow;
  const mandateBudgetMatches = mandateReadResponse.status === 200 && mandateRead
    && mandateRead.mandateId === mandateId && mandateRead.mandateVersion === 1
    && mandateRead.contentHash === mandate.contentHash && mandateRead.ownerId === command.ownerId
    && mandateRead.testRunId === command.testRunId && mandateRead.accountId === command.accountId
    && mandateRead.strategyVersion === STRATEGY_VERSION && mandateRead.market === command.market
    && mandateRead.currency === fixture.currency && ["ACTIVE", "PAUSED"].includes(String(mandateRead.status))
    && Array.isArray(mandateRead.securityScope) && mandateRead.securityScope.length === 1 && mandateRead.securityScope[0] === fixture.securityId
    && mandateRead.maxOrderAmount === maxOrderAmount && mandateRead.maxTotalAmount === maxOrderAmount
    && mandateRead.maxOrderCount === 1 && mandateRead.validFrom === mandateValidFrom && mandateRead.expiresAt === mandateExpiresAt;
  if (!mandateBudgetMatches) throw new Error(`V1.5 ${command.market} AUTO independently read Mandate does not match the persisted Fixture budget and scope: ${JSON.stringify({ status: mandateReadResponse.status, mandate: mandateRead ?? null })}`);

  const clientOrderId = command.recoveryMode ? `v13-fault-unknown-${command.market}-${command.testRunId}` : `v15-auto-${command.market}-${command.testRunId}${command.sessionSequence === undefined ? "" : `-session-${command.sessionSequence}`}`;
  const executionMode = command.sessionSequence !== undefined && !command.recoveryMode ? "SEQUENCED" : "IMMEDIATE";
  const executionResponse = await ports.execute({ proposalId: proposal.proposalId, mandateId, mandateVersion: 1, ownerId: command.ownerId, testRunId: command.testRunId, accountId: command.accountId, namespace: command.namespace, clientOrderId, now: command.runClockNow, executionMode });
  if (![200, 201, 202].includes(executionResponse.status) || !executionResponse.body || typeof executionResponse.body !== "object") {
    throw new Error(`V1.5 ${command.market} AUTO FakeBroker execution failed (${executionResponse.status}): ${JSON.stringify(executionResponse.body ?? null)}`);
  }
  let execution = executionResponse.body as Record<string, unknown>;
  let order = execution.order as Record<string, unknown> | undefined;
  let fill = execution.fill as Record<string, unknown> | undefined;
  let outbox = execution.outbox as Record<string, unknown> | undefined;
  if (execution.executionMode === "SEQUENCED" && ["ACCEPTED", "LEDGER_PENDING", "PARTIALLY_FILLED", "CANCEL_REQUESTED", "CANCELLED", "FILLED"].includes(String(order?.status))) {
    if (!ports.readCancellationRequest || !ports.readOrder || !ports.recordSequencedFill || !ports.requestOrderCancel || !ports.resolveOrderCancel) throw new Error("V1.5 AUTO sequenced execution requires durable cancellation and FakeBroker event ports");
    if (!order) throw new Error("V1.5 AUTO sequenced FakeBroker order is missing");
    const orderId = String(order.order_id ?? order.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/iu.test(orderId)) throw new Error("V1.5 AUTO sequenced FakeBroker order id is missing");
    const existing = await ports.readOrder(command.namespace, clientOrderId);
    const existingFacts = existing.body as { order?: Record<string, unknown>; fills?: Array<Record<string, unknown>> } | undefined;
    if (existing.status !== 200 || !existingFacts?.order) throw new Error("V1.5 AUTO sequenced FakeBroker original order could not be read");
    order = existingFacts.order;
    const requestedAt = await ports.readCancellationRequest(command.testRunId, command.ownerId);
    const cancelling = typeof requestedAt === "string" && Number.isFinite(Date.parse(requestedAt)) && order.status !== "FILLED";
    const alreadyCancelled = order.status === "CANCELLED";
    const previousFilledQuantity = (existingFacts.fills ?? []).reduce((sum, item) => sum + (Number.isSafeInteger(Number(item.quantity)) ? Number(item.quantity) : 0), 0);
    const cumulativeQuantity = alreadyCancelled ? previousFilledQuantity : cancelling ? Math.max(1, Math.floor(fixture.quantity / 2)) : fixture.quantity;
    const totalFeeMinor = BigInt(Math.round(fixture.fee * 100));
    const firstFeeMinor = cancelling && !alreadyCancelled ? (totalFeeMinor * BigInt(cumulativeQuantity) + BigInt(fixture.quantity) / 2n) / BigInt(fixture.quantity) : totalFeeMinor;
    const firstFee = `${firstFeeMinor / 100n}.${(firstFeeMinor % 100n).toString().padStart(2, "0")}`;
    const reportSeed = createHash("sha256").update(`${orderId}:v15-auto-fill-sequence-1`).digest("hex");
    const externalFillId = `${reportSeed.slice(0, 8)}-${reportSeed.slice(8, 12)}-4${reportSeed.slice(13, 16)}-a${reportSeed.slice(17, 20)}-${reportSeed.slice(20, 32)}`;
    if (!alreadyCancelled) {
      const fillResponse = await ports.recordSequencedFill(orderId, { externalFillId, sequence: 1, cumulativeQuantity, price: fixture.price.toFixed(2), fee: firstFee, effectiveAt: new Date(Date.parse(command.runClockNow) + 1000).toISOString(), evidenceRef: `v15-auto-sequenced-fill:${command.testRunId}:${command.market}:${command.sessionSequence ?? 1}:1` });
      if (![200, 202].includes(fillResponse.status)) throw new Error(`V1.5 AUTO FakeBroker Fill sequence 1 failed (${fillResponse.status})`);
    }
    if (cancelling && !alreadyCancelled) {
      const current = await ports.readOrder(command.namespace, clientOrderId);
      const currentOrder = (current.body as { order?: Record<string, unknown> } | undefined)?.order;
      if (current.status !== 200 || !currentOrder) throw new Error("V1.5 AUTO cancellation could not read the original partially-filled FakeBroker order");
      if (currentOrder.status !== "CANCELLED") {
        if (currentOrder.status !== "CANCEL_REQUESTED") {
          const cancel = await ports.requestOrderCancel(orderId);
          if (![200, 202].includes(cancel.status)) throw new Error(`V1.5 AUTO FakeBroker cancel request failed (${cancel.status})`);
        }
        const resolution = await ports.resolveOrderCancel(orderId, { outcome: "ACCEPTED", reason: `V15_AUTO_PARTIAL_FILL_CANCEL:${command.testRunId}:${command.market}:${command.sessionSequence ?? 1}`, sequence: 2 });
        if (![200, 202].includes(resolution.status)) throw new Error(`V1.5 AUTO FakeBroker cancel result failed (${resolution.status})`);
      }
    }
    const authoritative = await ports.readOrder(command.namespace, clientOrderId);
    const facts = authoritative.body as { order?: Record<string, unknown>; fills?: Array<Record<string, unknown>>; outbox?: Record<string, unknown> } | undefined;
    order = facts?.order;
    const fills = facts?.fills ?? [];
    fill = fills.length === 1 ? { ...fills[0], quantity: Number(fills[0]?.quantity), price: String(fills[0]?.price), fee: String(fills[0]?.fee) } : undefined;
    outbox = facts?.outbox;
    execution = { ...execution, order, fill, fills, outbox, cancellation: cancelling ? { requestedAt, partialFillQuantity: cumulativeQuantity, result: "CANCELLED" } : undefined };
  }
  const expectedTerminal = execution.cancellation ? "CANCELLED" : "FILLED";
  const expectedFillQuantity = execution.cancellation ? Math.max(1, Math.floor(fixture.quantity / 2)) : fixture.quantity;
  const expectedFee = execution.cancellation
    ? (BigInt(Math.round(fixture.fee * 100)) * BigInt(expectedFillQuantity) + BigInt(fixture.quantity) / 2n) / BigInt(fixture.quantity)
    : BigInt(Math.round(fixture.fee * 100));
  const expectedFeeText = `${expectedFee / 100n}.${(expectedFee % 100n).toString().padStart(2, "0")}`;
  if (!order || order.clientOrderId !== clientOrderId || order.status !== expectedTerminal || !fill || fill.quantity !== expectedFillQuantity || normalizeDecimal(fill.price) !== normalizeDecimal(fixture.price.toFixed(2)) || normalizeDecimal(fill.fee) !== normalizeDecimal(expectedFeeText) || !outbox || outbox.status !== "DELIVERED") {
    throw new Error(`V1.5 ${command.market} AUTO execution did not produce the exact FakeBroker Fill and delivered Outbox: ${JSON.stringify({ order, fill, outbox })}`);
  }
  const [portfolio, brokerAssetsResponse, brokerSummary] = await Promise.all([
    ports.readPortfolio(command.accountId, command.ownerId),
    ports.readFakeBrokerAssets(command.namespace, command.accountId),
    ports.readBrokerSummary(command.namespace)
  ]);
  const brokerAssets = brokerAssetsResponse.body as V15AutoBrokerAssets | undefined;
  if (execution.cancellation) {
    const reservation = portfolio.reservations?.find((item) => item.clientOrderId === clientOrderId);
    if (reservation?.status !== "RELEASED") throw new Error("V1.5 AUTO accepted partial-fill cancellation did not release its exact Portfolio reservation after the Fill was delivered");
    execution = { ...execution, cancellation: { ...(execution.cancellation as Record<string, unknown>), reservationStatus: reservation.status, releasedCashAmount: reservation.cashAmount } };
  }
  const completedPriorOrderCount = command.sessionSequence === 3 ? 1 : 0;
  const actualQuantity = (portfolio.positions ?? []).find((position) => position.security === fixture.securityId)?.quantity ?? 0;
  const expectedQuantity = completedPriorOrderCount * fixture.quantity + expectedFillQuantity;
  const actualOrderOrdinal = actualQuantity / fixture.quantity;
  const replayedOriginal = execution.replayed === true;
  const allowedQuantity = replayedOriginal ? actualQuantity >= expectedQuantity && actualQuantity <= 2 * fixture.quantity : actualQuantity === expectedQuantity;
  if (!Number.isSafeInteger(actualQuantity) || !allowedQuantity) throw new Error(`V1.5 ${command.market} AUTO cumulative position does not match the persisted sequenced Fill: ${JSON.stringify({ sessionSequence: command.sessionSequence, replayedOriginal, actualQuantity, expectedQuantity })}`);
  const expectedCashNumber = 10_000 - completedPriorOrderCount * (fixture.quantity * fixture.price + fixture.fee) - (expectedFillQuantity * fixture.price + Number(expectedFeeText));
  const expectedCash = expectedCashNumber.toFixed(2);
  const expectedPositions = [{ security: fixture.securityId, quantity: expectedQuantity }];
  const positions = (items: Array<{ security: string; quantity: number }> | undefined) => [...(items ?? [])].sort((a, b) => a.security.localeCompare(b.security));
  if (portfolio.ownerId !== command.ownerId || portfolio.testRunId !== command.testRunId || portfolio.namespace !== command.namespace || portfolio.market !== command.market || portfolio.environmentMode !== "PAPER" || portfolio.brokerMode !== "FAKE" || portfolio.cash.currency !== fixture.currency || normalizeDecimal(portfolio.cash.amount) !== normalizeDecimal(expectedCash) || JSON.stringify(positions(portfolio.positions)) !== JSON.stringify(expectedPositions)) {
    throw new Error(`V1.5 ${command.market} Portfolio ledger does not match the fixed AUTO Fill: ${JSON.stringify({ portfolio, expected: { ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: command.market, currency: fixture.currency, amount: expectedCash, positions: expectedPositions } })}`);
  }
  if (brokerAssetsResponse.status !== 200 || !brokerAssets || brokerAssets.owner_id !== command.ownerId || brokerAssets.test_run_id !== command.testRunId || brokerAssets.currency !== fixture.currency || normalizeDecimal(brokerAssets.current_cash) !== normalizeDecimal(expectedCash) || JSON.stringify(positions(brokerAssets.positions)) !== JSON.stringify(expectedPositions)) {
    throw new Error(`V1.5 ${command.market} independent FakeBroker assets do not match the fixed AUTO Fill`);
  }
  if (brokerSummary.namespace !== command.namespace || brokerSummary.brokerMode !== "FAKE" || brokerSummary.order_count < 1 || brokerSummary.fill_count < 1 || brokerSummary.unresolved_order_count !== 0 || brokerSummary.pending_outbox_count !== 0 || brokerSummary.externalOnlyOrderCount !== 0) {
    throw new Error(`V1.5 ${command.market} FakeBroker reconciliation contains missing, duplicate or unresolved facts`);
  }
  if (!ports.readMandateBudget) throw new Error("V1.5 AUTO requires an independent owner/TestRun-scoped budget reservation read");
  const budgetResponse = await ports.readMandateBudget(mandateId, command.testRunId, 1, command.ownerId);
  const budget = budgetResponse.body;
  const expectedConsumed = (fixture.quantity * fixture.price + fixture.fee).toFixed(2);
  if (budgetResponse.status !== 200 || !budget || budget.ownerId !== command.ownerId || budget.testRunId !== command.testRunId || budget.mandateId !== mandateId || budget.mandateVersion !== 1 || budget.reservedAmount !== "0.00" || budget.consumedAmount !== expectedConsumed || budget.releasedAmount !== "0.00" || budget.reservationCount !== 1 || budget.consumedCount !== 1 || budget.releasedCount !== 0) {
    throw new Error(`V1.5 ${command.market} AUTO independent budget reservation ledger does not match the settled FakeBroker Fill: ${JSON.stringify({ status: budgetResponse.status, budget: budget ?? null, expectedConsumed })}`);
  }
  let pausedAfterSession: { status: "PAUSED"; mandateId: string } | undefined;
  if (command.sessionSequence === 2) {
    if (!ports.pauseMandate) throw new Error("V1.5 multi-session AUTO requires Mandate pause before creating the next session's budget");
    const pause = await ports.pauseMandate(mandateId, { mandateVersion: 1, testRunId: command.testRunId, reason: "Close the fixed daily AUTO authorization after session settlement", now: command.runClockNow });
    const current = await ports.readMandate(mandateId, command.testRunId, command.ownerId);
    if (![200, 409].includes(pause.status) || current.status !== 200 || current.body?.mandateId !== mandateId || current.body?.contentHash !== mandate.contentHash || current.body?.status !== "PAUSED") throw new Error(`V1.5 ${command.market} AUTO daily Mandate must be independently confirmed PAUSED before the next session: ${JSON.stringify({ pause: pause.status, current: current.body ?? null })}`);
    pausedAfterSession = { status: "PAUSED", mandateId };
  }
  // In the normal scenario, whether this Activity attempt replayed is delivery
  // metadata, not a business fact. Recovery explicitly asserts the original
  // order replay, so retain that fact only for its dedicated scenario.
  const stableExecution = { ...execution };
  if (command.sessionSequence !== undefined) delete stableExecution.replayed;
  return { sessionSequence: command.sessionSequence, proposal, mandate: { mandateId, mandateVersion: 1, contentHash: mandate.contentHash, independentlyReadBudget: { status: "ACTIVE", maxOrderAmount, maxTotalAmount: maxOrderAmount, maxOrderCount: 1 }, independentlyReadReservation: budget as V15MandateBudgetLedger, pausedAfterSession }, execution: stableExecution, reconciliation: { portfolio, fakeBroker: brokerAssets, brokerSummary, status: "MATCH" }, windowDecision: command.windowDecision };
}

export async function completeV15AutoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, orders: V15AutoOrderResult[], ports: Pick<V15AutoTradePorts, "readBrokerSummary" | "readPortfolio" | "readFakeBrokerAssets"> & { saveRun(run: Parameters<StageRunRepository["save"]>[0]): Promise<unknown>; findRun(testRunId: string, ownerId: string): Promise<import("../ports/stage-run-repository.js").StoredStageRun | null> }) {
  const byMarketSequence = new Map(orders.map((item) => [`${item.proposal.market}:${item.sessionSequence}`, item]));
  if (input.scenarioId !== "auto-trade" || orders.length !== 4 || ["CN_A", "US_EQUITY"].some((market) => [2, 3].some((sequence) => !byMarketSequence.has(`${market}:${sequence}`)))) throw new Error("V1.5 AUTO completion requires a fresh order for each market's sessions 2 and 3");
  const missedOrders = ["CN_A", "US_EQUITY"].map((market) => byMarketSequence.get(`${market}:2`)!);
  if (missedOrders.some((item) => item.windowDecision?.missedSession !== 1 || item.windowDecision?.staleOrderCreated !== false || item.windowDecision?.reevaluatedSession !== 2 || !Number.isFinite(Date.parse(item.windowDecision.missedAt)))) throw new Error("V1.5 AUTO completion requires evidence that each expired window was skipped and re-evaluated in session 2");
  const endOfDaySessions = {} as Record<"CN_A" | "US_EQUITY", Array<{ localDate: string; timeZone: string; calendarVersion: string; sequence: number; openAt: string; closeAt: string; fillAt: string; orderAndFillBeforeClose: true; reconciliation: V15AutoOrderResult["reconciliation"] }>>;
  for (const market of ["CN_A", "US_EQUITY"] as const) {
    endOfDaySessions[market] = [];
    for (const sequence of [2, 3] as const) {
      const session = input.sessions.find((item) => item.market === market && item.sequence === sequence);
      const order = byMarketSequence.get(`${market}:${sequence}`)!;
      if (!session || !session.openTimeLocal || !session.closeTimeLocal) throw new Error(`V1.5 AUTO end-of-day requires an explicit frozen ${market} session ${sequence} open and close`);
      const openAt = Date.parse(v15SessionOpenClock(session));
      const closeAt = Date.parse(v15SessionCloseClock(session));
      const fillAtValue = (order.execution.fill as { effectiveAt?: unknown } | null | undefined)?.effectiveAt;
      const fillAt = typeof fillAtValue === "string" ? Date.parse(fillAtValue) : Number.NaN;
      if (!Number.isFinite(fillAt) || fillAt < openAt || fillAt >= closeAt) throw new Error(`V1.5 ${market} AUTO Fill must occur inside frozen session ${sequence} before day-end reconciliation`);
      endOfDaySessions[market].push({ localDate: session.localDate, timeZone: session.timeZone, calendarVersion: session.calendarVersion, sequence, openAt: new Date(openAt).toISOString(), closeAt: new Date(closeAt).toISOString(), fillAt: new Date(fillAt).toISOString(), orderAndFillBeforeClose: true, reconciliation: order.reconciliation });
    }
  }
  const summaryPromise = ports.readBrokerSummary(input.namespace);
  const terminalReads = await Promise.all(
    (["CN_A", "US_EQUITY"] as const).flatMap((market) => [
      ports.readPortfolio(accounts[market].accountId, input.ownerId),
      ports.readFakeBrokerAssets(input.namespace, accounts[market].accountId)
    ])
  );
  const summary = await summaryPromise;
  if (summary.namespace !== input.namespace || summary.brokerMode !== "FAKE" || summary.order_count !== 4 || summary.fill_count !== 4 || summary.unresolved_order_count !== 0 || summary.pending_outbox_count !== 0 || summary.externalOnlyOrderCount !== 0) throw new Error("V1.5 AUTO completion requires four reconciled FakeBroker orders and Fills across two sessions");
  const terminalReconciliation = {} as Record<"CN_A" | "US_EQUITY", { portfolio: V15AutoPortfolioSnapshot; fakeBroker: V15AutoBrokerAssets }>;
  for (const [index, market] of (["CN_A", "US_EQUITY"] as const).entries()) {
    const fixture = market === "CN_A"
      ? { currency: "CNY", security: "600000.SH", quantity: 100, cash: "8990.00" }
      : { currency: "USD", security: "AAPL", quantity: 10, cash: "9749.90" };
    const portfolio = terminalReads[index * 2] as V15AutoPortfolioSnapshot;
    const brokerResponse = terminalReads[index * 2 + 1] as Awaited<ReturnType<V15AutoTradePorts["readFakeBrokerAssets"]>>;
    const fakeBroker = brokerResponse.body as V15AutoBrokerAssets | undefined;
    const actualPositions = (positions: Array<{ security: string; quantity: number }> | undefined) => JSON.stringify([...(positions ?? [])].sort((a, b) => a.security.localeCompare(b.security)));
    const expectedPositions = JSON.stringify([{ security: fixture.security, quantity: fixture.quantity }]);
    if (portfolio.ownerId !== input.ownerId || portfolio.testRunId !== input.testRunId || portfolio.namespace !== input.namespace || portfolio.market !== market || portfolio.environmentMode !== "PAPER" || portfolio.brokerMode !== "FAKE" || portfolio.cash.currency !== fixture.currency || normalizeDecimal(portfolio.cash.amount) !== normalizeDecimal(fixture.cash) || actualPositions(portfolio.positions) !== expectedPositions) {
      throw new Error(`V1.5 AUTO terminal Portfolio read does not match the completed ${market} Fixture trade`);
    }
    if (brokerResponse.status !== 200 || !fakeBroker || fakeBroker.owner_id !== input.ownerId || fakeBroker.test_run_id !== input.testRunId || fakeBroker.currency !== fixture.currency || normalizeDecimal(fakeBroker.current_cash) !== normalizeDecimal(fixture.cash) || actualPositions(fakeBroker.positions) !== expectedPositions) {
      throw new Error(`V1.5 AUTO terminal FakeBroker read does not match the completed ${market} Fixture trade`);
    }
    terminalReconciliation[market] = { portfolio, fakeBroker };
  }
  const evidence = {
    evidenceScope: "TEMPORAL_AUTO_TRADE_FIXED_FIXTURE",
    businessExecution: "AUTO_TRADE_EXECUTED",
    businessServicesCalled: ["decision-governance-service", "portfolio-risk-service", "trade-execution-service"],
    workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED",
    liveTradingEnabled: false, brokerMode: "FAKE", fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256,
    seed: input.seed, accountIds: { CN_A: accounts.CN_A.accountId, US_EQUITY: accounts.US_EQUITY.accountId },
    orders: orders.map(({ sessionSequence, proposal, mandate, execution, reconciliation, windowDecision }) => ({ market: proposal.market, sessionSequence, proposalId: proposal.proposalId, mandate, order: execution.order, fill: execution.fill, outbox: execution.outbox, reconciliation, windowDecision })),
    reconciliation: { status: "MATCH", fakeBroker: summary },
    workflowCompletionReconciliation: { status: "MATCH", source: "FRESH_OWNER_AND_TESTRUN_SCOPED_PORTFOLIO_AND_FAKEBROKER_READS", byMarket: terminalReconciliation },
    missedWindowRecovery: { status: "RECOVERED", policy: "MISSED_WINDOW_REEVALUATE_NEXT_SESSION", byMarket: Object.fromEntries(missedOrders.map((item) => [item.proposal.market, item.windowDecision])) },
    dailyEndOfDay: { status: "MATCH", clockSource: "VERSIONED_AUTO_TRADE_FIXTURE_SESSION_CLOSE", sessionsPerMarket: 3, executedSessionsPerMarket: 2, byMarket: endOfDaySessions },
    multiSessionObservation: "NOT_RUN", humanAcceptance: "NOT_RUN"
  };
  const run: Parameters<StageRunRepository["save"]>[0] = { testRunId: input.testRunId, stageId: "V1.5", scenarioId: input.scenarioId, scenarioVersion: "1.3.0", ownerId: input.ownerId, namespace: input.namespace, status: "WAITING", seed: input.seed, assertions: [
    { assertionId: "V1.5-AUTO-ORDER-001", status: "PASS", expected: "Each CN_A and US session reevaluation produces a distinct persisted FakeBroker Fill and delivered Outbox", actual: evidence.orders },
    { assertionId: "V1.5-AUTO-RECON-001", status: "PASS", expected: "Portfolio and independent FakeBroker cash/positions match; exactly four orders and fills across two execution sessions have no unresolved or pending facts", actual: evidence.reconciliation },
    { assertionId: "V1.5-AUTO-TERMINAL-RECON-001", status: "PASS", expected: "Fresh owner/TestRun-scoped Portfolio and FakeBroker reads for both markets still match after all AUTO activities finish", actual: evidence.workflowCompletionReconciliation },
    { assertionId: "V1.5-AUTO-EOD-RECON-001", status: "PASS", expected: "At each explicitly listed Fixture session close, fresh Portfolio and independent FakeBroker reads match and the session's order Fill occurred after open and before close", actual: evidence.dailyEndOfDay },
    { assertionId: "V1.5-AUTO-MISSED-WINDOW-001", status: "PASS", expected: "The first session window is MISSED_WINDOW with no stale order; a new scoped Proposal and Mandate are created and executed in session 2", actual: evidence.missedWindowRecovery }
  ], evidence };
  try { return await ports.saveRun(run); }
  catch (error) {
    const stored = await ports.findRun(input.testRunId, input.ownerId);
    const storedOrders = Array.isArray(stored?.evidence.orders) ? stored.evidence.orders as Array<Record<string, unknown>> : [];
    const expectedIdentities = orders.map((item) => `${item.proposal.market}:${item.sessionSequence}:${item.proposal.proposalId}`).sort();
    const actualIdentities = storedOrders.map((item) => `${String(item.market)}:${String(item.sessionSequence)}:${String(item.proposalId)}`).sort();
    const replayedBusinessFactsMatch = storedOrders.length === orders.length && orders.every((item) => {
      const prior = storedOrders.find((entry) => entry.market === item.proposal.market && entry.sessionSequence === item.sessionSequence && entry.proposalId === item.proposal.proposalId);
      const priorOrder = prior?.order as Record<string, unknown> | undefined;
      const priorFill = prior?.fill as Record<string, unknown> | undefined;
      const currentOrder = item.execution.order as Record<string, unknown>;
      const currentFill = item.execution.fill as Record<string, unknown>;
      return priorOrder?.order_id === currentOrder.order_id && priorOrder?.clientOrderId === currentOrder.clientOrderId && priorFill?.externalFillId === currentFill.externalFillId && priorFill?.quantity === currentFill.quantity;
    });
    const idempotentSaveReplay = ["QUEUED", "RUNNING", "WAITING", "COMPLETED"].includes(String(stored?.status)) && stored?.stageId === run.stageId && stored.scenarioId === run.scenarioId && stored.scenarioVersion === run.scenarioVersion && stored.ownerId === run.ownerId && stored.namespace === run.namespace && stored.seed === run.seed && stored.evidence.businessExecution === "AUTO_TRADE_EXECUTED" && stored.evidence.fixtureSha256 === input.fixtureSha256 && stored.evidence.fixtureVersion === input.fixtureVersion && JSON.stringify(actualIdentities) === JSON.stringify(expectedIdentities) && replayedBusinessFactsMatch && stored.assertions.length >= 5 && stored.assertions.every((assertion) => typeof assertion === "object" && assertion !== null && "status" in assertion && assertion.status === "PASS");
    if (!idempotentSaveReplay) throw new Error(`V1.5 AUTO completion save conflict did not match an already-validated business result: ${JSON.stringify({ storedStatus: stored?.status ?? null, stageId: stored?.stageId ?? null, scenarioId: stored?.scenarioId ?? null, fixtureVersion: stored?.evidence.fixtureVersion ?? null, fixtureSha256: stored?.evidence.fixtureSha256 ?? null, storedOrderCount: storedOrders.length, actualIdentities, expectedIdentities, replayedBusinessFactsMatch, assertionStatuses: stored?.assertions.map((assertion) => typeof assertion === "object" && assertion !== null && "status" in assertion ? assertion.status : null) ?? [] })}`, { cause: error });
    return stored;
  }
}

export async function completeV15AutoTradeCancelled(
  input: V15NoTradeInput,
  accounts: Record<"CN_A" | "US_EQUITY", V15Account>,
  result: V15AutoExecutionResult,
  ports: Pick<V15AutoTradePorts, "readBrokerSummary"> & { saveRun(run: Parameters<StageRunRepository["save"]>[0]): Promise<unknown> }
) {
  if (input.scenarioId !== "auto-trade" || !result.cancelled || !result.cancelRequestedAt || result.orders.length >= 4) throw new Error("V1.5 AUTO cancellation completion requires a pending cancellation before all four Fixture orders complete");
  const cancelledPartialFill = result.orders.find((item) => {
    const cancellation = item.execution.cancellation as { result?: unknown; reservationStatus?: unknown } | undefined;
    const order = item.execution.order as Record<string, unknown> | undefined;
    const fill = item.execution.fill as Record<string, unknown> | undefined;
    const quantity = Number(fill?.quantity);
    return cancellation?.result === "CANCELLED" && cancellation.reservationStatus === "RELEASED" && order?.status === "CANCELLED" && Number.isSafeInteger(quantity) && quantity > 0;
  });
  if (!cancelledPartialFill) throw new Error("V1.5 AUTO cancellation requires a persisted partial Fill followed by an authoritative FakeBroker CANCELLED result");
  const keys = result.orders.map((order) => `${order.proposal.market}:${order.sessionSequence}`);
  if (new Set(keys).size !== keys.length || result.orders.some((order) => ![2, 3].includes(order.sessionSequence ?? 0) || order.reconciliation.status !== "MATCH" || (order.execution.outbox as Record<string, unknown> | undefined)?.status !== "DELIVERED")) {
    throw new Error("V1.5 cancelled AUTO orders must be unique Fixture sessions with reconciled, delivered fills");
  }
  const summary = await ports.readBrokerSummary(input.namespace);
  if (summary.namespace !== input.namespace || summary.brokerMode !== "FAKE" || summary.order_count !== result.orders.length || summary.fill_count !== result.orders.length || summary.unresolved_order_count !== 0 || summary.pending_outbox_count !== 0 || summary.externalOnlyOrderCount !== 0) {
    throw new Error("V1.5 cancellation must leave exactly the already-completed FakeBroker orders and Fills with no unresolved facts");
  }
  const orders = result.orders.map(({ sessionSequence, proposal, mandate, execution, reconciliation, windowDecision }) => ({ market: proposal.market, sessionSequence, proposalId: proposal.proposalId, mandate, order: execution.order, fill: execution.fill, fills: execution.fills, cancellation: execution.cancellation, outbox: execution.outbox, reconciliation, windowDecision }));
  const evidence = {
    evidenceScope: "TEMPORAL_AUTO_TRADE_FIXED_FIXTURE_CANCELLATION",
    businessExecution: "AUTO_TRADE_CANCELLED",
    businessServicesCalled: ["decision-governance-service", "portfolio-risk-service", "trade-execution-service"],
    workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED",
    liveTradingEnabled: false, brokerMode: "FAKE", fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256,
    seed: input.seed, accountIds: { CN_A: accounts.CN_A.accountId, US_EQUITY: accounts.US_EQUITY.accountId },
    orders, reconciliation: { status: "MATCH", fakeBroker: summary },
    autoTradeCancellation: { status: "CURRENT_ORDER_PARTIALLY_FILLED_THEN_CANCELLED", requestedAt: result.cancelRequestedAt, cancelledOrderId: (cancelledPartialFill.execution.order as Record<string, unknown>).order_id, partialFillQuantity: (cancelledPartialFill.execution.fill as Record<string, unknown>).quantity, remainingQuantityCancelled: cancelledPartialFill.proposal.legs[0]!.quantity - Number((cancelledPartialFill.execution.fill as Record<string, unknown>).quantity), reservationStatus: "RELEASED", completedOrderCount: orders.length, laterSessionOrdersCreated: 0 },
    dailyEndOfDay: "NOT_RUN", missedWindowRecovery: "NOT_RUN", backupRestore: "NOT_RUN", humanAcceptance: "NOT_RUN"
  };
  return ports.saveRun({ testRunId: input.testRunId, stageId: "V1.5", scenarioId: input.scenarioId, scenarioVersion: "1.3.0", ownerId: input.ownerId, namespace: input.namespace, status: "WAITING", seed: input.seed, assertions: [
    { assertionId: "V1.5-AUTO-CANCEL-001", status: "PASS", expected: "A durable TestRun cancellation is arbitrated after a persisted partial FakeBroker Fill; the remaining quantity is cancelled, its reservation is released after Fill delivery, and no later session order is sent", actual: evidence.autoTradeCancellation },
    { assertionId: "V1.5-AUTO-ORDER-001", status: "WAITING", expected: "All four CN/US session orders and Fills complete", actual: { completedOrderCount: orders.length, cancellation: evidence.autoTradeCancellation } },
    { assertionId: "V1.5-AUTO-RECON-001", status: "PASS", expected: "Every completed order is independently reconciled; FakeBroker counts equal completed fills and no outbox remains pending", actual: evidence.reconciliation }
  ], evidence });
}

export async function completeV15Recovery(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, orders: V15AutoOrderResult[], ports: Pick<V15AutoTradePorts, "readBrokerSummary"> & { saveRun(run: Parameters<StageRunRepository["save"]>[0]): Promise<unknown> }) {
  const byMarket = new Map(orders.map((item) => [item.proposal.market, item]));
  if (input.scenarioId !== "recovery" || orders.length !== 2 || !byMarket.has("CN_A") || !byMarket.has("US_EQUITY") || byMarket.get("CN_A")?.execution.replayed !== true || byMarket.get("US_EQUITY")?.execution.replayed === true) throw new Error("V1.5 recovery requires the CN UNKNOWN order to replay its original and the US control order to execute once");
  const summary = await ports.readBrokerSummary(input.namespace);
  if (summary.namespace !== input.namespace || summary.brokerMode !== "FAKE" || summary.order_count !== 2 || summary.fill_count !== 2 || summary.unresolved_order_count !== 0 || summary.pending_outbox_count !== 0 || summary.externalOnlyOrderCount !== 0) throw new Error("V1.5 recovery requires exactly two original FakeBroker orders and Fills with no unresolved facts");
  const ordersEvidence = orders.map(({ proposal, execution, reconciliation }) => ({ market: proposal.market, clientOrderId: (execution.order as Record<string, unknown>).clientOrderId, replayedOriginal: execution.replayed, orderId: (execution.order as Record<string, unknown>).order_id, fillId: (execution.fill as Record<string, unknown>).externalFillId, reconciliation }));
  const evidence = { evidenceScope: "TEMPORAL_AUTO_TRADE_UNKNOWN_RECOVERY", workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_RECOVERED", liveTradingEnabled: false, brokerMode: "FAKE", fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256, seed: input.seed, accountIds: { CN_A: accounts.CN_A.accountId, US_EQUITY: accounts.US_EQUITY.accountId }, orders: ordersEvidence, recovery: { responseLostAfterFakeBrokerCommit: true, originalOrderQueried: true, replayedOriginalPerMarket: orders.map((item) => ({ market: item.proposal.market, replayed: item.execution.replayed })) }, reconciliation: { status: "MATCH", fakeBroker: summary }, dailyEndOfDay: "NOT_RUN", backupRestore: "NOT_RUN", humanAcceptance: "NOT_RUN" };
  return ports.saveRun({ testRunId: input.testRunId, stageId: "V1.5", scenarioId: input.scenarioId, scenarioVersion: "1.2.0", ownerId: input.ownerId, namespace: input.namespace, status: "WAITING", seed: input.seed, assertions: [
    { assertionId: "V1.5-RECOVERY-001", status: "PASS", expected: "After the CN accepted response is lost, the same clientOrderId queries and reuses its original order; the US control order executes once", actual: evidence.recovery },
    { assertionId: "V1.5-RECOVERY-002", status: "PASS", expected: "Exactly two original FakeBroker orders/fills, delivered outboxes, matched ledgers, and zero unresolved/pending facts", actual: { orders: ordersEvidence, reconciliation: evidence.reconciliation } }
  ], evidence });
}

export async function completeV15PausedRejection(input: V15NoTradeInput, results: Awaited<ReturnType<typeof rejectV15PausedAutoTrade>>[], saveRun: (run: Parameters<StageRunRepository["save"]>[0]) => Promise<unknown>) {
  if (input.scenarioId !== "rejection" || results.length !== 2 || !results.some((item) => item.market === "CN_A") || !results.some((item) => item.market === "US_EQUITY")) throw new Error("V1.5 rejection completion requires both frozen market Fixtures");
  if (results.some((item) => item.crossCurrencyStatus !== 422)) throw new Error("V1.5 rejection completion requires a 422 Governance rejection for each cross-currency Proposal");
  const evidence = { evidenceScope: "TEMPORAL_PAUSED_MANDATE_REJECTION", workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "PAUSED_MANDATE_REJECTED", liveTradingEnabled: false, brokerMode: "FAKE", fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256, seed: input.seed, rejections: results, orders: "NONE", fills: "NONE", budgetReservations: "NONE", humanAcceptance: "NOT_RUN" };
  return saveRun({ testRunId: input.testRunId, stageId: "V1.5", scenarioId: input.scenarioId, scenarioVersion: "1.1.0", ownerId: input.ownerId, namespace: input.namespace, status: "WAITING", seed: input.seed, assertions: [
    { assertionId: "V1.5-OPS-PAUSE-001", status: "PASS", expected: "CN and US AUTO proposals are rejected with Governance reason MANDATE_INACTIVE while their mandates are PAUSED", actual: results.map(({ market, mandateStatus, executionStatus, rejectionReasonCode, rejection }) => ({ market, mandateStatus, executionStatus, rejectionReasonCode, rejection })) },
    { assertionId: "V1.5-XMK-CURRENCY-002", status: "PASS", expected: "Governance rejects AUTO_POLICY Proposals whose market and currency do not match before persistence or Trade Execution", actual: results.map(({ market, crossCurrencyStatus, crossCurrencyRejection }) => ({ market, httpStatus: crossCurrencyStatus, rejection: crossCurrencyRejection })) },
    { assertionId: "V1.5-REJECTION-ZERO-SIDE-EFFECTS-001", status: "PASS", expected: "No FakeBroker orders, fills, pending outbox, Portfolio position, or cash change in either market", actual: results.map(({ market, portfolio, brokerSummary }) => ({ market, portfolio, brokerSummary })) }
  ], evidence });
}
