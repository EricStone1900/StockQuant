import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";

const databaseUrl = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const parsed = new URL(databaseUrl);
const databaseName = decodeURIComponent(parsed.pathname.slice(1));
if (databaseName !== "trade_execution_test" || parsed.username === "trade_execution") throw new Error("execution auth HTTP smoke requires only trade_execution_test");
const pool = new Pool({ connectionString: databaseUrl });
const token = () => `smoke-${randomUUID()}-${randomUUID()}`;
const tokens = { platform: token(), replay: token(), outbound: token() };
const namespace = `service-auth-http-smoke/${randomUUID()}`;
const orderId = randomUUID();
const clientOrderId = `auth-${randomUUID()}`;
const clientModeInjectionCases = [
  { environmentMode: "PAPER", brokerMode: "FAKE" },
  { environmentMode: "LIVE", brokerMode: "FAKE" },
  { environmentMode: "PAPER", brokerMode: "REAL" },
  { environmentMode: "BACKTEST", brokerMode: "FAKE" },
  { environmentMode: "BACKTEST", brokerMode: "REAL" },
  { environmentMode: "LIVE", brokerMode: "REAL" },
];
async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const value = server.address().port;
      server.close((error) => error ? reject(error) : resolvePort(value));
    });
  });
}

const governancePort = await freePort();
let governanceIdentityVerified = false;
let governanceAuthorizationAllowed = true;
let governanceValidationCalls = 0;
const governance = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    governanceIdentityVerified = request.method === "POST"
      && request.url === "/internal/v1/authorizations/validate"
      && request.headers["x-stockquant-service-id"] === "trade-execution-service"
      && request.headers.authorization === `Bearer ${tokens.outbound}`;
    governanceValidationCalls += 1;
    const valid = governanceIdentityVerified && governanceAuthorizationAllowed;
    response.writeHead(valid ? 200 : 403, { "content-type": "application/json" });
    response.end(JSON.stringify({ valid }));
  });
});
await new Promise((resolveListen, reject) => { governance.once("error", reject); governance.listen(governancePort, "127.0.0.1", resolveListen); });

