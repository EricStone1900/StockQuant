import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrateQuantResearchSchema } from "../dist/adapters/postgres-schema-migrations.js";

const pool = new Pool({ connectionString: process.env.QUANT_RESEARCH_TEST_DATABASE_URL ?? "postgresql://quant_research@127.0.0.1:5433/quant_research_test" });
try {
  await Promise.all([migrateQuantResearchSchema(pool), migrateQuantResearchSchema(pool)]);
  const first = await pool.query("SELECT version, description FROM quant_research_schema_migrations ORDER BY version");
  assert.deepEqual(first.rows, [{ version: 1, description: "V1.4 backtest and research persistence baseline" }]);
  assert.equal((await pool.query("SELECT to_regclass('research_backtest_runs') AS relation")).rows[0].relation, "research_backtest_runs");

  await migrateQuantResearchSchema(pool);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM quant_research_schema_migrations")).rows[0].count, 1, "repeat startup must preserve the single V1 baseline");

  await pool.query("INSERT INTO quant_research_schema_migrations(version, description) VALUES (2, 'future schema')");
  await assert.rejects(migrateQuantResearchSchema(pool), /Unsupported Quant Research schema version 2/);
  console.log(JSON.stringify({ status: "PASS", migrationLedger: "quant_research_schema_migrations", concurrentStarts: 2, repeatStartup: "idempotent", unknownVersion: "rejected" }));
} finally {
  await pool.end();
}
