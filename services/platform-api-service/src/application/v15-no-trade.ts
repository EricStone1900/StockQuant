import type { StageRunRepository } from "../ports/stage-run-repository.js";
import type { StoredStageRun } from "../ports/stage-run-repository.js";
import type { V15Scenario } from "./v15-orchestration.js";

export type V15Market = "CN_A" | "US_EQUITY";
export type V15Session = { market: V15Market; localDate: string; timeZone: string; calendarVersion: string; sequence: number };
export type V15Account = {
  accountId: string; ownerId: string; testRunId: string; namespace: string; market: V15Market;
  environmentMode: string; brokerMode: string; cash: { amount: string; currency: string };
  positions?: Array<{ security: string; quantity: number }>;
  ledgerEntryCount?: number; ledgerVersion?: number;
  reservations?: Array<{ status: string }>;
};
export type V15BrokerSummary = { namespace: string; brokerMode: string; order_count: number; fill_count: number; unresolved_order_count: number; pending_outbox_count: number; externalOnlyOrderCount: number };

export interface V15NoTradePorts {
  initializeAccount(input: { testRunId: string; ownerId: string; namespace: string; market: V15Market }): Promise<V15Account>;
  readAccount(accountId: string, ownerId: string): Promise<V15Account>;
  readBrokerSummary(namespace: string): Promise<V15BrokerSummary>;
  saveRun(run: Parameters<StageRunRepository["save"]>[0]): Promise<StoredStageRun>;
}

export type V15NoTradeInput = {
  testRunId: string; ownerId: string; namespace: string; seed: number; scenarioId: V15Scenario;
  sessions: V15Session[]; fixtureVersion: string; fixtureSha256: string;
};

function requireAccount(account: V15Account, input: V15NoTradeInput, market: V15Market): void {
  if (account.ownerId !== input.ownerId || account.testRunId !== input.testRunId || account.namespace !== input.namespace || account.market !== market || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") {
    throw new Error(`V1.5 ${market} Portfolio account is outside the isolated PAPER/FAKE TestRun`);
  }
}