const port = await freePort();
const serviceEnv = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: "/tmp",
  NODE_ENV: "test",
  STOCKQUANT_BIND_HOST: "127.0.0.1",
  STOCKQUANT_PORT: String(port),
  STOCKQUANT_DATABASE_URL: databaseUrl,
  STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1",
  STOCKQUANT_GOVERNANCE_URL: `http://127.0.0.1:${governancePort}`,
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay,
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.outbound
};
const service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env: serviceEnv, stdio: ["ignore", "pipe", "pipe"] });
let serviceOutput = "";
for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => { if (serviceOutput.length < 8000) serviceOutput += chunk.toString().slice(0, 8000 - serviceOutput.length); });
const base = `http://127.0.0.1:${port}`;
async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (service.exitCode !== null) throw new Error(`trade execution service exited: ${serviceOutput}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* wait for the isolated process */ }
    await delay(100);
  }
  throw new Error(`trade execution service did not become ready: ${serviceOutput}`);
}
async function request(path, method, caller, bearer, body) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(caller ? { "x-stockquant-service-id": caller } : {}),
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

let migrated = false;
let runStatus;
try {
  await pool.query("SELECT 1");
  await waitReady();
  migrated = true;
  const assetAccountId = randomUUID();
  const assetOwnerId = `asset-owner-${randomUUID()}`;
  const assetTestRunId = randomUUID();
  await pool.query(`INSERT INTO fake_broker_account_assets
    (namespace,account_id,owner_id,test_run_id,currency,initial_cash,current_cash)
    VALUES($1,$2,$3,$4,'CNY',100000,98765.4321)`, [namespace, assetAccountId, assetOwnerId, assetTestRunId]);
  await pool.query(`INSERT INTO fake_broker_positions(namespace,account_id,security,quantity)
    VALUES($1,$2,'600000.SH',200)`, [namespace, assetAccountId]);
  const assetSnapshotResponse = await request(`/internal/v1/v13/accounts/assets?namespace=${encodeURIComponent(namespace)}&accountId=${encodeURIComponent(assetAccountId)}`, "GET", "platform-api-service", tokens.platform);
  const assetSnapshot = await assetSnapshotResponse.json();
  const assetSnapshotWrongIdentity = await request(`/internal/v1/v13/accounts/assets?namespace=${encodeURIComponent(namespace)}&accountId=${encodeURIComponent(assetAccountId)}`, "GET", "historical-replay-worker", tokens.replay);
  const assetSnapshotWrongAccount = await request(`/internal/v1/v13/accounts/assets?namespace=${encodeURIComponent(namespace)}&accountId=${randomUUID()}`, "GET", "platform-api-service", tokens.platform);
  const assetSnapshotWrongNamespace = await request(`/internal/v1/v13/accounts/assets?namespace=${encodeURIComponent(`${namespace}/other`)}&accountId=${encodeURIComponent(assetAccountId)}`, "GET", "platform-api-service", tokens.platform);
  const assetSnapshotMissingScope = await request("/internal/v1/v13/accounts/assets?namespace=&accountId=", "GET", "platform-api-service", tokens.platform);
  assert.equal(assetSnapshotResponse.status, 200);
  assert.deepEqual({
    brokerMode: assetSnapshot.brokerMode,
    source: assetSnapshot.source,
    namespace: assetSnapshot.namespace,
    ownerId: assetSnapshot.owner_id,
    testRunId: assetSnapshot.test_run_id,
    currency: assetSnapshot.currency,
    initialCash: assetSnapshot.initial_cash,
    currentCash: assetSnapshot.current_cash,
    positions: assetSnapshot.positions
  }, {
    brokerMode: "FAKE",
    source: "FAKEBROKER_INDEPENDENT_ASSET_LEDGER",
    namespace,
    ownerId: assetOwnerId,
    testRunId: assetTestRunId,
    currency: "CNY",
    initialCash: "100000.0000",
    currentCash: "98765.4321",
    positions: [{ security: "600000.SH", quantity: 200 }]
  });
  assert.equal(assetSnapshotWrongIdentity.status, 403);
  assert.equal(assetSnapshotWrongAccount.status, 404);
  assert.equal(assetSnapshotWrongNamespace.status, 404);
  assert.equal(assetSnapshotMissingScope.status, 422);
  const v13ModeInjectionRoutes = [
    ["manual", "/internal/v1/v13/paper-orders/execute-manual-proposal", { accountId: randomUUID(), clientOrderId: `mode-injection-${randomUUID()}`, namespace, now: "2026-10-08T00:00:00Z", ownerId: "auth-smoke-owner", proposalId: randomUUID(), testRunId: randomUUID() }],
    ["sequenced", "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", { accountId: randomUUID(), clientOrderId: `mode-injection-${randomUUID()}`, namespace, now: "2026-10-08T00:00:00Z", ownerId: "auth-smoke-owner", proposalId: randomUUID(), testRunId: randomUUID() }],
    ["auto", "/internal/v1/v13/paper-orders/execute-auto-proposal", { accountId: randomUUID(), clientOrderId: `mode-injection-${randomUUID()}`, mandateId: randomUUID(), mandateVersion: 1, namespace, now: "2026-10-08T00:00:00Z", ownerId: "auth-smoke-owner", proposalId: randomUUID(), testRunId: randomUUID() }]
  ];
  const v13ModeInjectionResults = [];
  for (const [name, path, body] of v13ModeInjectionRoutes) {
    for (const modes of clientModeInjectionCases) {
      const response = await request(path, "POST", "platform-api-service", tokens.platform, { ...body, ...modes });
      assert.equal(response.status, 422, `V1.3 ${name} HTTP contract must reject caller-supplied ${modes.environmentMode}/${modes.brokerMode}`);
      v13ModeInjectionResults.push({ route: name, ...modes, status: response.status });
    }
  }
  const v13ModeInjectionSideEffects = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1) AS fills,
      (SELECT count(*)::int FROM fake_broker_order_events e JOIN fake_broker_orders o ON o.order_id=e.order_id WHERE o.namespace=$1) AS events,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1) AS outbox`, [namespace]);
  assert.deepEqual(v13ModeInjectionSideEffects.rows[0], { orders: 0, fills: 0, events: 0, outbox: 0 }, "mode injection must have no FakeBroker order, fill, event, or outbox side effects");
  const writeRouteScopeCases = [
    ["historical execute", "/internal/v1/historical-orders/execute", "historical-replay-worker", "platform-api-service", tokens.platform],
    ["C5 local FakeBroker execute", "/internal/v1/c5-local/paper-orders/execute", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["C5 local session settlement", "/internal/v1/c5-local/accounts/settlements", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["snapshot execute", "/internal/v1/v24/paper-orders/execute-snapshot", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["manual proposal execute", "/internal/v1/v13/paper-orders/execute-manual-proposal", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["sequenced proposal execute", "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["AUTO proposal execute", "/internal/v1/v13/paper-orders/execute-auto-proposal", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["Paper receivable settlement", "/internal/v1/v13/accounts/settlements", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["external simulated order", "/internal/v1/fake-broker/external-orders", "platform-api-service", "historical-replay-worker", tokens.replay],
    ["order cancellation", `/internal/v1/orders/${orderId}/cancel`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["cancellation result", `/internal/v1/orders/${orderId}/cancel-result`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["order expiry", `/internal/v1/orders/${orderId}/expire`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["order UNKNOWN transition", `/internal/v1/orders/${orderId}/unknown`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["simulated fill report", `/internal/v1/orders/${orderId}/simulated-fill-reports`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["fee correction", `/internal/v1/orders/${orderId}/fills/${randomUUID()}/fee-corrections`, "platform-api-service", "historical-replay-worker", tokens.replay],
    ["outbox compensation", `/internal/v1/outbox/${randomUUID()}/compensate`, "platform-api-service", "historical-replay-worker", tokens.replay]
  ];
  const writeRouteScopeResults = [];
  for (const [name, path, allowedCaller, deniedCaller, deniedToken] of writeRouteScopeCases) {
    const denied = await request(path, "POST", deniedCaller, deniedToken, {});
    assert.equal(denied.status, 403, `${name} must reject ${deniedCaller} before parsing its command or touching domain facts`);
    writeRouteScopeResults.push({ route: name, deniedCaller, status: denied.status });
  }
  const v1ProtectedWriteRouteCredentialResults = [];
  for (const [name, path, allowedCaller] of writeRouteScopeCases.filter(([routeName]) => routeName !== "snapshot execute")) {
    const missingIdentity = await request(path, "POST", null, null, {});
    assert.equal(missingIdentity.status, 403, `${name} must reject a request without service identity or Bearer before parsing its command`);
    const wrongToken = allowedCaller === "platform-api-service" ? tokens.replay : tokens.platform;
    const forgedBearer = await request(path, "POST", allowedCaller, wrongToken, {});
    assert.equal(forgedBearer.status, 403, `${name} must reject ${allowedCaller} with another service's Bearer before parsing its command`);
    v1ProtectedWriteRouteCredentialResults.push({ route: name, missingIdentity: missingIdentity.status, forgedBearer: forgedBearer.status });
  }
  assert.equal(v1ProtectedWriteRouteCredentialResults.length, 15, "every in-scope Trade write route must have missing-identity and forged-Bearer probes");
  const c5InvalidContract=await request("/internal/v1/c5-local/paper-orders/execute","POST","platform-api-service",tokens.platform,{authorization:{}});
  assert.equal(c5InvalidContract.status,422,"C5 local execution must reject incomplete authorization evidence before contacting other services");
  const c5InvalidSettlement=await request("/internal/v1/c5-local/accounts/settlements","POST","platform-api-service",tokens.platform,{});
  assert.equal(c5InvalidSettlement.status,422,"C5 local settlement must reject incomplete scope before touching account facts");
  const writeRouteScopeSideEffects = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM fake_broker_orders WHERE namespace=$1) AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1) AS fills,
      (SELECT count(*)::int FROM fake_broker_order_events e JOIN fake_broker_orders o ON o.order_id=e.order_id WHERE o.namespace=$1) AS events,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1) AS outbox,
      (SELECT count(*)::int FROM fake_broker_sell_receivables WHERE namespace=$1) AS sell_receivables`, [namespace]);
  assert.deepEqual(writeRouteScopeSideEffects.rows[0], { orders: 0, fills: 0, events: 0, outbox: 0, sell_receivables: 0 }, "wrong service identities must cause no FakeBroker writes");
  const noIdentity = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", null);
  const forgedToken = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", tokens.replay);
  const unknownIdentity = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "forged-service", tokens.platform);
  const platformSummary = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", tokens.platform);
  const replayQuery = await request(`/internal/v1/historical-orders/${orderId}?namespace=${encodeURIComponent(namespace)}`, "GET", "historical-replay-worker", tokens.replay);
  const replayGenericOrderQuery = await request(`/internal/v1/orders/${orderId}`, "GET", "historical-replay-worker", tokens.replay);
  const platformCannotExecute = await request("/internal/v1/historical-orders/execute", "POST", "platform-api-service", tokens.platform, {});
  const replayCannotCancel = await request(`/internal/v1/orders/${orderId}/cancel`, "POST", "historical-replay-worker", tokens.replay, {});
  const replayCannotRecordCancelResult = await request(`/internal/v1/orders/${orderId}/cancel-result`, "POST", "historical-replay-worker", tokens.replay, { outcome: "ACCEPTED", reason: "smoke", sequence: 1 });
  const invalidCancelResult = await request(`/internal/v1/orders/${orderId}/cancel-result`, "POST", "platform-api-service", tokens.platform, { outcome: "UNKNOWN", reason: "smoke", sequence: 1 });
  const unmatchedCancelResult = await request(`/internal/v1/orders/${orderId}/cancel-result`, "POST", "platform-api-service", tokens.platform, { outcome: "ACCEPTED", reason: "smoke", sequence: 1 });
  assert.equal(noIdentity.status, 403);
  assert.equal(forgedToken.status, 403);
  assert.equal(unknownIdentity.status, 403);
  assert.equal(platformSummary.status, 200);
  assert.equal(replayQuery.status, 404);
  assert.equal(replayGenericOrderQuery.status, 403);
  assert.equal(platformCannotExecute.status, 403);
  assert.equal(replayCannotCancel.status, 403);
  assert.equal(replayCannotRecordCancelResult.status, 403);
  assert.equal(invalidCancelResult.status, 422);
  assert.equal(unmatchedCancelResult.status, 409);
  assert.equal(governanceValidationCalls, 0, "route-scope rejection must stop before governance lookup");

  const deniedCommand = {
    namespace,
    accountId: randomUUID(),
    clientOrderId: `denied-${randomUUID()}`,
    security: "600000.SH",
    requestedQuantity: 100,
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 1000 },
    authorizationId: randomUUID()
  };
  governanceAuthorizationAllowed = false;
  const governanceDenied = await request("/internal/v1/historical-orders/execute", "POST", "historical-replay-worker", tokens.replay, deniedCommand);
  const deniedOrders = await pool.query("SELECT count(*)::int AS count FROM fake_broker_orders WHERE namespace=$1", [namespace]);
  const deniedFills = await pool.query("SELECT count(*)::int AS count FROM fake_broker_fills f JOIN fake_broker_orders o ON o.order_id=f.order_id WHERE o.namespace=$1", [namespace]);
  const deniedEvents = await pool.query("SELECT count(*)::int AS count FROM fake_broker_order_events e JOIN fake_broker_orders o ON o.order_id=e.order_id WHERE o.namespace=$1", [namespace]);
  const deniedOutbox = await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox x JOIN fake_broker_orders o ON o.order_id=x.order_id WHERE o.namespace=$1", [namespace]);
  assert.equal(governanceDenied.status, 403);
  assert.equal(deniedOrders.rows[0].count, 0, "governance rejection must precede FakeBroker order persistence");
  assert.equal(deniedFills.rows[0].count, 0);
  assert.equal(deniedEvents.rows[0].count, 0);
  assert.equal(deniedOutbox.rows[0].count, 0);
  governanceAuthorizationAllowed = true;

  const validHistoricalCommand = {
    namespace,
    accountId: randomUUID(),
    clientOrderId,
    security: "600000.SH",
    requestedQuantity: 100,
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 0 },
    authorizationId: randomUUID()
  };
  const validationsBeforeInjectedMode = governanceValidationCalls;
  const historicalModeInjectionResults = [];
  for (const { environmentMode, brokerMode } of clientModeInjectionCases) {
    const response = await request("/internal/v1/historical-orders/execute", "POST", "historical-replay-worker", tokens.replay, { ...validHistoricalCommand, environmentMode, brokerMode });
    assert.equal(response.status, 422, `BACKTEST FakeBroker execution must reject ${environmentMode}/${brokerMode} injection before authorization or mutation`);
    historicalModeInjectionResults.push({ environmentMode, brokerMode, status: response.status });
  }
  const historicalModeInjectionNoGovernanceCall = governanceValidationCalls === validationsBeforeInjectedMode;
  assert.equal(historicalModeInjectionNoGovernanceCall, true, "malformed historical commands must be rejected before Governance lookup");
  const injectedHistoricalOrder = await pool.query("SELECT count(*)::int AS count FROM fake_broker_orders WHERE namespace=$1 AND client_order_id=$2", [namespace, clientOrderId]);
  assert.equal(injectedHistoricalOrder.rows[0].count, 0, "mode-injected historical commands must not persist an order");
  const execution = await request("/internal/v1/historical-orders/execute", "POST", "historical-replay-worker", tokens.replay, validHistoricalCommand);
  const executionText = await execution.text();
  assert.equal(execution.status, 200, executionText);
  const executionBody = JSON.parse(executionText);
  assert.equal(executionBody.result.status, "REJECTED");
  assert.equal(executionBody.result.rejectionReason, "ZERO_VOLUME");
  assert.equal(governanceIdentityVerified, true);
  const order = await request(`/internal/v1/historical-orders/${executionBody.result.orderId}?namespace=${encodeURIComponent(namespace)}`, "GET", "historical-replay-worker", tokens.replay);
  assert.equal(order.status, 200);
  const crossNamespaceOrder = await request(`/internal/v1/historical-orders/${executionBody.result.orderId}?namespace=${encodeURIComponent(`${namespace}-other`)}`, "GET", "historical-replay-worker", tokens.replay);
  assert.equal(crossNamespaceOrder.status, 404, "historical order lookup must not cross replay namespaces");
  const cancelCommand = {
    namespace, accountId: randomUUID(), clientOrderId: `cancel-${randomUUID()}`, security: "600000.SH", side: "SELL", currency: "CNY", initialAccountCash: "10000.0000",
    requestedQuantity: 100, bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 500 },
    reservation: { reservationId: randomUUID(), ownerId: "auth-smoke-owner", testRunId: randomUUID(), clientOrderId: "pending" }
  };
  cancelCommand.reservation.clientOrderId = cancelCommand.clientOrderId;
  await pool.query(`INSERT INTO fake_broker_account_assets(namespace,account_id,owner_id,test_run_id,currency,initial_cash,current_cash)
    VALUES($1,$2,$3,$4,'CNY',$5::numeric,$5::numeric)`, [cancelCommand.namespace, cancelCommand.accountId, cancelCommand.reservation.ownerId, cancelCommand.reservation.testRunId, cancelCommand.initialAccountCash]);
  await pool.query("INSERT INTO fake_broker_positions(namespace,account_id,security,quantity) VALUES($1,$2,'600000.SH',500)", [cancelCommand.namespace, cancelCommand.accountId]);
  const simulated = await new PostgresFakeBrokerRepository(pool).execute(cancelCommand);
  assert.equal(simulated.result.status, "PARTIALLY_FILLED");
  const orderStateForModeBoundary = async () => pool.query(`SELECT o.status,
    (SELECT count(*)::int FROM fake_broker_order_events e WHERE e.order_id=o.order_id) AS events,
    (SELECT count(*)::int FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id) AS outbox
    FROM fake_broker_orders o WHERE o.order_id=$1`, [simulated.result.orderId]);
  const stateBeforeOrderModeInjection = await orderStateForModeBoundary();
  const v13AdditionalModeBoundaryBefore = await pool.query(`SELECT
    (SELECT count(*)::int FROM fake_broker_external_orders WHERE namespace=$1) AS external_orders,
    (SELECT count(*)::int FROM fake_broker_sell_receivables WHERE namespace=$1) AS sell_receivables,
    (SELECT count(*)::int FROM fake_broker_simulated_reports WHERE order_id=$2) AS simulated_reports,
    (SELECT count(*)::int FROM fake_broker_fee_corrections WHERE external_fill_id=(SELECT external_fill_id FROM fake_broker_fills WHERE order_id=$2 ORDER BY external_fill_id LIMIT 1)) AS fee_corrections,
    (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=$2) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$2) AS outbox`, [namespace, simulated.result.orderId]);
  const v13AdditionalModeBoundaryAttempts = [];
  const rejectV13PaperWriteModeMatrix = async (route, path, body) => {
    for (const modes of clientModeInjectionCases) {
      const response = await request(path, "POST", "platform-api-service", tokens.platform, { ...body, ...modes });
      assert.equal(response.status, 422, `${route} must reject caller-supplied ${modes.environmentMode}/${modes.brokerMode}`);
      v13AdditionalModeBoundaryAttempts.push({ route, ...modes, status: response.status });
    }
  };
  await rejectV13PaperWriteModeMatrix("settlement", "/internal/v1/v13/accounts/settlements", {
    accountId: randomUUID(), asOf: "2026-09-28T01:30:00.000Z", namespace, ownerId: "auth-smoke-owner", testRunId: randomUUID()
  });
  await rejectV13PaperWriteModeMatrix("external-order", "/internal/v1/fake-broker/external-orders", {
    evidenceRef: "auth-smoke:mode-boundary", externalOrderId: `mode-${randomUUID()}`, namespace,
    observedAt: "2026-09-28T01:30:00.000Z", requestedQuantity: 1, security: "600000.SH", status: "NEW"
  });
  await rejectV13PaperWriteModeMatrix("simulated-fill-report", `/internal/v1/orders/${simulated.result.orderId}/simulated-fill-reports`, {
    cumulativeQuantity: Number(simulated.result.fill.quantity), effectiveAt: simulated.result.fill.effectiveAt, evidenceRef: "auth-smoke:mode-boundary",
    externalFillId: randomUUID(), fee: simulated.result.fill.fee, price: simulated.result.fill.price, sequence: 1
  });
  await rejectV13PaperWriteModeMatrix("fee-correction", `/internal/v1/orders/${simulated.result.orderId}/fills/${simulated.result.fill.externalFillId}/fee-corrections`, {
    correctedFee: "1.0000", effectiveAt: simulated.result.fill.effectiveAt, evidenceRef: "auth-smoke:mode-boundary",
    previousFee: simulated.result.fill.fee, revision: 1
  });
  const v13AdditionalModeBoundaryAfter = await pool.query(`SELECT
    (SELECT count(*)::int FROM fake_broker_external_orders WHERE namespace=$1) AS external_orders,
    (SELECT count(*)::int FROM fake_broker_sell_receivables WHERE namespace=$1) AS sell_receivables,
    (SELECT count(*)::int FROM fake_broker_simulated_reports WHERE order_id=$2) AS simulated_reports,
    (SELECT count(*)::int FROM fake_broker_fee_corrections WHERE external_fill_id=(SELECT external_fill_id FROM fake_broker_fills WHERE order_id=$2 ORDER BY external_fill_id LIMIT 1)) AS fee_corrections,
    (SELECT count(*)::int FROM fake_broker_fills WHERE order_id=$2) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox WHERE order_id=$2) AS outbox`, [namespace, simulated.result.orderId]);
  assert.deepEqual(v13AdditionalModeBoundaryAfter.rows, v13AdditionalModeBoundaryBefore.rows, "mode-injected settlement, external order, fill report and fee correction must have no business side effects");
  const transitionModeAttempts = [];
  for (const action of ["expire", "unknown", "cancel"]) {
    for (const modes of clientModeInjectionCases) {
      const response = await request(`/internal/v1/orders/${simulated.result.orderId}/${action}`, "POST", "platform-api-service", tokens.platform, modes);
      assert.equal(response.status, 422, `${action} must reject injected ${modes.environmentMode}/${modes.brokerMode} before changing order state`);
      transitionModeAttempts.push({ action, ...modes, status: response.status });
    }
  }
  assert.deepEqual((await orderStateForModeBoundary()).rows, stateBeforeOrderModeInjection.rows, "mode-injected cancel/expire/unknown calls must create no event, Fill or outbox facts");
  const cancelRequest = await request(`/internal/v1/orders/${simulated.result.orderId}/cancel`, "POST", "platform-api-service", tokens.platform);
  assert.equal(cancelRequest.status, 202);
  const cancelRequestedState = await orderStateForModeBoundary();
  const cancelResultModeAttempts = [];
  for (const modes of clientModeInjectionCases) {
    const injectedCancelResult = await request(`/internal/v1/orders/${simulated.result.orderId}/cancel-result`, "POST", "platform-api-service", tokens.platform, { outcome: "ACCEPTED", reason: "SIMULATED_AUTHORITY", sequence: 1, ...modes });
    assert.equal(injectedCancelResult.status, 422, `cancel-result must reject ${modes.environmentMode}/${modes.brokerMode} before applying the accepted result`);
    cancelResultModeAttempts.push({ ...modes, status: injectedCancelResult.status });
    assert.deepEqual((await orderStateForModeBoundary()).rows, cancelRequestedState.rows, "mode-injected cancel-result must leave order facts unchanged");
  }
  const cancelResult = await request(`/internal/v1/orders/${simulated.result.orderId}/cancel-result`, "POST", "platform-api-service", tokens.platform, { outcome: "ACCEPTED", reason: "SIMULATED_AUTHORITY", sequence: 1 });
  const cancelResultBody = await cancelResult.json();
  const pendingRelease = await pool.query("SELECT count(*)::int AS count FROM fake_broker_outbox WHERE order_id=$1 AND event_type='RESERVATION_RESOLVE'", [simulated.result.orderId]);
  assert.equal(cancelRequest.status, 202);
  assert.equal(cancelResult.status, 200);
  assert.equal(cancelResultBody.status, "CANCELLED");
  assert.equal(pendingRelease.rows[0].count, 0, "reservation release waits until the partial Fill has been posted");
  const compensationCommand = {
    namespace: `${namespace}/compensation`, accountId: randomUUID(), clientOrderId: `compensation-${randomUUID()}`,
    security: "600000.SH", requestedQuantity: 10,
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 1000 }
  };
  const compensationOrder = await new PostgresFakeBrokerRepository(pool).execute(compensationCommand);
  assert.equal(compensationOrder.result.status, "FILLED");
  const compensationEvent = await pool.query("SELECT event_id FROM fake_broker_outbox WHERE order_id=$1", [compensationOrder.result.orderId]);
  assert.equal(compensationEvent.rowCount, 1);
  await pool.query("UPDATE fake_broker_outbox SET status='COMPENSATION_REQUIRED',attempts=3,last_error='fixed HTTP smoke setup' WHERE event_id=$1", [compensationEvent.rows[0].event_id]);
  const compensationState = async () => pool.query("SELECT status,attempts,last_error FROM fake_broker_outbox WHERE event_id=$1", [compensationEvent.rows[0].event_id]);
  const compensationBeforeInjection = await compensationState();
  const compensationModeAttempts = [];
  for (const modes of clientModeInjectionCases) {
    const injectedCompensation = await request(`/internal/v1/outbox/${compensationEvent.rows[0].event_id}/compensate`, "POST", "platform-api-service", tokens.platform, modes);
    assert.equal(injectedCompensation.status, 422, `Outbox compensation must reject ${modes.environmentMode}/${modes.brokerMode} before requeueing the event`);
    compensationModeAttempts.push({ ...modes, status: injectedCompensation.status });
    assert.deepEqual((await compensationState()).rows, compensationBeforeInjection.rows, "mode-injected compensation must leave event status, attempts and error unchanged");
  }
  const compensationAfterInjection = await compensationState();
  const validCompensation = await request(`/internal/v1/outbox/${compensationEvent.rows[0].event_id}/compensate`, "POST", "platform-api-service", tokens.platform);
  assert.equal(validCompensation.status, 202, await validCompensation.text());
  const compensationAfterValid = await compensationState();
  assert.equal(compensationAfterValid.rows[0].status, "COMPENSATION_REQUIRED", "failed isolated Portfolio delivery remains visibly in compensation state");
  runStatus = { v13IndependentAssetRead: { status: assetSnapshotResponse.status, wrongIdentity: assetSnapshotWrongIdentity.status, wrongAccount: assetSnapshotWrongAccount.status, wrongNamespace: assetSnapshotWrongNamespace.status, missingScope: assetSnapshotMissingScope.status, accountId: assetAccountId, ownerId: assetOwnerId, testRunId: assetTestRunId, currency: assetSnapshot.currency, currentCash: assetSnapshot.current_cash, positions: assetSnapshot.positions }, v13ModeInjection: v13ModeInjectionResults, v13ModeInjectionSideEffects: v13ModeInjectionSideEffects.rows[0], v13AdditionalModeBoundary: { attempts: v13AdditionalModeBoundaryAttempts, unchangedBusinessFacts: JSON.stringify(v13AdditionalModeBoundaryBefore.rows) === JSON.stringify(v13AdditionalModeBoundaryAfter.rows), facts: v13AdditionalModeBoundaryAfter.rows[0] }, writeRouteScope: writeRouteScopeResults, v1ProtectedWriteRouteCredentialResults, writeRouteScopeSideEffects: writeRouteScopeSideEffects.rows[0], noIdentity: noIdentity.status, forgedToken: forgedToken.status, unknownIdentity: unknownIdentity.status, platformRead: platformSummary.status, replayRead: replayQuery.status, platformExecuteDenied: platformCannotExecute.status, replayCancelDenied: replayCannotCancel.status, replayCancelResultDenied: replayCannotRecordCancelResult.status, invalidCancelResult: invalidCancelResult.status, unmatchedCancelResult: unmatchedCancelResult.status, governanceDenied: governanceDenied.status, denialSideEffects: { orders: deniedOrders.rows[0].count, fills: deniedFills.rows[0].count, events: deniedEvents.rows[0].count, outbox: deniedOutbox.rows[0].count }, governedExecution: execution.status, historicalModeInjection: { attempts: historicalModeInjectionResults, governanceCallsUnchanged: historicalModeInjectionNoGovernanceCall, noOrderPersisted: injectedHistoricalOrder.rows[0].count === 0 }, outboxCompensationModeInjection: { attempts: compensationModeAttempts, unchangedBeforeValidCompensation: JSON.stringify(compensationBeforeInjection.rows) === JSON.stringify(compensationAfterInjection.rows), validStatus: validCompensation.status, remainsCompensationRequired: compensationAfterValid.rows[0].status === "COMPENSATION_REQUIRED" }, rejectedZeroVolume: executionBody.result.rejectionReason, tradeOrderTransitionModeInjection: { attempts: transitionModeAttempts, cancelResultAttempts: cancelResultModeAttempts, unchangedOrderFactsBeforeAndAfter: true }, cancelRequest: cancelRequest.status, simulatedCancelResult: { status: cancelRequest.status, orderStatus: cancelResultBody.status, releaseDeferredUntilFillPosted: pendingRelease.rows[0].count === 0 }, governanceBearerVerified: governanceIdentityVerified, governanceValidationCalls };
  console.log(JSON.stringify({ status: "PASS", namespace, evidence: runStatus }));
} finally {
  if (service.exitCode === null) {
    service.kill("SIGTERM");
    await new Promise((resolveClose) => service.once("close", resolveClose));
  }
  await new Promise((resolveClose, reject) => governance.close((error) => error ? reject(error) : resolveClose()));
  if (migrated) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_sell_receivables WHERE namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_authoritative_event_inbox e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_order_event_sequences s USING fake_broker_orders o WHERE s.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
      const remaining = await client.query("SELECT count(*)::int AS count FROM fake_broker_orders WHERE namespace=$1", [namespace]);
      assert.equal(remaining.rows[0].count, 0);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  await pool.end();
}
