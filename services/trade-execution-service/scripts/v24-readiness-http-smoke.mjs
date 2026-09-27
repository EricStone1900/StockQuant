import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

const databaseUrl = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const db = new URL(databaseUrl);
if (db.pathname !== "/trade_execution_test" || db.username !== "trade_execution_test" || db.hostname !== "127.0.0.1" || db.port !== "5433") throw new Error("readiness HTTP smoke requires the isolated local trade_execution_test database");
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
  console.log(JSON.stringify({ status: "PASS", scope: "read-only readiness HTTP boundary", http: { unauthorized: 403, wrongBearer: 403, forgedIdentity: 403, cn: 200, us: 200, invalidMarket: 400, writeVerb: 403 }, cn: cnBody, us: usBody, businessRowsBefore: before, businessRowsAfter: after }));
} finally {
  if (service.exitCode === null) { service.kill("SIGTERM"); await new Promise((resolveClose) => service.once("close", resolveClose)); }
  await pool.end();
}
