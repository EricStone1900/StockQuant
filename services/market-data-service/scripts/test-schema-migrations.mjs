import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrateMarketDataSchema } from "../dist/adapters/postgres-schema-migrations.js";
import { AlertOutboxRepository } from "../dist/adapters/postgres-alert-outbox-repository.js";
import { ArtifactDeliveryRepository } from "../dist/adapters/postgres-artifact-delivery-repository.js";
import { CollectionRunRepository } from "../dist/adapters/postgres-collection-run-repository.js";
import { CollectionScheduleRepository } from "../dist/adapters/postgres-collection-schedule-repository.js";
import { CoverageRepository } from "../dist/adapters/postgres-coverage-repository.js";
import { MinuteImportRepository } from "../dist/adapters/postgres-minute-import-repository.js";
import { MinuteUploadRepository } from "../dist/adapters/postgres-minute-upload-repository.js";
import { ProjectAccessRepository } from "../dist/adapters/postgres-project-access-repository.js";

const pool = new Pool({ connectionString: process.env.MARKET_DATA_TEST_DATABASE_URL ?? "postgresql://market_data@127.0.0.1:5433/market_data_test" });
try {
  const legacyRepositories = [
    new CollectionRunRepository(pool), new CollectionScheduleRepository(pool), new CoverageRepository(pool),
    new ArtifactDeliveryRepository(pool), new MinuteImportRepository(pool), new MinuteUploadRepository(pool),
    new AlertOutboxRepository(pool), new ProjectAccessRepository(pool)
  ];
  for (const repository of legacyRepositories) await repository.migrate();
  await pool.query(`INSERT INTO market_data_collection_runs
    (run_id, subscription_id, subscription_version, window_start, window_end, job_kind, idempotency_key, request_hash, status)
    VALUES ('11111111-1111-4111-8111-111111111111','legacy-v1',1,'2026-09-01T01:00:00Z','2026-09-01T02:00:00Z','INTRADAY_WINDOW','legacy-v1-key',$1,'COMPLETED')`, ["a".repeat(64)]);
  await Promise.all([migrateMarketDataSchema(pool), migrateMarketDataSchema(pool)]);
  const versions = await pool.query("SELECT version, description FROM market_data_schema_migrations ORDER BY version");
  assert.deepEqual(versions.rows, [{ version: 1, description: "V1.2 Market Data collection, fixture, artifact and project baseline" }]);
  const schemas = await pool.query("SELECT to_regclass('market_data_collection_runs') AS runs, to_regclass('market_data_minute_imports') AS imports, to_regclass('market_data_projects') AS projects");
  assert.deepEqual(schemas.rows[0], { runs: "market_data_collection_runs", imports: "market_data_minute_imports", projects: "market_data_projects" });
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM market_data_collection_runs WHERE subscription_id='legacy-v1'")).rows[0].count, 1, "existing pre-ledger Market Data rows must survive the baseline adoption");

  await migrateMarketDataSchema(pool);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM market_data_schema_migrations")).rows[0].count, 1, "repeat startup must preserve the single V1 baseline");
  await pool.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (2, 'future schema')");
  await assert.rejects(migrateMarketDataSchema(pool), /Unsupported Market Data schema version 2/);
  console.log(JSON.stringify({ status: "PASS", migrationLedger: "market_data_schema_migrations", concurrentStarts: 2, repeatStartup: "idempotent", unknownVersion: "rejected", componentSchemas: "present", legacyRow: "preserved" }));
} finally {
  await pool.end();
}
