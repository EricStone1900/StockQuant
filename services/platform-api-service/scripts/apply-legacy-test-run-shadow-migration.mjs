import assert from "node:assert/strict";
import { Pool } from "pg";
import { assertLegacyTestRunShadowParity, shadowMigrateLegacyTestRuns } from "../dist/adapters/postgres-legacy-test-run-migration.js";
import { assertNoLegacyNonterminalRows, expectedLegacyShadowInsertCount } from "../dist/application/v11-legacy-migration-preflight.js";

if (process.argv.length !== 3 || process.argv[2] !== "--apply") {
  throw new Error("refusing to write: pass the explicit --apply flag after reviewing the active-database preflight");
}
const databaseUrl = process.env.PLATFORM_API_LEGACY_MIGRATION_DATABASE_URL;
if (!databaseUrl) throw new Error("PLATFORM_API_LEGACY_MIGRATION_DATABASE_URL is required");
const target = new URL(databaseUrl);
if (decodeURIComponent(target.pathname.slice(1)) !== "platform_api" || target.hostname !== "127.0.0.1" || target.port !== "5433" || target.username !== "postgres") {
  throw new Error("this migration entrypoint only accepts the local Platform API database through its test-admin endpoint");
}

const pool = new Pool({ connectionString: databaseUrl, max: 2, connectionTimeoutMillis: 5_000 });
try {
  const nonterminal = await pool.query(`SELECT count(*)::int AS count FROM test_runs
    WHERE status IN ('QUEUED','RUNNING','WAITING')`);
  assertNoLegacyNonterminalRows(Number(nonterminal.rows[0].count));
  const existing = await pool.query("SELECT count(*)::int AS count FROM acceptance_stage_runs WHERE stage_id='V1.1'");
  const source = await pool.query("SELECT count(*)::int AS count FROM test_runs");
  const statuses = await pool.query("SELECT status,count(*)::int AS count FROM test_runs GROUP BY status ORDER BY status");
  const expectedInsertedRows = expectedLegacyShadowInsertCount({ sourceRows: Number(source.rows[0].count), shadowRows: Number(existing.rows[0].count) });

  const first = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(first.sourceCount, Number(source.rows[0].count));
  assert.equal(first.insertedCount, expectedInsertedRows);
  const parity = await assertLegacyTestRunShadowParity(pool);
  assert.equal(parity.sourceCount, parity.targetCount);
  const second = await shadowMigrateLegacyTestRuns(pool);
  assert.equal(second.sourceCount, first.sourceCount);
  assert.equal(second.insertedCount, 0);
  const targetCount = await pool.query("SELECT count(*)::int AS count FROM acceptance_stage_runs WHERE stage_id='V1.1'");
  assert.equal(Number(targetCount.rows[0].count), first.sourceCount);
  const sourceAfter = await pool.query("SELECT count(*)::int AS count FROM test_runs");
  assert.equal(Number(sourceAfter.rows[0].count), first.sourceCount);
  console.log(JSON.stringify({ status: "PASS", sourceRows: first.sourceCount, rowsAlreadyCopied: Number(existing.rows[0].count), copiedRows: first.insertedCount, targetRows: Number(targetCount.rows[0].count), sourceRowsPreserved: true, repeatInsertedRows: second.insertedCount, sourceStatuses: statuses.rows, nonterminalRows: Number(nonterminal.rows[0].count) }));
} finally {
  await pool.end();
}
