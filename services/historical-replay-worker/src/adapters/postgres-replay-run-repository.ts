import { Pool } from "pg";
import type { ReplayRunRepository, ReplayRunRecord } from "../ports/replay-run-repository.js";
import { assertTransition, type ReplayStatus } from "../domain/lifecycle.js";

export class ReplayRunConflict extends Error {
  constructor(message: string) { super(message); this.name = "ReplayConflict"; }
}

export class PostgresReplayRunRepository implements ReplayRunRepository {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS replay_worker_runs (
      test_run_id UUID PRIMARY KEY, namespace TEXT NOT NULL UNIQUE, owner_id TEXT NOT NULL, scenario_id TEXT NOT NULL, request_hash CHAR(64),
      status TEXT NOT NULL CHECK (status IN ('RUNNING','PAUSED','COMPLETED','FAILED','CANCELLED')), checkpoint JSONB NOT NULL, result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
    )`);
    await this.pool.query("ALTER TABLE replay_worker_runs DROP CONSTRAINT IF EXISTS replay_worker_runs_status_check");
    await this.pool.query("ALTER TABLE replay_worker_runs ADD CONSTRAINT replay_worker_runs_status_check CHECK (status IN ('RUNNING','PAUSED','COMPLETED','FAILED','CANCELLED'))");
    await this.pool.query("ALTER TABLE replay_worker_runs ADD COLUMN IF NOT EXISTS request_hash CHAR(64)");
  }

  async ready(): Promise<void> { await this.pool.query("SELECT 1"); }

  async withRunLock<T>(testRunId: string, operation: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    const lock = await client.query<{ locked: boolean }>("SELECT pg_try_advisory_lock(hashtext($1)) AS locked", [testRunId]);
    if (!lock.rows[0]?.locked) { client.release(); throw new ReplayRunConflict("replay run is already executing"); }
    try { return await operation(); } finally { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [testRunId]).catch(() => undefined); client.release(); }
  }

  async find(testRunId: string): Promise<ReplayRunRecord | null> {
    const found = await this.pool.query<any>(`SELECT test_run_id AS "testRunId", namespace, owner_id AS "ownerId", scenario_id AS "scenarioId", status, request_hash AS "requestHash", checkpoint, result, created_at AS "createdAt", completed_at AS "completedAt" FROM replay_worker_runs WHERE test_run_id=$1`, [testRunId]);
    return found.rows[0] ?? null;
  }

  async insert(input: Pick<ReplayRunRecord, "testRunId" | "namespace" | "ownerId" | "scenarioId" | "requestHash" | "checkpoint">, ignoreConflict = false): Promise<void> {
    await this.pool.query(`INSERT INTO replay_worker_runs (test_run_id,namespace,owner_id,scenario_id,request_hash,status,checkpoint) VALUES ($1,$2,$3,$4,$5,'RUNNING',$6::jsonb)${ignoreConflict ? " ON CONFLICT (test_run_id) DO NOTHING" : ""}`, [input.testRunId,input.namespace,input.ownerId,input.scenarioId,input.requestHash,JSON.stringify(input.checkpoint)]);
  }

  async markRunning(testRunId: string, requestHash: string): Promise<void> {
    await this.pool.query("UPDATE replay_worker_runs SET status='RUNNING', request_hash=COALESCE(request_hash,$2) WHERE test_run_id=$1 AND status IN ('PAUSED','FAILED')", [testRunId, requestHash]);
  }

  async setStatus(testRunId: string, status: ReplayStatus): Promise<void> {
    const current = await this.pool.query<{ status: ReplayStatus }>("SELECT status FROM replay_worker_runs WHERE test_run_id=$1", [testRunId]);
    if (current.rowCount !== 1) throw new Error("replay run was not found");
    assertTransition(current.rows[0].status, status);
    await this.pool.query("UPDATE replay_worker_runs SET status=$2, completed_at=CASE WHEN $2 IN ('COMPLETED','FAILED','CANCELLED') THEN now() ELSE completed_at END WHERE test_run_id=$1", [testRunId, status]);
  }

  async saveCheckpoint(testRunId: string, checkpoint: unknown, result: unknown): Promise<void> {
    await this.pool.query("UPDATE replay_worker_runs SET checkpoint=$2::jsonb, result=$3::jsonb WHERE test_run_id=$1", [testRunId, JSON.stringify(checkpoint), JSON.stringify(result)]);
  }
  async complete(testRunId: string, result: unknown): Promise<void> { await this.pool.query("UPDATE replay_worker_runs SET status='COMPLETED', result=$2::jsonb, completed_at=now() WHERE test_run_id=$1", [testRunId, JSON.stringify(result)]); }
  async fail(testRunId: string): Promise<void> { await this.pool.query("UPDATE replay_worker_runs SET status='FAILED', completed_at=now() WHERE test_run_id=$1", [testRunId]); }
  async saveResult(testRunId: string, result: unknown): Promise<void> { await this.pool.query("UPDATE replay_worker_runs SET result=$2::jsonb, status='COMPLETED', completed_at=now() WHERE test_run_id=$1", [testRunId, JSON.stringify(result)]); }
}
