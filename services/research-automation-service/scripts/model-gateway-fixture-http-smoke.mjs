import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client, Pool } from "pg";

const adminUrl = new URL(process.env.STOCKQUANT_MODEL_GATEWAY_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5433" || adminUrl.username !== "postgres" || adminUrl.pathname !== "/postgres") {
  throw new Error("model gateway fixture smoke requires the local PostgreSQL admin endpoint at 127.0.0.1:5433/postgres");
}
const databaseName = `stockquant_gateway_smoke_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const token = randomBytes(48).toString("base64url");
const artifactRoot = await mkdtemp(join(tmpdir(), "stockquant-gateway-fixture-artifacts-"));
const appDir = process.cwd();
const servicePort = await new Promise((resolvePort, reject) => {
  const server = createNetServer(); server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
});
const app = spawn(process.execPath, [resolve(appDir, "dist/bootstrap/main.js")], {
  cwd: appDir,
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: "/tmp",
    NODE_ENV: "test",
    STOCKQUANT_BIND_HOST: "127.0.0.1",
    STOCKQUANT_PORT: String(servicePort),
    STOCKQUANT_DATABASE_URL: databaseUrl.toString(),
    STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot,
    STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH",
    STOCKQUANT_BROKER_MODE: "FAKE",
    STOCKQUANT_LIVE_TRADING_ENABLED: "false",
    STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED",
    STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
    STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true",
    STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
for (const stream of [app.stdout, app.stderr]) stream.on("data", (chunk) => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); });
const base = `http://127.0.0.1:${servicePort}`;
const admin = new Client({ connectionString: adminUrl.toString() });
let created = false;
let pool;

async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (app.exitCode !== null) throw new Error(`research service exited before ready: ${output}`);
    try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* service is still booting */ }
    await delay(100);
  }
  throw new Error(`research service did not become ready: ${output}`);
}

async function request(path, { method = "GET", body, caller = "platform-api-service", bearer = token } = {}) {
  return fetch(`${base}${path}`, {
    method,
    headers: { "x-stockquant-service-id": caller, authorization: `Bearer ${bearer}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
}

async function createExperiment(idempotencyKey) {
  const response = await request("/v1/experiments", { method: "POST", body: {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1,
    budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey,
  } });
  assert.equal(response.status, 202);
  return response.json();
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  pool = new Pool({ connectionString: databaseUrl.toString() });
  await waitReady();
  const preflight = await request("/v1/model-gateway/preflight");
  assert.equal(preflight.status, 200);
  assert.equal((await preflight.json()).status, "BLOCKED", "real provider remains blocked");
  const runnerPreflight = await request("/v1/model-gateway/preflight", { caller: "runner-host", bearer: token });
  assert.equal(runnerPreflight.status, 403);

  const successExperiment = await createExperiment(`gateway-success-${randomUUID()}`);
  const successCall = { experimentId: successExperiment.experimentId, modelRunId: `fixed-${randomUUID()}`, requestedCents: 60, scenario: "COMPLETED" };
  const successResponse = await request("/v1/model-gateway/fixture-call", { method: "POST", body: successCall });
  assert.equal(successResponse.status, 200);
  const successBody = await successResponse.json();
  assert.deepEqual({ ...successBody, response: undefined }, {
    providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", status: "COMPLETED", modelRunId: successCall.modelRunId,
    response: undefined, actualCostCents: 23, budgetStatus: "SETTLED",
  });
  assert.equal(successBody.response.fixtureId, "v3.1-model-response-fixed-v1");
  assert.match(successBody.response.generatedCode, /import qlib/u);
  const successRetry = await request("/v1/model-gateway/fixture-call", { method: "POST", body: successCall });
  assert.equal(successRetry.status, 200);
  assert.equal((await successRetry.json()).status, "ALREADY_EXISTS");
  const successRows = await pool.query("SELECT status,requested_cents,reserved_cents,spent_cents FROM research_model_call_budgets WHERE experiment_id=$1", [successExperiment.experimentId]);
  assert.deepEqual(successRows.rows, [{ status: "SETTLED", requested_cents: 60, reserved_cents: 60, spent_cents: 23 }]);

  const timeoutExperiment = await createExperiment(`gateway-timeout-${randomUUID()}`);
  const timeoutCall = { experimentId: timeoutExperiment.experimentId, modelRunId: `fixed-${randomUUID()}`, requestedCents: 50, scenario: "TIMEOUT" };
  const timeoutResponse = await request("/v1/model-gateway/fixture-call", { method: "POST", body: timeoutCall });
  assert.equal(timeoutResponse.status, 202);
  assert.equal((await timeoutResponse.json()).status, "UNKNOWN");
  const timeoutRetry = await request("/v1/model-gateway/fixture-call", { method: "POST", body: timeoutCall });
  assert.equal((await timeoutRetry.json()).status, "ALREADY_EXISTS");
  const exhausted = await request("/v1/model-gateway/fixture-call", { method: "POST", body: { ...timeoutCall, modelRunId: `fixed-${randomUUID()}`, requestedCents: 51, scenario: "COMPLETED" } });
  assert.equal(exhausted.status, 422);
  const timeoutRows = await pool.query("SELECT status,requested_cents,reserved_cents,spent_cents FROM research_model_call_budgets WHERE experiment_id=$1", [timeoutExperiment.experimentId]);
  assert.deepEqual(timeoutRows.rows, [{ status: "UNKNOWN", requested_cents: 50, reserved_cents: 50, spent_cents: 0 }]);

  const overBudgetExperiment = await createExperiment(`gateway-over-budget-${randomUUID()}`);
  const overBudget = await request("/v1/model-gateway/fixture-call", { method: "POST", body: { experimentId: overBudgetExperiment.experimentId, modelRunId: `fixed-${randomUUID()}`, requestedCents: 40, scenario: "OVER_BUDGET" } });
  assert.equal(overBudget.status, 202);
  assert.equal((await overBudget.json()).status, "UNKNOWN");
  const overBudgetRows = await pool.query("SELECT status,requested_cents,reserved_cents,spent_cents FROM research_model_call_budgets WHERE experiment_id=$1", [overBudgetExperiment.experimentId]);
  assert.deepEqual(overBudgetRows.rows, [{ status: "UNKNOWN", requested_cents: 40, reserved_cents: 40, spent_cents: 0 }]);

  console.log(JSON.stringify({ status: "PASS", provider: "FIXTURE", externalCalls: 0, checks: ["preflight remains BLOCKED", "wrong caller denied", "reserve-dispatch-fixed-call-settle", "idempotent same-run replay", "timeout UNKNOWN budget hold", "no retry after UNKNOWN", "budget exhaustion refusal", "over-reservation UNKNOWN hold"] }));
} finally {
  app.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => app.once("exit", resolveExit)), delay(3000)]);
  if (app.exitCode === null) app.kill("SIGKILL");
  await pool?.end().catch(() => undefined);
  if (created) {
    const cleanupPool = new Pool({ connectionString: adminUrl.toString() });
    await cleanupPool.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await cleanupPool.end();
  }
  await admin.end();
  await rm(artifactRoot, { recursive: true, force: true });
}
