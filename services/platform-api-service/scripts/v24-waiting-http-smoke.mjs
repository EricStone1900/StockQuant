import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer as createHttpServer } from "node:http";
import { createServer as createTcpServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || parsed.username !== "platform_api_test") throw new Error("V2.4 waiting HTTP smoke requires platform_api_test only");
const pool = new Pool({ connectionString: databaseUrl });
const executionDatabaseUrl = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const executionParsed = new URL(executionDatabaseUrl);
if (decodeURIComponent(executionParsed.pathname.slice(1)) !== "trade_execution_test" || executionParsed.username !== "trade_execution_test" || Number(executionParsed.port || 5432) !== 5433) throw new Error("V2.4 waiting HTTP smoke requires trade_execution_test on port 5433 only");
const executionPool = new Pool({ connectionString: executionDatabaseUrl });
const serviceDirectory = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(serviceDirectory, "../..");
const ownerId = `v24-waiting-smoke-${randomUUID()}`;
const runIds = [];
let api;
let apiOutput = "";
let execution;
let executionOutput = "";
let apiUrl;
let canaryUrl;
let executionUrl;
let canary;
let canaryRequests = [];
let platformServiceToken;

async function freePort() {
  const listener = createTcpServer();
  return new Promise((resolvePort, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const port = listener.address().port;
      listener.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function stop(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((done) => child.once("exit", done)), delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function request(path, { cookie = `sq_session=${ownerId}`, method = "GET", body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(5000),
  });
  return { status: response.status, body: await response.json().catch(() => null) };
}

try {
  const dbPort = Number(parsed.port || 5432);
  if (dbPort !== 5433) throw new Error("V2.4 waiting HTTP smoke refuses a non-test PostgreSQL port");
  const apiPort = await freePort();
  const executionPort = await freePort();
  const canaryPort = await freePort();
  canary = createHttpServer((req, res) => {
    canaryRequests.push(`${req.method} ${req.url}`);
    res.writeHead(503, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "unexpected downstream call or invalid service identity" }));
  });
  await new Promise((resolveListen, reject) => { canary.once("error", reject); canary.listen(canaryPort, "127.0.0.1", resolveListen); });
  canaryUrl = `http://127.0.0.1:${canaryPort}`;
  executionUrl = `http://127.0.0.1:${executionPort}`;
  apiUrl = `http://127.0.0.1:${apiPort}`;
  platformServiceToken = `v24-waiting-smoke-${randomUUID()}-${randomUUID()}`;
  execution = spawn(process.execPath, [resolve(repositoryRoot, "services/trade-execution-service/dist/main.js")], {
    cwd: resolve(repositoryRoot, "services/trade-execution-service"),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", NODE_ENV: "test",
      STOCKQUANT_DATABASE_URL: executionDatabaseUrl, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(executionPort),
      STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformServiceToken,
      STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: `replay-${randomUUID()}-${randomUUID()}`,
      STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: `outbound-${randomUUID()}-${randomUUID()}`,
      STOCKQUANT_PORTFOLIO_API_URL: canaryUrl, STOCKQUANT_GOVERNANCE_URL: canaryUrl,
    }, stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [execution.stdout, execution.stderr]) stream.on("data", (chunk) => { if (executionOutput.length < 8000) executionOutput += chunk.toString().slice(0, 8000 - executionOutput.length); });
  let executionReady = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (execution.exitCode !== null) throw new Error(`temporary Trade Execution exited early: ${executionOutput}`);
    try { if ((await fetch(`${executionUrl}/ready`)).ok) { executionReady = true; break; } } catch { /* wait for startup */ }
    await delay(100);
  }
  assert.equal(executionReady, true, `temporary Trade Execution did not become ready: ${executionOutput}`);
  api = spawn(process.execPath, [resolve(serviceDirectory, "dist/main.js")], {
    cwd: serviceDirectory,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      NODE_ENV: "test",
      STOCKQUANT_LIVE_TRADING_ENABLED: "false",
      STOCKQUANT_BROKER_MODE: "FAKE",
      STOCKQUANT_V11_RUN_STORAGE: "legacy",
      STOCKQUANT_DATABASE_URL: databaseUrl,
      STOCKQUANT_BIND_HOST: "127.0.0.1",
      STOCKQUANT_PORT: String(apiPort),
      STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId,
      STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "false",
      STOCKQUANT_V24_AUTO_START: "false",
      STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformServiceToken,
      STOCKQUANT_PORTFOLIO_API_URL: canaryUrl,
      STOCKQUANT_TRADE_EXECUTION_URL: executionUrl,
      STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: canaryUrl,
      STOCKQUANT_MARKET_DATA_URL: canaryUrl,
      STOCKQUANT_GOVERNANCE_URL: canaryUrl,
      STOCKQUANT_RESEARCH_AUTOMATION_URL: canaryUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [api.stdout, api.stderr]) stream.on("data", (chunk) => { if (apiOutput.length < 8000) apiOutput += chunk.toString().slice(0, 8000 - apiOutput.length); });
  let live = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (api.exitCode !== null) throw new Error(`temporary Platform API exited early: ${apiOutput}`);
    try { if ((await fetch(`${apiUrl}/live`)).ok) { live = true; break; } } catch { /* wait for startup */ }
    await delay(100);
  }
  assert.equal(live, true, `temporary Platform API did not become live: ${apiOutput}`);
  assert.equal((await request("/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A", { cookie: "" })).status, 401, "paper readiness proxy requires a user session");
  const readinessProxy = await request("/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A");
  assert.equal(readinessProxy.status, 200, JSON.stringify(readinessProxy.body));
  assert.equal(readinessProxy.body.status, "BLOCKED");
  assert.equal(readinessProxy.body.market, "CN_A");
  assert.equal(readinessProxy.body.policyReadiness.status, "BLOCKED");
  assert.equal(readinessProxy.body.mandateReadiness.status, "BLOCKED");
  assert.equal(readinessProxy.body.riskEvaluation.status, "NOT_RUN");
  assert.equal(readinessProxy.body.resourceReservation.status, "NOT_RUN");
  assert.equal(readinessProxy.body.orderSubmissionEnabled, false);
  const usReadinessProxy = await request("/api/v1/acceptance/v2/v2.4/paper-readiness?market=US_EQUITY");
  assert.equal(usReadinessProxy.status, 200, JSON.stringify(usReadinessProxy.body));
  assert.equal(usReadinessProxy.body.market, "US_EQUITY");
  assert.equal(usReadinessProxy.body.status, "REJECTED");
  assert.equal(usReadinessProxy.body.policyReadiness.status, "REJECTED");
  assert.equal(usReadinessProxy.body.mandateReadiness.status, "REJECTED");
  assert.equal(usReadinessProxy.body.riskEvaluation.status, "NOT_RUN");
  assert.equal(usReadinessProxy.body.resourceReservation.status, "NOT_RUN");
  assert.equal(usReadinessProxy.body.orderSubmissionEnabled, false);
  const wrongExecutionIdentity = await fetch(`${executionUrl}/internal/v1/v24/paper-readiness?market=CN_A`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer forged-token" } });
  assert.equal(wrongExecutionIdentity.status, 403, "Trade Execution must reject a forged service bearer");

  const anonymous = await request("/api/v1/acceptance/v2/v2.4/runs", { cookie: null, method: "POST", body: { scenarioId: "normal" } });
  assert.equal(anonymous.status, 401);
  const foreign = await request("/api/v1/acceptance/v2/v2.4/runs", { cookie: "sq_session=foreign-owner", method: "POST", body: { scenarioId: "normal" } });
  assert.equal(foreign.status, 403);

  const results = [];
  for (const scenarioId of ["normal", "rejection", "recovery"]) {
    const accepted = await request("/api/v1/acceptance/v2/v2.4/runs", { method: "POST", body: { scenarioId, seed: 20260927 } });
    assert.equal(accepted.status, 202, JSON.stringify(accepted.body));
    assert.equal(accepted.body.status, "WAITING");
    const runId = accepted.body.testRunId;
    runIds.push(runId);
    const loaded = await request(`/api/v1/acceptance/v2/v2.4/runs/${runId}`);
    assert.equal(loaded.status, 200);
    assert.equal(loaded.body.status, "WAITING");
    assert.equal(loaded.body.scenarioId, scenarioId);
    assert.equal(loaded.body.evidence.executionGate.status, "BLOCKED");
    assert.equal(loaded.body.evidence.mandate.status, "PREPARATION_ONLY");
    assert.equal(loaded.body.evidence.source.status, "NOT_RUN");
    assert.deepEqual(loaded.body.evidence.orders, []);
    assert.deepEqual(loaded.body.evidence.fills, []);
    assert.equal(loaded.body.evidence.reconciliation.status, "NOT_RUN");
    assert.ok(loaded.body.assertions.length > 0 && loaded.body.assertions.every((item) => item.status === "WAITING"));
    const cli = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", runId, "--check-only"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_SESSION_COOKIE: `sq_session=${ownerId}` },
      timeout: 5000,
    });
    assert.equal(cli.status, 2, `same-run CLI must preserve WAITING as incomplete: ${cli.stderr}`);
    const cliResult = JSON.parse(cli.stdout);
    assert.equal(cliResult.checkOnly, true);
    assert.equal(cliResult.stageId, "V2.4");
    assert.equal(cliResult.testRunId, runId);
    assert.equal(cliResult.status, "WAITING");
    const ownerScoped = await request(`/api/v1/acceptance/v2/v2.4/runs/${runId}`, { cookie: "sq_session=foreign-owner" });
    assert.equal(ownerScoped.status, 403);
    results.push({ scenarioId, testRunId: runId, createStatus: accepted.status, readStatus: loaded.status, cliCheckOnly: cli.status, cliTestRunId: cliResult.testRunId, status: loaded.body.status });
  }

  const webE2e = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "tests/e2e/v24-live-readiness.spec.ts"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, CI: "1", STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId, STOCKQUANT_SESSION_COOKIE: `sq_session=${ownerId}` },
    timeout: 60000,
  });
  assert.equal(webE2e.status, 0, `V2.4 Web/API/CLI same-run browser check failed:\n${webE2e.stdout}\n${webE2e.stderr}\ncanaryRequests=${JSON.stringify(canaryRequests)}`);
  const ownerRuns = await pool.query("SELECT test_run_id::text,scenario_id,status FROM acceptance_stage_runs WHERE owner_id=$1 AND stage_id='V2.4' ORDER BY created_at", [ownerId]);
  assert.equal(ownerRuns.rowCount, 4, "expected three direct HTTP runs and one browser-created run");
  for (const row of ownerRuns.rows) if (!runIds.includes(row.test_run_id)) runIds.push(row.test_run_id);
  const browserRun = ownerRuns.rows.find((row) => !results.some((result) => result.testRunId === row.test_run_id));
  assert.ok(browserRun && browserRun.status === "WAITING");

  const persisted = await pool.query("SELECT test_run_id::text,stage_id,scenario_id,status,owner_id FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) ORDER BY scenario_id", [runIds]);
  assert.equal(persisted.rowCount, 4);
  assert.ok(persisted.rows.every((row) => row.stage_id === "V2.4" && row.status === "WAITING" && row.owner_id === ownerId));
  assert.deepEqual(canaryRequests, [], "acceptance runs and readiness proxy must not call unrelated services");
  const ledgerCounts = await executionPool.query(`SELECT
    (SELECT count(*)::int FROM fake_broker_orders) AS orders,
    (SELECT count(*)::int FROM fake_broker_fills) AS fills,
    (SELECT count(*)::int FROM fake_broker_order_events) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox) AS outbox`);
  assert.deepEqual(ledgerCounts.rows[0], { orders: 0, fills: 0, events: 0, outbox: 0 }, "readiness requests must leave all FakeBroker ledgers untouched");
  console.log(JSON.stringify({ status: "PASS", databases: ["platform_api_test", "trade_execution_test"], environmentMode: "PAPER", brokerMode: "FAKE", authentication: { anonymous: anonymous.status, foreignCreate: foreign.status, foreignRunRead: 403, paperReadinessAnonymous: 401, forgedServiceBearer: wrongExecutionIdentity.status }, scenarios: results, webCliSameRun: { testRunId: browserRun.test_run_id, status: browserRun.status, playwrightExitCode: webE2e.status }, paperReadinessProxy: { realTradeExecutionProcess: true, forwardedBearer: true, forwardedServiceId: true, cn: { market: readinessProxy.body.market, status: readinessProxy.body.status, orderSubmissionEnabled: readinessProxy.body.orderSubmissionEnabled }, us: { market: usReadinessProxy.body.market, status: usReadinessProxy.body.status, orderSubmissionEnabled: usReadinessProxy.body.orderSubmissionEnabled } }, persistedRows: persisted.rowCount, executionLedgerCounts: ledgerCounts.rows[0], unrelatedDownstreamRequests: canaryRequests.length, activeServicesTouched: false }));
} finally {
  await stop(api);
  await stop(execution);
  if (canary?.listening) await new Promise((resolveClose) => canary.close(resolveClose));
  const remainingOwnedRuns = await pool.query("SELECT test_run_id::text FROM acceptance_stage_runs WHERE owner_id=$1 AND stage_id='V2.4'", [ownerId]);
  for (const row of remainingOwnedRuns.rows) if (!runIds.includes(row.test_run_id)) runIds.push(row.test_run_id);
  if (runIds.length) {
    const cleanup = await pool.connect();
    try {
      await cleanup.query("BEGIN");
      await cleanup.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2 AND stage_id='V2.4'", [runIds, ownerId]);
      const remaining = await cleanup.query("SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[])", [runIds]);
      assert.equal(Number(remaining.rows[0].count), 0);
      await cleanup.query("COMMIT");
    } catch (error) { await cleanup.query("ROLLBACK"); throw error; }
    finally { cleanup.release(); }
  }
  await pool.end();
  await executionPool.end();
}
