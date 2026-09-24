import type { Pool } from "pg";
import type { RunnerJobRecord, RunnerJobStore } from "../application/v31-runner-jobs.js";

type Row = { job_id: string; job: RunnerJobRecord["job"]; status: RunnerJobRecord["status"]; submitted_at: Date; started_at: Date | null; completed_at: Date | null; execution: RunnerJobRecord["execution"]; artifact_refs: RunnerJobRecord["artifacts"]; attempt: number; retry_of: string | null };

const mapRow = (row: Row): RunnerJobRecord => ({
  jobId: row.job_id,
  job: row.job,
  status: row.status,
  submittedAt: row.submitted_at.toISOString(),
  startedAt: row.started_at?.toISOString() ?? null,
  completedAt: row.completed_at?.toISOString() ?? null,
  execution: row.execution,
  artifacts: Array.isArray(row.artifact_refs) ? row.artifact_refs : [],
  attempt: Number(row.attempt),
  retryOf: row.retry_of,
});

export class PgRunnerJobStore implements RunnerJobStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_runner_jobs (
      job_id TEXT PRIMARY KEY,
      job JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','TIMED_OUT','OUTPUT_LIMIT','SPAWN_FAILED')),
      submitted_at TIMESTAMPTZ NOT NULL,
      started_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      execution JSONB NULL,
      artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
      attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
      retry_of TEXT NULL
    )`);
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS retry_of TEXT NULL");
  }

  async save(record: RunnerJobRecord): Promise<RunnerJobRecord> {
    const result = await this.pool.query<Row>(`INSERT INTO research_runner_jobs(job_id,job,status,submitted_at,started_at,completed_at,execution,artifact_refs,attempt,retry_of)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(job_id) DO UPDATE SET job=EXCLUDED.job,status=EXCLUDED.status,submitted_at=EXCLUDED.submitted_at,started_at=EXCLUDED.started_at,completed_at=EXCLUDED.completed_at,execution=EXCLUDED.execution,artifact_refs=EXCLUDED.artifact_refs,attempt=EXCLUDED.attempt,retry_of=EXCLUDED.retry_of
      RETURNING *`, [record.jobId, record.job, record.status, record.submittedAt, record.startedAt, record.completedAt, record.execution, JSON.stringify(record.artifacts), record.attempt, record.retryOf]);
    return mapRow(result.rows[0]);
  }

  async get(jobId: string): Promise<RunnerJobRecord | null> {
    const result = await this.pool.query<Row>("SELECT * FROM research_runner_jobs WHERE job_id=$1", [jobId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
}
