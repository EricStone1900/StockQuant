import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { resolve } from "node:path";
import { createServer } from "node:net";

const databaseUrl = process.env.PORTFOLIO_RISK_TEST_DATABASE_URL ?? "postgresql://portfolio_risk@127.0.0.1:5433/portfolio_risk_test";
if (decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) !== "portfolio_risk_test") throw new Error("Portfolio HTTP auth smoke requires portfolio_risk_test only");
const pool = new Pool({ connectionString: databaseUrl });
const token = () => `test-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const tokens = { platform: token(), trade: token(), replay: token(), harness: token() };
const ownerId = `auth-smoke-${randomUUID()}`;
const namespace = `portfolio-auth-smoke/${randomUUID()}`;
const testRunId = randomUUID();
const port = await new Promise((resolvePort, reject) => {
  const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
});
const env = {
  PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test",
  STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl,
  STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform,
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay,
  STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS: tokens.harness,
};
const service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => { if (output.length < 12000) output += chunk.toString().slice(0, 12000 - output.length); });
const base = `http://127.0.0.1:${port}`;
async function waitReady() {
  for (let i = 0; i < 100; i += 1) {
    if (service.exitCode !== null) throw new Error(`portfolio service exited: ${output}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* waiting */ }
    await delay(100);
  }
  throw new Error(`portfolio service did not start: ${output}`);
}
async function request(path, method, caller, bearer, body, extraHeaders = {}) {
  return fetch(`${base}${path}`, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(caller ? { "x-stockquant-service-id": caller } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...extraHeaders }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
let accountId;
let backtestAccountId;
let settlementAccountId;
try {
  await waitReady();
  const matrixAccountId = randomUUID();
  const portfolioRoutes = [
    { method: "POST", path: () => "/internal/v1/accounts/initialize", callers: ["platform-api-service", "historical-replay-worker"] },
    { method: "POST", path: (accountId) => `/internal/v1/accounts/${accountId}/fills`, callers: ["trade-execution-service"] },
    { method: "POST", path: (accountId) => `/internal/v1/accounts/${accountId}/fills/fill-auth-matrix/fee-corrections`, callers: ["trade-execution-service"] },
    { method: "POST", path: (accountId) => `/internal/v1/accounts/${accountId}/reservations`, callers: ["trade-execution-service"] },
    { method: "POST", path: (accountId) => `/internal/v1/accounts/${accountId}/settlements`, callers: ["trade-execution-service"] },
    { method: "POST", path: (accountId) => `/internal/v1/accounts/${accountId}/reservations/${randomUUID()}/resolve`, callers: ["trade-execution-service"] },
    { method: "GET", path: (accountId) => `/internal/v1/accounts/${accountId}/sellable`, callers: ["platform-api-service"] },
    { method: "GET", path: (accountId) => `/internal/v1/accounts/${accountId}/snapshot`, callers: ["platform-api-service", "historical-replay-worker"] },
    { method: "POST", path: () => "/internal/v1/faults/fill", callers: ["test-harness"] },
  ];
  const portfolioCallers = [
    { id: "platform-api-service", token: tokens.platform },
    { id: "trade-execution-service", token: tokens.trade },
    { id: "historical-replay-worker", token: tokens.replay },
    { id: "test-harness", token: tokens.harness },
  ];
  const readPortfolioFactCounts = async () => (await pool.query(`SELECT
    (SELECT count(*)::int FROM accounts) AS accounts,
    (SELECT count(*)::int FROM ledger_entries) AS ledger_entries,
    (SELECT count(*)::int FROM account_positions) AS account_positions,
    (SELECT count(*)::int FROM recorded_fills) AS recorded_fills,
    (SELECT count(*)::int FROM sell_settlements) AS sell_settlements,
    (SELECT count(*)::int FROM fill_fee_corrections) AS fill_fee_corrections,
    (SELECT count(*)::int FROM resource_reservations) AS resource_reservations`)).rows[0];
  const portfolioFactCountsBeforeAuthMatrix = await readPortfolioFactCounts();
  const portfolioAuthMatrixProbes = [];
  for (const route of portfolioRoutes) {
    for (const caller of portfolioCallers) {
      const path = route.path(matrixAccountId);
      if ((route.callers).includes(caller.id)) {
        const wrongBearer = portfolioCallers.find((candidate) => candidate.id !== caller.id).token;
        const response = await request(path, route.method, caller.id, wrongBearer, route.method === "GET" ? undefined : {});
        portfolioAuthMatrixProbes.push({ method: route.method, path, caller: caller.id, kind: "wrong-bearer", status: response.status, expected: 401 });
      } else {
        const response = await request(path, route.method, caller.id, caller.token, route.method === "GET" ? undefined : {});
        portfolioAuthMatrixProbes.push({ method: route.method, path, caller: caller.id, kind: "wrong-scope", status: response.status, expected: 403 });
      }
    }
  }
  const portfolioFactCountsAfterAuthMatrix = await readPortfolioFactCounts();
  if (portfolioAuthMatrixProbes.some((probe) => probe.status !== probe.expected)
    || JSON.stringify(portfolioFactCountsBeforeAuthMatrix) !== JSON.stringify(portfolioFactCountsAfterAuthMatrix)) {
    throw new Error(`Portfolio caller/route HTTP matrix mismatch or rejected-request side effects: ${JSON.stringify({ probes: portfolioAuthMatrixProbes, before: portfolioFactCountsBeforeAuthMatrix, after: portfolioFactCountsAfterAuthMatrix })}`);
  }
  const command = { fixtureAccountRef: "service-auth-http-smoke", ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace, testRunId, idempotencyKey: "initialize-1" };
  const missing = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", null, command);
  const bad = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.trade, command);
  const wrongScope = await request("/internal/v1/accounts/initialize", "POST", "trade-execution-service", tokens.trade, command);
  if (missing.status !== 401 || bad.status !== 401 || wrongScope.status !== 403) throw new Error(`auth rejection mismatch: ${JSON.stringify({ missing: missing.status, bad: bad.status, wrongScope: wrongScope.status })}`);
  const rejectedModeAttempts = [];
  for (const [environmentMode, brokerMode] of [["LIVE", "FAKE"], ["PAPER", "REAL"], ["LIVE", "REAL"]]) {
    const response = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, { ...command, idempotencyKey: `reject-${environmentMode}-${brokerMode}`, environmentMode, brokerMode });
    rejectedModeAttempts.push({ environmentMode, brokerMode, status: response.status });
  }
  const rejectedModeSideEffects = await pool.query("SELECT count(*)::int AS count FROM accounts WHERE namespace=$1 AND test_run_id=$2", [namespace, testRunId]);
  if (rejectedModeAttempts.some((attempt) => attempt.status !== 403) || rejectedModeSideEffects.rows[0].count !== 0) throw new Error(`unsupported environment/broker modes must be rejected before persistence: ${JSON.stringify({ attempts: rejectedModeAttempts, accountsCreated: rejectedModeSideEffects.rows[0].count })}`);
  const initializationModeMatrix = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const fixtureAccountRef = `initialize-matrix-${environmentMode}-${brokerMode}`;
    const response = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, {
      ...command, fixtureAccountRef, environmentMode, brokerMode, idempotencyKey: `matrix-${environmentMode}-${brokerMode}`,
    });
    const expectedStatus = brokerMode === "FAKE" && environmentMode !== "LIVE" ? [200, 201] : [403];
    const accepted = response.status === 200 || response.status === 201;
    let persisted = null;
    if (accepted) {
      const body = await response.json();
      const snapshot = body.snapshot ?? body;
      if (!snapshot.accountId) throw new Error(`accepted ${environmentMode}/${brokerMode} initialization returned no account snapshot: ${JSON.stringify(body)}`);
      persisted = await pool.query("SELECT environment_mode, broker_mode FROM accounts WHERE account_id=$1 AND namespace=$2 AND test_run_id=$3 AND owner_id=$4", [snapshot.accountId, namespace, testRunId, ownerId]);
    }
    initializationModeMatrix.push({ environmentMode, brokerMode, status: response.status, expected: expectedStatus, persisted: persisted?.rows[0] ?? null });
    if (!accepted && persisted !== null) throw new Error(`rejected ${environmentMode}/${brokerMode} initialization unexpectedly persisted`);
    if (accepted && (persisted.rowCount !== 1 || persisted.rows[0].environment_mode !== environmentMode || persisted.rows[0].broker_mode !== brokerMode)) throw new Error(`accepted ${environmentMode}/${brokerMode} identity was not persisted exactly: ${JSON.stringify(persisted?.rows)}`);
  }
  const matrixAccountFacts = await pool.query("SELECT environment_mode, broker_mode FROM accounts WHERE namespace=$1 AND test_run_id=$2 AND owner_id=$3 AND fixture_account_ref LIKE 'initialize-matrix-%' ORDER BY fixture_account_ref", [namespace, testRunId, ownerId]);
  if (initializationModeMatrix.some((probe) => !probe.expected.includes(probe.status)) || matrixAccountFacts.rowCount !== 2) throw new Error(`account initialization mode matrix mismatch: ${JSON.stringify({ probes: initializationModeMatrix, persistedAccounts: matrixAccountFacts.rows })}`);
  console.info(`[V1.1 Portfolio account initialization six-mode HTTP+PG] ${JSON.stringify({ status: "PASS", attempts: initializationModeMatrix, persistedAcceptedAccounts: matrixAccountFacts.rows })}`);
  const backtestCommand = { ...command, fixtureAccountRef: "service-auth-http-smoke-backtest", environmentMode: "BACKTEST", idempotencyKey: "initialize-backtest-1" };
  const backtestInitialized = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, backtestCommand);
  if (backtestInitialized.status !== 201 && backtestInitialized.status !== 200) throw new Error(`valid BACKTEST/FAKE identity could not initialize isolated account: ${backtestInitialized.status} ${await backtestInitialized.text()}`);
  const backtestResult = await backtestInitialized.json();
  backtestAccountId = backtestResult.snapshot.accountId;
  const backtestFacts = await pool.query("SELECT environment_mode, broker_mode, cash_amount::text AS cash_amount FROM accounts WHERE account_id=$1 AND namespace=$2 AND test_run_id=$3 AND owner_id=$4", [backtestAccountId, namespace, testRunId, ownerId]);
  if (backtestResult.snapshot.environmentMode !== "BACKTEST" || backtestFacts.rowCount !== 1 || backtestFacts.rows[0].environment_mode !== "BACKTEST" || backtestFacts.rows[0].broker_mode !== "FAKE" || backtestFacts.rows[0].cash_amount !== "10000.0000") throw new Error("BACKTEST/FAKE mode was not persisted exactly on the owner/TestRun-scoped account");
  const initialized = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, command);
  if (initialized.status !== 201 && initialized.status !== 200) throw new Error(`valid platform identity could not initialize isolated account: ${initialized.status} ${await initialized.text()}`);
  const result = await initialized.json();
  accountId = result.snapshot.accountId;
  const sellableQuery = new URLSearchParams({ namespace, testRunId, security: "600000.SH", asOf: "2024-01-05T01:00:00Z" });
  const sellablePath = `/internal/v1/accounts/${accountId}/sellable?${sellableQuery}`;
  const sellableRead = await request(sellablePath, "GET", "platform-api-service", tokens.platform, undefined, { "x-stockquant-owner-id": ownerId });
  const sellableBody = await sellableRead.json();
  const sellableForeign = await request(sellablePath, "GET", "platform-api-service", tokens.platform, undefined, { "x-stockquant-owner-id": "foreign-owner" });
  const invalid = await request(`/internal/v1/accounts/${accountId}/sellable?${sellableQuery}&unexpected=1`, "GET", "platform-api-service", tokens.platform, undefined, { "x-stockquant-owner-id": ownerId });
  if (sellableRead.status !== 200 || sellableBody.sellableQuantity !== 0 || sellableBody.accountId !== accountId || sellableBody.namespace !== namespace || sellableBody.testRunId !== testRunId || sellableForeign.status !== 403 || invalid.status !== 400) throw new Error(`sellable HTTP scope or quantity mismatch: ${JSON.stringify({ status: sellableRead.status, body: sellableBody, foreign: sellableForeign.status, invalid: invalid.status })}`);
  console.info("[C5 sellable HTTP] scoped zero position, owner isolation and query rejection PASS");
  const settlementAccountResponse = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, { ...command, fixtureAccountRef: "settlement-mode-boundary", idempotencyKey: "settlement-mode-boundary-initialize" });
  if (settlementAccountResponse.status !== 201 && settlementAccountResponse.status !== 200) throw new Error(`could not initialize isolated account for due-settlement boundary probe: ${settlementAccountResponse.status} ${await settlementAccountResponse.text()}`);
  settlementAccountId = (await settlementAccountResponse.json()).snapshot.accountId;
  const buyReservationCommand = { namespace, testRunId, ownerId, idempotencyKey: "settlement-boundary-buy", clientOrderId: "settlement-boundary-buy", side: "BUY", currency: "CNY", cashAmount: "1005.0000", security: null, quantity: null };
  const buyReservationResponse = await request(`/internal/v1/accounts/${settlementAccountId}/reservations`, "POST", "trade-execution-service", tokens.trade, buyReservationCommand);
  if (![200, 201].includes(buyReservationResponse.status)) throw new Error(`could not reserve isolated BUY for settlement probe: ${buyReservationResponse.status} ${await buyReservationResponse.text()}`);
  const buyReservation = (await buyReservationResponse.json()).reservation;
  const buyFillId = randomUUID();
  const buyFillResponse = await request(`/internal/v1/accounts/${settlementAccountId}/fills`, "POST", "trade-execution-service", tokens.trade, { namespace, externalFillId: buyFillId, security: "600000.SH", quantity: 100, price: "10.0000", fee: "5.0000", currency: "CNY", effectiveAt: "2024-01-05T01:00:00.000Z", side: "BUY", reservation: { reservationId: buyReservation.reservationId, ownerId, testRunId, clientOrderId: buyReservationCommand.clientOrderId } });
  if (![200, 201].includes(buyFillResponse.status)) throw new Error(`could not post isolated BUY fill: ${buyFillResponse.status} ${await buyFillResponse.text()}`);
  const buyResolved = await request(`/internal/v1/accounts/${settlementAccountId}/reservations/${buyReservation.reservationId}/resolve`, "POST", "trade-execution-service", tokens.trade, { namespace, testRunId, ownerId, outcome: "FILLED", evidenceRef: `fill:${buyFillId}` });
  if (buyResolved.status !== 200) throw new Error(`could not resolve isolated BUY reservation: ${buyResolved.status} ${await buyResolved.text()}`);
  const sellReservationCommand = { namespace, testRunId, ownerId, idempotencyKey: "settlement-boundary-sell", clientOrderId: "settlement-boundary-sell", side: "SELL", currency: "CNY", cashAmount: null, security: "600000.SH", quantity: 100, asOf: "2024-01-08T01:00:00.000Z" };
  const sellReservationResponse = await request(`/internal/v1/accounts/${settlementAccountId}/reservations`, "POST", "trade-execution-service", tokens.trade, sellReservationCommand);
  if (![200, 201].includes(sellReservationResponse.status)) throw new Error(`could not reserve isolated SELL for settlement probe: ${sellReservationResponse.status} ${await sellReservationResponse.text()}`);
  const sellReservation = (await sellReservationResponse.json()).reservation;
  const sellFillId = randomUUID();
  const sellFillResponse = await request(`/internal/v1/accounts/${settlementAccountId}/fills`, "POST", "trade-execution-service", tokens.trade, { namespace, externalFillId: sellFillId, security: "600000.SH", quantity: 100, price: "10.0000", fee: "5.0000", currency: "CNY", effectiveAt: "2024-01-08T01:01:00.000Z", side: "SELL", settlement: { tradeDate: "2024-01-08", settlementDate: "2024-01-09", calendarVersion: "v1.4-synthetic-settlement-1", settlementErrorCode: null }, reservation: { reservationId: sellReservation.reservationId, ownerId, testRunId, clientOrderId: sellReservationCommand.clientOrderId } });
  if (![200, 201].includes(sellFillResponse.status)) throw new Error(`could not post isolated SELL fill: ${sellFillResponse.status} ${await sellFillResponse.text()}`);
  const sellResolved = await request(`/internal/v1/accounts/${settlementAccountId}/reservations/${sellReservation.reservationId}/resolve`, "POST", "trade-execution-service", tokens.trade, { namespace, testRunId, ownerId, outcome: "FILLED", evidenceRef: `fill:${sellFillId}` });
  if (sellResolved.status !== 200) throw new Error(`could not resolve isolated SELL reservation: ${sellResolved.status} ${await sellResolved.text()}`);
  const readSettlementBoundaryFacts = () => pool.query(`SELECT a.cash_amount::text AS cash_amount, a.ledger_version,
    (SELECT count(*)::int FROM ledger_entries WHERE account_id=a.account_id) AS ledger_entries,
    (SELECT COALESCE(json_agg(json_build_object('fillId',fill_id,'amount',amount::text,'status',status) ORDER BY fill_id),'[]'::json) FROM sell_settlements WHERE account_id=a.account_id) AS sell_settlements,
    (SELECT count(*)::int FROM resource_reservations WHERE account_id=a.account_id) AS reservations
    FROM accounts a WHERE a.account_id=$1`, [settlementAccountId]);
  const settlementStateBeforeContractProbe = await readSettlementBoundaryFacts();
  if (settlementStateBeforeContractProbe.rows[0].cash_amount !== "8995.0000" || settlementStateBeforeContractProbe.rows[0].sell_settlements.length !== 1 || settlementStateBeforeContractProbe.rows[0].sell_settlements[0].status !== "PENDING") throw new Error(`settlement probe did not prepare one due pending receivable: ${JSON.stringify(settlementStateBeforeContractProbe.rows)}`);
  const settlementAsOf = "2024-01-09T01:30:00.000Z";
  const settlementModeProbes = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const response = await request(`/internal/v1/accounts/${settlementAccountId}/settlements`, "POST", "trade-execution-service", tokens.trade, { asOf: settlementAsOf, environmentMode, brokerMode });
    const after = await readSettlementBoundaryFacts();
    settlementModeProbes.push({ environmentMode, brokerMode, status: response.status, pendingReceivableUnchanged: JSON.stringify(settlementStateBeforeContractProbe.rows) === JSON.stringify(after.rows) });
    if (response.status !== 400 || !settlementModeProbes.at(-1).pendingReceivableUnchanged) {
      throw new Error(`settlement endpoint must reject mode payload ${environmentMode}/${brokerMode} outside its exact asOf schema without settling due receivables: ${JSON.stringify({ probes: settlementModeProbes, before: settlementStateBeforeContractProbe.rows, after: after.rows })}`);
    }
  }
  const validSettlementResponse = await request(`/internal/v1/accounts/${settlementAccountId}/settlements`, "POST", "trade-execution-service", tokens.trade, { asOf: settlementAsOf });
  const settlementStateAfterValidRequest = await readSettlementBoundaryFacts();
  if (![200, 201].includes(validSettlementResponse.status) || !(await validSettlementResponse.json()).settledFillIds.includes(sellFillId) || settlementStateAfterValidRequest.rows[0].cash_amount !== "9990.0000" || settlementStateAfterValidRequest.rows[0].sell_settlements[0].status !== "SETTLED") throw new Error(`valid settlement did not release the exact pending receivable after mode probes: ${JSON.stringify({ status: validSettlementResponse.status, facts: settlementStateAfterValidRequest.rows })}`);
  console.info(`[V1.1 Portfolio settlement mode-injection six-mode HTTP+PG] ${JSON.stringify({ status: "PASS", probes: settlementModeProbes, dueReceivableUnchangedForEveryRejectedRequest: true })}`);
  const own = await fetch(`${base}/internal/v1/accounts/${accountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}`, "x-stockquant-owner-id": ownerId } });
  const foreign = await fetch(`${base}/internal/v1/accounts/${accountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}`, "x-stockquant-owner-id": "foreign-owner" } });
  const tradeOwn = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "platform-api-service", tokens.platform, {});
  if (own.status !== 200 || foreign.status !== 403 || tradeOwn.status !== 403) throw new Error(`route/owner scope mismatch: ${JSON.stringify({ own: own.status, foreign: foreign.status, tradeOwn: tradeOwn.status })}`);
  const snapshot = await own.json();
  if (snapshot.ownerId !== ownerId || snapshot.cash.amount !== "10000.0000" || snapshot.ledgerEntryCount !== 1) throw new Error("authenticated account snapshot assertions failed");
  const reservationPath = `/internal/v1/accounts/${accountId}/reservations`;
  const reservationCommand = { namespace, testRunId, ownerId, idempotencyKey: "cash-reserve-1", clientOrderId: "smoke-order-1", side: "BUY", currency: "CNY", cashAmount: "3000.0000", security: null, quantity: null };
  const unauthenticatedReserve = await request(reservationPath, "POST", "trade-execution-service", null, reservationCommand);
  const wrongScopeReserve = await request(reservationPath, "POST", "platform-api-service", tokens.platform, reservationCommand);
  if (unauthenticatedReserve.status !== 401 || wrongScopeReserve.status !== 403) throw new Error("reservation endpoint auth scope mismatch");
  const injectedReservationMode = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const response = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, { ...reservationCommand, idempotencyKey: `mode-${environmentMode}-${brokerMode}`, clientOrderId: `mode-${environmentMode}-${brokerMode}`, environmentMode, brokerMode });
    const facts = await pool.query("SELECT count(*)::int AS count FROM resource_reservations WHERE account_id=$1", [accountId]);
    injectedReservationMode.push({ environmentMode, brokerMode, status: response.status, reservationsAfter: facts.rows[0].count });
    if (response.status !== 422 || facts.rows[0].count !== 0) throw new Error(`reservation route accepted injected ${environmentMode}/${brokerMode} or wrote a reservation before rejecting it`);
  }
  const reservationsBeforeValidRequest = await pool.query("SELECT count(*)::int AS count FROM resource_reservations WHERE account_id=$1", [accountId]);
  const reserveResponse = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, reservationCommand);
  if (reserveResponse.status !== 201 && reserveResponse.status !== 200) throw new Error(`valid trade identity could not reserve resources: ${reserveResponse.status} ${await reserveResponse.text()}`);
  const reserved = await reserveResponse.json();
  if (!reserved.reservation?.reservationId || reserved.reservation.status !== "HELD" || reserved.replayed !== false) throw new Error("reservation did not create one HELD resource record");
  const replayResponse = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, reservationCommand);
  const replay = await replayResponse.json();
  if (replayResponse.status !== 201 && replayResponse.status !== 200 || replay.replayed !== true || replay.reservation.reservationId !== reserved.reservation.reservationId) throw new Error("reservation retry was not idempotent");
  const fillCommand = { namespace, externalFillId: randomUUID(), security: "600000.SH", quantity: 10, price: "100.0000", fee: "1.0000", currency: "CNY", effectiveAt: "2026-09-25T01:00:00.000Z", side: "BUY", reservation: { reservationId: reserved.reservation.reservationId, ownerId, testRunId, clientOrderId: reservationCommand.clientOrderId } };
  const injectedFillMode = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const response = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, { ...fillCommand, externalFillId: randomUUID(), environmentMode, brokerMode });
    const facts = await pool.query("SELECT count(*)::int AS count FROM recorded_fills WHERE account_id=$1", [accountId]);
    injectedFillMode.push({ environmentMode, brokerMode, status: response.status, fillsAfter: facts.rows[0].count });
    if (response.status !== 422 || facts.rows[0].count !== 0) throw new Error(`Fill route accepted injected ${environmentMode}/${brokerMode} or wrote a Fill before rejecting it`);
  }
  const fillsBeforeValidRequest = await pool.query("SELECT count(*)::int AS count FROM recorded_fills WHERE account_id=$1", [accountId]);
  const fillResponse = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, fillCommand);
  const fillReplayResponse = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, fillCommand);
  if (![200, 201].includes(fillResponse.status) || ![200, 201].includes(fillReplayResponse.status) || !(await fillReplayResponse.json()).replayed) throw new Error("reserved fill posting or retry was not idempotent");
  const feeCorrectionPath = `/internal/v1/accounts/${accountId}/fills/${fillCommand.externalFillId}/fee-corrections`;
  const feeCorrection = { revision: 1, previousFee: "1.0000", correctedFee: "2.0000", effectiveAt: "2026-09-25T01:02:00.000Z", evidenceRef: "fakebroker-fee-correction:smoke-1" };
  const wrongFeeCaller = await request(feeCorrectionPath, "POST", "platform-api-service", tokens.platform, feeCorrection);
  const injectedFeeCorrectionMode = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const response = await request(feeCorrectionPath, "POST", "trade-execution-service", tokens.trade, { ...feeCorrection, revision: 2, evidenceRef: `mode-${environmentMode}-${brokerMode}`, environmentMode, brokerMode });
    const facts = await pool.query("SELECT count(*)::int AS count FROM fill_fee_corrections WHERE external_fill_id=$1", [fillCommand.externalFillId]);
    injectedFeeCorrectionMode.push({ environmentMode, brokerMode, status: response.status, correctionsAfter: facts.rows[0].count });
    if (response.status !== 422 || facts.rows[0].count !== 0) throw new Error(`fee correction route accepted injected ${environmentMode}/${brokerMode} or wrote a correction before rejecting it`);
  }
  const correctionsBeforeValidRequest = await pool.query("SELECT count(*)::int AS count FROM fill_fee_corrections WHERE external_fill_id=$1", [fillCommand.externalFillId]);
  const feeCorrectionResponse = await request(feeCorrectionPath, "POST", "trade-execution-service", tokens.trade, feeCorrection);
  const feeCorrectionReplay = await request(feeCorrectionPath, "POST", "trade-execution-service", tokens.trade, feeCorrection);
  const fillReplayAfterCorrection = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, fillCommand);
  const correctedSnapshotResponse = await request(`/internal/v1/accounts/${accountId}/snapshot`, "GET", "platform-api-service", tokens.platform, undefined, { "x-stockquant-owner-id": ownerId });
  const correctedSnapshot = await correctedSnapshotResponse.json();
  if (wrongFeeCaller.status !== 403 || feeCorrectionResponse.status !== 200 || !(await feeCorrectionReplay.json()).replayed || !(await fillReplayAfterCorrection.json()).replayed || correctedSnapshotResponse.status !== 200 || correctedSnapshot.cash.amount !== "8998.0000") throw new Error("fee correction route, retry, original Fill replay, or exact cash adjustment failed");
  const overBudget = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, { ...reservationCommand, idempotencyKey: "cash-reserve-too-much", clientOrderId: "smoke-order-too-much", cashAmount: "8000.0000" });
  if (overBudget.status !== 409) throw new Error(`over-budget reservation should be rejected with 409, received ${overBudget.status}`);
  const resolvePath = `${reservationPath}/${reserved.reservation.reservationId}/resolve`;
  const resolution = { namespace, testRunId, ownerId, outcome: "UNKNOWN", evidenceRef: "smoke:broker-query-required" };
  const replayResolve = await request(resolvePath, "POST", "historical-replay-worker", tokens.replay, resolution);
  const foreignResolve = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, ownerId: "foreign-owner" });
  const invalidOutcome = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, outcome: "MAYBE" });
  if (replayResolve.status !== 403 || foreignResolve.status !== 403 || invalidOutcome.status !== 400) throw new Error("reservation resolution caller, owner or outcome scope was not enforced");
  const injectedResolutionMode = [];
  for (const [environmentMode, brokerMode] of [["PAPER", "FAKE"], ["PAPER", "REAL"], ["BACKTEST", "FAKE"], ["BACKTEST", "REAL"], ["LIVE", "FAKE"], ["LIVE", "REAL"]]) {
    const response = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, environmentMode, brokerMode });
    const facts = await pool.query("SELECT status FROM resource_reservations WHERE reservation_id=$1", [reserved.reservation.reservationId]);
    injectedResolutionMode.push({ environmentMode, brokerMode, status: response.status, reservationStatusAfter: facts.rows[0]?.status });
    if (response.status !== 422 || facts.rows[0]?.status !== "HELD") throw new Error(`reservation resolution accepted injected ${environmentMode}/${brokerMode} or changed the hold before rejecting it`);
  }
  const reservationBeforeValidResolution = await pool.query("SELECT status FROM resource_reservations WHERE reservation_id=$1", [reserved.reservation.reservationId]);
  const unknownResolve = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, resolution);
  if (unknownResolve.status !== 200 || (await unknownResolve.json()).status !== "UNKNOWN") throw new Error("UNKNOWN did not preserve the resource hold with update status 200");
  const release = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, outcome: "CANCELLED", evidenceRef: "smoke:authoritative-cancel-confirmed" });
  if (release.status !== 200 || (await release.json()).status !== "RELEASED") throw new Error("authoritative cancellation did not release the reservation with update status 200");
  console.info(`[V1.1 Portfolio mutation route six-mode HTTP+PG] ${JSON.stringify({ status: "PASS", reservation: injectedReservationMode, fill: injectedFillMode, feeCorrection: injectedFeeCorrectionMode, reservationResolution: injectedResolutionMode, allRejectedBeforeMutation: true })}`);
  console.log(JSON.stringify({ status: "PASS", testRunId, portfolioAuthMatrix: { routeCount: portfolioRoutes.length, callerCount: portfolioCallers.length, probeCount: portfolioAuthMatrixProbes.length, deniedAndForgedRequestsRejected: true, businessFactsUnchanged: portfolioFactCountsBeforeAuthMatrix, unauthorizedRequestsNoEffects: true }, caller: "platform-api-service", missingBearer: missing.status, wrongBearer: bad.status, wrongRouteScope: wrongScope.status, rejectedModeAttempts, rejectedModeAccountsCreated: rejectedModeSideEffects.rows[0].count, paperInitialize: initialized.status, backtestInitialize: backtestInitialized.status, backtestPersistedMode: backtestFacts.rows[0].environment_mode, backtestPersistedBroker: backtestFacts.rows[0].broker_mode, settlementModeProbes, settlementInvalidRequestNoAccountMutation: settlementModeProbes.every((probe) => probe.pendingReceivableUnchanged), settlementPendingReceivableBefore: settlementStateBeforeContractProbe.rows[0].sell_settlements, settlementAfterValidRequest: settlementStateAfterValidRequest.rows[0].sell_settlements, validSettlementCashAfter: settlementStateAfterValidRequest.rows[0].cash_amount, ownSnapshot: own.status, foreignOwner: foreign.status, platformFillDenied: tradeOwn.status, rejectedMutationModeAttempts: { reservation: injectedReservationMode, fill: injectedFillMode, feeCorrection: injectedFeeCorrectionMode, reservationResolution: injectedResolutionMode }, rejectedMutationSideEffects: { reservations: reservationsBeforeValidRequest.rows[0].count, fills: fillsBeforeValidRequest.rows[0].count, feeCorrections: correctionsBeforeValidRequest.rows[0].count, reservationStatusBeforeResolve: reservationBeforeValidResolution.rows[0]?.status }, reservationCreated: reserveResponse.status, reservationIdempotentRetry: replay.replayed, reservedFill: fillResponse.status, fillIdempotentRetry: true, feeCorrection: feeCorrectionResponse.status, feeCorrectionReplay: true, originalFillReplayAfterCorrection: true, exactCorrectedCash: correctedSnapshot.cash.amount, wrongFeeCaller: wrongFeeCaller.status, overBudget: overBudget.status, crossCallerResolve: replayResolve.status, crossOwnerResolve: foreignResolve.status, invalidOutcome: invalidOutcome.status, unknownRetainsHold: true, cancellationReleases: true }));
} finally {
  if (service.exitCode === null) { service.kill("SIGTERM"); await new Promise((resolveClose) => service.once("close", resolveClose)); }
  if (accountId || backtestAccountId || settlementAccountId) {
    const accountIds = [accountId, backtestAccountId, settlementAccountId].filter(Boolean);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM resource_reservations WHERE account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM sell_settlements WHERE account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM fill_fee_corrections c USING recorded_fills f WHERE c.external_fill_id=f.external_fill_id AND f.account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM recorded_fills WHERE account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM account_positions WHERE account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM ledger_entries WHERE account_id = ANY($1::uuid[])", [accountIds]);
      await client.query("DELETE FROM accounts WHERE account_id = ANY($1::uuid[]) AND namespace=$2 AND test_run_id=$3 AND owner_id=$4", [accountIds, namespace, testRunId, ownerId]);
      const remaining = await client.query("SELECT count(*) FROM accounts WHERE account_id = ANY($1::uuid[])", [accountIds]);
      if (Number(remaining.rows[0].count) !== 0) throw new Error("account cleanup failed for exact isolated HTTP smoke accounts");
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  await pool.end();
}
