import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export type StoredStageRun = {
  testRunId: string; stageId: string; scenarioId: string; scenarioVersion: string; ownerId: string;
  namespace: string; status: string; seed: number; assertions: unknown[]; evidence: Record<string, unknown>;
  createdAt: string; completedAt: string | null;
};

export class PostgresStageRunRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS acceptance_stage_runs (
        test_run_id UUID PRIMARY KEY, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL,
        scenario_version TEXT NOT NULL, owner_id TEXT NOT NULL, namespace TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','WAITING','COMPLETED','FAILED','CANCELLED')),
        seed INTEGER NOT NULL, assertions JSONB NOT NULL, evidence JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS acceptance_stage_runs_owner_idx ON acceptance_stage_runs(owner_id, test_run_id);
    `);
  }

  async save(run: Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace?: string }): Promise<StoredStageRun> {
    const namespace = run.namespace ?? `${run.stageId.toLowerCase().replace(".", "-")}-${run.scenarioId}-${run.testRunId}`;
    const result = await this.pool.query(`
      INSERT INTO acceptance_stage_runs (test_run_id, stage_id, scenario_id, scenario_version, owner_id, namespace, status, seed, assertions, evidence, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,CASE WHEN $7 IN ('COMPLETED','FAILED','CANCELLED') THEN now() END)
      ON CONFLICT (test_run_id) DO UPDATE SET status=EXCLUDED.status, assertions=EXCLUDED.assertions, evidence=EXCLUDED.evidence,
        completed_at=CASE WHEN EXCLUDED.status IN ('COMPLETED','FAILED','CANCELLED') THEN now() ELSE acceptance_stage_runs.completed_at END
      RETURNING *`, [run.testRunId, run.stageId, run.scenarioId, run.scenarioVersion, run.ownerId, namespace, run.status, run.seed, JSON.stringify(run.assertions), JSON.stringify(run.evidence)]);
    return this.row(result.rows[0]);
  }

  async find(testRunId: string, ownerId: string): Promise<StoredStageRun | null> {
    const result = await this.pool.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    return result.rowCount === 1 ? this.row(result.rows[0]) : null;
  }

  newId() { return randomUUID(); }
  private row(row: Record<string, any>): StoredStageRun { return { testRunId: row.test_run_id, stageId: row.stage_id, scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, ownerId: row.owner_id, namespace: row.namespace, status: row.status, seed: row.seed, assertions: row.assertions, evidence: row.evidence, createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null }; }
}
