import type { Pool } from "pg";
import { migrateAutoMandates } from "./postgres-auto-mandate-repository.js";
import { migrateExecutionAuthorizations } from "./postgres-execution-authorization-repository.js";
import { migrateProposals } from "./postgres-proposal-repository.js";
import { migrateStrategySnapshots } from "./postgres-strategy-snapshot-repository.js";

export async function migrateDecisionGovernanceSchema(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:decision-governance-service:schema-migrations"]);
    await client.query(`CREATE TABLE IF NOT EXISTS decision_governance_schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    const applied = await client.query<{ version: number }>("SELECT version FROM decision_governance_schema_migrations ORDER BY version DESC LIMIT 1");
    const latestVersion = applied.rows[0]?.version ?? 0;
    if (latestVersion > 1) throw new Error(`Unsupported Decision Governance schema version ${latestVersion}`);
    if (latestVersion === 1) {
      await client.query("COMMIT");
      return;
    }

    // Adopt the existing idempotent schema initializers as one atomic V1 baseline.
    // A failed statement rolls back both DDL and the migration record.
    await migrateExecutionAuthorizations(client);
    await migrateProposals(client);
    await migrateAutoMandates(client);
    await migrateStrategySnapshots(client);
    await client.query("INSERT INTO decision_governance_schema_migrations(version, description) VALUES (1, 'V1 execution authorization, proposal, mandate, and strategy snapshot schema')");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
