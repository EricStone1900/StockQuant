import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { createServer as createNetServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const requirePg = createRequire(resolve(root, "services/decision-governance-service/package.json"));
const { Client } = requirePg("pg");
const adminUrl = new URL(process.env.STOCKQUANT_AUTH_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5433" || adminUrl.username !== "postgres" || adminUrl.pathname !== "/postgres") {
  throw new Error("service auth HTTP smokes require the dedicated local PostgreSQL admin endpoint at 127.0.0.1:5433/postgres");
}

const databaseName = `stockquant_auth_smoke_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const tokens = {
  platform: randomBytes(48).toString("base64url"),
  replay: randomBytes(48).toString("base64url"),
  runner: randomBytes(48).toString("base64url"),
  trade: randomBytes(48).toString("base64url")
};
const appEnv = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: "/tmp",
  NODE_ENV: "test",
  STOCKQUANT_BIND_HOST: "127.0.0.1",
  STOCKQUANT_DATABASE_URL: databaseUrl.toString(),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay,
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade,
  STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH: randomBytes(48).toString("base64url"),
  STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1",
  STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1",
  STOCKQUANT_GOVERNANCE_URL: "http://127.0.0.1:1",
  STOCKQUANT_QUANT_RESEARCH_URL: "http://127.0.0.1:1",
  QLIB_WORKER_URL: "http://127.0.0.1:1"
};

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

async function runService(serviceName, assertions) {
  const serviceDir = resolve(root, "services", serviceName);
  const port = await freePort();
  const child = spawn(process.execPath, [resolve(serviceDir, "dist/main.js")], {
    cwd: serviceDir,
    env: { ...appEnv, STOCKQUANT_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => {
    if (output.length < 6000) output += chunk.toString().slice(0, 6000 - output.length);
  });
  const base = `http://127.0.0.1:${port}`;
  const request = (path, { caller, bearer, method = "GET", body } = {}) => fetch(`${base}${path}`, {
    method,
    headers: {
      ...(caller ? { "x-stockquant-service-id": caller } : {}),
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {})
    },
    ...(body !== undefined ? { body } : {}),
    signal: AbortSignal.timeout(3000)
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`${serviceName} exited before ready: ${output}`);
      try {
        const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { ready = true; break; }
      } catch { /* isolated process is still starting */ }
      await delay(100);
    }
    assert.equal(ready, true, `${serviceName} did not become ready: ${output}`);
    await assertions(request);
  } finally {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
}

