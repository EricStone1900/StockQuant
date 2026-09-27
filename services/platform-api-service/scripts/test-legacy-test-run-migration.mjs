import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";
import { PostgresTestRunRepository } from "../dist/adapters/postgres-test-run-repository.js";
import { shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";

const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || parsed.username === "platform_api") throw new Error("legacy TestRun migration test requires platform_api_test only");
const pool = new Pool({ connectionString: databaseUrl });
const ownerId = `legacy-shadow-${randomUUID()}`;
const namespaces = ["completed", "running", "waiting", "conflict"].map((suffix) => `legacy-shadow/${ownerId}/${suffix}`);
const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const createdAt = new Date("2024-01-02T03:04:05.000Z");

try {
  await new PostgresTestRunRepository(pool).migrate();
  await new PostgresStageRunRepository(pool).migrate();
  await pool.query("BEGIN");
  await pool.query(`INSERT INTO test_runs (test_run_id,stage_id,scenario_id,scenario_version,namespace,owner_id,status,seed,account_id,error,created_at,completed_at)
    VALUES ($1,'V1.1','normal','1.0.0',$2,$3,'COMPLETED',17,$4,NULL,$5,$6),
           ($7,'V1.1','recovery','1.0.0',$8,$3,'RUNNING',19,NULL,NULL,$5,NULL),
           ($9,'V1.1','rejection','1.0.0',$10,$3,'WAITING',23,NULL,'dependency pending',$5,NULL)`,
  [ids[0], namespaces[0], ownerId, randomUUID(), createdAt, new Date("2024-01-02T03:05:05.000Z"), ids[1], namespaces[1], ids[2], namespaces[2]]);
  await pool.query(`INSERT INTO test_assertions (test_assertion_id,test_run_id,assertion_id,status,expected,actual,evidence,created_at)
    VALUES ($1,$2,'V1.1-SYNTHETIC-001','PASS','{"cash":"10.00"}'::jsonb,'{"cash":"10.00"}'::jsonb,'{"source":"fixture"}'::jsonb,$3)`, [randomUUID(), ids[0], createdAt]);
  await pool.query(`INSERT INTO acceptance_records (acceptance_record_id,test_run_id,owner_id,conclusion,note,created_at)
    VALUES ($1,$2,$3,'FAIL','retained earlier conclusion',$4),($5,$2,$3,'PASS','later signed conclusion',$6)`, [randomUUID(), ids[0], ownerId, createdAt, randomUUID(), new Date("2024-01-03T03:04:05.000Z")]);
  await pool.query("COMMIT");

  const first = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(first.sourceCount >= 3, true);
  assert.equal(first.insertedCount, 3);
  const copied = await pool.query("SELECT stage_id,scenario_id,status,seed,assertions,evidence,created_at,completed_at FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [ids[0], ownerId]);
  assert.equal(copied.rowCount, 1);
  assert.equal(copied.rows[0].created_at.toISOString(), createdAt.toISOString());
  assert.equal(copied.rows[0].completed_at.toISOString(), "2024-01-02T03:05:05.000Z");
  const assertion = copied.rows[0].assertions[0];
  assert.deepEqual({ assertionId: assertion.assertionId, status: assertion.status, expected: assertion.expected, actual: assertion.actual, evidence: assertion.evidence }, { assertionId: "V1.1-SYNTHETIC-001", status: "PASS", expected: { cash: "10.00" }, actual: { cash: "10.00" }, evidence: { source: "fixture" } });
  assert.equal(Date.parse(assertion.createdAt), createdAt.getTime());
  assert.equal(copied.rows[0].evidence.legacyAccountId !== null, true);
  assert.deepEqual(copied.rows[0].evidence.legacyAcceptanceRecords.map((record) => record.conclusion), ["FAIL", "PASS"]);
  const openStatuses = await pool.query("SELECT test_run_id,status FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) ORDER BY test_run_id", [[ids[1], ids[2]]]);
  assert.equal(openStatuses.rowCount, 2);
  assert.deepEqual(new Set(openStatuses.rows.map((row) => row.status)), new Set(["RUNNING", "WAITING"]));
  const second = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(second.sourceCount, first.sourceCount);
  assert.equal(second.insertedCount, 0);

  await pool.query("INSERT INTO test_runs (test_run_id,stage_id,scenario_id,scenario_version,namespace,owner_id,status,seed,created_at,completed_at) VALUES ($1,'V1.1','normal','1.0.0',$2,$3,'COMPLETED',29,$4,$5)", [ids[3], namespaces[3], ownerId, createdAt, new Date("2024-01-02T03:05:05.000Z")]);
  await pool.query("INSERT INTO acceptance_stage_runs (test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence,created_at,completed_at) VALUES ($1,'V1.1','recovery','1.0.0',$2,$3,'FAILED',999,'[]'::jsonb,'{}'::jsonb,$4,NULL)", [ids[3], ownerId, namespaces[3], createdAt]);
  await assert.rejects(shadowMigrateLegacyTestRuns(pool), /conflicting records/u);
  const conflictCount = await pool.query("SELECT count(*)::int AS count FROM acceptance_stage_runs WHERE test_run_id=$1", [ids[3]]);
  assert.equal(conflictCount.rows[0].count, 1);
  console.log(JSON.stringify({ status: "PASS", syntheticRows: 4, completedHistory: "assertions + two acceptance records + timestamps preserved", openStatuses: ["RUNNING", "WAITING"], rerun: "idempotent", conflictingId: "transaction rolled back; no overwrite" }));
} finally {
  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [ids, ownerId]);
    await pool.query("DELETE FROM acceptance_records WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [ids, ownerId]);
    await pool.query("DELETE FROM test_assertions WHERE test_run_id=ANY($1::uuid[])", [ids]);
    await pool.query("DELETE FROM test_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2 AND namespace=ANY($3::text[])", [ids, ownerId, namespaces]);
    const remaining = await pool.query("SELECT (SELECT count(*) FROM test_runs WHERE test_run_id=ANY($1::uuid[])) + (SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[])) AS count", [ids]);
    assert.equal(Number(remaining.rows[0].count), 0);
    await pool.query("COMMIT");
  } catch (error) { await pool.query("ROLLBACK"); throw error; }
  await pool.end();
}
