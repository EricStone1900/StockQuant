import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";
import { PostgresTestRunRepository } from "../dist/adapters/postgres-test-run-repository.js";
import { shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";

const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || parsed.username !== "platform_api_test") throw new Error("V1.1 unified HTTP smoke requires platform_api_test only");
const pool = new Pool({ connectionString: databaseUrl });
const ownerId = "acceptance-owner-1";
let testRunId;
const serviceDirectory = fileURLToPath(new URL("..", import.meta.url));
const legacy = new PostgresTestRunRepository(pool, "legacy");
const unified = new PostgresTestRunRepository(pool, "stage");
let server;
let output = "";
let baseUrl;
async function stop() {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([new Promise((done) => server.once("exit", done)), delay(3000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
}

try {
  await legacy.migrate();
  await new PostgresStageRunRepository(pool).migrate();
  await shadowMigrateLegacyTestRuns(pool);
  const run = await unified.create(ownerId, "normal", 20260926);
  testRunId = run.testRunId;
  await unified.replaceAssertions(testRunId, [{ assertionId: "V1.1-HTTP-UNIFIED-001", status: "PASS", expected: "stage-first", actual: "stage-first", evidence: { source: "acceptance_stage_runs" } }]);
  await unified.updateStatus(testRunId, "COMPLETED");
  await unified.assertStorageReady();

  const listener = createServer();
  const port = await new Promise((resolvePort, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const value = listener.address().port;
      listener.close((error) => error ? reject(error) : resolvePort(value));
    });
  });
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve(serviceDirectory, "dist/main.js")], {
    cwd: serviceDirectory,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: "/tmp",
      NODE_ENV: "test",
      STOCKQUANT_LIVE_TRADING_ENABLED: "false",
      STOCKQUANT_BROKER_MODE: "FAKE",
      STOCKQUANT_V11_RUN_STORAGE: "stage",
      STOCKQUANT_DATABASE_URL: databaseUrl,
      STOCKQUANT_BIND_HOST: "127.0.0.1",
      STOCKQUANT_PORT: String(port),
      STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "false",
      STOCKQUANT_V24_AUTO_START: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (chunk) => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); });
  let live = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Platform API exited during stage-store startup: ${output}`);
    try { if ((await fetch(`${baseUrl}/live`)).ok) { live = true; break; } } catch { /* startup */ }
    await delay(100);
  }
  assert.equal(live, true, `Platform API stage-store startup failed: ${output}`);

  const headers = { cookie: `sq_session=${ownerId}` };
  const runResponse = await fetch(`${baseUrl}/api/v1/acceptance/runs/${testRunId}`, { headers });
  const runText = await runResponse.text();
  assert.equal(runResponse.status, 200, runText);
  const body = JSON.parse(runText);
  assert.equal(body.status, "COMPLETED");
  assert.equal(body.assertions.length, 1);
  assert.equal(body.assertions[0].assertionId, "V1.1-HTTP-UNIFIED-001");

  const evidenceResponse = await fetch(`${baseUrl}/api/v1/acceptance/runs/${testRunId}/evidence`, { headers });
  assert.equal(evidenceResponse.status, 200);
  const evidence = await evidenceResponse.json();
  assert.equal(evidence.run.status, "COMPLETED");
  assert.equal(evidence.assertions[0].evidence.source, "acceptance_stage_runs");
  const denied = await fetch(`${baseUrl}/api/v1/acceptance/runs/${testRunId}`, { headers: { cookie: "sq_session=foreign-owner" } });
  assert.equal(denied.status, 403);
  console.log(JSON.stringify({ status: "PASS", storageMode: "stage", startupParityGate: "PASS", ownerScopedRunRead: runResponse.status, evidenceRead: evidenceResponse.status, foreignSession: denied.status, runStatus: body.status, assertions: body.assertions.length }));
} finally {
  await stop();
  if (testRunId) {
    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
      await pool.query("DELETE FROM acceptance_records WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
      await pool.query("DELETE FROM test_assertions WHERE test_run_id=$1", [testRunId]);
      await pool.query("DELETE FROM test_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
      const remaining = await pool.query("SELECT (SELECT count(*) FROM test_runs WHERE test_run_id=$1) + (SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=$1) AS count", [testRunId]);
      assert.equal(Number(remaining.rows[0].count), 0);
      await pool.query("COMMIT");
    } catch (error) { await pool.query("ROLLBACK"); throw error; }
  }
  await pool.end();
}