function equalDecimal(left: string, right: string): boolean {
  const canonical = (value: string) => {
    if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(value)) return null;
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.replace(/0+$/u, "")}`.replace(/\.$/u, "");
  };
  const leftValue = canonical(left); const rightValue = canonical(right);
  return leftValue !== null && leftValue === rightValue;
}

export async function prepareV15NoTrade(input: V15NoTradeInput, ports: Pick<V15NoTradePorts, "initializeAccount">) {
  const accounts = {} as Record<V15Market, V15Account>;
  for (const market of ["CN_A", "US_EQUITY"] as const) {
    accounts[market] = await ports.initializeAccount({ ...input, market });
    requireAccount(accounts[market], input, market);
    if (accounts[market].positions?.length) throw new Error(`V1.5 ${market} initial account must be flat`);
    const expectedCurrency = market === "CN_A" ? "CNY" : "USD";
    if (accounts[market].cash.currency !== expectedCurrency || !equalDecimal(accounts[market].cash.amount, "10000.00")) throw new Error(`V1.5 ${market} initial cash must match the frozen V1 PAPER account Fixture`);
    if (accounts[market].ledgerEntryCount !== 1 || accounts[market].ledgerVersion !== 1 || (accounts[market].reservations?.length ?? 0) !== 0) throw new Error(`V1.5 ${market} initial ledger must contain only opening cash with no resource reservations`);
  }
  return accounts;
}

export async function verifyV15NoTradeSession(input: V15NoTradeInput, session: V15Session, baseline: V15Account, ports: Pick<V15NoTradePorts, "readAccount" | "readBrokerSummary">) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(session.localDate) || !Number.isSafeInteger(session.sequence) || session.sequence < 1 || !session.timeZone || !session.calendarVersion) throw new Error("V1.5 session must have a frozen local date, sequence, timezone and calendar version");
  const account = await ports.readAccount(baseline.accountId, input.ownerId);
  requireAccount(account, input, session.market);
  const expectedCurrency = session.market === "CN_A" ? "CNY" : "USD";
  if (account.cash.currency !== expectedCurrency || !equalDecimal(account.cash.amount, baseline.cash.amount) || account.ledgerEntryCount !== baseline.ledgerEntryCount || account.ledgerVersion !== baseline.ledgerVersion || (account.reservations?.length ?? 0) !== 0) throw new Error(`V1.5 ${session.market} account cash, ledger or reserved budget changed`);
  const summary = await ports.readBrokerSummary(input.namespace);
  if (summary.namespace !== input.namespace || summary.brokerMode !== "FAKE") throw new Error("V1.5 reconciliation source is not the isolated FakeBroker namespace");
  const noOrders = summary.order_count === 0 && summary.fill_count === 0 && summary.unresolved_order_count === 0 && summary.pending_outbox_count === 0 && summary.externalOnlyOrderCount === 0;
  const noLedgerChanges = equalDecimal(account.cash.amount, baseline.cash.amount) && (account.positions?.length ?? 0) === 0;
  if (!noOrders || !noLedgerChanges) throw new Error(`V1.5 NO_TRADE facts changed on ${session.market} ${session.localDate}`);
  return { market: session.market, localDate: session.localDate, timeZone: session.timeZone, calendarVersion: session.calendarVersion, sequence: session.sequence, accountId: baseline.accountId, cash: account.cash, ledgerEntryCount: account.ledgerEntryCount, ledgerVersion: account.ledgerVersion, reservations: account.reservations ?? [], positions: account.positions ?? [], broker: summary };
}

export async function completeV15NoTrade(input: V15NoTradeInput, accounts: Record<V15Market, V15Account>, observations: ReturnType<typeof verifyV15NoTradeSession> extends Promise<infer T> ? T[] : never, ports: Pick<V15NoTradePorts, "saveRun">) {
  const byMarket = { CN_A: observations.filter((item) => item.market === "CN_A"), US_EQUITY: observations.filter((item) => item.market === "US_EQUITY") };
  if (byMarket.CN_A.length !== 60 || byMarket.US_EQUITY.length !== 60 || byMarket.CN_A.some((item, index) => item.sequence !== index + 1) || byMarket.US_EQUITY.some((item, index) => item.sequence !== index + 1)) throw new Error("V1.5 NO_TRADE completion requires exactly 60 ordered authoritative observations per market");
  if (observations.length !== input.sessions.length || observations.some((item, index) => item.market !== input.sessions[index]?.market || item.localDate !== input.sessions[index]?.localDate || item.sequence !== input.sessions[index]?.sequence || item.broker.order_count !== 0 || item.broker.fill_count !== 0 || item.broker.unresolved_order_count !== 0 || item.broker.pending_outbox_count !== 0 || item.broker.externalOnlyOrderCount !== 0 || item.positions.length !== 0 || (item.reservations?.length ?? 0) !== 0)) throw new Error("V1.5 NO_TRADE observations do not match the frozen calendar or zero-side-effect assertions");
  const ids = input.scenarioId === "normal" ? ["V1.5-SYS-SCHEDULE-001", "V1.5-HOLD-002"] : input.scenarioId === "rejection" ? ["V1.5-OPS-PAUSE-001", "V1.5-XMK-CURRENCY-002"] : ["V1.5-RECOVERY-001", "V1.5-RECOVERY-002"];
  const assertions = ids.map((assertionId) => ({
    assertionId,
    status: assertionId === "V1.5-HOLD-002" ? "PASS" : "WAITING",
    expected: assertionId === "V1.5-HOLD-002" ? "60 local virtual sessions per market; authoritative order/fill/ledger/position facts remain unchanged" : "Automatic approval-to-order dispatch and its independent evidence are still required",
    actual: assertionId === "V1.5-HOLD-002" ? { sessionsPerMarket: 60, authoritativeObservations: 120, brokerOrders: 0, brokerFills: 0, accountBalanceUnchanged: true, positionsUnchanged: true } : "NOT_RUN",
  }));
  const finalObservations = observations.at(-1);
  const evidence = {
    evidenceScope: "TEMPORAL_NO_TRADE_WITH_AUTHORITATIVE_DOMAIN_READS",
    businessExecution: "NO_TRADE_SESSIONS_EXECUTED",
    businessServicesCalled: ["portfolio-risk-service", "trade-execution-service"],
    brokerMode: "FAKE", liveTradingEnabled: false, fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256,
    workflow: "TEMPORAL_COMPLETED", nats: "NOT_USED_FOR_NO_TRADE_SESSION_DISPATCH", temporal: "COMPLETED",
    seed: input.seed, accountIds: { CN_A: accounts.CN_A.accountId, US_EQUITY: accounts.US_EQUITY.accountId },
    localSessions: { CN_A: byMarket.CN_A.length, US_EQUITY: byMarket.US_EQUITY.length, authoritativeObservations: observations.length,
      first: { CN_A: byMarket.CN_A[0]?.localDate, US_EQUITY: byMarket.US_EQUITY[0]?.localDate },
      last: { CN_A: byMarket.CN_A.at(-1)?.localDate, US_EQUITY: byMarket.US_EQUITY.at(-1)?.localDate } },
    orders: "ZERO_AUTHORITATIVE_FAKEBROKER_ORDERS", fills: "ZERO_AUTHORITATIVE_FAKEBROKER_FILLS",
    portfolioLedgerFacts: { source: "PORTFOLIO_ACCOUNT_SNAPSHOTS", endingCash: { CN_A: byMarket.CN_A.at(-1)?.cash, US_EQUITY: byMarket.US_EQUITY.at(-1)?.cash }, ledgerEntries: { CN_A: byMarket.CN_A.at(-1)?.ledgerEntryCount, US_EQUITY: byMarket.US_EQUITY.at(-1)?.ledgerEntryCount }, positions: { CN_A: [], US_EQUITY: [] }, resourceReservations: 0, budgetConsumed: "0.00" },
    reconciliation: finalObservations ? { source: "FAKEBROKER_INDEPENDENT_RECONCILIATION", final: finalObservations.broker } : "NOT_RUN",
    automaticTrading: "NOT_RUN", backupRestore: "NOT_RUN",
  };
  return ports.saveRun({ testRunId: input.testRunId, stageId: "V1.5", scenarioId: input.scenarioId, scenarioVersion: "1.1.0", ownerId: input.ownerId, namespace: input.namespace, status: "WAITING", seed: input.seed, assertions, evidence });
}
