import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { PostgresFakeBrokerRepository } from "../../trade-execution-service/dist/adapters/postgres-fake-broker-repository.js";
import { AlertOutboxRepository } from "../../market-data-service/dist/adapters/postgres-alert-outbox-repository.js";
import { isIsolatedPostgresTarget } from "../../trade-execution-service/scripts/isolated-postgres-target.mjs";

const { Client, Pool } = pg;
const service = fileURLToPath(new URL("..", import.meta.url));
const repo = resolve(service, "../..");
const suffix = randomUUID().replaceAll("-", "");
const adminUrl = new URL(process.env.V24_PAPER_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(isIsolatedPostgresTarget(adminUrl.toString(), process.env.STOCKQUANT_ISOLATED_PG_CONTAINER, undefined, { username: "postgres", database: "postgres" }), true, "Paper smoke requires the bounded disposable PostgreSQL admin endpoint; shared Compose PostgreSQL is forbidden");
const admin = new Client({ connectionString: adminUrl.toString() });
const databases = ["platform", "portfolio", "trade", "governance", "market_data"].map((name) => `sq_v24_paper_${name}_${suffix}`);
const urls = databases.map((database) => { const url = new URL(adminUrl); url.pathname = `/${database}`; return url.toString(); });
const tokens = Object.fromEntries(["platform", "trade", "replay", "governance"].map((name) => [name, randomBytes(48).toString("base64url")]));
const owner = `v24-paper-${suffix}`;
const children = [];
let dropNextExecutionResponse = false;
let failNextClientOrderLookup = false;
let droppedExecutionResponseCount = 0;
let webImageTag;
let webImageId;
let webContainerName;
let webContainerRemoved = false;
let webImageRemoved = false;
let proxy;
let portfolioProxy;
let dropNextPortfolioFillResponse = false;
let portfolioFillResponseDropped = false;
let holdPortfolioFillRetries = false;
let v24OutboxRecoveryEvidence = null;
let governanceProxy;
let governanceAuthorizationPause = null;
let canary;
let recoveryControl;
const proxyErrors = [];
const governanceProxyErrors = [];
const proxyEvents = [];
const executionRequests = [];
let webTestRunId;
let webTestRuns = [];
let webFactCounts = null;
let browserPlatformControlRunId;
let consumedAuthorizationRevokeEvidence = null;
const dbNamesCreated = [];
let tradeProcess;
let tradeRestartEvidence = null;
let outboxRestartEvidence = null;
let pendingFillCancelEvidence = null;
let databaseSnapshotFiles = [];
let marketDataProcess;
let marketDataPool;
let alertIntegrationEvidence;

async function freePort() {
  const server = createServer();
  return new Promise((resolvePort, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((error) => error ? reject(error) : resolvePort(port)); }); });
}
function start(script, cwd, env, args = []) {
  const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const entry = { child, output: "" };
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { entry.output = (entry.output + chunk.toString()).slice(-12000); });
  children.push(entry); return entry;
}
async function stop(entry) {
  if (!entry || entry.child.exitCode !== null) return;
  entry.child.kill("SIGTERM");
  await Promise.race([new Promise((done) => entry.child.once("exit", done)), delay(3000)]);
  if (entry.child.exitCode === null) entry.child.kill("SIGKILL");
}
async function waitReady(entry, url, live = false) {
  for (let i = 0; i < 150; i += 1) {
    if (entry.child.exitCode !== null) throw new Error(`temporary service exited before ready: ${entry.output}`);
    try { if ((await fetch(url)).ok) return; } catch { /* wait for listen */ }
    await delay(100);
  }
  throw new Error(`temporary service readiness timeout: ${url}\n${entry.output}`);
}
function serviceEnv(databaseUrl, port, extra = {}) {
  return { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl, STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false", ...extra };
}
async function request(apiUrl, path, { method = "GET", cookie = `sq_session=${owner}`, body } = {}) {
  let response;
  try { response = await fetch(`${apiUrl}${path}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) }); }
  catch (error) { throw new Error(`Platform request failed ${method} ${path}: ${error instanceof Error ? error.message : String(error)}\ngovernanceProxyErrors=${JSON.stringify(governanceProxyErrors)}\nproxyEvents=${JSON.stringify(proxyEvents)}\nservices=${JSON.stringify(children.map(({ child, output }) => ({ pid: child.pid, exitCode: child.exitCode, output: output.slice(-5000) })))}`); }
  return { status: response.status, body: await response.json().catch(() => null) };
}
async function internalRequest(baseUrl, path, headers = {}, body = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  return { status: response.status, body: await response.json().catch(() => null) };
}
async function paperFactCounts() {
  const portfolioDb = new Client({ connectionString: urls[1] });
  const tradeDb = new Client({ connectionString: urls[2] });
  await Promise.all([portfolioDb.connect(), tradeDb.connect()]);
  try {
    const ledger = await portfolioDb.query("SELECT count(*)::int AS count FROM ledger_entries");
    const portfolioFills = await portfolioDb.query("SELECT count(*)::int AS count FROM recorded_fills");
    const positions = await portfolioDb.query("SELECT count(*)::int AS count FROM account_positions");
    const reservations = await portfolioDb.query("SELECT count(*)::int AS count FROM resource_reservations");
    const orders = await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_orders");
    const fills = await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_fills");
    const orderEvents = await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_order_events");
    const outbox = await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_outbox");
    return { ledgerEntries: ledger.rows[0].count, portfolioFills: portfolioFills.rows[0].count, positions: positions.rows[0].count, reservations: reservations.rows[0].count, brokerOrders: orders.rows[0].count, brokerFills: fills.rows[0].count, brokerOrderEvents: orderEvents.rows[0].count, outboxEvents: outbox.rows[0].count };
  } finally { await Promise.all([portfolioDb.end(), tradeDb.end()]); }
}

try {
  await admin.connect();
  for (const database of databases) { await admin.query(`CREATE DATABASE "${database}"`); dbNamesCreated.push(database); }
  const [platformPort, portfolioPort, tradePort, governancePort, canaryPort] = await Promise.all(Array.from({ length: 5 }, freePort));
  const portfolioUrl = `http://127.0.0.1:${portfolioPort}`;
  const governanceUrl = `http://127.0.0.1:${governancePort}`;
  const tradeUrl = `http://127.0.0.1:${tradePort}`;
  canary = createServer((req, res) => { if (req.url === "/ready") { res.writeHead(200).end('{"status":"ready"}'); return; } res.writeHead(404).end(); });
  await new Promise((resolveListen, reject) => { canary.once("error", reject); canary.listen(canaryPort, "127.0.0.1", resolveListen); });
  const canaryUrl = `http://127.0.0.1:${canaryPort}`;
  const portfolioEnv = serviceEnv(urls[1], portfolioPort, {
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay, STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS: tokens.governance
  });
  let portfolio = start(resolve(repo, "services/portfolio-risk-service/dist/main.js"), resolve(repo, "services/portfolio-risk-service"), portfolioEnv);
  await waitReady(portfolio, `${portfolioUrl}/ready`);
  const portfolioProxyPort = await freePort();
  portfolioProxy = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (holdPortfolioFillRetries && req.method === "POST" && req.url?.endsWith("/fills")) {
        res.writeHead(503, { "content-type": "application/json" }); res.end('{"error":"isolated fault gate holds V2.4 Outbox retry until Trade restart"}'); return;
      }
      const headers = Object.fromEntries(["content-type", "authorization", "x-stockquant-service-id", "x-stockquant-owner-id"].flatMap((name) => req.headers[name] ? [[name, req.headers[name]]] : []));
      const upstream = await fetch(`${portfolioUrl}${req.url}`, { method: req.method, headers, ...(body.length ? { body } : {}), signal: AbortSignal.timeout(15000) });
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (dropNextPortfolioFillResponse && req.method === "POST" && req.url?.endsWith("/fills") && upstream.ok) {
        dropNextPortfolioFillResponse = false; portfolioFillResponseDropped = true; holdPortfolioFillRetries = true; res.destroy(); return;
      }
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" }); res.end(bytes);
    } catch { res.destroy(); }
  });
  await new Promise((resolveListen, reject) => { portfolioProxy.once("error", reject); portfolioProxy.listen(portfolioProxyPort, "127.0.0.1", resolveListen); });
  const portfolioProxyUrl = `http://127.0.0.1:${portfolioProxyPort}`;
  const governance = start(resolve(repo, "services/decision-governance-service/dist/main.js"), resolve(repo, "services/decision-governance-service"), serviceEnv(urls[3], governancePort, {
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay
  }));
  await waitReady(governance, `${governanceUrl}/ready`);
  const governanceProxyPort = await freePort();
  governanceProxy = createServer(async (req, res) => {
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      const headers = Object.fromEntries(["content-type", "authorization", "x-stockquant-service-id", "x-stockquant-owner-id"].flatMap((name) => req.headers[name] ? [[name, req.headers[name]]] : []));
      const upstream = await fetch(`${governanceUrl}${req.url}`, { method: req.method, headers, ...(body.length ? { body } : {}), signal: AbortSignal.timeout(15000) });
      const bytes = Buffer.from(await upstream.arrayBuffer());
      const control = governanceAuthorizationPause;
      const validationNamespace = JSON.parse(body.toString()).command?.namespace;
      if (req.method === "POST" && req.url === "/internal/v1/paper-authorizations/validate" && control?.armed && (!control.namespace || validationNamespace === control.namespace)) {
        control.armed = false; control.namespace = validationNamespace; control.reached({ status: upstream.status, body: bytes.toString() }); await control.released;
      }
      res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") ?? "application/json" }); res.end(bytes);
    } catch (error) { governanceProxyErrors.push(error instanceof Error ? error.stack ?? error.message : String(error)); res.destroy(); }
  });
  await new Promise((resolveListen, reject) => { governanceProxy.once("error", reject); governanceProxy.listen(governanceProxyPort, "127.0.0.1", resolveListen); });
  const governanceProxyUrl = `http://127.0.0.1:${governanceProxyPort}`;
  const tradeEnv = serviceEnv(urls[2], tradePort, {
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade,
    STOCKQUANT_PORTFOLIO_API_URL: portfolioProxyUrl, STOCKQUANT_GOVERNANCE_URL: governanceProxyUrl
  });
  tradeProcess = start(resolve(repo, "services/trade-execution-service/dist/main.js"), resolve(repo, "services/trade-execution-service"), tradeEnv);
  await waitReady(tradeProcess, `${tradeUrl}/ready`);

  const snapshotTestRunId = randomUUID();
  const snapshotCommand = {
    namespace: `w2-v24-idempotency-${snapshotTestRunId}`, accountId: randomUUID(), clientOrderId: `w2-v24-order-${snapshotTestRunId}`,
    security: "600000.SH", requestedQuantity: 100, price: "10.0000", fee: "5.0000", effectiveAt: "2026-09-25T01:32:00.000Z",
    currency: "CNY", snapshotId: "w2-fixed-snapshot", policyVersion: "w2-fixed-policy-v1", fixtureVersion: "2.0.0",
    quoteAgeSeconds: 1, deviationBps: 0, testRunId: snapshotTestRunId, ownerId: `w2-owner-${suffix}`,
    mandateId: "w2-fixed-mandate", mandateVersion: "2.0.0", strategyVersion: "a".repeat(64),
    reservation: { reservationId: randomUUID(), ownerId: `w2-owner-${suffix}`, testRunId: snapshotTestRunId, clientOrderId: `w2-v24-order-${snapshotTestRunId}` }
  };
  const idempotencyPool = new Pool({ connectionString: urls[2] });
  const idempotencyRepository = new PostgresFakeBrokerRepository(idempotencyPool);
  let idempotencyFacts;
  try {
    const concurrent = await Promise.all([idempotencyRepository.executeSnapshotPaper(snapshotCommand), idempotencyRepository.executeSnapshotPaper(snapshotCommand)]);
    assert.deepEqual(concurrent.map((item) => item.replayed).sort(), [false, true]);
    const originalExecution = concurrent.find((item) => !item.replayed);
    assert.ok(originalExecution);
    await assert.rejects(idempotencyRepository.executeSnapshotPaper({ ...snapshotCommand, price: "10.0100" }), (error) => error?.statusCode === 409);
    await idempotencyPool.end();
    await stop(tradeProcess);
    tradeProcess = start(resolve(repo, "services/trade-execution-service/dist/main.js"), resolve(repo, "services/trade-execution-service"), tradeEnv);
    await waitReady(tradeProcess, `${tradeUrl}/ready`);
    const reopenedPool = new Pool({ connectionString: urls[2] });
    const reopenedRepository = new PostgresFakeBrokerRepository(reopenedPool);
    const reconnectReplay = await reopenedRepository.executeSnapshotPaper(snapshotCommand);
    assert.equal(reconnectReplay.replayed, true);
    assert.deepEqual(reconnectReplay.result, originalExecution.result);
    const counts = await reopenedPool.query(`SELECT count(*)::int AS orders,
      (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1) AS fills,
      (SELECT count(*)::int FROM fake_broker_order_events e JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1) AS events,
      (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1) AS outbox
      FROM fake_broker_orders WHERE namespace=$1`, [snapshotCommand.namespace]);
    assert.deepEqual(counts.rows[0], { orders: 1, fills: 1, events: 2, outbox: 1 });
    const cancelDuringLedgerPending = await internalRequest(tradeUrl, `/internal/v1/orders/${originalExecution.result.orderId}/cancel`, { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` });
    assert.equal(cancelDuringLedgerPending.status, 404, JSON.stringify(cancelDuringLedgerPending));
    const pendingCancelAfter = await reopenedPool.query(`SELECT o.status,
      (SELECT count(*)::int FROM fake_broker_order_events e WHERE e.order_id=o.order_id) AS events,
      (SELECT count(*)::int FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id) AS outbox
      FROM fake_broker_orders o WHERE o.order_id=$1`, [originalExecution.result.orderId]);
    assert.deepEqual(pendingCancelAfter.rows[0], { status: "LEDGER_PENDING", events: 2, fills: 1, outbox: 1 }, "a full confirmed Fill awaiting ledger acknowledgement cannot be cancelled or lose its Outbox event");
    pendingFillCancelEvidence = { orderId: originalExecution.result.orderId, orderBeforeCancel: "LEDGER_PENDING", cancelStatus: cancelDuringLedgerPending.status, after: pendingCancelAfter.rows[0], unchanged: true };
    tradeRestartEvidence = { persistedOrderSurvivedTradeProcessRestart: true, originalCommandReplayAfterRestart: reconnectReplay.replayed, resultingOrderId: reconnectReplay.result.orderId };
    idempotencyFacts = { concurrentCalls: 2, createdOrders: 1, replayedCalls: 2, changedPayload: "409 conflict before side effects", reconnectReplay: true, persistedFacts: counts.rows[0] };
    await reopenedPool.query("DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1", [snapshotCommand.namespace]);
    await reopenedPool.query("DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1", [snapshotCommand.namespace]);
    await reopenedPool.query("DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1", [snapshotCommand.namespace]);
    await reopenedPool.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [snapshotCommand.namespace]);
    await reopenedPool.end();
  } catch (error) {
    await idempotencyPool.end().catch(() => {});
    throw error;
  }

  const governanceDb = new Client({ connectionString: urls[3] });
  const portfolioDb = new Client({ connectionString: urls[1] });
  const tradeDb = new Client({ connectionString: urls[2] });
  await Promise.all([governanceDb.connect(), portfolioDb.connect(), tradeDb.connect()]);
  const unauthorizedBaseline = {
    authorizations: (await governanceDb.query("SELECT count(*)::int AS count FROM execution_authorizations")).rows[0].count,
    accounts: (await portfolioDb.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count,
    ledgerEntries: (await portfolioDb.query("SELECT count(*)::int AS count FROM ledger_entries")).rows[0].count,
    reservations: (await portfolioDb.query("SELECT count(*)::int AS count FROM resource_reservations")).rows[0].count,
    orders: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_orders")).rows[0].count,
    fills: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_fills")).rows[0].count,
    outbox: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_outbox")).rows[0].count
  };
  const governanceWrongToken = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"z".repeat(48)}` }, {});
  const governanceSpoofedCaller = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations", { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.platform}` }, {});
  const tradeMissingToken = await internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service" }, {});
  const tradeSpoofedCaller = await internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.trade}` }, {});
  const fixture = JSON.parse(await readFile(resolve(repo, "fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json"), "utf8"));
  const liveTestRunId = randomUUID();
  const liveGrant = {
    scenarioId: fixture.scenarioId, scenarioVersion: fixture.scenarioVersion, testRunId: liveTestRunId, ownerId: owner,
    namespace: `v24-paper-v2-${liveTestRunId}`, accountId: randomUUID(), clockNow: fixture.snapshot.ingestedAt,
    dataMode: fixture.dataMode, environmentMode: fixture.environmentMode, brokerMode: fixture.brokerMode, liveTradingEnabled: true,
    market: fixture.market, currency: fixture.currency, policy: fixture.policy, mandate: fixture.mandate, signal: fixture.signal,
    order: { clientOrderId: `v24-fixture-v2-${liveTestRunId}`, security: fixture.order.security, acceptedAt: fixture.order.acceptedAt, requestedQuantity: fixture.order.requestedQuantity },
    snapshot: fixture.snapshot, fee: fixture.fee
  };
  const liveWrite = await internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: randomUUID(), grant: liveGrant });
  const unauthorizedFinal = {
    authorizations: (await governanceDb.query("SELECT count(*)::int AS count FROM execution_authorizations")).rows[0].count,
    accounts: (await portfolioDb.query("SELECT count(*)::int AS count FROM accounts")).rows[0].count,
    ledgerEntries: (await portfolioDb.query("SELECT count(*)::int AS count FROM ledger_entries")).rows[0].count,
    reservations: (await portfolioDb.query("SELECT count(*)::int AS count FROM resource_reservations")).rows[0].count,
    orders: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_orders")).rows[0].count,
    fills: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_fills")).rows[0].count,
    outbox: (await tradeDb.query("SELECT count(*)::int AS count FROM fake_broker_outbox")).rows[0].count
  };
  await Promise.all([governanceDb.end(), portfolioDb.end(), tradeDb.end()]);
  for (const result of [governanceWrongToken, governanceSpoofedCaller, tradeMissingToken, tradeSpoofedCaller]) assert.equal(result.status, 403, JSON.stringify(result));
  assert.equal(liveWrite.status, 422, JSON.stringify(liveWrite));
  assert.deepEqual(unauthorizedFinal, unauthorizedBaseline, "missing/forged service identity and LIVE write rejection happen before domain side effects");
  const identityAndLiveReject = { responses: { governanceWrongToken: governanceWrongToken.status, governanceSpoofedCaller: governanceSpoofedCaller.status, tradeMissingToken: tradeMissingToken.status, tradeSpoofedCaller: tradeSpoofedCaller.status, liveWrite: liveWrite.status }, countsBefore: unauthorizedBaseline, countsAfter: unauthorizedFinal, unchanged: true };

  const expiredTestRunId = randomUUID();
  const expiredGrant = {
    ...liveGrant, testRunId: expiredTestRunId, namespace: `v24-paper-v2-${expiredTestRunId}`, accountId: randomUUID(), liveTradingEnabled: false,
    order: { ...liveGrant.order, clientOrderId: `v24-fixture-v2-${expiredTestRunId}` }
  };
  const createdAuthorization = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { grant: expiredGrant });
  assert.equal(createdAuthorization.status, 200, JSON.stringify(createdAuthorization));
  const revokedTestRunId = randomUUID();
  const revokedGrant = { ...expiredGrant, testRunId: revokedTestRunId, namespace: `v24-paper-v2-${revokedTestRunId}`, accountId: randomUUID(), order: { ...expiredGrant.order, clientOrderId: `v24-fixture-v2-${revokedTestRunId}` } };
  const createdRevocationTarget = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { grant: revokedGrant });
  assert.equal(createdRevocationTarget.status, 200, JSON.stringify(createdRevocationTarget));
  const revokeCommand = { authorizationId: createdRevocationTarget.body.authorizationId, namespace: revokedGrant.namespace, accountId: revokedGrant.accountId, reason: "operator paused this isolated TestRun before execution" };
  const revokeBefore = await paperFactCounts();
  const revokeWrongService = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.trade}` }, revokeCommand);
  const revokeWrongBearer = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"z".repeat(48)}` }, revokeCommand);
  const revokeWrongScope = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { ...revokeCommand, namespace: `${revokedGrant.namespace}-other` });
  const revokedAuthorization = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, revokeCommand);
  const replayedRevocation = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, revokeCommand);
  const conflictingRevocation = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { ...revokeCommand, reason: "different reason" });
  const revokeAttempt = await internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: revokeCommand.authorizationId, grant: revokedGrant });
  const revokeAfter = await paperFactCounts();
  const revokedAuthorizationDb = new Client({ connectionString: urls[3] }); await revokedAuthorizationDb.connect();
  const revokedAuthorizationRow = await revokedAuthorizationDb.query("SELECT status,revocation_reason,revoked_at IS NOT NULL AS revoked_at_present FROM execution_authorizations WHERE authorization_id=$1", [revokeCommand.authorizationId]);
  await revokedAuthorizationDb.end();
  assert.equal(revokeWrongService.status, 403); assert.equal(revokeWrongBearer.status, 403); assert.equal(revokeWrongScope.status, 404);
  assert.equal(revokedAuthorization.status, 200); assert.equal(replayedRevocation.status, 200); assert.equal(replayedRevocation.body.replayed, true); assert.equal(conflictingRevocation.status, 409);
  assert.equal(revokeAttempt.status, 403, JSON.stringify(revokeAttempt));
  assert.deepEqual(revokedAuthorizationRow.rows[0], { status: "REVOKED", revocation_reason: revokeCommand.reason, revoked_at_present: true });
  assert.deepEqual(revokeAfter, revokeBefore, "a revoked authorization must be rejected before Portfolio or FakeBroker side effects");
  const revokedAuthorizationEvidence = { revokedAuthorizationId: revokeCommand.authorizationId, reason: revokeCommand.reason, wrongServiceStatus: revokeWrongService.status, wrongBearerStatus: revokeWrongBearer.status, wrongScopeStatus: revokeWrongScope.status, revokeStatus: revokedAuthorization.status, idempotentReplayStatus: replayedRevocation.status, conflictingReasonStatus: conflictingRevocation.status, executionAfterRevokeStatus: revokeAttempt.status, persisted: revokedAuthorizationRow.rows[0], countsBefore: revokeBefore, countsAfter: revokeAfter, noBusinessSideEffects: true };
  const snapshotMutations = [
    { name: "wrong-security", grant: { ...expiredGrant, snapshot: { ...expiredGrant.snapshot, security: "000001.SZ" } }, expectedStatus: 422 },
    { name: "wrong-market", grant: { ...expiredGrant, market: "US_EQUITY" }, expectedStatus: 422 },
    { name: "stale", grant: { ...expiredGrant, snapshot: { ...expiredGrant.snapshot, status: "STALE" } }, expectedStatus: 409 },
    { name: "pre-acceptance", grant: { ...expiredGrant, snapshot: { ...expiredGrant.snapshot, observedAt: "2026-09-25T01:30:59.000Z", ingestedAt: "2026-09-25T01:31:00.000Z" } }, expectedStatus: 409 },
    { name: "future-ingested", grant: { ...expiredGrant, snapshot: { ...expiredGrant.snapshot, ingestedAt: "2026-09-25T01:33:00.000Z" }, clockNow: "2026-09-25T01:32:30.000Z" }, expectedStatus: 422 },
    { name: "outside-window", grant: { ...expiredGrant, snapshot: { ...expiredGrant.snapshot, observedAt: "2026-09-25T01:35:00.000Z", ingestedAt: "2026-09-25T01:35:01.000Z" }, clockNow: "2026-09-25T01:35:02.000Z" }, expectedStatus: 409 }
  ];
  const snapshotMutationResponses = await Promise.all(snapshotMutations.map(({ grant }) => internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: createdAuthorization.body.authorizationId, grant })));
  snapshotMutationResponses.forEach((response, index) => assert.equal(response.status, snapshotMutations[index].expectedStatus, `${snapshotMutations[index].name}: ${JSON.stringify(response)}`));
  const snapshotMutationFacts = await paperFactCounts();
  assert.deepEqual(snapshotMutationFacts, { ledgerEntries: 0, portfolioFills: 0, positions: 0, reservations: 0, brokerOrders: 0, brokerFills: 0, brokerOrderEvents: 0, outboxEvents: 0 }, "invalid snapshot variants must fail before any Portfolio or FakeBroker write");
  const snapshotReject = { mutations: snapshotMutations.map(({ name, expectedStatus }, index) => ({ name, expectedStatus, actualStatus: snapshotMutationResponses[index].status })), businessFactsAfter: snapshotMutationFacts, noBusinessSideEffects: true };
  const scopeMutations = [
    { ...expiredGrant, ownerId: `${expiredGrant.ownerId}-changed` },
    { ...expiredGrant, testRunId: randomUUID() },
    { ...expiredGrant, accountId: randomUUID() },
    { ...expiredGrant, mandate: { ...expiredGrant.mandate, mandateVersion: "9.9.9" } },
    { ...expiredGrant, mandate: { ...expiredGrant.mandate, strategyVersion: "b".repeat(64) } },
    { ...expiredGrant, policy: { ...expiredGrant.policy, feePolicyVersion: "fee-policy-changed" } },
    { ...expiredGrant, fee: "4.0000" },
    { ...expiredGrant, order: { ...expiredGrant.order, clientOrderId: `${expiredGrant.order.clientOrderId}-changed` } }
  ];
  const scopeTamperResponses = await Promise.all(scopeMutations.map((grant) => internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: createdAuthorization.body.authorizationId, grant })));
  for (const response of scopeTamperResponses) assert.equal(response.status, 403, JSON.stringify(response));
  const scopeTamperBusinessFacts = await paperFactCounts();
  assert.deepEqual(scopeTamperBusinessFacts, { ledgerEntries: 0, portfolioFills: 0, positions: 0, reservations: 0, brokerOrders: 0, brokerFills: 0, brokerOrderEvents: 0, outboxEvents: 0 }, "owner, TestRun, account, mandate, strategy, policy and fee changes must fail before domain writes");
  const scopeTamperReject = { rejectedMutations: scopeMutations.map((grant) => ({ ownerChanged: grant.ownerId !== expiredGrant.ownerId, testRunChanged: grant.testRunId !== expiredGrant.testRunId, accountChanged: grant.accountId !== expiredGrant.accountId, mandateVersionChanged: grant.mandate.mandateVersion !== expiredGrant.mandate.mandateVersion, strategyVersionChanged: grant.mandate.strategyVersion !== expiredGrant.mandate.strategyVersion, feePolicyVersionChanged: grant.policy.feePolicyVersion !== expiredGrant.policy.feePolicyVersion, feeChanged: grant.fee !== expiredGrant.fee, clientOrderIdChanged: grant.order.clientOrderId !== expiredGrant.order.clientOrderId })), statuses: scopeTamperResponses.map((response) => response.status), businessFactsAfter: scopeTamperBusinessFacts, noBusinessSideEffects: true };
  const expireAuthorizationDb = new Client({ connectionString: urls[3] }); await expireAuthorizationDb.connect();
  const expired = await expireAuthorizationDb.query("UPDATE execution_authorizations SET expires_at=now()-interval '1 second' WHERE namespace=$1 RETURNING status", [expiredGrant.namespace]);
  await expireAuthorizationDb.end();
  assert.equal(expired.rowCount, 1);
  const expiredBusinessBefore = await paperFactCounts();
  const expiredAttempt = await internalRequest(tradeUrl, "/internal/v1/v24/paper-orders/execute-snapshot", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: createdAuthorization.body.authorizationId, grant: expiredGrant });
  assert.equal(expiredAttempt.status, 403, JSON.stringify(expiredAttempt));
  const expiredStateDb = new Client({ connectionString: urls[3] }); await expiredStateDb.connect();
  const expiredState = await expiredStateDb.query("SELECT status,expires_at<=now() AS expired FROM execution_authorizations WHERE namespace=$1", [expiredGrant.namespace]);
  await expiredStateDb.end();
  assert.deepEqual(expiredState.rows[0], { status: "ACTIVE", expired: true }, "an expired grant must remain unconsumed");
  const expiredBusinessAfter = await paperFactCounts();
  assert.deepEqual(expiredBusinessAfter, expiredBusinessBefore, "expired authorization rejection must not create Portfolio or FakeBroker facts");
  const expiredAuthorizationReject = { authorizationRequestStatus: createdAuthorization.status, executionStatus: expiredAttempt.status, persistedAuthorization: expiredState.rows[0], businessCountsBefore: expiredBusinessBefore, businessCountsAfter: expiredBusinessAfter, noBusinessSideEffects: true };

  const resourceRunId = randomUUID();
  const resourceNamespace = `w2-v24-resource-${resourceRunId}`;
  const resourceOwner = `w2-resource-owner-${suffix}`;
  const initializedResourceAccount = await internalRequest(portfolioUrl, "/internal/v1/accounts/initialize", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { fixtureAccountRef: `w2-resource-${resourceRunId}`, ownerId: resourceOwner, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace: resourceNamespace, testRunId: resourceRunId, idempotencyKey: `w2-resource-init-${resourceRunId}` });
  assert.equal(initializedResourceAccount.status, 201, JSON.stringify(initializedResourceAccount));
  const resourceAccountId = initializedResourceAccount.body.snapshot.accountId;
  const reserveCash = (suffixValue, amount) => internalRequest(portfolioUrl, `/internal/v1/accounts/${resourceAccountId}/reservations`, { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.trade}` }, { namespace: resourceNamespace, testRunId: resourceRunId, ownerId: resourceOwner, idempotencyKey: `w2-reserve-${suffixValue}`, clientOrderId: `w2-order-${suffixValue}`, side: "BUY", currency: "CNY", cashAmount: amount, security: null, quantity: null });
  const competingReservations = await Promise.all([reserveCash("first", "6000.0000"), reserveCash("second", "6000.0000")]);
  assert.deepEqual(competingReservations.map(({ status }) => status).sort(), [201, 409]);
  const heldReservation = competingReservations.find(({ status }) => status === 201)?.body.reservation;
  assert.ok(heldReservation);
  const unknownReservation = await internalRequest(portfolioUrl, `/internal/v1/accounts/${resourceAccountId}/reservations/${heldReservation.reservationId}/resolve`, { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.trade}` }, { namespace: resourceNamespace, testRunId: resourceRunId, ownerId: resourceOwner, outcome: "UNKNOWN", evidenceRef: `w2-unknown-${resourceRunId}` });
  assert.equal(unknownReservation.status, 200, JSON.stringify(unknownReservation));
  const blockedWhileUnknown = await reserveCash("while-unknown", "5000.0000");
  assert.equal(blockedWhileUnknown.status, 409, JSON.stringify(blockedWhileUnknown));
  const releaseUnknown = await internalRequest(portfolioUrl, `/internal/v1/accounts/${resourceAccountId}/reservations/${heldReservation.reservationId}/resolve`, { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.trade}` }, { namespace: resourceNamespace, testRunId: resourceRunId, ownerId: resourceOwner, outcome: "CANCELLED", evidenceRef: `w2-authoritative-cancel-${resourceRunId}` });
  assert.equal(releaseUnknown.status, 200, JSON.stringify(releaseUnknown));
  const reserveAfterRelease = await reserveCash("after-release", "5000.0000");
  assert.equal(reserveAfterRelease.status, 201, JSON.stringify(reserveAfterRelease));
  const releaseFinal = await internalRequest(portfolioUrl, `/internal/v1/accounts/${resourceAccountId}/reservations/${reserveAfterRelease.body.reservation.reservationId}/resolve`, { "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${tokens.trade}` }, { namespace: resourceNamespace, testRunId: resourceRunId, ownerId: resourceOwner, outcome: "CANCELLED", evidenceRef: `w2-cleanup-cancel-${resourceRunId}` });
  assert.equal(releaseFinal.status, 200, JSON.stringify(releaseFinal));
  const resourceSnapshotResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${resourceAccountId}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}`, "x-stockquant-owner-id": resourceOwner } });
  const resourceSnapshot = await resourceSnapshotResponse.json();
  assert.equal(resourceSnapshotResponse.status, 200, JSON.stringify(resourceSnapshot));
  assert.equal(resourceSnapshot.cash.amount, "10000.0000");
  assert.deepEqual(resourceSnapshot.reservations.map(({ status }) => status), ["RELEASED", "RELEASED"]);
  const resourceConcurrencyEvidence = { competingReservationStatuses: competingReservations.map(({ status }) => status), oneReservationWon: true, unknownStatusBlockedAdditional5000: blockedWhileUnknown.status === 409, authoritativeReleaseAllowedReallocation: reserveAfterRelease.status === 201, finalCash: resourceSnapshot.cash.amount, finalReservationStatuses: resourceSnapshot.reservations.map(({ status }) => status), ledgerEntries: resourceSnapshot.ledgerEntryCount };

  const proxyPortValue = await freePort();
  let recoverySawDroppedResponse = false;
  proxy = createServer(async (req, res) => {
    const event = { method: req.method, url: req.url, startedAt: Date.now(), outcome: "PENDING" }; proxyEvents.push(event);
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      const body = Buffer.concat(chunks);
      if (req.method === "POST" && req.url === "/internal/v1/v24/paper-orders/execute-snapshot") {
        try { const parsed = JSON.parse(body.toString("utf8")); executionRequests.push({ testRunId: parsed.grant?.testRunId, namespace: parsed.grant?.namespace, clientOrderId: parsed.grant?.order?.clientOrderId }); } catch { /* malformed requests are still forwarded for service validation */ }
      }
      if (failNextClientOrderLookup && req.method === "GET" && req.url?.startsWith("/internal/v1/orders/by-client-id?")) {
        failNextClientOrderLookup = false; event.status = 503; event.outcome = "LOOKUP_UNAVAILABLE"; event.elapsedMs = Date.now() - event.startedAt; res.writeHead(503, { "content-type": "application/json" }).end('{"error":"injected temporary lookup outage"}'); return;
      }
      const upstream = await fetch(`${tradeUrl}${req.url}`, { method: req.method, headers: { "content-type": req.headers["content-type"] ?? "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, ...(body.length ? { body } : {}) });
      event.status = upstream.status;
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (dropNextExecutionResponse && req.method === "POST" && req.url === "/internal/v1/v24/paper-orders/execute-snapshot") {
        dropNextExecutionResponse = false; recoverySawDroppedResponse = true; droppedExecutionResponseCount += 1; event.outcome = "RESPONSE_DROPPED"; event.elapsedMs = Date.now() - event.startedAt; res.destroy(); return;
      }
      res.writeHead(upstream.status, Object.fromEntries(upstream.headers)); res.end(bytes); event.outcome = "FORWARDED"; event.elapsedMs = Date.now() - event.startedAt;
    } catch (error) { proxyErrors.push(error instanceof Error ? error.stack ?? error.message : String(error)); event.outcome = "ERROR"; event.elapsedMs = Date.now() - event.startedAt; res.destroy(); }
  });
  await new Promise((resolveListen, reject) => { proxy.once("error", reject); proxy.listen(proxyPortValue, "127.0.0.1", resolveListen); });
  const proxyUrl = `http://127.0.0.1:${proxyPortValue}`;
  const platform = start(resolve(repo, "services/platform-api-service/dist/main.js"), service, serviceEnv(urls[0], platformPort, {
    STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner, STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "false", STOCKQUANT_V24_AUTO_START: "false",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: tokens.governance,
    STOCKQUANT_PORTFOLIO_API_URL: portfolioUrl, STOCKQUANT_GOVERNANCE_URL: governanceUrl, STOCKQUANT_TRADE_EXECUTION_URL: proxyUrl,
    STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: canaryUrl, STOCKQUANT_MARKET_DATA_URL: canaryUrl, STOCKQUANT_RESEARCH_AUTOMATION_URL: canaryUrl
  }));
  const apiUrl = `http://127.0.0.1:${platformPort}`;
  await waitReady(platform, `${apiUrl}/live`);
  assert.equal((await request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { cookie: "", method: "POST", body: { scenarioId: "normal" } })).status, 401);
  assert.equal((await request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { cookie: "sq_session=foreign-owner", method: "POST", body: { scenarioId: "normal" } })).status, 403);
  const runs = [];
  for (const scenarioId of ["normal", "rejection", "recovery", "external-reconciliation"]) {
    if (scenarioId === "recovery") dropNextExecutionResponse = true;
    const created = await request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId, seed: 20260927 } });
    assert.equal(created.status, 202, JSON.stringify(created.body));
    if (created.body.status !== "COMPLETED") {
      const failure = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${created.body.testRunId}`);
      assert.equal(created.body.status, "COMPLETED", JSON.stringify({ response: created.body, failure: failure.body, proxyErrors, services: children.map((entry) => entry.output.slice(-1500)) }));
    }
    const run = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${created.body.testRunId}`);
    assert.equal(run.body.status, "COMPLETED", JSON.stringify(run.body.assertions));
    assert.ok(run.body.assertions.length > 0 && run.body.assertions.every((item) => item.status === "PASS"), JSON.stringify(run.body.assertions));
    assert.equal((await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${created.body.testRunId}`, { cookie: "sq_session=foreign-owner" })).status, 403);
    const cli = spawnSync(process.execPath, [resolve(repo, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", created.body.testRunId, "--check-only"], { cwd: repo, encoding: "utf8", timeout: 10000, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_SESSION_COOKIE: `sq_session=${owner}` } });
    assert.equal(cli.status, 0, cli.stderr); assert.equal(JSON.parse(cli.stdout).testRunId, created.body.testRunId); assert.equal(JSON.parse(cli.stdout).status, "COMPLETED");
    if (["normal", "recovery", "external-reconciliation"].includes(scenarioId)) {
      assert.equal(run.body.evidence.order.status, "FILLED");
      assert.deepEqual(run.body.evidence.fills[0] && { quantity: run.body.evidence.fills[0].quantity, price: run.body.evidence.fills[0].price, fee: run.body.evidence.fills[0].fee }, { quantity: 100, price: "10.0000", fee: "5.0000" });
      assert.equal(run.body.evidence.account.cash.amount, "8995.0000");
      assert.equal(run.body.evidence.resourceReservation.status, "CAPTURED");
      assert.equal(run.body.evidence.outbox.status, "DELIVERED");
      if (scenarioId === "external-reconciliation") {
        assert.equal(run.body.assertions.at(-1).assertionId, "V2.4-PF05-001");
        assert.equal(run.body.evidence.reconciliation.externalOnlyOrderCount, 1);
        assert.equal(run.body.evidence.reconciliation.discrepancies[0].kind, "EXTERNAL_ORDER_MISSING_LOCALLY");
      }
    } else {
      assert.equal(run.body.evidence.governance.httpStatus, 422); assert.deepEqual(run.body.evidence.orders, []); assert.deepEqual(run.body.evidence.fills, []);
      assert.equal(run.body.evidence.reconciliation.order_count, 0); assert.equal(run.body.evidence.account.ledgerEntryCount, 1);
    }
    if (scenarioId === "normal") {
      const consumed = run.body.evidence.authorization;
      const attemptedConsumedRevoke = await internalRequest(governanceUrl, "/internal/v1/paper-authorizations/revoke", { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, { authorizationId: consumed.authorizationId, namespace: consumed.scope.namespace, accountId: consumed.scope.accountId, reason: "cannot revoke after execution authorization was consumed" });
      assert.equal(attemptedConsumedRevoke.status, 409, JSON.stringify(attemptedConsumedRevoke));
      consumedAuthorizationRevokeEvidence = { testRunId: run.body.testRunId, revokeStatusAfterConsumption: attemptedConsumedRevoke.status, cannotRevokeConsumedGrant: true };
    }
    runs.push({ scenarioId, testRunId: created.body.testRunId, cliExitCode: cli.status, status: run.body.status, assertions: run.body.assertions });
  }
  assert.equal(recoverySawDroppedResponse, true, "recovery smoke must discard the actual execution acceptance response");

  const beforePostExpiryFill = await paperFactCounts();
  let resolveAuthorizationReached;
  let resolveAuthorizationResponse;
  const authorizationReached = new Promise((resolveReached) => { resolveAuthorizationReached = resolveReached; });
  const authorizationReleased = new Promise((resolveRelease) => { resolveAuthorizationResponse = resolveRelease; });
  governanceAuthorizationPause = { armed: true, reached: resolveAuthorizationReached, released: authorizationReleased };
  const expiryRunPromise = request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId: "normal", seed: 20260927 } });
  const authorizationResponse = await authorizationReached;
  const expiryExecution = executionRequests.findLast((item) => item.namespace === governanceAuthorizationPause.namespace);
  assert.ok(expiryExecution?.testRunId && expiryExecution.namespace);
  assert.equal(authorizationResponse.status, 200, authorizationResponse.body);
  const expireBeforePortfolioCommitDb = new Client({ connectionString: urls[3] }); await expireBeforePortfolioCommitDb.connect();
  try {
    const expireGrant = await expireBeforePortfolioCommitDb.query("UPDATE execution_authorizations SET expires_at=now()-interval '1 second' WHERE namespace=$1 AND status='CONSUMED' RETURNING status", [expiryExecution.namespace]);
    assert.equal(expireGrant.rowCount, 1, "the precise authorization must expire after Governance validates it but before Trade receives the successful validation response");
  } finally { await expireBeforePortfolioCommitDb.end(); resolveAuthorizationResponse(); governanceAuthorizationPause = null; }
  const expiryRunCreation = await expiryRunPromise;
  assert.equal(expiryRunCreation.status, 202, JSON.stringify(expiryRunCreation.body));
  assert.equal(expiryRunCreation.body.testRunId, expiryExecution.testRunId);
  assert.equal(expiryRunCreation.body.status, "COMPLETED", JSON.stringify(expiryRunCreation.body));
  const expiryRunRecord = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${expiryRunCreation.body.testRunId}`);
  assert.equal(expiryRunRecord.body.evidence.order.status, "FILLED");
  const expiredAuthorizedFillDb = new Client({ connectionString: urls[3] }); await expiredAuthorizedFillDb.connect();
  const postExpiryAuthorization = await expiredAuthorizedFillDb.query("SELECT status,expires_at<=now() AS expired FROM execution_authorizations WHERE namespace=$1", [expiryExecution.namespace]);
  await expiredAuthorizedFillDb.end();
  assert.deepEqual(postExpiryAuthorization.rows[0], { status: "CONSUMED", expired: true });
  const afterPostExpiryFill = await paperFactCounts();
  assert.deepEqual(afterPostExpiryFill, { ledgerEntries: beforePostExpiryFill.ledgerEntries + 2, portfolioFills: beforePostExpiryFill.portfolioFills + 1, positions: beforePostExpiryFill.positions + 1, reservations: beforePostExpiryFill.reservations + 1, brokerOrders: beforePostExpiryFill.brokerOrders + 1, brokerFills: beforePostExpiryFill.brokerFills + 1, brokerOrderEvents: beforePostExpiryFill.brokerOrderEvents + 2, outboxEvents: beforePostExpiryFill.outboxEvents + 1 });
  const authorizedFillAfterExpiryEvidence = { testRunId: expiryRunCreation.body.testRunId, governanceConsumedWhileValid: true, successfulValidationResponseDeliveredAfterExpiry: true, expiredAuthorization: postExpiryAuthorization.rows[0], fillStatusAfterExpiration: expiryRunRecord.body.evidence.order.status, portfolioFillCountDelta: afterPostExpiryFill.portfolioFills - beforePostExpiryFill.portfolioFills, outboxStatus: expiryRunRecord.body.evidence.outbox.status, exactFactCounts: true };

  const beforeV24OutboxLoss = await paperFactCounts();
  dropNextPortfolioFillResponse = true;
  const v24OutboxRunCreation = await request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId: "normal", seed: 20260927 } });
  assert.equal(v24OutboxRunCreation.status, 202, JSON.stringify(v24OutboxRunCreation.body));
  assert.equal(portfolioFillResponseDropped, true, "Portfolio must commit this V2.4 Fill before the proxy discards the response");
  const outboxExecution = executionRequests.findLast((item) => item.testRunId === v24OutboxRunCreation.body.testRunId);
  assert.ok(outboxExecution?.namespace);
  const v24OutboxRunRecord = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${v24OutboxRunCreation.body.testRunId}`);
  await stop(tradeProcess);
  const pendingOutboxDb = new Client({ connectionString: urls[2] }); await pendingOutboxDb.connect();
  const pendingOutbox = await pendingOutboxDb.query(`SELECT o.order_id,o.status,x.event_id,x.status AS outbox_status,x.attempts,x.payload FROM fake_broker_orders o JOIN fake_broker_outbox x USING(order_id) WHERE o.namespace=$1`, [outboxExecution.namespace]);
  await pendingOutboxDb.end();
  assert.equal(pendingOutbox.rowCount, 1);
  assert.equal(pendingOutbox.rows[0].status, "LEDGER_PENDING");
  assert.equal(pendingOutbox.rows[0].outbox_status, "PENDING");
  assert.ok(pendingOutbox.rows[0].attempts >= 1);
  const outboxReservationId = pendingOutbox.rows[0].payload.reservation.reservationId;
  const reservationBeforeRestartDb = new Client({ connectionString: urls[1] }); await reservationBeforeRestartDb.connect();
  const reservationBeforeRestart = await reservationBeforeRestartDb.query("SELECT status,captured_cash_amount::text FROM resource_reservations WHERE reservation_id=$1", [outboxReservationId]);
  await reservationBeforeRestartDb.end();
  assert.deepEqual(reservationBeforeRestart.rows[0], { status: "HELD", captured_cash_amount: "1005.0000" }, "Portfolio's committed Fill must apply exact cash usage while the unresolved reservation remains held after its response is lost");
  const committedFillCounts = await paperFactCounts();
  assert.deepEqual(committedFillCounts, { ledgerEntries: beforeV24OutboxLoss.ledgerEntries + 2, portfolioFills: beforeV24OutboxLoss.portfolioFills + 1, positions: beforeV24OutboxLoss.positions + 1, reservations: beforeV24OutboxLoss.reservations + 1, brokerOrders: beforeV24OutboxLoss.brokerOrders + 1, brokerFills: beforeV24OutboxLoss.brokerFills + 1, brokerOrderEvents: beforeV24OutboxLoss.brokerOrderEvents + 2, outboxEvents: beforeV24OutboxLoss.outboxEvents + 1 });
  await stop(portfolio);
  portfolio = start(resolve(repo, "services/portfolio-risk-service/dist/main.js"), resolve(repo, "services/portfolio-risk-service"), portfolioEnv);
  await waitReady(portfolio, `${portfolioUrl}/ready`);
  const portfolioAfterRestartResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${encodeURIComponent(v24OutboxRunRecord.body.evidence.accountId)}/snapshot`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}`, "x-stockquant-owner-id": owner } });
  const portfolioAfterRestart = await portfolioAfterRestartResponse.json();
  assert.equal(portfolioAfterRestartResponse.status, 200, JSON.stringify(portfolioAfterRestart));
  assert.equal(portfolioAfterRestart.ledgerEntryCount, 2, "Portfolio restart must retain the committed Fill ledger state before Outbox replay");
  assert.equal(portfolioAfterRestart.cash.amount, "8995.0000");
  tradeProcess = start(resolve(repo, "services/trade-execution-service/dist/main.js"), resolve(repo, "services/trade-execution-service"), tradeEnv);
  await waitReady(tradeProcess, `${tradeUrl}/ready`);
  holdPortfolioFillRetries = false;
  let deliveredOutbox = null;
  const retryDeadline = Date.now() + 10000;
  while (Date.now() < retryDeadline) {
    const observe = new Client({ connectionString: urls[2] }); await observe.connect();
    try { deliveredOutbox = await observe.query(`SELECT o.order_id,o.status,x.status AS outbox_status,x.attempts FROM fake_broker_orders o JOIN fake_broker_outbox x USING(order_id) WHERE o.namespace=$1`, [outboxExecution.namespace]); }
    finally { await observe.end(); }
    if (deliveredOutbox.rows[0]?.outbox_status === "DELIVERED") break;
    await delay(100);
  }
  assert.equal(deliveredOutbox?.rows[0]?.outbox_status, "DELIVERED", "the restarted Trade Execution service must replay the durable V2.4 Outbox");
  assert.equal(deliveredOutbox.rows[0].status, "FILLED");
  const reservationAfterRestartDb = new Client({ connectionString: urls[1] }); await reservationAfterRestartDb.connect();
  const reservationAfterRestart = await reservationAfterRestartDb.query("SELECT status,captured_cash_amount::text FROM resource_reservations WHERE reservation_id=$1", [outboxReservationId]);
  await reservationAfterRestartDb.end();
  assert.deepEqual(reservationAfterRestart.rows[0], { status: "CAPTURED", captured_cash_amount: "1005.0000" });
  const afterV24OutboxRetry = await paperFactCounts();
  assert.deepEqual(afterV24OutboxRetry, committedFillCounts, "Portfolio idempotency must prevent a duplicate Fill after response-loss retry");
  v24OutboxRecoveryEvidence = { testRunId: v24OutboxRunCreation.body.testRunId, platformRunStatusBeforeRestart: v24OutboxRunRecord.body.status, responseDroppedAfterPortfolioCommit: portfolioFillResponseDropped, pendingBeforeRestart: { orderStatus: pendingOutbox.rows[0].status, outboxStatus: pendingOutbox.rows[0].outbox_status, attempts: pendingOutbox.rows[0].attempts }, reservationBeforeRestart: reservationBeforeRestart.rows[0], portfolioProcessRestartedBeforeOutboxReplay: true, portfolioFactsAfterRestart: { ledgerEntryCount: portfolioAfterRestart.ledgerEntryCount, cash: portfolioAfterRestart.cash.amount }, deliveredAfterTradeRestart: deliveredOutbox.rows[0], reservationAfterRestart: reservationAfterRestart.rows[0], factsAfterFirstCommit: committedFillCounts, factsAfterRetry: afterV24OutboxRetry, noDuplicatePortfolioFill: true };

  const completedNormalRun = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${runs[0].testRunId}`);
  const filledOrderId = completedNormalRun.body.evidence.order.order_id;
  const beforeTerminalCancel = await paperFactCounts();
  const terminalCancel = await internalRequest(tradeUrl, `/internal/v1/orders/${filledOrderId}/cancel`, { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` });
  assert.equal(terminalCancel.status, 404, JSON.stringify(terminalCancel));
  const afterTerminalCancel = await paperFactCounts();
  assert.deepEqual(afterTerminalCancel, beforeTerminalCancel, "cancelling a filled FakeBroker order must not append a duplicate terminal event or mutate Portfolio facts");
  const filledOrderResponse = await fetch(`${tradeUrl}/internal/v1/orders/${filledOrderId}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` } });
  const filledOrderAfterCancel = await filledOrderResponse.json();
  assert.equal(filledOrderResponse.status, 200);
  assert.equal(filledOrderAfterCancel.status, "FILLED");
  const terminalCancelEvidence = { orderId: filledOrderId, cancelStatus: terminalCancel.status, orderStatusAfterCancel: filledOrderAfterCancel.status, before: beforeTerminalCancel, after: afterTerminalCancel, noSideEffects: true };

  const beforeLookupOutage = await paperFactCounts();
  dropNextExecutionResponse = true;
  failNextClientOrderLookup = true;
  const lookupOutageCreation = await request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId: "recovery", seed: 20260927 } });
  assert.equal(lookupOutageCreation.status, 202, JSON.stringify(lookupOutageCreation.body));
  const lookupOutageRun = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}`);
  assert.equal(lookupOutageRun.body.status, "FAILED", "the run must remain unresolved when its original-order lookup is unavailable");
  const outageExecution = executionRequests.filter((entry) => entry.testRunId === lookupOutageCreation.body.testRunId);
  assert.equal(outageExecution.length, 1, "a lookup outage must not blindly resubmit the execution command");
  const outageOrder = outageExecution[0];
  failNextClientOrderLookup = true;
  const unknownResume = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}/recover`, { method: "POST" });
  assert.equal(unknownResume.status, 202, JSON.stringify(unknownResume.body));
  assert.equal(unknownResume.body.status, "UNKNOWN");
  assert.equal(unknownResume.body.executionResent, false, "an unavailable authoritative lookup must never resend the execution command");
  const unknownRun = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}`);
  assert.equal(unknownRun.body.status, "FAILED", "UNKNOWN recovery remains unresolved");
  const unknownHistory = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}/history`);
  assert.equal(unknownHistory.status, 200, JSON.stringify(unknownHistory.body));
  assert.equal(unknownHistory.body.revisions.length, 1);
  assert.equal(unknownHistory.body.revisions[0].status, "FAILED", "the original failed evidence is retained in history");
  await stop(tradeProcess);
  tradeProcess = start(resolve(repo, "services/trade-execution-service/dist/main.js"), resolve(repo, "services/trade-execution-service"), tradeEnv);
  await waitReady(tradeProcess, `${tradeUrl}/ready`);
  const restoredLookupResponse = await fetch(`${proxyUrl}/internal/v1/orders/by-client-id?${new URLSearchParams({ namespace: outageOrder.namespace, clientOrderId: outageOrder.clientOrderId })}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` } });
  const restoredLookupText = await restoredLookupResponse.text();
  assert.equal(restoredLookupResponse.status, 200, restoredLookupText);
  const restoredLookup = JSON.parse(restoredLookupText);
  assert.equal(restoredLookup.order.clientOrderId, outageOrder.clientOrderId);
  assert.equal(restoredLookup.order.status, "FILLED");
  const afterUnknownResume = await paperFactCounts();
  assert.deepEqual(afterUnknownResume, { ledgerEntries: beforeLookupOutage.ledgerEntries + 2, portfolioFills: beforeLookupOutage.portfolioFills + 1, positions: beforeLookupOutage.positions + 1, reservations: beforeLookupOutage.reservations + 1, brokerOrders: beforeLookupOutage.brokerOrders + 1, brokerFills: beforeLookupOutage.brokerFills + 1, brokerOrderEvents: beforeLookupOutage.brokerOrderEvents + 2, outboxEvents: beforeLookupOutage.outboxEvents + 1 }, "UNKNOWN recovery cannot alter facts beyond the single original execution");
  const recoveredRun = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}/recover`, { method: "POST" });
  assert.equal(recoveredRun.status, 202, JSON.stringify(recoveredRun.body));
  assert.equal(recoveredRun.body.status, "COMPLETED");
  assert.equal(recoveredRun.body.executionResent, false, "an existing authoritative order is recovered without resubmission");
  assert.equal(recoveredRun.body.recoveredOrderId, restoredLookup.order.order_id);
  const completedRecoveryRun = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}`);
  assert.equal(completedRecoveryRun.body.status, "COMPLETED");
  const completedRecoveryHistory = await request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${lookupOutageCreation.body.testRunId}/history`);
  assert.equal(completedRecoveryHistory.body.revisions.length, 2);
  assert.equal(completedRecoveryHistory.body.revisions[1].evidence.recovery.status, "UNKNOWN");
  const cliRecoveryCheck = spawnSync(process.execPath, [resolve(repo, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", lookupOutageCreation.body.testRunId, "--check-only"], { cwd: repo, encoding: "utf8", timeout: 10000, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_SESSION_COOKIE: `sq_session=${owner}` } });
  assert.equal(cliRecoveryCheck.status, 0, `${cliRecoveryCheck.stdout}\n${cliRecoveryCheck.stderr}`);
  const afterLookupOutage = await paperFactCounts();
  assert.deepEqual(afterLookupOutage, { ledgerEntries: beforeLookupOutage.ledgerEntries + 2, portfolioFills: beforeLookupOutage.portfolioFills + 1, positions: beforeLookupOutage.positions + 1, reservations: beforeLookupOutage.reservations + 1, brokerOrders: beforeLookupOutage.brokerOrders + 1, brokerFills: beforeLookupOutage.brokerFills + 1, brokerOrderEvents: beforeLookupOutage.brokerOrderEvents + 2, outboxEvents: beforeLookupOutage.outboxEvents + 1 }, "restoring the query reveals the original committed facts without duplicates");
  assert.deepEqual(await paperFactCounts(), afterLookupOutage, "recover endpoint and check-only CLI do not duplicate business facts");
  const lookupUnavailableRecovery = { failedTestRunId: lookupOutageCreation.body.testRunId, initialTestRunStatus: lookupOutageRun.body.status, recoveredTestRunStatus: completedRecoveryRun.body.status, executionRequestsForRun: executionRequests.filter((entry) => entry.testRunId === lookupOutageCreation.body.testRunId).length, tradeRestartedWhileUnknown: true, unknownResume: unknownResume.body, recoveryHistory: completedRecoveryHistory.body.revisions.map(({ status, evidence }) => ({ status, recoveryStatus: evidence.recovery?.status ?? "FAILED_BEFORE_RECOVERY" })), checkOnlyExitCode: cliRecoveryCheck.status, injectedEvents: proxyEvents.filter((event) => event.outcome === "RESPONSE_DROPPED" || event.outcome === "LOOKUP_UNAVAILABLE").slice(-3).map(({ method, url, status, outcome }) => ({ method, url, status, outcome })), restoredOriginalOrder: restoredLookup.order, before: beforeLookupOutage, after: afterLookupOutage, noBlindResubmission: true };

  const beforeConcurrentRuns = await paperFactCounts();
  const concurrentRunCreations = await Promise.all([1, 2].map(() => request(apiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId: "normal", seed: 20260927 } })));
  for (const created of concurrentRunCreations) { assert.equal(created.status, 202, JSON.stringify(created.body)); assert.equal(created.body.status, "COMPLETED", JSON.stringify(created.body)); }
  const concurrentRunRecords = await Promise.all(concurrentRunCreations.map(({ body }) => request(apiUrl, `/api/v1/acceptance/v2/v2.4/runs/${body.testRunId}`)));
  for (const run of concurrentRunRecords) {
    assert.equal(run.body.status, "COMPLETED");
    assert.equal(run.body.evidence.order.status, "FILLED");
    assert.equal(run.body.evidence.account.cash.amount, "8995.0000");
    assert.equal(run.body.evidence.reconciliation.order_count, 1);
    assert.equal(run.body.evidence.reconciliation.fill_count, 1);
  }
  const concurrentRunIds = concurrentRunCreations.map(({ body }) => body.testRunId);
  assert.equal(new Set(concurrentRunIds).size, 2);
  const afterConcurrentRuns = await paperFactCounts();
  assert.deepEqual(afterConcurrentRuns, { ledgerEntries: beforeConcurrentRuns.ledgerEntries + 4, portfolioFills: beforeConcurrentRuns.portfolioFills + 2, positions: beforeConcurrentRuns.positions + 2, reservations: beforeConcurrentRuns.reservations + 2, brokerOrders: beforeConcurrentRuns.brokerOrders + 2, brokerFills: beforeConcurrentRuns.brokerFills + 2, brokerOrderEvents: beforeConcurrentRuns.brokerOrderEvents + 4, outboxEvents: beforeConcurrentRuns.outboxEvents + 2 }, "two simultaneous TestRuns must have isolated accounts, orders, fills and ledgers");
  const concurrentRunEvidence = { testRunIds: concurrentRunIds, statuses: concurrentRunRecords.map(({ body }) => body.status), accountIds: concurrentRunRecords.map(({ body }) => body.evidence.accountId), accountCash: concurrentRunRecords.map(({ body }) => body.evidence.account.cash.amount), reconciliationCounts: concurrentRunRecords.map(({ body }) => ({ orders: body.evidence.reconciliation.order_count, fills: body.evidence.reconciliation.fill_count })), before: beforeConcurrentRuns, after: afterConcurrentRuns, isolated: true };

  if (process.env.V24_PAPER_SMOKE_SKIP_WEB !== "true") {
    const marketDataPort = await freePort();
    const marketDataUrl = `http://127.0.0.1:${marketDataPort}`;
    marketDataProcess = start(resolve(repo, "services/market-data-service/dist/main.js"), resolve(repo, "services/market-data-service"), serviceEnv(urls[4], marketDataPort, {
      STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform,
      STOCKQUANT_COLLECTION_EXECUTOR: "1",
      STOCKQUANT_SCHEDULER_WORKER: "1",
      STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "false"
    }));
    await waitReady(marketDataProcess, `${marketDataUrl}/ready`);
    const marketDataReadiness = await fetch(`${marketDataUrl}/ready`).then((response) => response.json());
    assert.equal(marketDataReadiness.collectionSourceAuthorization, "NOT_AUTHORIZED");
    assert.equal(marketDataReadiness.collectionSchedulerWorker, "DISABLED", "scheduler must fail closed even when its request flag is enabled without source authorization");
    assert.equal(marketDataReadiness.collectionExecutor, "DISABLED", "executor must fail closed without source authorization");
    marketDataPool = new Pool({ connectionString: urls[4] });
    const alertRepository = new AlertOutboxRepository(marketDataPool);
    await alertRepository.migrate();
    const seededAlert = await alertRepository.raiseIncident(`v24-browser-alert:${suffix}`, "COLLECTION_RUN_FAILED", "CRITICAL", { runId: `isolated-${suffix}` });
    const seededIncidentId = seededAlert.incident.incidentId;
    const browserApiPort = await freePort();
    const browserApiUrl = `http://127.0.0.1:${browserApiPort}`;
    const recoveryControlPort = await freePort();
    recoveryControl = createServer((req, res) => {
      if (req.method === "POST" && req.url === "/arm-next-recovery") { dropNextExecutionResponse = true; failNextClientOrderLookup = true; res.writeHead(204).end(); return; }
      res.writeHead(404).end();
    });
    await new Promise((resolveListen, reject) => { recoveryControl.once("error", reject); recoveryControl.listen(recoveryControlPort, "127.0.0.1", resolveListen); });
    const browserPlatform = start(resolve(repo, "services/platform-api-service/dist/main.js"), service, serviceEnv(urls[0], browserApiPort, {
      STOCKQUANT_BIND_HOST: "0.0.0.0",
      STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner, STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "false", STOCKQUANT_V24_AUTO_START: "false",
      STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: tokens.governance,
      STOCKQUANT_PORTFOLIO_API_URL: portfolioUrl, STOCKQUANT_GOVERNANCE_URL: governanceUrl, STOCKQUANT_TRADE_EXECUTION_URL: proxyUrl,
      STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: canaryUrl, STOCKQUANT_MARKET_DATA_URL: marketDataUrl, STOCKQUANT_RESEARCH_AUTOMATION_URL: canaryUrl
    }));
    await waitReady(browserPlatform, `${browserApiUrl}/live`);
    const platformControl = await request(browserApiUrl, "/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId: "rejection", seed: 20260907 } });
    assert.equal(platformControl.status, 202, JSON.stringify(platformControl.body));
    const platformControlResult = await request(browserApiUrl, `/api/v1/acceptance/v2/v2.4/runs/${platformControl.body.testRunId}`);
    assert.equal(platformControlResult.body.status, "COMPLETED", JSON.stringify(platformControlResult.body));
    browserPlatformControlRunId = platformControl.body.testRunId;
    const webPort = await freePort();
    webImageTag = `stockquant-v24-w1-web:${suffix}`;
    webContainerName = `sq-v24-w1-web-${suffix}`;
    const webBuild = spawnSync("docker", ["build", "--tag", webImageTag, "--file", "apps/web/Dockerfile", "."], { cwd: repo, encoding: "utf8", timeout: 180000 });
    assert.equal(webBuild.status, 0, `${webBuild.stdout}\n${webBuild.stderr}`);
    const imageInspect = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}}", webImageTag], { cwd: repo, encoding: "utf8", timeout: 10000 });
    assert.equal(imageInspect.status, 0, `${imageInspect.stdout}\n${imageInspect.stderr}`);
    webImageId = imageInspect.stdout.trim();
    const webStart = spawnSync("docker", ["run", "--detach", "--name", webContainerName, "--publish", `127.0.0.1:${webPort}:8080`, "--env", `STOCKQUANT_PLATFORM_API_URL=http://host.docker.internal:${browserApiPort}`, webImageTag], { cwd: repo, encoding: "utf8", timeout: 30000 });
    assert.equal(webStart.status, 0, `${webStart.stdout}\n${webStart.stderr}`);
    const webProbe = { child: { exitCode: null }, output: "containerized Vite preview" };
    try { await waitReady(webProbe, `http://127.0.0.1:${webPort}/acceptance/v2/v2.4`); }
    catch (error) {
      const logs = spawnSync("docker", ["logs", webContainerName], { cwd: repo, encoding: "utf8", timeout: 10000 });
      const inspection = spawnSync("docker", ["inspect", "--format", "{{.State.Status}} {{.State.ExitCode}}", webContainerName], { cwd: repo, encoding: "utf8", timeout: 10000 });
      throw new Error(`${error instanceof Error ? error.message : String(error)}\ncontainer=${inspection.stdout}\n${logs.stdout}\n${logs.stderr}`);
    }
    const e2eChild = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "tests/e2e/v24-live-readiness.spec.ts", "tests/e2e/v24-paper-overview.spec.ts"], { cwd: repo, env: { ...process.env, CI: "1", PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`, STOCKQUANT_PLATFORM_API_URL: browserApiUrl, STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner, STOCKQUANT_V24_RECOVERY_FAULT_CONTROL_URL: `http://127.0.0.1:${recoveryControlPort}/arm-next-recovery`, STOCKQUANT_ALERT_INTEGRATION: "true", STOCKQUANT_ALERT_INCIDENT_ID: seededIncidentId }, stdio: ["ignore", "pipe", "pipe"] });
    let e2eStdout = "";
    let e2eStderr = "";
    e2eChild.stdout.on("data", (chunk) => { e2eStdout = (e2eStdout + chunk.toString()).slice(-30000); });
    e2eChild.stderr.on("data", (chunk) => { e2eStderr = (e2eStderr + chunk.toString()).slice(-30000); });
    const e2e = await new Promise((resolveE2e) => {
      const timeout = setTimeout(() => e2eChild.kill("SIGTERM"), 120000);
      e2eChild.once("error", (error) => { clearTimeout(timeout); resolveE2e({ status: 1, stdout: e2eStdout, stderr: `${e2eStderr}\n${String(error)}` }); });
      e2eChild.once("close", (status) => { clearTimeout(timeout); resolveE2e({ status: status ?? 1, stdout: e2eStdout, stderr: e2eStderr }); });
    });
    const browserPlatformDb = new Client({ connectionString: urls[0] }); await browserPlatformDb.connect();
    const browserPlatformDiagnosticRuns = await browserPlatformDb.query("SELECT test_run_id::text,scenario_id,status FROM acceptance_stage_runs WHERE owner_id=$1 AND stage_id='V2.4' ORDER BY created_at", [owner]);
    await browserPlatformDb.end();
    assert.equal(e2e.status, 0, `${e2e.stdout}\n${e2e.stderr}\nproxyEvents=${JSON.stringify(proxyEvents)}\nproxyErrors=${JSON.stringify(proxyErrors)}\nbrowserRuns=${JSON.stringify(browserPlatformDiagnosticRuns.rows)}\nbrowserPlatformLogs=${children.at(-1).output}`);
    const finalAlert = (await alertRepository.activeIncidents()).find((incident) => incident.incidentId === seededIncidentId);
    assert.equal(finalAlert?.state, "ACKNOWLEDGED", "browser acknowledgement must persist through Platform to the isolated Market Data PostgreSQL repository");
    assert.equal(finalAlert?.acknowledgedBy, owner, "acknowledgement actor must come from the authenticated browser session");
    alertIntegrationEvidence = { incidentId: seededIncidentId, state: finalAlert.state, acknowledgedBy: finalAlert.acknowledgedBy, marketDataBaseUrl: marketDataUrl, sourceRequests: 0, collectionSourceAuthorization: marketDataReadiness.collectionSourceAuthorization, collectionSchedulerWorker: marketDataReadiness.collectionSchedulerWorker, collectionExecutor: marketDataReadiness.collectionExecutor, schedulerAndExecutorRequested: true, persistenceVerified: true };
    await marketDataPool.end();
    marketDataPool = undefined;
    assert.equal(droppedExecutionResponseCount, 3, "the accepted API and Web recovery responses plus the temporary-lookup-outage run each drop a persisted-order acceptance response");
    const platformAuditDb = new Client({ connectionString: urls[0] }); await platformAuditDb.connect();
    const browserRuns = await platformAuditDb.query("SELECT test_run_id::text,scenario_id,status FROM acceptance_stage_runs WHERE owner_id=$1 AND stage_id='V2.4' ORDER BY created_at", [owner]);
    await platformAuditDb.end();
    const browserScenarioRuns = browserRuns.rows.filter((run) => !runs.some((item) => item.testRunId === run.test_run_id) && run.test_run_id !== browserPlatformControlRunId && run.test_run_id !== lookupOutageCreation.body.testRunId && run.test_run_id !== expiryRunCreation.body.testRunId && run.test_run_id !== v24OutboxRunCreation.body.testRunId && !concurrentRunIds.includes(run.test_run_id));
    assert.equal(browserRuns.rowCount, 14, "four isolated API scenarios, query-outage, post-expiry and V2.4 Outbox runs, two concurrent runs, one direct control and all four browser TestRuns must persist");
    assert.deepEqual(browserScenarioRuns.map(({ scenario_id, status }) => ({ scenario_id, status })), [
      { scenario_id: "normal", status: "COMPLETED" },
      { scenario_id: "rejection", status: "COMPLETED" },
      { scenario_id: "recovery", status: "COMPLETED" },
      { scenario_id: "external-reconciliation", status: "COMPLETED" }
    ]);
    webTestRunId = browserScenarioRuns.at(-1).test_run_id;
    const beforeWebCliChecks = await paperFactCounts();
    webTestRuns = browserScenarioRuns.map((browserRun) => {
      const webCli = spawnSync(process.execPath, [resolve(repo, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", browserRun.test_run_id, "--check-only"], { cwd: repo, encoding: "utf8", timeout: 10000, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: browserApiUrl, STOCKQUANT_SESSION_COOKIE: `sq_session=${owner}` } });
      assert.equal(webCli.status, 0, webCli.stderr);
      assert.equal(JSON.parse(webCli.stdout).testRunId, browserRun.test_run_id);
      assert.equal(JSON.parse(webCli.stdout).status, "COMPLETED");
      return { testRunId: browserRun.test_run_id, exitCode: webCli.status };
    });
    const afterWebCliChecks = await paperFactCounts();
    assert.deepEqual(afterWebCliChecks, beforeWebCliChecks, "CLI --check-only and browser reloads must not mutate Paper orders, fills, ledger, reservations or Outbox");
    webFactCounts = { beforeWebCliChecks, afterWebCliChecks, unchanged: true };
  }
  const outboxRestart = spawnSync(process.execPath, [resolve(repo, "services/trade-execution-service/scripts/p5-7-outbox-http-smoke.mjs")], {
    cwd: resolve(repo, "services/trade-execution-service"), encoding: "utf8", timeout: 120000,
    env: { ...process.env, TRADE_EXECUTION_TEST_DATABASE_URL: urls[2], PORTFOLIO_RISK_TEST_DATABASE_URL: urls[1], STOCKQUANT_ALLOW_EPHEMERAL_P57_DB: "true" }
  });
  assert.equal(outboxRestart.status, 0, `${outboxRestart.stdout}\n${outboxRestart.stderr}`);
  const outboxReportLine = outboxRestart.stdout.trim().split("\n").filter((line) => line.trim().startsWith("{")).at(-1);
  assert.ok(outboxReportLine, outboxRestart.stdout);
  outboxRestartEvidence = JSON.parse(outboxReportLine);
  const auditDirectory = resolve(repo, "evidence/audits");
  const snapshotDirectory = resolve(auditDirectory, `2026-10-02-v24-isolated-db-snapshots-${suffix}`);
  await mkdir(snapshotDirectory, { recursive: true, mode: 0o700 });
  for (let index = 0; index < databases.length; index += 1) {
    const databaseClient = new Client({ connectionString: urls[index] });
    await databaseClient.connect();
    try {
      const tableList = await databaseClient.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
      const tables = {};
      for (const { table_name: tableName } of tableList.rows) {
        const escapedTableName = `"${String(tableName).replaceAll('"', '""')}"`;
        const records = await databaseClient.query(`SELECT COALESCE(json_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]'::json) AS rows FROM public.${escapedTableName} AS t`);
        tables[tableName] = records.rows[0].rows;
      }
      const snapshotBytes = Buffer.from(`${JSON.stringify({ database: databases[index], capturedAt: new Date().toISOString(), tables }, null, 2)}\n`);
      const filePath = resolve(snapshotDirectory, `${databases[index]}.json`);
      await writeFile(filePath, snapshotBytes, { mode: 0o600 });
      databaseSnapshotFiles.push({ path: filePath, sha256: createHash("sha256").update(snapshotBytes).digest("hex"), tableCount: tableList.rowCount, rowCount: Object.values(tables).reduce((sum, rows) => sum + rows.length, 0) });
    } finally { await databaseClient.end(); }
  }
  assert.equal(databaseSnapshotFiles.length, 5, "export all five isolated databases before cleanup");
  if (webContainerName) {
    const removed = spawnSync("docker", ["rm", "--force", webContainerName], { cwd: repo, encoding: "utf8", timeout: 30000 });
    assert.equal(removed.status, 0, `${removed.stdout}\n${removed.stderr}`);
    webContainerRemoved = true;
  }
  if (webImageTag) {
    const removed = spawnSync("docker", ["image", "rm", webImageTag], { cwd: repo, encoding: "utf8", timeout: 30000 });
    assert.equal(removed.status, 0, `${removed.stdout}\n${removed.stderr}`);
    webImageRemoved = true;
  }
  await mkdir(auditDirectory, { recursive: true });
  const auditReport = resolve(auditDirectory, `${new Date().toISOString().slice(0, 10)}-v24-paper-smoke-${suffix}.json`);
  await writeFile(auditReport, `${JSON.stringify({ status: "PASS", source: "v24:paper-http-smoke", environment: "isolated local PostgreSQL and Platform/Governance/Portfolio/Trade Execution/Market Data processes plus Chromium and containerized Web image/Vite preview", brokerMode: "FAKE", dataMode: "FIXTURE", identityAndLiveReject, snapshotReject, scopeTamperReject, expiredAuthorizationReject, revokedAuthorizationEvidence, consumedAuthorizationRevokeEvidence, authorizedFillAfterExpiryEvidence, v24OutboxRecoveryEvidence, pendingFillCancelEvidence, resourceConcurrencyEvidence, lookupUnavailableRecovery, terminalCancelEvidence, concurrentRunEvidence, tradeExecutionSnapshotIdempotency: idempotencyFacts, tradeRestartEvidence, outboxRestartEvidence, apiScenarios: runs.map(({ scenarioId, testRunId, cliExitCode, status, assertions }) => ({ scenarioId, testRunId, cliExitCode, status, assertions: assertions.map(({ assertionId, status }) => ({ assertionId, status })) })), browserPlatformControlRunId, browserScenarios: webTestRuns, alertIntegrationEvidence, lostRecoveryResponseConfirmed: recoverySawDroppedResponse, droppedExecutionResponseCount, successfulApiAndWebRecoveryDrops: 2, webRecoveryDroppedResponseConfirmed: droppedExecutionResponseCount >= 2, proxyFaultEvents: proxyEvents.filter((event) => event.outcome === "RESPONSE_DROPPED" || event.outcome === "LOOKUP_UNAVAILABLE"), webCliReadOnlyFactCounts: webFactCounts, temporaryDatabaseExportedBeforeCleanup: databaseSnapshotFiles.length === 5, databaseSnapshotFiles, activeServicesTouched: false, temporaryWebImageTag: webImageTag, temporaryWebImageId: webImageId, temporaryWebContainerName: webContainerName, temporaryWebImageRemovedAfterRun: webImageRemoved, temporaryWebContainerRemovedAfterRun: webContainerRemoved }, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ status: "PASS", auditReport, testRunIds: runs.map((run) => run.testRunId), scenarios: runs, webTestRunId, webTestRuns, lostRecoveryResponseConfirmed: recoverySawDroppedResponse, webApiCliSameRun: process.env.V24_PAPER_SMOKE_SKIP_WEB !== "true", webChecked: process.env.V24_PAPER_SMOKE_SKIP_WEB !== "true", tempDatabases: databases, activeServicesTouched: false }));
} finally {
  for (const entry of [...children].reverse()) await stop(entry);
  portfolioProxy?.closeAllConnections();
  proxy?.close();
  governanceProxy?.close();
  portfolioProxy?.close();
  await marketDataPool?.end().catch(() => undefined);
  canary?.close();
  recoveryControl?.close();
  if (webContainerName && !webContainerRemoved) spawnSync("docker", ["rm", "--force", webContainerName], { cwd: repo, encoding: "utf8", timeout: 30000 });
  if (webImageTag && !webImageRemoved) spawnSync("docker", ["image", "rm", webImageTag], { cwd: repo, encoding: "utf8", timeout: 30000 });
  await admin.end().catch(() => undefined);
  const cleanup = new Client({ connectionString: adminUrl.toString() }); await cleanup.connect();
  for (const database of dbNamesCreated.reverse()) await cleanup.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
  await cleanup.end();
}
