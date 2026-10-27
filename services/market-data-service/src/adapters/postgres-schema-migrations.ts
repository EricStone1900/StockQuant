import type { Pool, PoolClient } from "pg";
import { AlertOutboxRepository } from "./postgres-alert-outbox-repository.js";
import { ArtifactDeliveryRepository } from "./postgres-artifact-delivery-repository.js";
import { CollectionRunRepository } from "./postgres-collection-run-repository.js";
import { CollectionScheduleRepository } from "./postgres-collection-schedule-repository.js";
import { CoverageRepository } from "./postgres-coverage-repository.js";
import { MinuteImportRepository } from "./postgres-minute-import-repository.js";
import { MinuteUploadRepository } from "./postgres-minute-upload-repository.js";
import { ProjectAccessRepository } from "./postgres-project-access-repository.js";
import { PostgresWatchlistRepository } from "./postgres-watchlist-repository.js";
import { PostgresSamplingSettingsRepository } from "./postgres-sampling-settings-repository.js";
import { PostgresNewsRevisionRepository } from "./postgres-news-revision-repository.js";
import { PostgresSnapshotSamplingRepository } from "./postgres-snapshot-sampling-repository.js";
import { PostgresSamplingPolicyRepository } from "./postgres-sampling-policy-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "./postgres-sampling-task-lifecycle-repository.js";
import { PostgresDailyBarCompletionRepository } from "./postgres-daily-bar-completion-repository.js";

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
    if (latestVersion > 19) throw new Error(`Unsupported Market Data schema version ${latestVersion}`);
    if (latestVersion >= 14) {
      await client.query("COMMIT");
      return;
    }
    if (latestVersion === 13) {
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }
    if (latestVersion === 12) {
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 11) {
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 10) {
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 9) {
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 8) {
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 7) {
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 6) {
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 5) {
      await new PostgresSnapshotSamplingRepository(pool).migrateFixtureResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 4) {
      await new PostgresSnapshotSamplingRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (5, 'Durable V2.1 snapshot sampling tasks')");
      await new PostgresSnapshotSamplingRepository(pool).migrateFixtureResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 3) {
      await new PostgresNewsRevisionRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (4, 'Stable-source news revision ledger')");
      await new PostgresSnapshotSamplingRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (5, 'Durable V2.1 snapshot sampling tasks')");
      await new PostgresSnapshotSamplingRepository(pool).migrateFixtureResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 2) {
      await new PostgresSamplingSettingsRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (3, 'Persistent V2.1 sampling interval configuration')");
      await new PostgresNewsRevisionRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (4, 'Stable-source news revision ledger')");
      await new PostgresSnapshotSamplingRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (5, 'Durable V2.1 snapshot sampling tasks')");
      await new PostgresSnapshotSamplingRepository(pool).migrateFixtureResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
      await client.query("COMMIT");
      return;
    }

    if (latestVersion === 1) {
      await new PostgresWatchlistRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (2, 'Owner/account/TestRun scoped online watchlists')");
      await new PostgresSamplingSettingsRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (3, 'Persistent V2.1 sampling interval configuration')");
      await new PostgresNewsRevisionRepository(pool).migrate(client satisfies PoolClient);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (4, 'Stable-source news revision ledger')");
      await new PostgresSnapshotSamplingRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (5, 'Durable V2.1 snapshot sampling tasks')");
      await new PostgresSnapshotSamplingRepository(pool).migrateFixtureResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
      await new PostgresSamplingPolicyRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
      await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
      await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
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
      new ProjectAccessRepository(pool),
      new PostgresWatchlistRepository(pool),
      new PostgresSamplingSettingsRepository(pool),
      new PostgresNewsRevisionRepository(pool),
      new PostgresSnapshotSamplingRepository(pool),
      new PostgresSamplingPolicyRepository(pool)
    ];
    for (const repository of repositories) await repository.migrate(client satisfies PoolClient);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (1, 'V1.2 Market Data collection, fixture, artifact and project baseline')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (2, 'Owner/account/TestRun scoped online watchlists')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (3, 'Persistent V2.1 sampling interval configuration')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (4, 'Stable-source news revision ledger')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (5, 'Durable V2.1 snapshot sampling tasks')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (6, 'V2.1 immutable Fixture sampling results')");
    await new PostgresSnapshotSamplingRepository(pool).migrateTaskIdentity(client);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (7, 'Mode-scoped immutable V2.1 sampling task identities')");
    await new PostgresSnapshotSamplingRepository(pool).migrateTaskScope(client);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (8, 'Owner/account/TestRun scoped V2.1 sampling tasks')");
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (9, 'Independent V2.1 sampling schedule policy records')");
    await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (10, 'Durable V2.1 sampling task leases, bounded retries and outcomes')");
    await new PostgresSnapshotSamplingRepository(pool).migratePendingTaskStatuses(client);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (11, 'Queued V2.1 sampling task execution states')");
    await new PostgresSnapshotSamplingRepository(pool).migrateObservationProvenance(client);
    await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (12, 'V2.1 snapshot source and freshness provenance')");
      await new PostgresSnapshotSamplingRepository(pool).migrateTaskSourceIdentity(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (13, 'Source-scoped V2.1 sampling task identities')");
      await new PostgresSnapshotSamplingRepository(pool).migrateRealResults(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (14, 'V2.1 authorized REAL snapshot result persistence')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/** V2.1 DAILY_BAR persistence is an additive post-migration so historic migration branches remain stable. */
export async function migrateDailyBarCompletionSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:market-data-service:schema-migrations"]);
    const latest = await client.query<{ version: number }>("SELECT version FROM market_data_schema_migrations ORDER BY version DESC LIMIT 1");
    const version = latest.rows[0]?.version ?? 0;
    if (version > 19) throw new Error(`Unsupported Market Data schema version ${version}`);
    if (version < 15) {
      await new PostgresDailyBarCompletionRepository(pool).migrate(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (15, 'V2.1 durable independent DAILY_BAR completion tasks and results')");
    }
    if (version < 16) {
      await new PostgresDailyBarCompletionRepository(pool).migrateJobs(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (16, 'V2.1 durable DAILY_BAR completion worker queue, leases and retries')");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

/** Adds the opt-in scoped DAILY_BAR close scheduler after the v17 Monitor Outbox migration. */
export async function migrateDailyBarCloseSchedulerSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:market-data-service:schema-migrations"]);
    const latest = await client.query<{ version: number }>("SELECT version FROM market_data_schema_migrations ORDER BY version DESC LIMIT 1");
    const version = latest.rows[0]?.version ?? 0;
    if (version > 19) throw new Error(`Unsupported Market Data schema version ${version}`);
    if (version < 17) throw new Error(`DAILY_BAR close scheduler requires schema v17; found ${version}`);
    if (version < 18) {
      await new PostgresDailyBarCompletionRepository(pool).migrateJobs(client);
      await client.query(`UPDATE market_data_sampling_policies SET policy_version=policy_version+1,
        policy_json=jsonb_set(jsonb_set(policy_json,'{executor}','"CONFIGURED"'::jsonb),'{activationGate}','"DATA_READY"'::jsonb),updated_at=now()
        WHERE policy_id='dailyBarCompletion' AND policy_json->>'executor'='NOT_IMPLEMENTED'`);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (18, 'V2.1 opt-in after-close DAILY_BAR schedule registration')");
    }
    if (version < 19) {
      await new PostgresDailyBarCompletionRepository(pool).migrateRealJobs(client);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (19, 'Independent REAL DAILY_BAR source request jobs; nullable Fixture references')");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

/** Adds the transactional quote-available consumer outbox after DAILY_BAR's v16 migration. */
export async function migrateMonitorConsumerOutboxSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:market-data-service:schema-migrations"]);
    const latest = await client.query<{ version: number }>("SELECT version FROM market_data_schema_migrations ORDER BY version DESC LIMIT 1");
    const version = latest.rows[0]?.version ?? 0;
    if (version > 19) throw new Error(`Unsupported Market Data schema version ${version}`);
    if (version < 17) {
      await new PostgresSamplingTaskLifecycleRepository(pool).migrate(client);
      await client.query(`UPDATE market_data_sampling_policies SET policy_version=policy_version+1,
        policy_json=jsonb_set(policy_json,'{executor}','"CONFIGURED"'::jsonb),updated_at=now()
        WHERE policy_id='monitorEvaluation' AND policy_json->>'executor'='NOT_IMPLEMENTED'`);
      await client.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (17, 'Transactional V2.1 quote-available Monitor consumer outbox')");
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
