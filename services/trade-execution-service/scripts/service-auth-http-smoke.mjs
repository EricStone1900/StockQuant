import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { resolve } from "node:path";
import { Pool } from "pg";

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
  const noIdentity = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", null);
  const forgedToken = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", tokens.replay);
  const unknownIdentity = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "forged-service", tokens.platform);
  const platformSummary = await request(`/internal/v1/reconciliation/summary?namespace=${encodeURIComponent(namespace)}`, "GET", "platform-api-service", tokens.platform);
  const replayQuery = await request(`/internal/v1/orders/${orderId}`, "GET", "historical-replay-worker", tokens.replay);
  const platformCannotExecute = await request("/internal/v1/historical-orders/execute", "POST", "platform-api-service", tokens.platform, {});
  const replayCannotCancel = await request(`/internal/v1/orders/${orderId}/cancel`, "POST", "historical-replay-worker", tokens.replay, {});
  assert.equal(noIdentity.status, 403);
  assert.equal(forgedToken.status, 403);
  assert.equal(unknownIdentity.status, 403);
  assert.equal(platformSummary.status, 200);
  assert.equal(replayQuery.status, 404);
  assert.equal(platformCannotExecute.status, 403);
  assert.equal(replayCannotCancel.status, 403);
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

  const execution = await request("/internal/v1/historical-orders/execute", "POST", "historical-replay-worker", tokens.replay, {
    namespace,
    accountId: randomUUID(),
    clientOrderId,
    security: "600000.SH",
    requestedQuantity: 100,
    bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 0 },
    authorizationId: randomUUID()
  });
  const executionText = await execution.text();
  assert.equal(execution.status, 200, executionText);
  const executionBody = JSON.parse(executionText);
  assert.equal(executionBody.result.status, "REJECTED");
  assert.equal(executionBody.result.rejectionReason, "ZERO_VOLUME");
  assert.equal(governanceIdentityVerified, true);
  const order = await request(`/internal/v1/orders/${executionBody.result.orderId}`, "GET", "historical-replay-worker", tokens.replay);
  assert.equal(order.status, 200);
  runStatus = { noIdentity: noIdentity.status, forgedToken: forgedToken.status, unknownIdentity: unknownIdentity.status, platformRead: platformSummary.status, replayRead: replayQuery.status, platformExecuteDenied: platformCannotExecute.status, replayCancelDenied: replayCannotCancel.status, governanceDenied: governanceDenied.status, denialSideEffects: { orders: deniedOrders.rows[0].count, fills: deniedFills.rows[0].count, events: deniedEvents.rows[0].count, outbox: deniedOutbox.rows[0].count }, governedExecution: execution.status, rejectedZeroVolume: executionBody.result.rejectionReason, governanceBearerVerified: governanceIdentityVerified, governanceValidationCalls };
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
      await client.query("DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1", [namespace]);
      await client.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
      const remaining = await client.query("SELECT count(*)::int AS count FROM fake_broker_orders WHERE namespace=$1", [namespace]);
      assert.equal(remaining.rows[0].count, 0);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  await pool.end();
}
