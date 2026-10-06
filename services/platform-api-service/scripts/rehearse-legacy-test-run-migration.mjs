import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";
import { PostgresTestRunRepository } from "../dist/adapters/postgres-test-run-repository.js";
import { expectedLegacyShadowInsertCount } from "../dist/application/v11-legacy-migration-preflight.js";

const databaseUrl = process.env.PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL;
if (!databaseUrl) throw new Error("PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL is required");
const target = new URL(databaseUrl);
const database = decodeURIComponent(target.pathname.slice(1));
if (!/^platform_shadow_[a-f0-9]{16,32}$/u.test(database) || target.username !== "postgres") {
  throw new Error("migration rehearsal accepts only a random platform_shadow_<hex> database via the local postgres test admin");
}

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
const ownerId = `v11-migration-rehearsal-${randomUUID()}`;
const createdRunIds = [];
try {
  const source = await pool.query("SELECT count(*)::int AS total FROM test_runs");
  const statuses = await pool.query("SELECT status,count(*)::int AS count FROM test_runs GROUP BY status ORDER BY status");
  const alreadyCopied = await pool.query("SELECT count(*)::int AS total FROM acceptance_stage_runs WHERE stage_id='V1.1'");
  const expectedInsertCount = expectedLegacyShadowInsertCount({ sourceRows: Number(source.rows[0].total), shadowRows: Number(alreadyCopied.rows[0].total) });
  const first = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(first.sourceCount, Number(source.rows[0].total));
  const copiedBefore = Number(alreadyCopied.rows[0].total);
  assert.equal(first.insertedCount, expectedInsertCount);
  const mapped = await pool.query(`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE s.status IS DISTINCT FROM r.status OR s.seed IS DISTINCT FROM r.seed
        OR s.created_at IS DISTINCT FROM r.created_at OR s.completed_at IS DISTINCT FROM r.completed_at)::int AS core_mismatches,
      count(*) FILTER (WHERE jsonb_array_length(s.evidence->'legacyAcceptanceRecords') <>
        (SELECT count(*) FROM acceptance_records a WHERE a.test_run_id=r.test_run_id))::int AS acceptance_history_mismatches
    FROM test_runs r JOIN acceptance_stage_runs s USING (test_run_id)`);
  assert.equal(Number(mapped.rows[0].total), Number(source.rows[0].total));
  assert.equal(Number(mapped.rows[0].core_mismatches), 0);
  assert.equal(Number(mapped.rows[0].acceptance_history_mismatches), 0);

  const second = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(second.sourceCount, first.sourceCount);
  assert.equal(second.insertedCount, 0, "second pass must be idempotent");
  const sourceAfter = await pool.query("SELECT count(*)::int AS total FROM test_runs WHERE stage_id='V1.1'");
  assert.equal(Number(sourceAfter.rows[0].total), Number(source.rows[0].total), "legacy source rows must remain unchanged");

  const stage = new PostgresTestRunRepository(pool, "stage");
  await stage.assertStorageReady();
  const newRun = await stage.create(ownerId, "normal", 20261001);
  createdRunIds.push(newRun.testRunId);
  await stage.updateStatus(newRun.testRunId, "WAITING", null, "migration rehearsal");
  const stageRun = await stage.find(newRun.testRunId, ownerId);
  assert.equal(stageRun?.status, "WAITING");
  assert.equal(await stage.find(newRun.testRunId, "different-owner"), null);
  const legacyRun = await pool.query("SELECT status,error FROM test_runs WHERE test_run_id=$1 AND owner_id=$2", [newRun.testRunId, ownerId]);
  assert.deepEqual(legacyRun.rows[0], { status: "WAITING", error: "migration rehearsal" });
  await stage.assertStorageReady();

  const migrationMode = copiedBefore === 0 ? "first-copy snapshot" : copiedBefore === first.sourceCount ? "already-migrated snapshot" : "partial-shadow snapshot";
  console.log(JSON.stringify({ status: "PASS", databaseClass: "random isolated restored snapshot", migrationMode, sourceRows: first.sourceCount, rowsAlreadyCopied: copiedBefore, insertedRows: first.insertedCount, statuses: statuses.rows, coreFieldMismatches: mapped.rows[0].core_mismatches, acceptanceHistoryMismatches: mapped.rows[0].acceptance_history_mismatches, rerunInsertedRows: second.insertedCount, sourceRowsPreserved: Number(sourceAfter.rows[0].total) === first.sourceCount, stageModeOwnerScopedRead: true, newRunDualWrite: true, parityAfterDualWrite: true }));
} finally {
  if (createdRunIds.length > 0) {
    await pool.query("BEGIN");
    try {
      await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [createdRunIds, ownerId]);
      await pool.query("DELETE FROM acceptance_records WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [createdRunIds, ownerId]);
      await pool.query("DELETE FROM test_assertions WHERE test_run_id=ANY($1::uuid[])", [createdRunIds]);
      await pool.query("DELETE FROM test_runs WHERE test_run_id=ANY($1::uuid[]) AND owner_id=$2", [createdRunIds, ownerId]);
      const remaining = await pool.query("SELECT (SELECT count(*) FROM test_runs WHERE test_run_id=ANY($1::uuid[])) + (SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=ANY($1::uuid[])) AS count", [createdRunIds]);
      assert.equal(Number(remaining.rows[0].count), 0, "rehearsal TestRun rows must be removed from both stores");
      await pool.query("COMMIT");
    } catch (error) { await pool.query("ROLLBACK"); throw error; }
  }
  await pool.end();
}
