import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import type { V24DailyTarget, V24DailyTargetRepository, V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";

/** Immutable intended targets only. Broker orders, budgets and fills remain domain-owned. */
export class PostgresV24DailyTargetRepository implements V24DailyTargetRepository {
  constructor(private readonly pool: Pool) {}
  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(735401, 24)");
      await client.query(`CREATE TABLE IF NOT EXISTS v24_fixture_daily_targets (
        target_id TEXT PRIMARY KEY, test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id),
        owner_id TEXT NOT NULL, account_id UUID NOT NULL, namespace TEXT NOT NULL,
        session_date DATE NOT NULL, strategy_sha256 TEXT NOT NULL CHECK (strategy_sha256 ~ '^[a-f0-9]{64}$'),
        payload JSONB NOT NULL CHECK (payload->>'dataMode' = 'FIXTURE'),
        UNIQUE(test_run_id)
      )`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async save(target: V24DailyTarget): Promise<{ target: V24DailyTarget; created: boolean }> {
    if (target.dataMode !== "FIXTURE") throw new Error("C5_DAILY_TARGET_FIXTURE_REQUIRED");
    const result = await this.pool.query(`INSERT INTO v24_fixture_daily_targets(target_id,test_run_id,owner_id,account_id,namespace,session_date,strategy_sha256,payload)
      SELECT $1,$2,$3,$4,$5,$6,$7,$8::jsonb FROM acceptance_stage_runs
      WHERE test_run_id=$2 AND owner_id=$3 AND namespace=$5 AND stage_id='V2.4'
      ON CONFLICT DO NOTHING RETURNING payload`, [target.targetId, target.testRunId, target.ownerId, target.accountId, target.namespace, target.sessionDate, target.strategySha256, JSON.stringify(target)]);
    if (result.rows[0]) return { target: result.rows[0].payload as V24DailyTarget, created: true };
    const existing = await this.find(target, target.targetId);
    if (!existing) throw new Error("C5_DAILY_TARGET_SCOPE_OR_IDENTITY_CONFLICT");
    if (!isDeepStrictEqual(existing, JSON.parse(JSON.stringify(target)))) throw new Error("C5_DAILY_TARGET_IMMUTABLE_CONFLICT");
    return { target: existing, created: false };
  }
  async find(scope: V24DailyTargetScope, targetId: string): Promise<V24DailyTarget | null> {
    const result = await this.pool.query(`SELECT t.payload FROM v24_fixture_daily_targets t
      JOIN acceptance_stage_runs r ON r.test_run_id=t.test_run_id AND r.owner_id=t.owner_id AND r.namespace=t.namespace AND r.stage_id='V2.4'
      WHERE t.target_id=$1 AND t.test_run_id=$2 AND t.owner_id=$3 AND t.account_id=$4 AND t.namespace=$5`, [targetId, scope.testRunId, scope.ownerId, scope.accountId, scope.namespace]);
    return result.rows[0]?.payload as V24DailyTarget ?? null;
  }
}
