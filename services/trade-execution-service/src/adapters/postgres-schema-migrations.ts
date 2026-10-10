import type { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "./postgres-fake-broker-repository.js";
import { PostgresSimulationExecutionPolicyRepository } from "./postgres-simulation-execution-policy-repository.js";

export async function migrateTradeExecutionSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:trade-execution-service:schema-migrations"]);
    await client.query(`CREATE TABLE IF NOT EXISTS trade_execution_schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ version: number }>("SELECT version FROM trade_execution_schema_migrations ORDER BY version DESC LIMIT 1");
    const latestVersion = applied.rows[0]?.version ?? 0;
    if (latestVersion > 1) throw new Error(`Unsupported Trade Execution schema version ${latestVersion}`);
    if (latestVersion === 1) {
      await client.query("COMMIT");
      return;
    }

    const broker = new PostgresFakeBrokerRepository(pool);
    const policies = new PostgresSimulationExecutionPolicyRepository(pool);
    await broker.migrate(client);
    await policies.migrate(client);
    await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (1, 'V1 FakeBroker orders, fills, events, outbox, and simulation policy schema')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
