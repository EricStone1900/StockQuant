import type { Pool } from "pg";
import { initializeQuantResearchSchema } from "./postgres-schema.js";

export async function migrateQuantResearchSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:quant-research-service:schema-migrations"]);
    await client.query(`CREATE TABLE IF NOT EXISTS quant_research_schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ version: number }>("SELECT version FROM quant_research_schema_migrations ORDER BY version DESC LIMIT 1");
    const latestVersion = applied.rows[0]?.version ?? 0;
    if (latestVersion > 1) throw new Error(`Unsupported Quant Research schema version ${latestVersion}`);
    if (latestVersion === 1) {
      await client.query("COMMIT");
      return;
    }

    await initializeQuantResearchSchema(client);
    await client.query("INSERT INTO quant_research_schema_migrations(version, description) VALUES (1, 'V1.4 backtest and research persistence baseline')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
