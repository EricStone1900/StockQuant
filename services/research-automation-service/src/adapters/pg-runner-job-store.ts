import type { Pool, PoolClient } from "pg";
import type { RunnerJobCursor, RunnerJobRecord, RunnerJobStore } from "../application/v31-runner-jobs.js";
import { validateLeasedRunnerOutputPublication } from "../application/v31-runner-output.js";

type Row = { job_id: string; job: RunnerJobRecord["job"]; status: RunnerJobRecord["status"]; submitted_at: Date; started_at: Date | null; completed_at: Date | null; execution: RunnerJobRecord["execution"]; artifact_refs: RunnerJobRecord["artifacts"]; attempt: number; retry_of: string | null; lease_owner: string | null; lease_expires_at: Date | null; fencing_token: number };

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
  lease: row.lease_owner && row.lease_expires_at ? { workerId: row.lease_owner, expiresAt: row.lease_expires_at.toISOString(), fencingToken: Number(row.fencing_token) } : null,
});

export class PgRunnerJobStore implements RunnerJobStore {
  constructor(private readonly pool: Pool) {}

  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_runner_jobs (
      job_id TEXT PRIMARY KEY,
      job JSONB NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','TIMED_OUT','OUTPUT_LIMIT','SPAWN_FAILED','CANCELLED')),
      submitted_at TIMESTAMPTZ NOT NULL,
      started_at TIMESTAMPTZ NULL,
      completed_at TIMESTAMPTZ NULL,
      execution JSONB NULL,
      artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
      attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
      retry_of TEXT NULL,
      lease_owner TEXT NULL,
      lease_expires_at TIMESTAMPTZ NULL,
      fencing_token INTEGER NOT NULL DEFAULT 0
    )`);
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS artifact_refs JSONB NOT NULL DEFAULT '[]'::jsonb");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS attempt INTEGER NOT NULL DEFAULT 1");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS retry_of TEXT NULL");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS lease_owner TEXT NULL");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ NULL");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD COLUMN IF NOT EXISTS fencing_token INTEGER NOT NULL DEFAULT 0");
    await this.pool.query("ALTER TABLE research_runner_jobs DROP CONSTRAINT IF EXISTS research_runner_jobs_status_check");
    await this.pool.query("ALTER TABLE research_runner_jobs ADD CONSTRAINT research_runner_jobs_status_check CHECK (status IN ('QUEUED','RUNNING','COMPLETED','FAILED','TIMED_OUT','OUTPUT_LIMIT','SPAWN_FAILED','CANCELLED'))");
    await this.pool.query("CREATE INDEX IF NOT EXISTS research_runner_jobs_test_run_submitted_idx ON research_runner_jobs ((job->>'testRunId'), submitted_at, job_id)");
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

  async listForTestRun(testRunId: string, offset: number, limit: number): Promise<RunnerJobRecord[]> {
    const result = await this.pool.query<Row>(`SELECT * FROM research_runner_jobs
      WHERE job->>'testRunId'=$1 ORDER BY submitted_at, job_id OFFSET $2 LIMIT $3`, [testRunId, offset, limit]);
    return result.rows.map(mapRow);
  }

  async listAfterTestRun(testRunId: string, after: RunnerJobCursor | null, limit: number): Promise<RunnerJobRecord[]> {
    const result = after
      ? await this.pool.query<Row>(`SELECT * FROM research_runner_jobs
          WHERE job->>'testRunId'=$1 AND (submitted_at,job_id)>($2::timestamptz,$3::text)
          ORDER BY submitted_at,job_id LIMIT $4`, [testRunId, after.submittedAt, after.jobId, limit])
      : await this.pool.query<Row>(`SELECT * FROM research_runner_jobs
          WHERE job->>'testRunId'=$1 ORDER BY submitted_at,job_id LIMIT $2`, [testRunId, limit]);
    return result.rows.map(mapRow);
  }

  async claim(workerId: string, now: Date, leaseMs: number, testRunId?: string): Promise<RunnerJobRecord | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // V3.1 freezes Runner concurrency at one. This transaction-scoped lock makes
      // the limit hold across multiple host processes and TestRun scopes.
      await client.query("SELECT pg_advisory_xact_lock(hashtext('stockquant:runner-job-global-capacity-v1'))");
      const active = await client.query<{ count: string }>("SELECT count(*)::text AS count FROM research_runner_jobs WHERE status='RUNNING' AND lease_expires_at>$1", [now]);
      if (Number(active.rows[0]?.count ?? 0) >= 1) {
        await client.query("COMMIT");
        return null;
      }
      const result = await client.query<Row>(`WITH candidate AS (
        SELECT job_id FROM research_runner_jobs
        WHERE (status='QUEUED' OR (status='RUNNING' AND (lease_expires_at IS NULL OR lease_expires_at <= $2))) AND ($4::text IS NULL OR job->>'testRunId'=$4)
        ORDER BY submitted_at, job_id FOR UPDATE SKIP LOCKED LIMIT 1
      ) UPDATE research_runner_jobs j SET status='RUNNING', started_at=COALESCE(j.started_at,$2), lease_owner=$1,
        lease_expires_at=$2 + ($3 * INTERVAL '1 millisecond'), fencing_token=j.fencing_token+1
        FROM candidate c WHERE j.job_id=c.job_id RETURNING j.*`, [workerId, now, leaseMs, testRunId ?? null]);
      await client.query("COMMIT");
      return result.rows[0] ? mapRow(result.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async heartbeat(jobId: string, workerId: string, fencingToken: number, now: Date, leaseMs: number): Promise<RunnerJobRecord | null> {
    const result = await this.pool.query<Row>(`UPDATE research_runner_jobs SET lease_expires_at=$5 + ($4 * INTERVAL '1 millisecond')
      WHERE job_id=$1 AND status='RUNNING' AND lease_owner=$2 AND fencing_token=$3 AND lease_expires_at>$5 RETURNING *`, [jobId, workerId, fencingToken, leaseMs, now]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async complete(jobId: string, workerId: string, fencingToken: number, now: Date, execution: RunnerJobRecord["execution"] & {}, artifacts: RunnerJobRecord["artifacts"]): Promise<RunnerJobRecord | null> {
    const result = await this.pool.query<Row>(`UPDATE research_runner_jobs AS j SET status=$5, completed_at=$4, execution=$6,
      artifact_refs=j.artifact_refs || COALESCE((
        SELECT jsonb_agg(new_ref.value) FROM jsonb_array_elements($7::jsonb) AS new_ref(value)
        WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(j.artifact_refs) AS old_ref(value)
          WHERE old_ref.value->>'namespace'=new_ref.value->>'namespace' AND old_ref.value->>'artifactId'=new_ref.value->>'artifactId')
      ), '[]'::jsonb), lease_owner=NULL, lease_expires_at=NULL
      WHERE j.job_id=$1 AND j.status='RUNNING' AND j.lease_owner=$2 AND j.fencing_token=$3 AND j.lease_expires_at>$4 RETURNING j.*`, [jobId, workerId, fencingToken, now, execution.status, execution, JSON.stringify(artifacts)]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  /** Serialize output publication against cancellation and lease takeover. The callback must persist
   * the immutable ArtifactRef using this transaction client before it returns. */
  async publishOutputArtifact<T>(input: {
    jobId: string;
    workerId: string;
    fencingToken: number;
    now: Date;
    artifact: RunnerJobRecord["artifacts"][number];
    persist: (client: PoolClient) => Promise<T>;
  }): Promise<{ published: false } | { published: true; value: T }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const active = await client.query<Row>(`SELECT * FROM research_runner_jobs
        WHERE job_id=$1 AND status='RUNNING' AND lease_owner=$2 AND fencing_token=$3 AND lease_expires_at>$4
        FOR UPDATE`, [input.jobId, input.workerId, input.fencingToken, input.now]);
      if (!active.rows[0]) {
        await client.query("ROLLBACK");
        return { published: false };
      }
      validateLeasedRunnerOutputPublication({ record: mapRow(active.rows[0]), jobId: input.jobId, workerId: input.workerId, fencingToken: input.fencingToken, now: input.now, ref: input.artifact });
      const value = await input.persist(client);
      const updated = await client.query(`UPDATE research_runner_jobs SET artifact_refs=
        CASE WHEN EXISTS (SELECT 1 FROM jsonb_array_elements(artifact_refs) existing WHERE existing->>'namespace'=$5 AND existing->>'artifactId'=$6)
          THEN artifact_refs ELSE artifact_refs || jsonb_build_array($7::jsonb) END
        WHERE job_id=$1 AND status='RUNNING' AND lease_owner=$2 AND fencing_token=$3 AND lease_expires_at>$4`,
      [input.jobId, input.workerId, input.fencingToken, input.now, input.artifact.namespace, input.artifact.artifactId, JSON.stringify({ ...input.artifact, status: "PUBLISHED" })]);
      if (updated.rowCount !== 1) throw new Error("runner output publication lost its lease before commit");
      await client.query("COMMIT");
      return { published: true, value };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async cancel(jobId: string, now: Date): Promise<RunnerJobRecord | null> {
    const result = await this.pool.query<Row>(`UPDATE research_runner_jobs SET status='CANCELLED', completed_at=$2, execution=NULL, lease_owner=NULL, lease_expires_at=NULL
      WHERE job_id=$1 AND status IN ('QUEUED','RUNNING') RETURNING *`, [jobId, now]);
    if (result.rows[0]) return mapRow(result.rows[0]);
    const current = await this.get(jobId);
    return current?.status === "CANCELLED" ? current : null;
  }
}
