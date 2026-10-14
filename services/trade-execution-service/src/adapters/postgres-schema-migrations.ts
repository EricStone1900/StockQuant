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
    if (latestVersion > 3) throw new Error(`Unsupported Trade Execution schema version ${latestVersion}`);
    const broker = new PostgresFakeBrokerRepository(pool);
    const policies = new PostgresSimulationExecutionPolicyRepository(pool);
    if (latestVersion === 3) {
      await client.query("COMMIT");
      return;
    }
    if (latestVersion === 2) {
      await client.query(`ALTER TABLE fake_broker_sell_receivables ALTER COLUMN settlement_date DROP NOT NULL;
        ALTER TABLE fake_broker_sell_receivables ADD COLUMN IF NOT EXISTS settlement_error_code TEXT NULL;
        ALTER TABLE fake_broker_sell_receivables DROP CONSTRAINT IF EXISTS fake_broker_sell_receivables_mapping_check;
        ALTER TABLE fake_broker_sell_receivables ADD CONSTRAINT fake_broker_sell_receivables_mapping_check CHECK (
          (settlement_date IS NOT NULL AND settlement_error_code IS NULL)
          OR (settlement_date IS NULL AND settlement_error_code='SETTLEMENT_CALENDAR_UNAVAILABLE' AND status='PENDING')
        );`);
      await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (3, 'Persist unmapped Paper SELL receivables without releasing cash')");
      await client.query("COMMIT");
      return;
    }
    if (latestVersion === 1) {
      await broker.migrate(client);
      await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (2, 'OD-014 strict settled cash and Paper sell receivables')");
      await client.query(`ALTER TABLE fake_broker_sell_receivables ALTER COLUMN settlement_date DROP NOT NULL;
        ALTER TABLE fake_broker_sell_receivables ADD COLUMN IF NOT EXISTS settlement_error_code TEXT NULL;
        ALTER TABLE fake_broker_sell_receivables DROP CONSTRAINT IF EXISTS fake_broker_sell_receivables_mapping_check;
        ALTER TABLE fake_broker_sell_receivables ADD CONSTRAINT fake_broker_sell_receivables_mapping_check CHECK (
          (settlement_date IS NOT NULL AND settlement_error_code IS NULL)
          OR (settlement_date IS NULL AND settlement_error_code='SETTLEMENT_CALENDAR_UNAVAILABLE' AND status='PENDING')
        );`);
      await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (3, 'Persist unmapped Paper SELL receivables without releasing cash')");
      await client.query("COMMIT");
      return;
    }
    await broker.migrate(client);
    await policies.migrate(client);
    await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (1, 'V1 FakeBroker orders, fills, events, outbox, and simulation policy schema')");
    await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (2, 'OD-014 strict settled cash and Paper sell receivables')");
    await client.query(`ALTER TABLE fake_broker_sell_receivables ALTER COLUMN settlement_date DROP NOT NULL;
      ALTER TABLE fake_broker_sell_receivables ADD COLUMN IF NOT EXISTS settlement_error_code TEXT NULL;
      ALTER TABLE fake_broker_sell_receivables DROP CONSTRAINT IF EXISTS fake_broker_sell_receivables_mapping_check;
      ALTER TABLE fake_broker_sell_receivables ADD CONSTRAINT fake_broker_sell_receivables_mapping_check CHECK (
        (settlement_date IS NOT NULL AND settlement_error_code IS NULL)
        OR (settlement_date IS NULL AND settlement_error_code='SETTLEMENT_CALENDAR_UNAVAILABLE' AND status='PENDING')
      );`);
    await client.query("INSERT INTO trade_execution_schema_migrations(version, description) VALUES (3, 'Persist unmapped Paper SELL receivables without releasing cash')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