const admin = new Client({ connectionString: adminUrl.toString() });
let created = false;
try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;

  await runService("decision-governance-service", async (request) => {
    const testDb = new Client({ connectionString: databaseUrl.toString() });
    await testDb.connect();
    try {
    const missing = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", body: "{" });
    const mismatched = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.trade, body: "{" });
    const forgedScope = await request("/internal/v1/authorizations", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: "{" });
    const requestAuthorized = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: "{" });
    const validateAuthorized = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: "{" });
    assert.equal(missing.status, 403);
    assert.equal(mismatched.status, 403);
    assert.equal(forgedScope.status, 403);
    assert.equal(requestAuthorized.status, 422, "valid replay identity must reach JSON validation without writing a row");
    assert.equal(validateAuthorized.status, 422, "valid execution identity must reach JSON validation without writing a row");

    const command = { namespace: `auth-smoke-${randomUUID()}`, accountId: randomUUID(), clientOrderId: `order-${randomUUID()}`, security: "600000.SH", requestedQuantity: 100, bar: { timestamp: "2026-09-25T01:32:00.000Z", open: "10.0000", volume: 1000 } };
    const issuedResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: command.namespace, accountId: command.accountId, command, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(issuedResponse.status, 200, "valid replay command should receive a scoped one-time authorization");
    const { authorizationId } = await issuedResponse.json();
    const tampered = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command: { ...command, requestedQuantity: 101 } }) });
    assert.equal(tampered.status, 403, "changed command must not consume or validate the authorization");
    const replayedValidations = await Promise.all([1, 2].map(() => request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command }) })));
    assert.deepEqual(replayedValidations.map((response) => response.status).sort(), [200, 403], "authorization must be consumed exactly once under concurrent validation");

    const renewedCommand = { ...command, clientOrderId: `order-${randomUUID()}`, requestedQuantity: 50 };
    const renewedResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: command.namespace, accountId: command.accountId, command: renewedCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(renewedResponse.status, 200);
    const renewed = await renewedResponse.json();
    assert.notEqual(renewed.authorizationId, authorizationId, "re-issuing within the same namespace must rotate the authorization ID");
    const staleId = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId, accountId: command.accountId, command }) });
    assert.equal(staleId.status, 403, "prior authorization ID must remain invalid after namespace renewal");

    const expiredCommand = { ...command, namespace: `auth-smoke-expired-${randomUUID()}`, clientOrderId: `order-${randomUUID()}` };
    const expiredResponse = await request("/internal/v1/authorizations", { method: "POST", caller: "historical-replay-worker", bearer: tokens.replay, body: JSON.stringify({ namespace: expiredCommand.namespace, accountId: expiredCommand.accountId, command: expiredCommand, environmentMode: "BACKTEST", brokerMode: "FAKE" }) });
    assert.equal(expiredResponse.status, 200);
    const expired = await expiredResponse.json();
    await testDb.query("UPDATE execution_authorizations SET expires_at=now()-interval '1 second' WHERE authorization_id=$1", [expired.authorizationId]);
    const expiredValidation = await request("/internal/v1/authorizations/validate", { method: "POST", caller: "trade-execution-service", bearer: tokens.trade, body: JSON.stringify({ authorizationId: expired.authorizationId, accountId: expiredCommand.accountId, command: expiredCommand }) });
    assert.equal(expiredValidation.status, 403, "expired authorization must be rejected");
    } finally {
      await testDb.end();
    }
  });

  await runService("historical-replay-worker", async (request) => {
    const runId = randomUUID();
    const path = `/internal/v1/replays/${runId}`;
    const missing = await request(path, { caller: "platform-api-service" });
    const mismatched = await request(path, { caller: "platform-api-service", bearer: tokens.replay });
    const forged = await request(path, { caller: "unknown-service", bearer: tokens.platform });
    const allowedRead = await request(path, { caller: "platform-api-service", bearer: tokens.platform });
    assert.equal(missing.status, 403);
    assert.equal(mismatched.status, 403);
    assert.equal(forged.status, 403);
    assert.equal(allowedRead.status, 404, "authorized read should reach the exact run lookup");

    const platform = { caller: "platform-api-service", bearer: tokens.platform };
    const forbiddenCallers = [
      { caller: "runner-host", bearer: tokens.runner },
      { caller: platform.caller, bearer: tokens.replay }
    ];
    const writeCases = [
      ["single replay submit", "/internal/v1/replays", "POST"],
      ["multi replay submit", "/internal/v1/replays/multi", "POST"],
      ["async multi replay submit", "/internal/v1/replays/multi?async=true", "POST"],
      ["pause foreign run", `${path}/pause`, "POST"],
      ["resume foreign run", `${path}/resume`, "POST"],
      ["cancel foreign run", `${path}/cancel`, "POST"],
      ["recover foreign run", `${path}/recover-unknown`, "POST"]
    ];
    for (const [label, route, method] of writeCases) {
      for (const identity of forbiddenCallers) {
        const denied = await request(route, { ...identity, method, body: "{}" });
        assert.equal(denied.status, 403, `${label} must reject the foreign or mismatched service identity before reading or changing replay state`);
      }
    }

    const singleMalformed = await request("/internal/v1/replays", { ...platform, method: "POST", body: "{}" });
    const multiMalformed = await request("/internal/v1/replays/multi", { ...platform, method: "POST", body: "{}" });
    const asyncMalformed = await request("/internal/v1/replays/multi?async=true", { ...platform, method: "POST", body: "{}" });
    assert.deepEqual([singleMalformed.status, multiMalformed.status, asyncMalformed.status], [422, 422, 422], "authorized malformed submits must stop at input validation and create no run");
    const lifecycleMissing = await Promise.all(["pause", "resume", "cancel"].map((action) => request(`${path}/${action}`, { ...platform, method: "POST" })));
    assert.deepEqual(lifecycleMissing.map((response) => response.status), [404, 404, 404], "authorized lifecycle operations on the isolated absent run must not create state");
    const recoveryMissing = await request(`${path}/recover-unknown`, { ...platform, method: "POST" });
    assert.equal(recoveryMissing.status, 422, "authorized recovery of a run without original-order evidence must fail closed");
  });

  await runService("quant-research-service", async (request) => {
    const wrongToken = await request("/v1/qlib/probe", { caller: "platform-api-service", bearer: tokens.replay });
    const replayOutOfScope = await request("/v1/qlib/probe", { caller: "historical-replay-worker", bearer: tokens.replay });
    const allowedPlatformProbe = await request("/v1/qlib/probe", { caller: "platform-api-service", bearer: tokens.platform });
    const tokenDerivedPlatformProbe = await request("/v1/qlib/probe", { bearer: tokens.platform });
    const forgedPlatformClaim = await request("/v1/qlib/probe", { caller: "historical-replay-worker", bearer: tokens.platform });
    const allowedPlatformInvalidCandidate = await request("/v1/research/candidates", { method: "POST", caller: "platform-api-service", bearer: tokens.platform, body: "{}" });
    assert.equal(wrongToken.status, 403);
    assert.equal(replayOutOfScope.status, 403);
    assert.equal(allowedPlatformProbe.status, 200);
    assert.equal(tokenDerivedPlatformProbe.status, 200, "valid Bearer identity must work without the legacy service header");
    assert.equal(forgedPlatformClaim.status, 403, "an optional service header must agree with the Bearer identity");
    assert.equal(allowedPlatformInvalidCandidate.status, 422, "authorized request must reach input validation before any insert");
  });

  console.log(JSON.stringify({ status: "PASS", database: "temporary isolated database", services: ["decision-governance-service", "historical-replay-worker", "quant-research-service"], historicalReplayRoutes: { unauthorizedRouteProbes: 14, unauthorizedServiceIdentities: ["runner-host", "platform-api-service with replay-worker Bearer"], malformedAuthorizedSubmissions: 3, missingRunLifecycleActions: 3, missingRunRecovery: 1 }, governanceAuthorization: { commandBinding: "PASS", concurrentSingleUse: "PASS", namespaceRenewalRotatesId: "PASS", expiredAuthorization: "REJECTED", environmentMode: "BACKTEST", brokerMode: "FAKE" } }));
} finally {
  if (created) {
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    const remaining = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName]);
    assert.equal(remaining.rowCount, 0, "random service-auth smoke database must be dropped");
  }
  await admin.end();
}
