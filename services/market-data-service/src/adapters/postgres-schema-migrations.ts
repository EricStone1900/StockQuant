import type { Pool, PoolClient } from "pg";
import { AlertOutboxRepository } from "./postgres-alert-outbox-repository.js";
import { ArtifactDeliveryRepository } from "./postgres-artifact-delivery-repository.js";
import { CollectionRunRepository } from "./postgres-collection-run-repository.js";
import { CollectionScheduleRepository } from "./postgres-collection-schedule-repository.js";
import { CoverageRepository } from "./postgres-coverage-repository.js";
import { MinuteImportRepository } from "./postgres-minute-import-repository.js";
import { MinuteUploadRepository } from "./postgres-minute-upload-repository.js";
import { ProjectAccessRepository } from "./postgres-project-access-repository.js";

export async function migrateMarketDataSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:market-data-service:schema-migrations"]);
    await client.query(`CREATE TABLE IF NOT EXISTS market_data_schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ version: number }>("SELECT version FROM market_data_schema_migrations ORDER BY version DESC LIMIT 1");
    const latestVersion = applied.rows[0]?.version ?? 0;
    if (latestVersion > 1) throw new Error(`Unsupported Market Data schema version ${latestVersion}`);
    if (latestVersion === 1) {
      await client.query("COMMIT");
      return;
    }

    const repositories = [
      new CollectionRunRepository(pool),
      new CollectionScheduleRepository(pool),
      new CoverageRepository(pool),
      new ArtifactDeliveryRepository(pool),
      new MinuteImportRepository(pool),
      new MinuteUploadRepository(pool),
      new AlertOutboxRepository(pool),
      new ProjectAccessRepository(pool)
    ];
    for (const repository of repositories) await repository.migrate(client satisfies PoolClient);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (1, 'V1.2 Market Data collection, fixture, artifact and project baseline')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
