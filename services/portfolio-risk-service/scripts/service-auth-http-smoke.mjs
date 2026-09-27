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
async function request(path, method, caller, bearer, body) {
  return fetch(`${base}${path}`, { method, headers: { ...(body ? { "content-type": "application/json" } : {}), ...(caller ? { "x-stockquant-service-id": caller } : {}), ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
let accountId;
try {
  await waitReady();
  const command = { fixtureAccountRef: "service-auth-http-smoke", ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace, testRunId, idempotencyKey: "initialize-1" };
  const missing = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", null, command);
  const bad = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.trade, command);
  const wrongScope = await request("/internal/v1/accounts/initialize", "POST", "trade-execution-service", tokens.trade, command);
  if (missing.status !== 401 || bad.status !== 401 || wrongScope.status !== 403) throw new Error(`auth rejection mismatch: ${JSON.stringify({ missing: missing.status, bad: bad.status, wrongScope: wrongScope.status })}`);
  const initialized = await request("/internal/v1/accounts/initialize", "POST", "platform-api-service", tokens.platform, command);
  if (initialized.status !== 201 && initialized.status !== 200) throw new Error(`valid platform identity could not initialize isolated account: ${initialized.status} ${await initialized.text()}`);
  const result = await initialized.json();
  accountId = result.snapshot.accountId;
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
  const reserveResponse = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, reservationCommand);
  if (reserveResponse.status !== 201 && reserveResponse.status !== 200) throw new Error(`valid trade identity could not reserve resources: ${reserveResponse.status} ${await reserveResponse.text()}`);
  const reserved = await reserveResponse.json();
  if (!reserved.reservation?.reservationId || reserved.reservation.status !== "HELD" || reserved.replayed !== false) throw new Error("reservation did not create one HELD resource record");
  const replayResponse = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, reservationCommand);
  const replay = await replayResponse.json();
  if (replayResponse.status !== 201 && replayResponse.status !== 200 || replay.replayed !== true || replay.reservation.reservationId !== reserved.reservation.reservationId) throw new Error("reservation retry was not idempotent");
  const fillCommand = { namespace, externalFillId: randomUUID(), security: "600000.SH", quantity: 10, price: "100.0000", fee: "1.0000", currency: "CNY", effectiveAt: "2026-09-25T01:00:00.000Z", side: "BUY", reservation: { reservationId: reserved.reservation.reservationId, ownerId, testRunId, clientOrderId: reservationCommand.clientOrderId } };
  const fillResponse = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, fillCommand);
  const fillReplayResponse = await request(`/internal/v1/accounts/${accountId}/fills`, "POST", "trade-execution-service", tokens.trade, fillCommand);
  if (![200, 201].includes(fillResponse.status) || ![200, 201].includes(fillReplayResponse.status) || !(await fillReplayResponse.json()).replayed) throw new Error("reserved fill posting or retry was not idempotent");
  const overBudget = await request(reservationPath, "POST", "trade-execution-service", tokens.trade, { ...reservationCommand, idempotencyKey: "cash-reserve-too-much", clientOrderId: "smoke-order-too-much", cashAmount: "8000.0000" });
  if (overBudget.status !== 409) throw new Error(`over-budget reservation should be rejected with 409, received ${overBudget.status}`);
  const resolvePath = `${reservationPath}/${reserved.reservation.reservationId}/resolve`;
  const resolution = { namespace, testRunId, ownerId, outcome: "UNKNOWN", evidenceRef: "smoke:broker-query-required" };
  const replayResolve = await request(resolvePath, "POST", "historical-replay-worker", tokens.replay, resolution);
  const foreignResolve = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, ownerId: "foreign-owner" });
  const invalidOutcome = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, outcome: "MAYBE" });
  if (replayResolve.status !== 403 || foreignResolve.status !== 403 || invalidOutcome.status !== 400) throw new Error("reservation resolution caller, owner or outcome scope was not enforced");
  const unknownResolve = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, resolution);
  if (unknownResolve.status !== 200 || (await unknownResolve.json()).status !== "UNKNOWN") throw new Error("UNKNOWN did not preserve the resource hold with update status 200");
  const release = await request(resolvePath, "POST", "trade-execution-service", tokens.trade, { ...resolution, outcome: "CANCELLED", evidenceRef: "smoke:authoritative-cancel-confirmed" });
  if (release.status !== 200 || (await release.json()).status !== "RELEASED") throw new Error("authoritative cancellation did not release the reservation with update status 200");
  console.log(JSON.stringify({ status: "PASS", testRunId, caller: "platform-api-service", missingBearer: missing.status, wrongBearer: bad.status, wrongRouteScope: wrongScope.status, ownSnapshot: own.status, foreignOwner: foreign.status, platformFillDenied: tradeOwn.status, reservationCreated: reserveResponse.status, reservationIdempotentRetry: replay.replayed, reservedFill: fillResponse.status, fillIdempotentRetry: true, overBudget: overBudget.status, crossCallerResolve: replayResolve.status, crossOwnerResolve: foreignResolve.status, invalidOutcome: invalidOutcome.status, unknownRetainsHold: true, cancellationReleases: true }));
} finally {
  if (service.exitCode === null) { service.kill("SIGTERM"); await new Promise((resolveClose) => service.once("close", resolveClose)); }
  if (accountId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM resource_reservations WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM recorded_fills WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM account_positions WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM ledger_entries WHERE account_id=$1", [accountId]);
      await client.query("DELETE FROM accounts WHERE account_id=$1 AND namespace=$2 AND test_run_id=$3 AND owner_id=$4", [accountId, namespace, testRunId, ownerId]);
      const remaining = await client.query("SELECT count(*) FROM accounts WHERE account_id=$1", [accountId]);
      if (Number(remaining.rows[0].count) !== 0) throw new Error("account cleanup failed for exact isolated HTTP smoke account");
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  await pool.end();
}
