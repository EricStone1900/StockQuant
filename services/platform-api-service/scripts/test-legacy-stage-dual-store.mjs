import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";
import { PostgresTestRunRepository } from "../dist/adapters/postgres-test-run-repository.js";
import { shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";

const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || parsed.username !== "platform_api_test") throw new Error("V1.1 dual-store test requires platform_api_test only");
const pool = new Pool({ connectionString: databaseUrl });
const ownerId = `v11-dual-store-${randomUUID()}`;
const created = [];
const scenarios = ["normal", "rejection"];
const accountId = randomUUID();
const legacy = new PostgresTestRunRepository(pool, "legacy");
const unified = new PostgresTestRunRepository(pool, "stage");
try {
  await legacy.migrate();
  await new PostgresStageRunRepository(pool).migrate();
  await shadowMigrateLegacyTestRuns(pool);
  await unified.assertStorageReady();

  const run = await unified.create(ownerId, scenarios[0], 20260926);
  created.push(run.testRunId);
  assert.equal(run.status, "QUEUED");
  assert.deepEqual(await unified.find(run.testRunId, "another-owner"), null);
  const sourceCreated = await pool.query("SELECT stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,created_at FROM test_runs WHERE test_run_id=$1", [run.testRunId]);
  const stageCreated = await pool.query("SELECT stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,created_at FROM acceptance_stage_runs WHERE test_run_id=$1", [run.testRunId]);
  assert.deepEqual(stageCreated.rows[0], sourceCreated.rows[0], "dual create preserves identity and full-precision database timestamp");

  await unified.updateStatus(run.testRunId, "WAITING", accountId, null);
  const waiting = await unified.find(run.testRunId, ownerId);
  assert.equal(waiting?.status, "WAITING");
  assert.equal(waiting?.accountId, accountId);
  const assertions = [
    { assertionId: "V1.1-DUAL-001", status: "PASS", expected: { count: 1 }, actual: { count: 1 }, evidence: { durable: true } },
    { assertionId: "V1.1-DUAL-002", status: "WAITING", expected: "restart", actual: "pending", evidence: { recovery: true } }
  ];
  await unified.replaceAssertions(run.testRunId, assertions);
  assert.deepEqual(await unified.assertions(run.testRunId), assertions);
  await unified.updateStatus(run.testRunId, "COMPLETED", accountId, null);
  assert.equal((await unified.find(run.testRunId, ownerId))?.status, "COMPLETED");
  await unified.assertStorageReady();

  const rollbackRun = await unified.create(ownerId, scenarios[1], 20260927);
  created.push(rollbackRun.testRunId);
  await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1", [rollbackRun.testRunId]);
  await assert.rejects(unified.updateStatus(rollbackRun.testRunId, "RUNNING"), /unified V1.1 TestRun is missing/u);
  const rolledBack = await pool.query("SELECT status FROM test_runs WHERE test_run_id=$1", [rollbackRun.testRunId]);
  assert.equal(rolledBack.rows[0].status, "QUEUED", "legacy write rolls back atomically when the unified write fails");
  await assert.rejects(unified.assertStorageReady(), /unified TestRun store is not ready/u);
  console.log(JSON.stringify({ status: "PASS", dualCreate: true, stageFirstOwnerScopedRead: true, statusAndAssertionDualWrite: true, fullPrecisionTimestamp: true, migrationParity: "PASS", missingTargetFailsClosed: true, partialWriteRolledBack: true }));
} finally {
  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [created, ownerId]);
    await pool.query("DELETE FROM acceptance_records WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [created, ownerId]);
    await pool.query("DELETE FROM test_assertions WHERE test_run_id=ANY($1::uuid[])", [created]);
    await pool.query("DELETE FROM test_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [created, ownerId]);
    const remaining = await pool.query("SELECT (SELECT count(*) FROM test_runs WHERE test_run_id=ANY($1::uuid[])) + (SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[])) AS count", [created]);
    assert.equal(Number(remaining.rows[0].count), 0);
    await pool.query("COMMIT");
  } catch (error) { await pool.query("ROLLBACK"); throw error; }
  await pool.end();
}
