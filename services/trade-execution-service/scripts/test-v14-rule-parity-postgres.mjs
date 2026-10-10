import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";
import { V14BacktestEngine } from "../../quant-research-service/dist/domain/v14-daily-backtest.js";
import { PostgresAccountRepository } from "../../portfolio-risk-service/dist/adapters/postgres-account-repository.js";

const connectionString = process.env.TRADE_EXECUTION_TEST_DATABASE_URL;
if (!connectionString) throw new Error("TRADE_EXECUTION_TEST_DATABASE_URL is required");
const parsed = new URL(connectionString);
const databaseName = parsed.pathname.replace(/^\//u, "");
if (databaseName !== "trade_execution_test" || parsed.username !== "trade_execution_test" || parsed.hostname !== "127.0.0.1") {
  throw new Error("refusing V1.4 parity test outside its dedicated isolated trade_execution_test database");
}
const portfolioConnectionString = process.env.PORTFOLIO_RISK_TEST_DATABASE_URL;
if (!portfolioConnectionString) throw new Error("PORTFOLIO_RISK_TEST_DATABASE_URL is required");
const portfolioParsed = new URL(portfolioConnectionString);
if (portfolioParsed.pathname.replace(/^\//u, "") !== "portfolio_risk_test" || portfolioParsed.username !== "portfolio_risk" || portfolioParsed.hostname !== "127.0.0.1") {
  throw new Error("refusing V1.4 Portfolio parity test outside its dedicated isolated portfolio_risk_test database");
}
const governanceConnectionString = process.env.DECISION_GOVERNANCE_TEST_DATABASE_URL;
if (!governanceConnectionString) throw new Error("DECISION_GOVERNANCE_TEST_DATABASE_URL is required");
const governanceParsed = new URL(governanceConnectionString);
if (governanceParsed.pathname.replace(/^\//u, "") !== "decision_governance_test" || governanceParsed.username !== "decision_governance" || governanceParsed.hostname !== "127.0.0.1") {
  throw new Error("refusing V1.4 authorization test outside its dedicated isolated decision_governance_test database");
}

const bars = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"].map((date) => ({ date, securityId: "600000.SH", closeCents: 1_000, volume: 100 }));
const marketFeeSchedule = { scheduleId: "CN_A_CASH_EQUITY_2023_08_28", commissionRatePartsPerBillion: 54_100, minimumCommissionCents: 5 };
const policy = { initialCashCents: 200_000, targetQuantity: 29, participationRateBasisPoints: 2_900, slippageBasisPoints: 55, fixedFeeCents: 29, marketFeeSchedule };
const namespace = `v14-parity-${randomUUID()}`;
const accountId = randomUUID();
const expectedOutboxInputs = new Map();
const pool = new Pool({ connectionString });
const portfolioPool = new Pool({ connectionString: portfolioConnectionString });
const governancePool = new Pool({ connectionString: governanceConnectionString });
const portfolio = new PostgresAccountRepository(portfolioPool);
const portfolioAccounts = new Map();
const serviceProcesses = [];
let portfolioHttpUrl;
let governanceHttpUrl;
let tradeHttpUrl;
const serviceTokens = { platform: `platform-${randomUUID()}-${randomUUID()}`, replay: `replay-${randomUUID()}-${randomUUID()}`, trade: `trade-${randomUUID()}-${randomUUID()}` };
let governanceGrantCount = 0;
let portfolioQuantLedgerReconciliations = 0;
let fakeBrokerAssetReconciliations = 0;
let fakeBrokerIdempotentAssetReplays = 0;
let fakeBrokerInsufficientAssetRecovery = false;

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

function launchService(servicePath, entry, env) {
  const child = spawn(process.execPath, [entry], { cwd: resolve(servicePath), env, stdio: ["ignore", "pipe", "pipe"] });
  child.log = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (child.log.length < 12000) child.log += chunk.toString().slice(0, 12000 - child.log.length); });
  serviceProcesses.push(child);
  return child;
}

async function waitReady(child, url) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`V1.4 parity service exited before ready: ${child.log}`);
    try { if ((await fetch(`${url}/ready`)).ok) return; } catch { /* bounded startup probe */ }
    await delay(100);
  }
  throw new Error(`V1.4 parity service did not become ready: ${child.log}`);
}

async function stopService(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((done) => child.once("close", done));
}

function centsFromMoney(amount) {
  const match = /^(-?)(\d+)(?:\.(\d{1,4}))?$/u.exec(String(amount));
  assert.ok(match, `Portfolio money must be a decimal amount: ${amount}`);
  const fractional = (match[3] ?? "").padEnd(4, "0");
  assert.equal(fractional.slice(2), "00", `Portfolio amount must preserve exact cent precision: ${amount}`);
  const cents = BigInt(match[2]) * 100n + BigInt(fractional.slice(0, 2));
  return Number(match[1] === "-" ? -cents : cents);
}

async function postJson(url, caller, token, body) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": caller, authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  const result = await response.json().catch(() => null);
  assert.ok(response.ok, `HTTP ${caller} POST ${url} failed ${response.status}: ${JSON.stringify(result)}`);
  return result;
}

