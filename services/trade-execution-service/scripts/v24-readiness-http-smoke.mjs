import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { isIsolatedPostgresTarget } from "./isolated-postgres-target.mjs";

const databaseUrl = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
if (!isIsolatedPostgresTarget(databaseUrl, process.env.STOCKQUANT_ISOLATED_PG_CONTAINER)) throw new Error("readiness HTTP smoke requires the dedicated trade_execution_test database or an inspected read-only disposable PostgreSQL test container");
const pool = new Pool({ connectionString: databaseUrl });
const token = () => `v24-readiness-${randomUUID()}-${randomUUID()}`;
const platformToken = token();
const replayToken = token();
const outboundToken = token();
const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
});
const service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env: {
  PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1",
  STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl, STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1",
  STOCKQUANT_GOVERNANCE_URL: "http://127.0.0.1:1", STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: replayToken, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: outboundToken
}, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); });
const base = `http://127.0.0.1:${port}`;
const headers = (serviceId, bearer) => ({ ...(serviceId ? { "x-stockquant-service-id": serviceId } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) });
async function countBusinessRows() {
  const result = await pool.query(`SELECT (SELECT count(*) FROM fake_broker_orders)::int AS orders,
    (SELECT count(*) FROM fake_broker_fills)::int AS fills,
    (SELECT count(*) FROM fake_broker_order_events)::int AS events,
    (SELECT count(*) FROM fake_broker_outbox)::int AS outbox`);
  return result.rows[0];
}
async function readPersistedPolicy() {
  const result = await pool.query(`SELECT policy_id, policy_version, schema_version, status,
    environment_mode, broker_mode, live_trading_enabled, policy_sha256, policy_json
    FROM simulation_execution_policies WHERE policy_id='v24-snapshot-paper-policy' AND policy_version='1.0.0'`);
  assert.equal(result.rowCount, 1, "the simulation policy must be persisted before readiness is served");
  return result.rows[0];
}
let before;
try {
  await pool.query("SELECT 1");
  let ready = false;
  for (let i = 0; i < 100; i += 1) {
    if (service.exitCode !== null) throw new Error(`service exited: ${output}`);
    try { if ((await fetch(`${base}/ready`)).ok) { ready = true; break; } } catch { /* wait for loopback service */ }
    await delay(100);
  }
  assert.equal(ready, true, `service did not become ready: ${output}`);
  const policyBefore = await readPersistedPolicy();
  assert.equal(policyBefore.status, "PREPARATION_ONLY");
  assert.equal(policyBefore.environment_mode, "PAPER");
  assert.equal(policyBefore.broker_mode, "FAKE");
  assert.equal(policyBefore.live_trading_enabled, false);
  assert.equal(policyBefore.policy_json.policyVersion, "1.0.0");
  await assert.rejects(pool.query("UPDATE simulation_execution_policies SET policy_json='{}'::jsonb WHERE policy_id='v24-snapshot-paper-policy' AND policy_version='1.0.0'"), /SIMULATION_POLICY_VERSION_IS_IMMUTABLE/u);
  await assert.rejects(pool.query("DELETE FROM simulation_execution_policies WHERE policy_id='v24-snapshot-paper-policy' AND policy_version='1.0.0'"), /SIMULATION_POLICY_VERSION_IS_IMMUTABLE/u);
  await assert.rejects(pool.query("TRUNCATE simulation_execution_policies"), /SIMULATION_POLICY_VERSION_IS_IMMUTABLE/u);
  before = await countBusinessRows();
  const endpoint = "/internal/v1/v24/paper-readiness";
  const call = (market, serviceId = "platform-api-service", bearer = platformToken) => fetch(`${base}${endpoint}?market=${market}`, { headers: headers(serviceId, bearer) });
  assert.equal((await call("CN_A", "platform-api-service", null)).status, 403);
  assert.equal((await call("CN_A", "platform-api-service", replayToken)).status, 403);
  assert.equal((await call("CN_A", "forged-service", platformToken)).status, 403);
  const cn = await call("CN_A");
  const cnBody = await cn.json();
  assert.equal(cn.status, 200);
  assert.equal(cnBody.status, "BLOCKED");
  assert.equal(cnBody.brokerMode, "FAKE");
  assert.equal(cnBody.liveTradingEnabled, false);
  assert.equal(cnBody.policyReadiness.status, "BLOCKED");
  assert.equal(cnBody.mandateReadiness.status, "BLOCKED");
  assert.equal(cnBody.riskEvaluation.status, "NOT_RUN");
  assert.equal(cnBody.resourceReservation.status, "NOT_RUN");
  assert.equal(cnBody.orderSubmissionEnabled, false);
  const us = await call("US_EQUITY");
  const usBody = await us.json();
  assert.equal(us.status, 200);
  assert.equal(usBody.status, "REJECTED");
  assert.equal(usBody.policyReadiness.reason, "UNSUPPORTED_MARKET");
  assert.equal(usBody.orderSubmissionEnabled, false);
  assert.equal((await call("INVALID")).status, 400);
  assert.equal((await fetch(`${base}${endpoint}?market=CN_A`, { method: "POST", headers: headers("platform-api-service", platformToken) })).status, 403);
  const after = await countBusinessRows();
  assert.deepEqual(after, before, "readiness requests must not create orders, fills, events, or outbox entries");
  const policyAfter = await readPersistedPolicy();
  assert.deepEqual(policyAfter, policyBefore, "readiness must use but never modify the immutable simulation policy");
  console.log(JSON.stringify({ status: "PASS", scope: "read-only readiness HTTP boundary and immutable persisted simulation policy", policy: { id: policyBefore.policy_id, version: policyBefore.policy_version, sha256: policyBefore.policy_sha256, status: policyBefore.status, environmentMode: policyBefore.environment_mode, brokerMode: policyBefore.broker_mode, liveTradingEnabled: policyBefore.live_trading_enabled, unchangedByReadiness: true }, http: { unauthorized: 403, wrongBearer: 403, forgedIdentity: 403, cn: 200, us: 200, invalidMarket: 400, writeVerb: 403 }, cn: cnBody, us: usBody, businessRowsBefore: before, businessRowsAfter: after }));
} finally {
  if (service.exitCode === null) { service.kill("SIGTERM"); await new Promise((resolveClose) => service.once("close", resolveClose)); }
  await pool.end();
}
