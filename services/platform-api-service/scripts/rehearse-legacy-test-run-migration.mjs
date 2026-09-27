import assert from "node:assert/strict";
import { Pool } from "pg";
import { shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";

const databaseUrl = process.env.PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL;
if (!databaseUrl) throw new Error("PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL is required");
const target = new URL(databaseUrl);
const database = decodeURIComponent(target.pathname.slice(1));
if (!/^platform_shadow_[a-f0-9]{16,32}$/u.test(database) || target.username !== "postgres") {
  throw new Error("migration rehearsal accepts only a random platform_shadow_<hex> database via the local postgres test admin");
}

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
try {
  const source = await pool.query("SELECT count(*)::int AS total FROM test_runs");
  const statuses = await pool.query("SELECT status,count(*)::int AS count FROM test_runs GROUP BY status ORDER BY status");
  const alreadyCopied = await pool.query("SELECT count(*)::int AS total FROM acceptance_stage_runs WHERE stage_id='V1.1'");
  assert.equal(Number(alreadyCopied.rows[0].total), 0, "restored snapshot must not already contain V1.1 shadow rows");

  const first = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(first.sourceCount, Number(source.rows[0].total));
  assert.equal(first.insertedCount, Number(source.rows[0].total));
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
  console.log(JSON.stringify({ status: "PASS", databaseClass: "random isolated restored snapshot", sourceRows: first.sourceCount, insertedRows: first.insertedCount, statuses: statuses.rows, coreFieldMismatches: mapped.rows[0].core_mismatches, acceptanceHistoryMismatches: mapped.rows[0].acceptance_history_mismatches, rerunInsertedRows: second.insertedCount, sourceRowsPreserved: Number(sourceAfter.rows[0].total) === first.sourceCount }));
} finally {
  await pool.end();
}