async function startPaperHttpServices() {
  const governancePort = await freePort();
  governanceHttpUrl = `http://127.0.0.1:${governancePort}`;
  const governanceProcess = launchService("services/decision-governance-service", resolve("services/decision-governance-service/dist/main.js"), {
    ...process.env, NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(governancePort),
    STOCKQUANT_DATABASE_URL: governanceConnectionString, STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE",
    STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: serviceTokens.replay, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: serviceTokens.trade,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: serviceTokens.platform,
  });
  await waitReady(governanceProcess, governanceHttpUrl);
  const portfolioPort = await freePort();
  portfolioHttpUrl = `http://127.0.0.1:${portfolioPort}`;
  const common = { ...process.env, NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE" };
  const portfolioEnv = {
    ...common, STOCKQUANT_PORT: String(portfolioPort), STOCKQUANT_DATABASE_URL: portfolioConnectionString,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: serviceTokens.platform, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: serviceTokens.trade,
    STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: serviceTokens.replay, STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS: `harness-${randomUUID()}-${randomUUID()}`,
  };
  const portfolioProcess = launchService("services/portfolio-risk-service", resolve("services/portfolio-risk-service/dist/main.js"), portfolioEnv);
  await waitReady(portfolioProcess, portfolioHttpUrl);
  const tradePort = await freePort();
  tradeHttpUrl = `http://127.0.0.1:${tradePort}`;
  const tradeEnv = {
    ...common, STOCKQUANT_PORT: String(tradePort), STOCKQUANT_DATABASE_URL: connectionString, STOCKQUANT_PORTFOLIO_API_URL: portfolioHttpUrl,
    STOCKQUANT_GOVERNANCE_URL: `http://127.0.0.1:${governancePort}`, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: serviceTokens.trade,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: serviceTokens.platform, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: serviceTokens.replay,
  };
  const tradeProcess = launchService("services/trade-execution-service", resolve("services/trade-execution-service/dist/main.js"), tradeEnv);
  await waitReady(tradeProcess, tradeHttpUrl);
}

async function executePaperHttpScenario({ scenario, market, currency, security, side, clientOrderId, quantity, executionDate, timestamp, open, volume, participationRate, slippageBps, marketFeeSchedule, quantBacktest }) {
  let account = portfolioAccounts.get(scenario);
  if (!account) {
    assert.equal(side, "BUY", `${scenario} must initialize with its first BUY`);
    const runId = randomUUID();
    const ownerId = `v14-parity-${scenario}`;
    const initialized = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/initialize`, "platform-api-service", serviceTokens.platform, {
      fixtureAccountRef: `v14-parity-${scenario}`, ownerId, market, environmentMode: "PAPER", brokerMode: "FAKE",
      initialCash: { amount: "2000.0000", currency }, namespace, testRunId: runId, idempotencyKey: `v14-parity-${scenario}`,
    });
    account = { accountId: initialized.snapshot.accountId, ownerId, runId, currency, cash: "2000.0000", quantityBySecurity: new Map(), tradeCount: 0 };
    portfolioAccounts.set(scenario, account);
  }
  const reservationIdempotencyKey = `v14-parity-${scenario}-${clientOrderId}`;
  const reservationBody = {
    namespace, testRunId: account.runId, ownerId: account.ownerId, idempotencyKey: reservationIdempotencyKey, clientOrderId,
    side, currency,
    ...(side === "BUY" ? { cashAmount: "2000.0000", security: null, quantity: null } : { cashAmount: null, security, quantity }),
    ...(side === "SELL" ? { asOf: `${executionDate}T12:00:00.000Z` } : {}),
  };
  const reservationResult = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${account.accountId}/reservations`, "trade-execution-service", serviceTokens.trade, reservationBody);
  const reservation = reservationResult.reservation;
  const authorizationCommand = {
    namespace, accountId: account.accountId, clientOrderId, security, requestedQuantity: quantity, initialAccountCash: "2000.0000",
    bar: { timestamp, open, volume },
  };
  const grantCountBeforeReject = await governancePool.query("SELECT count(*)::int AS total FROM execution_authorizations WHERE namespace=$1", [namespace]);
  const wrongCallerGrantResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${serviceTokens.trade}` },
    body: JSON.stringify({ namespace, accountId: account.accountId, command: authorizationCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(wrongCallerGrantResponse.status, 403, "Governance must reject a Trade caller attempting to mint a Replay grant");
  const grantCountAfterReject = await governancePool.query("SELECT count(*)::int AS total FROM execution_authorizations WHERE namespace=$1", [namespace]);
  assert.equal(grantCountAfterReject.rows[0].total, grantCountBeforeReject.rows[0].total, "rejected grant must create no authorization row");
  const grantResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify({ namespace, accountId: account.accountId, command: authorizationCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
    signal: AbortSignal.timeout(5000),
  });
  const grant = await grantResponse.json().catch(() => null);
  assert.equal(grantResponse.status, 200, `real Governance replay grant failed ${grantResponse.status}: ${JSON.stringify(grant)}`);
  assert.equal(typeof grant.authorizationId, "string");
  governanceGrantCount += 1;
  const alteredCommand = { ...authorizationCommand, requestedQuantity: quantity + 1 };
  const alteredValidationResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations/validate`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${serviceTokens.trade}` },
    body: JSON.stringify({ authorizationId: grant.authorizationId, accountId: account.accountId, command: alteredCommand }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(alteredValidationResponse.status, 403, "Governance must reject a command-hash mismatch");
  const grantAfterAlteredValidation = await governancePool.query("SELECT status FROM execution_authorizations WHERE authorization_id=$1", [grant.authorizationId]);
  assert.equal(grantAfterAlteredValidation.rows[0]?.status, "ACTIVE", "a rejected altered command must leave the exact grant available for the original command");
  const command = {
    authorizationId: grant.authorizationId, namespace, accountId: account.accountId, clientOrderId, security, requestedQuantity: quantity, initialAccountCash: "2000.0000",
    bar: { timestamp, open, volume }, side, participationRate, slippageBps, currency,
    ...(marketFeeSchedule ? { marketFeeSchedule } : {}),
    reservation: { reservationId: reservation.reservationId, ownerId: account.ownerId, testRunId: account.runId, clientOrderId },
  };
  const invalidExecution = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify({ ...command, authorizationId: randomUUID() }), signal: AbortSignal.timeout(10000),
  });
  assert.equal(invalidExecution.status, 403, "Trade must reject an execution with no matching Governance authorization");
  const absentOrder = await pool.query("SELECT count(*)::int AS total FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2", [namespace, clientOrderId]);
  assert.equal(absentOrder.rows[0].total, 0, "rejected historical execution must not create a FakeBroker order");
  const executedResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(command), signal: AbortSignal.timeout(10000),
  });
  const executed = await executedResponse.json().catch(() => null);
  assert.equal(executedResponse.status, 200, `Trade historical HTTP execution failed: ${JSON.stringify(executed)}`);
  assert.ok(executed.result?.fill, `Trade HTTP response must contain the FakeBroker Fill: ${JSON.stringify(executed)}`);
  const replayedExecutionResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(command), signal: AbortSignal.timeout(10000),
  });
  const replayedExecution = await replayedExecutionResponse.json().catch(() => null);
  assert.equal(replayedExecutionResponse.status, 200, `Trade same-command retry must be safe: ${JSON.stringify(replayedExecution)}`);
  assert.equal(replayedExecution.replayed, true, "same clientOrderId and exact authorized request must return the durable FakeBroker result");
  assert.equal(replayedExecution.result.orderId, executed.result.orderId);
  assert.equal(replayedExecution.result.fill.externalFillId, executed.result.fill.externalFillId);
  fakeBrokerIdempotentAssetReplays += 1;
  const consumedGrant = await governancePool.query("SELECT status,command_hash FROM execution_authorizations WHERE authorization_id=$1", [grant.authorizationId]);
  assert.equal(consumedGrant.rowCount, 1);
  assert.equal(consumedGrant.rows[0].status, "CONSUMED", "the real Governance HTTP authorization must be consumed by Trade before FakeBroker execution");
  const expectedCash = await portfolioPool.query("SELECT ($1::numeric + CASE WHEN $5='BUY' THEN -1 ELSE 1 END * ($2::numeric * $3::numeric + CASE WHEN $5='BUY' THEN $4::numeric ELSE -$4::numeric END))::numeric(20,4)::text AS cash", [account.cash, executed.result.fill.quantity, executed.result.fill.price, executed.result.fill.fee, side]);
  account.cash = expectedCash.rows[0].cash;
  account.tradeCount += 1;
  const previousQuantity = account.quantityBySecurity.get(security) ?? 0;
  account.quantityBySecurity.set(security, previousQuantity + (side === "BUY" ? executed.result.fill.quantity : -executed.result.fill.quantity));
  const snapshotResponse = await fetch(`${portfolioHttpUrl}/internal/v1/accounts/${account.accountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}`, "x-stockquant-owner-id": account.ownerId } });
  const snapshot = await snapshotResponse.json();
  assert.equal(snapshotResponse.status, 200);
  assert.equal(snapshot.cash.amount, account.cash);
  assert.equal(snapshot.cash.currency, currency);
  assert.equal(snapshot.ledgerEntryCount, 1 + account.tradeCount);
  assert.equal(snapshot.positions.find((position) => position.security === security)?.quantity ?? 0, account.quantityBySecurity.get(security));
  const assetQuery = new URLSearchParams({ namespace, accountId: account.accountId });
  const fakeBrokerAssetsResponse = await fetch(`${tradeHttpUrl}/internal/v1/v13/accounts/assets?${assetQuery}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}` } });
  const fakeBrokerAssets = await fakeBrokerAssetsResponse.json();
  assert.equal(fakeBrokerAssetsResponse.status, 200, "historical FakeBroker HTTP must expose its independent asset ledger");
  assert.equal(fakeBrokerAssets.source, "FAKEBROKER_INDEPENDENT_ASSET_LEDGER");
  assert.equal(fakeBrokerAssets.owner_id, account.ownerId);
  assert.equal(fakeBrokerAssets.test_run_id, account.runId);
  assert.equal(fakeBrokerAssets.currency, currency);
  assert.equal(fakeBrokerAssets.current_cash, account.cash, "independent FakeBroker cash must match the fixed execution ledger");
  assert.deepEqual(fakeBrokerAssets.positions, [...account.quantityBySecurity.entries()].filter(([, positionQuantity]) => positionQuantity > 0).map(([positionSecurity, positionQuantity]) => ({ security: positionSecurity, quantity: positionQuantity })).sort((left, right) => left.security.localeCompare(right.security)));
  assert.equal(fakeBrokerAssets.fill_event_count, account.tradeCount, "every durable historical Fill must apply once to the independent FakeBroker asset ledger");
  fakeBrokerAssetReconciliations += 1;
  const quantCashAtSession = quantBacktest.evidence.cashLedger.find((entry) => entry.date === executionDate);
  const quantPositionAtSession = quantBacktest.evidence.positionAvailability.find((entry) => entry.date === executionDate);
  assert.ok(quantCashAtSession, `Quant cash ledger must include ${executionDate}`);
  assert.ok(quantPositionAtSession, `Quant position ledger must include ${executionDate}`);
  const quantPortfolioCashCents = quantCashAtSession.settledCashCents + quantCashAtSession.unsettledSaleProceedsCents;
  assert.equal(centsFromMoney(snapshot.cash.amount), quantPortfolioCashCents, `${scenario} Portfolio cash must match Quant settled cash plus explicitly unsettled sale proceeds on ${executionDate}`);
  assert.equal(snapshot.positions.find((position) => position.security === security)?.quantity ?? 0, quantPositionAtSession.heldQuantity, `${scenario} Portfolio quantity must match Quant held quantity on ${executionDate}`);
  portfolioQuantLedgerReconciliations += 1;
  return { ...executed, accountId: account.accountId, reservationId: reservation.reservationId, snapshot, quantLedger: { settledCashCents: quantCashAtSession.settledCashCents, unsettledSaleProceedsCents: quantCashAtSession.unsettledSaleProceedsCents, heldQuantity: quantPositionAtSession.heldQuantity } };
}

try {
  await pool.query("SELECT 1");
  await portfolioPool.query("SELECT 1");
  await governancePool.query("SELECT 1");
  const broker = new PostgresFakeBrokerRepository(pool);
  await broker.migrate();
  await portfolio.migrate();
  await startPaperHttpServices();

  // A valid Governance grant and Portfolio reservation must still be rejected
  // when the independent FakeBroker account cannot fund the fixed BUY. The
  // failed transaction must leave no order, Fill, Outbox, or seeded asset row;
  // a corrected, newly authorized retry then completes exactly once.
  const recoveryScenario = "fakebroker-insufficient-cash-recovery";
  const recoveryRunId = randomUUID();
  const recoveryNamespace = `${namespace}-recovery`;
  const recoveryOwnerId = `v14-parity-${recoveryScenario}`;
  const recoveryClientOrderId = `parity-recovery-${randomUUID()}`;
  const recoveryAccount = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/initialize`, "platform-api-service", serviceTokens.platform, {
    fixtureAccountRef: `v14-parity-${recoveryScenario}`, ownerId: recoveryOwnerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
    initialCash: { amount: "2000.0000", currency: "CNY" }, namespace: recoveryNamespace, testRunId: recoveryRunId, idempotencyKey: recoveryScenario,
  });
  const recoveryAccountId = recoveryAccount.snapshot.accountId;
  const recoveryReservationResponse = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${recoveryAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, {
    namespace: recoveryNamespace, testRunId: recoveryRunId, ownerId: recoveryOwnerId, idempotencyKey: recoveryClientOrderId,
    clientOrderId: recoveryClientOrderId, side: "BUY", currency: "CNY", cashAmount: "2000.0000", security: null, quantity: null,
  });
  const recoveryReservation = recoveryReservationResponse.reservation;
  const recoveryBaseCommand = {
    namespace: recoveryNamespace, accountId: recoveryAccountId, clientOrderId: recoveryClientOrderId, security: "600000.SH", requestedQuantity: 29,
    bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.0000", volume: 100 }, side: "BUY", participationRate: 0.29,
    slippageBps: 0, currency: "CNY", reservation: { reservationId: recoveryReservation.reservationId, ownerId: recoveryOwnerId, testRunId: recoveryRunId, clientOrderId: recoveryClientOrderId },
  };
  const grantRecoveryCommand = async (initialAccountCash) => {
    const command = { ...recoveryBaseCommand, initialAccountCash };
    const authorizationCommand = {
      namespace: recoveryNamespace, accountId: recoveryAccountId, clientOrderId: recoveryClientOrderId, security: "600000.SH", requestedQuantity: 29,
      initialAccountCash, bar: command.bar,
    };
    const response = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
      method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
      body: JSON.stringify({ namespace: recoveryNamespace, accountId: recoveryAccountId, command: authorizationCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }), signal: AbortSignal.timeout(5000),
    });
    const grant = await response.json().catch(() => null);
    assert.equal(response.status, 200, `recovery Replay authorization failed: ${JSON.stringify(grant)}`);
    governanceGrantCount += 1;
    return { ...command, authorizationId: grant.authorizationId };
  };
  const underfundedCommand = await grantRecoveryCommand("0.0000");
  const underfundedResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(underfundedCommand), signal: AbortSignal.timeout(10000),
  });
  const underfundedBody = await underfundedResponse.json().catch(() => null);
  assert.equal(underfundedResponse.status, 422, `FakeBroker must reject a valid but insufficient independent cash seed: ${JSON.stringify(underfundedBody)}`);
  assert.equal(underfundedBody?.error, "FAKEBROKER_INSUFFICIENT_ASSETS");
  const afterUnderfunded = await pool.query(`SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS outbox,
      (SELECT count(*)::int FROM fake_broker_account_assets WHERE namespace=$1 AND account_id=$3) AS assets,
      (SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events`, [recoveryNamespace, recoveryClientOrderId, recoveryAccountId]);
  assert.deepEqual(afterUnderfunded.rows[0], { orders: 0, fills: 0, outbox: 0, assets: 0, asset_events: 0 }, "insufficient FakeBroker assets must roll back every broker ledger effect");
  const recoveredCommand = await grantRecoveryCommand("2000.0000");
  const recoveredResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(recoveredCommand), signal: AbortSignal.timeout(10000),
  });
  const recoveredBody = await recoveredResponse.json().catch(() => null);
  assert.equal(recoveredResponse.status, 200, `corrected FakeBroker asset seed must allow the newly authorized retry: ${JSON.stringify(recoveredBody)}`);
  assert.ok(recoveredBody?.result?.fill);
  const afterRecovery = await pool.query(`SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS outbox,
      (SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events`, [recoveryNamespace, recoveryClientOrderId, recoveryAccountId]);
  assert.deepEqual(afterRecovery.rows[0], { orders: 1, fills: 1, outbox: 1, asset_events: 1 }, "the valid recovery authorization must commit each broker ledger fact exactly once");
  const recoveredRetryResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(recoveredCommand), signal: AbortSignal.timeout(10000),
  });
  const recoveredRetry = await recoveredRetryResponse.json().catch(() => null);
  assert.equal(recoveredRetryResponse.status, 200);
  assert.equal(recoveredRetry.replayed, true);
  assert.equal(recoveredRetry.result.orderId, recoveredBody.result.orderId);
  fakeBrokerInsufficientAssetRecovery = true;

  for (const item of [
    { side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03" },
    { side: "SELL", signalDate: "2024-01-04", executionDate: "2024-01-05" },
  ]) {
    const sellOrder = item.side === "SELL" ? { signalDate: item.signalDate, executionDate: item.executionDate, quantity: 29 } : undefined;
    const backtest = new V14BacktestEngine(bars, "v14-postgres-parity", { ...policy, ...(sellOrder ? { sellOrder } : {}) }).run("normal");
    const expected = backtest.evidence.trades.find((trade) => trade.side === item.side);
    assert.ok(expected, `${item.side} fill is missing from the Quant result`);

    const clientOrderId = `parity-${item.side.toLowerCase()}-${randomUUID()}`;
    expectedOutboxInputs.set(clientOrderId, { security: "600000.SH", side: item.side, currency: "CNY", scenario: "cn-standard" });
    const execution = await executePaperHttpScenario({ scenario: "cn-standard", market: "CN_A", currency: "CNY", security: "600000.SH", side: item.side, clientOrderId, quantity: 29, executionDate: item.executionDate, timestamp: `${item.executionDate}T01:30:00.000Z`, open: "10.00", volume: 100, participationRate: 0.29, slippageBps: 55, marketFeeSchedule, quantBacktest: backtest });
    assert.equal(execution.replayed, false);
    assert.equal(execution.result.status, "FILLED");
    assert.ok(execution.result.fill);
    expectedOutboxInputs.get(clientOrderId).portfolioAccountId = execution.accountId;

    const persisted = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
      f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
    assert.equal(persisted.rowCount, 1);
    const actual = persisted.rows[0];
    assert.deepEqual({
      status: actual.status,
      quantity: actual.quantity,
      price: actual.price,
      fee: actual.fee,
      session: actual.session,
      fillOutbox: actual.fill_outbox,
    }, {
      status: "FILLED",
      quantity: expected.quantity,
      price: `${Math.floor(expected.priceCents / 100)}.${(expected.priceCents % 100).toString().padStart(2, "0")}00`,
      fee: `${Math.floor(expected.feeCents / 100)}.${(expected.feeCents % 100).toString().padStart(2, "0")}00`,
      session: item.executionDate,
      fillOutbox: true,
    });
  }

  const historicalFeeCases = [
    {
      schedule: { scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", commissionRatePartsPerBillion: 68_700, minimumCommissionCents: 5 },
      bars: ["2023-08-23", "2023-08-24", "2023-08-25", "2023-08-28"].map((date) => ({ date, securityId: "600000.SH", closeCents: 1_000, volume: 100 })),
      orders: [{ side: "BUY", signalDate: "2023-08-23", executionDate: "2023-08-24" }, { side: "SELL", signalDate: "2023-08-24", executionDate: "2023-08-25" }],
    },
    {
      schedule: marketFeeSchedule,
      bars: ["2023-08-25", "2023-08-28", "2023-08-29", "2023-08-30"].map((date) => ({ date, securityId: "600000.SH", closeCents: 1_000, volume: 100 })),
      orders: [{ side: "BUY", signalDate: "2023-08-25", executionDate: "2023-08-28" }, { side: "SELL", signalDate: "2023-08-29", executionDate: "2023-08-30" }],
    },
  ];
  for (const feeCase of historicalFeeCases) {
    for (const item of feeCase.orders) {
      const historicalPolicy = { ...policy, marketFeeSchedule: feeCase.schedule };
      const sellOrder = item.side === "SELL" ? { signalDate: item.signalDate, executionDate: item.executionDate, quantity: 29 } : undefined;
      const backtest = new V14BacktestEngine(feeCase.bars, `v14-historical-fee-${feeCase.schedule.scheduleId}`, { ...historicalPolicy, ...(sellOrder ? { sellOrder } : {}) }).run("normal");
      const expected = backtest.evidence.trades.find((trade) => trade.side === item.side);
      assert.ok(expected, `${feeCase.schedule.scheduleId} ${item.side} fill is missing from the Quant result`);
      const clientOrderId = `parity-historical-${item.executionDate}-${item.side.toLowerCase()}-${randomUUID()}`;
      expectedOutboxInputs.set(clientOrderId, { security: "600000.SH", side: item.side, currency: "CNY", scenario: feeCase.schedule.scheduleId });
      const execution = await executePaperHttpScenario({ scenario: feeCase.schedule.scheduleId, market: "CN_A", currency: "CNY", security: "600000.SH", side: item.side, clientOrderId, quantity: 29, executionDate: item.executionDate, timestamp: `${item.executionDate}T01:30:00.000Z`, open: "10.00", volume: 100, participationRate: 0.29, slippageBps: 55, marketFeeSchedule: feeCase.schedule, quantBacktest: backtest });
      assert.equal(execution.result.status, "FILLED", `${feeCase.schedule.scheduleId} ${item.side} should fill`);
      expectedOutboxInputs.get(clientOrderId).portfolioAccountId = execution.accountId;
      const persisted = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
        f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
        FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
        WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
      assert.equal(persisted.rowCount, 1);
      assert.deepEqual(persisted.rows[0], {
        status: "FILLED", quantity: expected.quantity,
        price: `${Math.floor(expected.priceCents / 100)}.${(expected.priceCents % 100).toString().padStart(2, "0")}00`,
        fee: `${Math.floor(expected.feeCents / 100)}.${(expected.feeCents % 100).toString().padStart(2, "0")}00`,
        session: item.executionDate, fill_outbox: true,
      }, `${feeCase.schedule.scheduleId} ${item.side} persisted facts must match Quant`);
    }
  }

  // The US slice deliberately uses a fixed synthetic fee schedule. It checks
  // USD serialization and persisted FakeBroker facts without claiming a real
  // US market fee/tax model.
  const usBars = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"].map((date) => ({ date, securityId: "AAPL", closeCents: 1_000, volume: 1_000 }));
  const usPolicy = { initialCashCents: 200_000, targetQuantity: 100, participationRateBasisPoints: 2_900, slippageBasisPoints: 0, fixedFeeCents: 100 };
  for (const item of [
    { side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03" },
    { side: "SELL", signalDate: "2024-01-04", executionDate: "2024-01-05" },
  ]) {
    const sellOrder = item.side === "SELL" ? { signalDate: item.signalDate, executionDate: item.executionDate, quantity: 100 } : undefined;
    const backtest = new V14BacktestEngine(usBars, "v14-us-fixture-parity", { ...usPolicy, ...(sellOrder ? { sellOrder } : {}) }).run("normal");
    const expected = backtest.evidence.trades.find((trade) => trade.side === item.side);
    assert.ok(expected, `US ${item.side} fill is missing from the Quant result`);
    const clientOrderId = `parity-us-${item.side.toLowerCase()}-${randomUUID()}`;
    expectedOutboxInputs.set(clientOrderId, { security: "AAPL", side: item.side, currency: "USD", scenario: "us-standard" });
    const execution = await executePaperHttpScenario({ scenario: "us-standard", market: "US_EQUITY", currency: "USD", security: "AAPL", side: item.side, clientOrderId, quantity: 100, executionDate: item.executionDate, timestamp: `${item.executionDate}T14:30:00.000Z`, open: "10.00", volume: 1_000, participationRate: 0.29, slippageBps: 0, quantBacktest: backtest });
    assert.equal(execution.replayed, false);
    assert.equal(execution.result.status, "FILLED");
    assert.ok(execution.result.fill);
    expectedOutboxInputs.get(clientOrderId).portfolioAccountId = execution.accountId;
    const persisted = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
      f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
    assert.equal(persisted.rowCount, 1);
    assert.deepEqual(persisted.rows[0], {
      status: "FILLED", quantity: expected.quantity,
      price: `${Math.floor(expected.priceCents / 100)}.${(expected.priceCents % 100).toString().padStart(2, "0")}00`,
      fee: `${Math.floor(expected.feeCents / 100)}.${(expected.feeCents % 100).toString().padStart(2, "0")}00`,
      session: item.executionDate, fill_outbox: true,
    });
  }

  const partialPolicy = { ...policy, participationRateBasisPoints: 2_500, fixedFeeCents: 25 };
  const partialBacktest = new V14BacktestEngine(bars, "v14-postgres-partial-parity", partialPolicy).run("normal");
  const expectedPartial = partialBacktest.evidence.trades.find((trade) => trade.side === "BUY");
  assert.ok(expectedPartial, "partial BUY fill is missing from the Quant result");
  const partialClientOrderId = `parity-partial-buy-${randomUUID()}`;
  expectedOutboxInputs.set(partialClientOrderId, { security: "600000.SH", side: "BUY", currency: "CNY", scenario: "cn-partial" });
  const partialExecution = await executePaperHttpScenario({ scenario: "cn-partial", market: "CN_A", currency: "CNY", security: "600000.SH", side: "BUY", clientOrderId: partialClientOrderId, quantity: 29, executionDate: "2024-01-03", timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 100, participationRate: 0.25, slippageBps: 55, marketFeeSchedule, quantBacktest: partialBacktest });
  assert.equal(partialExecution.replayed, false);
  assert.equal(partialExecution.result.status, "PARTIALLY_FILLED");
  assert.ok(partialExecution.result.fill);
  expectedOutboxInputs.get(partialClientOrderId).portfolioAccountId = partialExecution.accountId;
  const persistedPartial = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
      f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, partialClientOrderId]);
  assert.equal(persistedPartial.rowCount, 1);
  assert.deepEqual(persistedPartial.rows[0], {
    status: "PARTIALLY_FILLED",
    quantity: expectedPartial.quantity,
    price: `${Math.floor(expectedPartial.priceCents / 100)}.${(expectedPartial.priceCents % 100).toString().padStart(2, "0")}00`,
    fee: `${Math.floor(expectedPartial.feeCents / 100)}.${(expectedPartial.feeCents % 100).toString().padStart(2, "0")}00`,
    session: "2024-01-03",
    fill_outbox: true,
  });

  const noVolumeBars = bars.map((bar, index) => index === 1 ? { ...bar, volume: 0 } : bar);
  const noVolumeBacktest = new V14BacktestEngine(noVolumeBars, "v14-postgres-zero-volume-parity", policy).run("normal");
  const expectedRejection = noVolumeBacktest.evidence.orderOutcomes.find((outcome) => outcome.side === "BUY");
  assert.deepEqual(expectedRejection, {
    side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 29,
    filledQuantity: 0, status: "REJECTED", reason: "ZERO_VOLUME",
  });
  const rejectedClientOrderId = `parity-zero-volume-${randomUUID()}`;
  const rejectedExecution = await broker.execute({
    namespace, accountId, clientOrderId: rejectedClientOrderId, security: "600000.SH", requestedQuantity: 29,
    side: "BUY", currency: "CNY",
    bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 0 },
    participationRate: 0.29, slippageBps: 0,
  });
  assert.equal(rejectedExecution.result.status, expectedRejection.status);
  assert.equal(rejectedExecution.result.rejectionReason, expectedRejection.reason);
  const persistedRejection = await pool.query(`SELECT o.status, o.rejection_reason AS reason,
      (SELECT count(*)::int FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, rejectedClientOrderId]);
  assert.deepEqual(persistedRejection.rows, [{ status: "REJECTED", reason: "ZERO_VOLUME", fills: 0, fill_outbox: 0 }]);

  // A terminal rejection through the authorized HTTP path must release its
  // resource reservation from the same durable FakeBroker order evidence.
  const rejectionNamespace = `${namespace}-http-zero-volume`;
  const rejectionRunId = randomUUID();
  const rejectionOwnerId = `v14-parity-http-zero-volume-${randomUUID()}`;
  const rejectionClientOrderId = `parity-http-zero-volume-${randomUUID()}`;
  const rejectionAccount = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/initialize`, "platform-api-service", serviceTokens.platform, {
    fixtureAccountRef: rejectionOwnerId, ownerId: rejectionOwnerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
    initialCash: { amount: "2000.0000", currency: "CNY" }, namespace: rejectionNamespace, testRunId: rejectionRunId, idempotencyKey: rejectionOwnerId,
  });
  const rejectionAccountId = rejectionAccount.snapshot.accountId;
  const rejectionReservationResult = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${rejectionAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, {
    namespace: rejectionNamespace, testRunId: rejectionRunId, ownerId: rejectionOwnerId, idempotencyKey: rejectionClientOrderId,
    clientOrderId: rejectionClientOrderId, side: "BUY", currency: "CNY", cashAmount: "500.0000", security: null, quantity: null,
  });
  const rejectionReservation = rejectionReservationResult.reservation;
  const rejectionCommand = {
    namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: rejectionClientOrderId, security: "600000.SH", requestedQuantity: 29,
    initialAccountCash: "2000.0000", bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 0 },
    side: "BUY", participationRate: 0.29, slippageBps: 55, currency: "CNY",
    reservation: { reservationId: rejectionReservation.reservationId, ownerId: rejectionOwnerId, testRunId: rejectionRunId, clientOrderId: rejectionClientOrderId },
  };
  const rejectionAuthorizationResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify({ namespace: rejectionNamespace, accountId: rejectionAccountId, command: { namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: rejectionClientOrderId, security: "600000.SH", requestedQuantity: 29, initialAccountCash: "2000.0000", bar: rejectionCommand.bar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
    signal: AbortSignal.timeout(5000),
  });
  const rejectionAuthorization = await rejectionAuthorizationResponse.json().catch(() => null);
  assert.equal(rejectionAuthorizationResponse.status, 200, `zero-volume Replay authorization failed: ${JSON.stringify(rejectionAuthorization)}`);
  const authorizedRejectionCommand = { ...rejectionCommand, authorizationId: rejectionAuthorization.authorizationId };
  const httpRejectionResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedRejectionCommand), signal: AbortSignal.timeout(10000),
  });
  const httpRejection = await httpRejectionResponse.json().catch(() => null);
  assert.equal(httpRejectionResponse.status, 200, `authorized zero-volume rejection failed: ${JSON.stringify(httpRejection)}`);
  assert.deepEqual({ status: httpRejection.result.status, rejectionReason: httpRejection.result.rejectionReason, replayed: httpRejection.replayed }, { status: expectedRejection.status, rejectionReason: expectedRejection.reason, replayed: false });
  const rejectionReplayResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedRejectionCommand), signal: AbortSignal.timeout(10000),
  });
  const rejectionReplay = await rejectionReplayResponse.json().catch(() => null);
  assert.equal(rejectionReplayResponse.status, 200);
  assert.equal(rejectionReplay.replayed, true, "a same-command rejected retry must replay the durable rejection");
  assert.equal(rejectionReplay.result.orderId, httpRejection.result.orderId);
  const rejectedOrderFacts = await pool.query(`SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND f.event_type='FILL_POST') AS fill_outbox,
      (SELECT count(*)::int FROM fake_broker_outbox r JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND r.event_type='RESERVATION_RESOLVE' AND r.status='DELIVERED') AS released_reservations,
      (SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events,
      (SELECT current_cash::text FROM fake_broker_account_assets WHERE namespace=$1 AND account_id=$3) AS broker_cash`, [rejectionNamespace, rejectionClientOrderId, rejectionAccountId]);
  assert.deepEqual(rejectedOrderFacts.rows[0], { orders: 1, fills: 0, fill_outbox: 0, released_reservations: 1, asset_events: 0, broker_cash: "2000.0000" }, "the terminal rejection must release only its reservation, with no Fill or asset side effect");
  const rejectedPortfolioSnapshot = await fetch(`${portfolioHttpUrl}/internal/v1/accounts/${rejectionAccountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}`, "x-stockquant-owner-id": rejectionOwnerId } }).then((response) => response.json());
  assert.equal(rejectedPortfolioSnapshot.cash.amount, "2000.0000");
  assert.equal(rejectedPortfolioSnapshot.ledgerEntryCount, 1, "reservation release and rejection must not create a Portfolio ledger entry");
  assert.equal(rejectedPortfolioSnapshot.reservations.find((item) => item.reservationId === rejectionReservation.reservationId)?.status, "RELEASED");

  // Carry the Quant restriction fixture's complete daily bar through Governance
  // authorization and the real Paper/FakeBroker HTTP path. A changed limit is
  // a different authorized/idempotent request, so replay the exact command.
  const restrictionFixture = readFileSync(resolve("fixtures/v1/v1.4/market_restrictions_synthetic.csv"), "utf8");
  assert.equal(createHash("sha256").update(restrictionFixture).digest("hex"), "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a", "Paper restrictions must use the frozen Quant scenario Fixture");
  const restrictionRows = restrictionFixture.trim().split(/\r?\n/u).slice(1).map((line) => line.split(","));
  const restrictionCases = restrictionRows.filter((row) => ["suspended-buy", "locked-upper-buy"].includes(row[0])).map((row) => ({
    name: row[0], side: row[1], date: row[2], security: row[3], open: row[4], high: row[5], low: row[6], close: row[7], volume: Number(row[8]), tradingStatus: row[9], upperLimit: row[10], lowerLimit: row[11],
    reason: row[0] === "suspended-buy" ? "SUSPENDED" : "LOCKED_AT_UPPER_LIMIT",
  }));
  assert.equal(restrictionCases.length, 2, "frozen restriction Fixture must contain suspended and locked-upper BUY rows");
  for (const restriction of restrictionCases) {
    const restrictionClientOrderId = `parity-http-${restriction.name}-${randomUUID()}`;
    const restrictionReservationResult = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${rejectionAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, {
      namespace: rejectionNamespace, testRunId: rejectionRunId, ownerId: rejectionOwnerId, idempotencyKey: restrictionClientOrderId,
      clientOrderId: restrictionClientOrderId, side: "BUY", currency: "CNY", cashAmount: "500.0000", security: null, quantity: null,
    });
    const restrictionReservation = restrictionReservationResult.reservation;
    const restrictionBar = { timestamp: `${restriction.date}T01:30:00.000Z`, open: restriction.open, high: restriction.high, low: restriction.low, close: restriction.close, volume: restriction.volume, tradingStatus: restriction.tradingStatus, upperLimit: restriction.upperLimit, lowerLimit: restriction.lowerLimit };
    const restrictionCommand = {
      namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: restrictionClientOrderId, security: restriction.security, requestedQuantity: 29,
      initialAccountCash: "2000.0000", bar: restrictionBar, side: restriction.side, participationRate: 0.29, slippageBps: 55, currency: "CNY",
      reservation: { reservationId: restrictionReservation.reservationId, ownerId: rejectionOwnerId, testRunId: rejectionRunId, clientOrderId: restrictionClientOrderId },
    };
    const restrictionAuthorizationResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
      method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
      body: JSON.stringify({ namespace: rejectionNamespace, accountId: rejectionAccountId, command: { namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: restrictionClientOrderId, security: restriction.security, requestedQuantity: 29, initialAccountCash: "2000.0000", bar: restrictionBar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
      signal: AbortSignal.timeout(5000),
    });
    const restrictionAuthorization = await restrictionAuthorizationResponse.json().catch(() => null);
    assert.equal(restrictionAuthorizationResponse.status, 200, `${restriction.name} Governance authorization failed: ${JSON.stringify(restrictionAuthorization)}`);
    const authorizedRestrictionCommand = { ...restrictionCommand, authorizationId: restrictionAuthorization.authorizationId };
    const restrictionExecutionResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
      method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
      body: JSON.stringify(authorizedRestrictionCommand), signal: AbortSignal.timeout(10000),
    });
    const restrictionExecution = await restrictionExecutionResponse.json().catch(() => null);
    assert.equal(restrictionExecutionResponse.status, 200, `${restriction.name} Paper execution failed: ${JSON.stringify(restrictionExecution)}`);
    assert.deepEqual({ status: restrictionExecution.result.status, rejectionReason: restrictionExecution.result.rejectionReason, replayed: restrictionExecution.replayed }, { status: "REJECTED", rejectionReason: restriction.reason, replayed: false });
    const restrictionReplayResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
      method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
      body: JSON.stringify(authorizedRestrictionCommand), signal: AbortSignal.timeout(10000),
    });
    const restrictionReplay = await restrictionReplayResponse.json().catch(() => null);
    assert.equal(restrictionReplayResponse.status, 200);
    assert.equal(restrictionReplay.replayed, true, `${restriction.name} same-command replay must return the durable rejection`);
    assert.equal(restrictionReplay.result.orderId, restrictionExecution.result.orderId);
    const restrictionFacts = await pool.query(`SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND f.event_type='FILL_POST') AS fill_outbox,
      (SELECT count(*)::int FROM fake_broker_outbox r JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND r.event_type='RESERVATION_RESOLVE' AND r.status='DELIVERED') AS released_reservations`, [rejectionNamespace, restrictionClientOrderId]);
    assert.deepEqual(restrictionFacts.rows[0], { orders: 1, fills: 0, fill_outbox: 0, released_reservations: 1 }, `${restriction.name} creates only the auditable rejected order and releases its reservation`);
    governanceGrantCount += 1;
  }

  const lockedLowerRow = restrictionRows.find((row) => row[0] === "locked-lower-sell");
  assert.ok(lockedLowerRow, "frozen restriction Fixture must contain the locked-lower SELL row");
  const lockedLowerClientOrderId = `parity-http-locked-lower-sell-${randomUUID()}`;
  const lockedLowerBar = { timestamp: `${lockedLowerRow[2]}T01:30:00.000Z`, open: lockedLowerRow[4], high: lockedLowerRow[5], low: lockedLowerRow[6], close: lockedLowerRow[7], volume: Number(lockedLowerRow[8]), tradingStatus: lockedLowerRow[9], upperLimit: lockedLowerRow[10], lowerLimit: lockedLowerRow[11] };
  const lockedLowerCommand = { namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: lockedLowerClientOrderId, security: lockedLowerRow[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: lockedLowerBar, side: "SELL", participationRate: 0.29, slippageBps: 55, currency: "CNY" };
  const lockedLowerGrantResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify({ namespace: rejectionNamespace, accountId: rejectionAccountId, command: { namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: lockedLowerClientOrderId, security: lockedLowerRow[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: lockedLowerBar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
    signal: AbortSignal.timeout(5000),
  });
  const lockedLowerGrant = await lockedLowerGrantResponse.json().catch(() => null);
  assert.equal(lockedLowerGrantResponse.status, 200, `locked-lower SELL Governance authorization failed: ${JSON.stringify(lockedLowerGrant)}`);
  const authorizedLockedLowerCommand = { ...lockedLowerCommand, authorizationId: lockedLowerGrant.authorizationId };
  const lockedLowerExecutionResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedLockedLowerCommand), signal: AbortSignal.timeout(10000),
  });
  const lockedLowerExecution = await lockedLowerExecutionResponse.json().catch(() => null);
  assert.equal(lockedLowerExecutionResponse.status, 200, `locked-lower SELL Paper execution failed: ${JSON.stringify(lockedLowerExecution)}`);
  assert.deepEqual({ status: lockedLowerExecution.result.status, rejectionReason: lockedLowerExecution.result.rejectionReason, replayed: lockedLowerExecution.replayed }, { status: "REJECTED", rejectionReason: "LOCKED_AT_LOWER_LIMIT", replayed: false });
  const lockedLowerRetryResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedLockedLowerCommand), signal: AbortSignal.timeout(10000),
  });
  const lockedLowerRetry = await lockedLowerRetryResponse.json().catch(() => null);
  assert.equal(lockedLowerRetryResponse.status, 200);
  assert.equal(lockedLowerRetry.replayed, true, "locked-lower SELL retry must replay the same durable rejection");
  const lockedLowerFacts = await pool.query(`SELECT
    (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
    (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND x.event_type IN ('FILL_POST','RESERVATION_RESOLVE')) AS financial_outbox,
    (SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events`, [rejectionNamespace, lockedLowerClientOrderId, rejectionAccountId]);
  assert.deepEqual(lockedLowerFacts.rows[0], { orders: 1, fills: 0, financial_outbox: 0, asset_events: 0 }, "locked-lower SELL persists only the auditable rejected order without financial Outbox or FakeBroker asset effects");
  governanceGrantCount += 1;

  // Stronger P4 path: establish a real held position through the authorized
  // Paper/FakeBroker→Portfolio flow, then reject a lower-limit SELL only after
  // Portfolio has accepted a dated sell reservation for that position.
  const sellChainFixture = readFileSync(resolve("fixtures/v1/v1.4/market_restrictions_sell_chain.csv"), "utf8");
  assert.equal(createHash("sha256").update(sellChainFixture).digest("hex"), "dcbb0ee08607ad46ac287b3c9ce912c008fa7a29b2f0bd55d4f7f7547805f9c2", "SELL holdings scenario must use its frozen, versioned input");
  const [sellChainHeader, sellChainBuyRow, sellChainSellRow] = sellChainFixture.trim().split(/\r?\n/u);
  assert.equal(sellChainHeader, "case_id,side,date,security_id,open,high,low,close,volume,trading_status,upper_limit,lower_limit");
  const sellChainBuy = sellChainBuyRow.split(",");
  const sellChainSell = sellChainSellRow.split(",");
  assert.equal(sellChainBuy[0], "seed-position-buy");
  assert.equal(sellChainSell[0], "locked-lower-sell");
  const sellChainNamespace = `${namespace}-locked-sell-position`;
  const sellChainRunId = randomUUID();
  const sellChainOwnerId = `v14-parity-locked-sell-position-${randomUUID()}`;
  const sellChainAccount = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/initialize`, "platform-api-service", serviceTokens.platform, {
    fixtureAccountRef: sellChainOwnerId, ownerId: sellChainOwnerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
    initialCash: { amount: "2000.0000", currency: "CNY" }, namespace: sellChainNamespace, testRunId: sellChainRunId, idempotencyKey: sellChainOwnerId,
  });
  const sellChainAccountId = sellChainAccount.snapshot.accountId;
  const setupBuyId = `parity-http-${sellChainBuy[0]}-${randomUUID()}`;
  const setupBuyReservationBody = { namespace: sellChainNamespace, testRunId: sellChainRunId, ownerId: sellChainOwnerId, idempotencyKey: setupBuyId, clientOrderId: setupBuyId, side: "BUY", currency: "CNY", cashAmount: "500.0000", security: null, quantity: null };
  const setupBuyReservation = (await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${sellChainAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, setupBuyReservationBody)).reservation;
  const setupBuyBar = { timestamp: `${sellChainBuy[2]}T01:30:00.000Z`, open: sellChainBuy[4], high: sellChainBuy[5], low: sellChainBuy[6], close: sellChainBuy[7], volume: Number(sellChainBuy[8]), tradingStatus: sellChainBuy[9], upperLimit: sellChainBuy[10], lowerLimit: sellChainBuy[11] };
  const setupBuyCommand = { namespace: sellChainNamespace, accountId: sellChainAccountId, clientOrderId: setupBuyId, security: sellChainBuy[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: setupBuyBar, side: "BUY", participationRate: 0.29, slippageBps: 55, currency: "CNY", reservation: { reservationId: setupBuyReservation.reservationId, ownerId: sellChainOwnerId, testRunId: sellChainRunId, clientOrderId: setupBuyId } };
  const setupBuyGrantResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` }, body: JSON.stringify({ namespace: sellChainNamespace, accountId: sellChainAccountId, command: { namespace: sellChainNamespace, accountId: sellChainAccountId, clientOrderId: setupBuyId, security: sellChainBuy[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: setupBuyBar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }), signal: AbortSignal.timeout(5000) });
  const setupBuyGrant = await setupBuyGrantResponse.json().catch(() => null);
  assert.equal(setupBuyGrantResponse.status, 200, `position setup BUY authorization failed: ${JSON.stringify(setupBuyGrant)}`);
  const setupBuyResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` }, body: JSON.stringify({ ...setupBuyCommand, authorizationId: setupBuyGrant.authorizationId }), signal: AbortSignal.timeout(10000) });
  const setupBuy = await setupBuyResponse.json().catch(() => null);
  assert.equal(setupBuyResponse.status, 200, `position setup BUY failed: ${JSON.stringify(setupBuy)}`);
  assert.equal(setupBuy.result.status, "FILLED");
  assert.equal(setupBuy.result.fill.quantity, 29);
  governanceGrantCount += 1;
  const beforeLockedSell = await fetch(`${portfolioHttpUrl}/internal/v1/accounts/${sellChainAccountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}`, "x-stockquant-owner-id": sellChainOwnerId } }).then((response) => response.json());
  assert.equal(beforeLockedSell.positions.find((item) => item.security === sellChainBuy[3])?.quantity, 29, "an actual prior-session holding must exist before the locked SELL");
  assert.equal(beforeLockedSell.ledgerEntryCount, 2, "setup BUY must post exactly one Portfolio fill ledger entry");

  const sellChainId = `parity-http-${sellChainSell[0]}-${randomUUID()}`;
  const sellChainSellReservation = (await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${sellChainAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, { namespace: sellChainNamespace, testRunId: sellChainRunId, ownerId: sellChainOwnerId, idempotencyKey: sellChainId, clientOrderId: sellChainId, side: "SELL", currency: "CNY", cashAmount: null, security: sellChainSell[3], quantity: 29, asOf: `${sellChainSell[2]}T12:00:00+08:00` })).reservation;
  assert.equal(sellChainSellReservation.status, "HELD", "Portfolio must accept a dated SELL reservation against the actual sellable holding");
  const sellChainBar = { timestamp: `${sellChainSell[2]}T01:30:00.000Z`, open: sellChainSell[4], high: sellChainSell[5], low: sellChainSell[6], close: sellChainSell[7], volume: Number(sellChainSell[8]), tradingStatus: sellChainSell[9], upperLimit: sellChainSell[10], lowerLimit: sellChainSell[11] };
  const sellChainCommand = { namespace: sellChainNamespace, accountId: sellChainAccountId, clientOrderId: sellChainId, security: sellChainSell[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: sellChainBar, side: "SELL", participationRate: 0.29, slippageBps: 55, currency: "CNY", reservation: { reservationId: sellChainSellReservation.reservationId, ownerId: sellChainOwnerId, testRunId: sellChainRunId, clientOrderId: sellChainId } };
  const sellChainGrantResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` }, body: JSON.stringify({ namespace: sellChainNamespace, accountId: sellChainAccountId, command: { namespace: sellChainNamespace, accountId: sellChainAccountId, clientOrderId: sellChainId, security: sellChainSell[3], requestedQuantity: 29, initialAccountCash: "2000.0000", bar: sellChainBar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }), signal: AbortSignal.timeout(5000) });
  const sellChainGrant = await sellChainGrantResponse.json().catch(() => null);
  assert.equal(sellChainGrantResponse.status, 200, `reserved locked SELL authorization failed: ${JSON.stringify(sellChainGrant)}`);
  const sellChainExecutionResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` }, body: JSON.stringify({ ...sellChainCommand, authorizationId: sellChainGrant.authorizationId }), signal: AbortSignal.timeout(10000) });
  const sellChainExecution = await sellChainExecutionResponse.json().catch(() => null);
  assert.equal(sellChainExecutionResponse.status, 200, `reserved locked SELL Paper rejection failed: ${JSON.stringify(sellChainExecution)}`);
  assert.deepEqual({ status: sellChainExecution.result.status, rejectionReason: sellChainExecution.result.rejectionReason, replayed: sellChainExecution.replayed }, { status: "REJECTED", rejectionReason: "LOCKED_AT_LOWER_LIMIT", replayed: false });
  const sellChainRetryResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` }, body: JSON.stringify({ ...sellChainCommand, authorizationId: sellChainGrant.authorizationId }), signal: AbortSignal.timeout(10000) });
  const sellChainRetry = await sellChainRetryResponse.json().catch(() => null);
  assert.equal(sellChainRetryResponse.status, 200);
  assert.equal(sellChainRetry.replayed, true);
  assert.equal(sellChainRetry.result.orderId, sellChainExecution.result.orderId);
  const sellChainFacts = await pool.query(`SELECT (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,(SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,(SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND x.event_type='FILL_POST') AS fill_outbox,(SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND x.event_type='RESERVATION_RESOLVE' AND x.status='DELIVERED') AS released_reservations,(SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events`, [sellChainNamespace, sellChainId, sellChainAccountId]);
  assert.deepEqual(sellChainFacts.rows[0], { orders: 1, fills: 0, fill_outbox: 0, released_reservations: 1, asset_events: 1 }, "locked SELL adds one audit order and releases its real reservation without another asset event");
  const afterLockedSell = await fetch(`${portfolioHttpUrl}/internal/v1/accounts/${sellChainAccountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}`, "x-stockquant-owner-id": sellChainOwnerId } }).then((response) => response.json());
  assert.equal(afterLockedSell.positions.find((item) => item.security === sellChainSell[3])?.quantity, 29, "rejected locked SELL must preserve the actual Portfolio holding");
  assert.equal(afterLockedSell.cash.amount, beforeLockedSell.cash.amount, "rejected locked SELL must preserve Portfolio cash");
  assert.equal(afterLockedSell.ledgerEntryCount, beforeLockedSell.ledgerEntryCount, "rejected locked SELL must not add Portfolio ledger entries");
  assert.equal(afterLockedSell.reservations.find((item) => item.reservationId === sellChainSellReservation.reservationId)?.status, "RELEASED", "only the locked SELL reservation must be released");
  const sellChainAssetsResponse = await fetch(`${tradeHttpUrl}/internal/v1/v13/accounts/assets?${new URLSearchParams({ namespace: sellChainNamespace, accountId: sellChainAccountId })}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}` } });
  const sellChainAssets = await sellChainAssetsResponse.json();
  assert.equal(sellChainAssetsResponse.status, 200);
  assert.equal(sellChainAssets.current_cash, beforeLockedSell.cash.amount);
  assert.deepEqual(sellChainAssets.positions, [{ security: sellChainSell[3], quantity: 29 }], "independent FakeBroker holding must also remain unchanged after the rejected SELL");
  assert.equal(sellChainAssets.fill_event_count, 1);
  governanceGrantCount += 1;

  const expiredClientOrderId = `parity-http-limit-expired-${randomUUID()}`;
  const expiredReservationResult = await postJson(`${portfolioHttpUrl}/internal/v1/accounts/${rejectionAccountId}/reservations`, "trade-execution-service", serviceTokens.trade, {
    namespace: rejectionNamespace, testRunId: rejectionRunId, ownerId: rejectionOwnerId, idempotencyKey: expiredClientOrderId,
    clientOrderId: expiredClientOrderId, side: "BUY", currency: "CNY", cashAmount: "500.0000", security: null, quantity: null,
  });
  const expiredReservation = expiredReservationResult.reservation;
  const expiredCommand = {
    namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: expiredClientOrderId, security: "600000.SH", requestedQuantity: 29,
    initialAccountCash: "2000.0000", bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 100 },
    side: "BUY", orderType: "LIMIT", limitPrice: "9.00", participationRate: 0.29, slippageBps: 55, currency: "CNY",
    reservation: { reservationId: expiredReservation.reservationId, ownerId: rejectionOwnerId, testRunId: rejectionRunId, clientOrderId: expiredClientOrderId },
  };
  const expiredAuthorizationResponse = await fetch(`${governanceHttpUrl}/internal/v1/authorizations`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify({ namespace: rejectionNamespace, accountId: rejectionAccountId, command: { namespace: rejectionNamespace, accountId: rejectionAccountId, clientOrderId: expiredClientOrderId, security: "600000.SH", requestedQuantity: 29, initialAccountCash: "2000.0000", bar: expiredCommand.bar }, environmentMode: "BACKTEST", brokerMode: "FAKE" }),
    signal: AbortSignal.timeout(5000),
  });
  const expiredAuthorization = await expiredAuthorizationResponse.json().catch(() => null);
  assert.equal(expiredAuthorizationResponse.status, 200, `limit-expiry Replay authorization failed: ${JSON.stringify(expiredAuthorization)}`);
  governanceGrantCount += 1;
  const authorizedExpiredCommand = { ...expiredCommand, authorizationId: expiredAuthorization.authorizationId };
  const httpExpiredResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedExpiredCommand), signal: AbortSignal.timeout(10000),
  });
  const httpExpired = await httpExpiredResponse.json().catch(() => null);
  assert.equal(httpExpiredResponse.status, 200, `authorized limit expiry failed: ${JSON.stringify(httpExpired)}`);
  assert.deepEqual({ status: httpExpired.result.status, rejectionReason: httpExpired.result.rejectionReason, replayed: httpExpired.replayed }, { status: "EXPIRED", rejectionReason: "LIMIT_NOT_MARKETABLE", replayed: false });
  const expiredReplayResponse = await fetch(`${tradeHttpUrl}/internal/v1/historical-orders/execute`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${serviceTokens.replay}` },
    body: JSON.stringify(authorizedExpiredCommand), signal: AbortSignal.timeout(10000),
  });
  const expiredReplay = await expiredReplayResponse.json().catch(() => null);
  assert.equal(expiredReplayResponse.status, 200);
  assert.equal(expiredReplay.replayed, true, "a same-command expired retry must replay the durable expiry");
  assert.equal(expiredReplay.result.orderId, httpExpired.result.orderId);
  const expiredOrderFacts = await pool.query(`SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND f.event_type='FILL_POST') AS fill_outbox,
      (SELECT count(*)::int FROM fake_broker_outbox r JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND o.client_order_id=$2 AND r.event_type='RESERVATION_RESOLVE' AND r.status='DELIVERED' AND r.payload->>'outcome'='EXPIRED') AS released_reservations,
      (SELECT count(*)::int FROM fake_broker_asset_events WHERE namespace=$1 AND account_id=$3) AS asset_events,
      (SELECT current_cash::text FROM fake_broker_account_assets WHERE namespace=$1 AND account_id=$3) AS broker_cash`, [rejectionNamespace, expiredClientOrderId, rejectionAccountId]);
  assert.deepEqual(expiredOrderFacts.rows[0], { orders: 1, fills: 0, fill_outbox: 0, released_reservations: 1, asset_events: 0, broker_cash: "2000.0000" }, "the terminal expiry must release only its reservation, with no Fill or asset side effect");
  const expiredPortfolioSnapshot = await fetch(`${portfolioHttpUrl}/internal/v1/accounts/${rejectionAccountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${serviceTokens.platform}`, "x-stockquant-owner-id": rejectionOwnerId } }).then((response) => response.json());
  assert.equal(expiredPortfolioSnapshot.cash.amount, "2000.0000");
  assert.equal(expiredPortfolioSnapshot.ledgerEntryCount, 1);
  assert.equal(expiredPortfolioSnapshot.reservations.find((item) => item.reservationId === expiredReservation.reservationId)?.status, "RELEASED");

  const counts = await pool.query(`SELECT count(*)::int AS orders,
    (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND x.event_type='FILL_POST') AS fill_outbox
    FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
  assert.deepEqual(counts.rows[0], { orders: 10, fills: 9, fill_outbox: 9 });
  assert.equal(expectedOutboxInputs.size, 9);
  const fillOutboxFacts = await pool.query(`SELECT o.client_order_id, o.account_id, o.namespace, o.security,
      f.external_fill_id, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee, f.effective_at::text AS effective_at,
      x.payload
    FROM fake_broker_orders o
    JOIN fake_broker_fills f USING(order_id)
    JOIN fake_broker_outbox x ON x.order_id=o.order_id AND x.event_type='FILL_POST'
    WHERE o.namespace=$1
    ORDER BY o.client_order_id`, [namespace]);
  assert.equal(fillOutboxFacts.rowCount, 9);
  let portfolioBuyReconciliations = 0;
  for (const row of fillOutboxFacts.rows) {
    const expectedInput = expectedOutboxInputs.get(row.client_order_id);
    assert.ok(expectedInput, `Fill Outbox should correspond to a fixed expected order ${row.client_order_id}`);
    assert.deepEqual({
      accountId: row.payload.accountId,
      namespace: row.payload.namespace,
      security: row.payload.security,
      externalFillId: row.payload.externalFillId,
      quantity: row.payload.quantity,
      price: row.payload.price,
      fee: row.payload.fee,
      effectiveAt: row.payload.effectiveAt,
      side: row.payload.side,
      currency: row.payload.currency,
      securityMatchesExpected: row.security === expectedInput.security,
      accountMatchesPortfolio: row.account_id === expectedInput.portfolioAccountId,
    }, {
      accountId: row.account_id,
      namespace: row.namespace,
      security: row.security,
      externalFillId: row.external_fill_id,
      quantity: row.quantity,
      price: row.price,
      fee: row.fee,
      effectiveAt: new Date(row.effective_at).toISOString(),
      side: expectedInput.side,
      currency: expectedInput.currency,
      securityMatchesExpected: true,
      accountMatchesPortfolio: true,
    }, `Fill Outbox payload must preserve persisted FakeBroker facts for ${row.external_fill_id}`);

    const account = portfolioAccounts.get(expectedInput.scenario);
    assert.ok(account, `Trade HTTP should have used a separately initialized Portfolio account for ${expectedInput.scenario}`);
    assert.equal(row.account_id, account.accountId);
    const snapshot = await portfolio.snapshot(account.accountId, account.ownerId);
    assert.ok(snapshot);
    assert.deepEqual({ cash: snapshot.cash, positions: snapshot.positions, ledgerEntryCount: snapshot.ledgerEntryCount }, {
      cash: { amount: account.cash, currency: expectedInput.currency },
      positions: [...account.quantityBySecurity.entries()].filter(([, quantity]) => quantity > 0).map(([security, quantity]) => ({ security, quantity })),
      ledgerEntryCount: 1 + account.tradeCount,
    }, `independent Portfolio ledger should reconcile to actual HTTP-delivered fills for ${row.external_fill_id}`);
    if (expectedInput.side === "BUY") portfolioBuyReconciliations += 1;
  }
  assert.equal(portfolioBuyReconciliations, 5);
  assert.equal(governanceGrantCount, 17);
  const authorizationRows = await governancePool.query("SELECT count(*)::int AS total,count(*) FILTER (WHERE status='CONSUMED')::int AS consumed FROM execution_authorizations WHERE namespace=$1", [namespace]);
  assert.deepEqual(authorizationRows.rows[0], { total: 1, consumed: 1 }, "isolated real Governance must retain exactly one current namespace grant, consumed after each rotation");
  assert.equal(portfolioQuantLedgerReconciliations, 9);
  assert.equal(fakeBrokerAssetReconciliations, 9);
  assert.equal(fakeBrokerIdempotentAssetReplays, 9);
  assert.equal(fakeBrokerInsufficientAssetRecovery, true);
  console.log(JSON.stringify({ status: "PASS", databases: ["isolated trade_execution_test", "isolated portfolio_risk_test", "isolated decision_governance_test"], liveServices: ["Decision Governance HTTP", "Trade Execution HTTP", "Portfolio Risk HTTP"], governanceAuthorization: "real Replay authorization grant/consume HTTP+PostgreSQL; nine fixed outcome orders, two insufficient-cash/recovery grants, and REJECTED, EXPIRED, suspended and locked-limit terminal outcomes were command-hash-bound", scenario: "V1.4 Quant versus Trade HTTP/FakeBroker persistence and independent FakeBroker/Portfolio HTTP-ledger outcomes", fixtures: { CN_A: "synthetic exact-cent CNY with versioned current and historical fee schedules", US_EQUITY: "synthetic USD with fixed fixture fee; not a real-market fee claim" }, compared: ["CN BUY/SELL through Trade and Portfolio HTTP", "CN partial BUY through Trade and Portfolio HTTP", "CN zero-volume rejection and nonmarketable LIMIT expiry through Trade HTTP with durable reservation release and idempotent replay", "CN suspension, locked-upper BUY and locked-lower SELL rejection through Trade HTTP; complete bar limits bound into Governance and idempotency", "CN historical-fee BUY/SELL before 2023-08-28", "CN current-fee BUY/SELL from 2023-08-28", "US BUY/SELL through Trade and Portfolio HTTP", "independent FakeBroker cash/positions/events", "same-command retry preserves order/fill/assets or terminal rejection/expiry", "insufficient FakeBroker cash rejects with zero side effects and a newly authorized corrected retry recovers exactly once", "independent Portfolio ledger snapshots and Outbox account scope", "prior-session holding plus real sell reservation released on locked-lower SELL"], fields: ["status", "quantity", "price", "fee", "session", "rejection reason", "Fill outbox", "reservation resolution outbox", "FakeBroker independent cash and positions", "Portfolio cash", "Portfolio position", "Portfolio ledger entries", "Governance authorization command hash/status"], portfolioBuyReconciliations, portfolioQuantLedgerReconciliations, fakeBrokerAssetReconciliations, fakeBrokerIdempotentAssetReplays, fakeBrokerInsufficientAssetRecovery, rejectedHttpReservationReleased: true, expiredHttpReservationReleased: true, marketRestrictionHttpReservationsReleased: 3, marketRestrictionLockedLowerSellHttp: true, marketRestrictionSellReservationBacked: true, governanceGrantCount, governanceAuthorizationRows: authorizationRows.rows[0], settlementBoundary: "Portfolio cash is compared against Quant settled cash plus unsettled sale proceeds; sell availability/receivable settlement parity remains unasserted pending OD-014", counts: counts.rows[0] }));
} finally {
  for (const child of [...serviceProcesses].reverse()) await stopService(child);
  await governancePool.end();
  await portfolioPool.end();
  await pool.end();
}
