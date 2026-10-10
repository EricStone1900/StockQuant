import type { Pool } from "pg";
import { PostgresReplayRunRepository } from "./postgres-replay-run-repository.js";

export async function migrateHistoricalReplaySchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:historical-replay-worker:schema-migrations"]);
    await client.query(`CREATE TABLE IF NOT EXISTS historical_replay_schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ version: number }>("SELECT version FROM historical_replay_schema_migrations ORDER BY version DESC LIMIT 1");
    const latestVersion = applied.rows[0]?.version ?? 0;
    if (latestVersion > 1) throw new Error(`Unsupported Historical Replay schema version ${latestVersion}`);
    if (latestVersion === 1) {
      await client.query("COMMIT");
      return;
    }

    await new PostgresReplayRunRepository(pool).initialize(client);
    await client.query("INSERT INTO historical_replay_schema_migrations(version, description) VALUES (1, 'V1 historical replay run and checkpoint schema')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
