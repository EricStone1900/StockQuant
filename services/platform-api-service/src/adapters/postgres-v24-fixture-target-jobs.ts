import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import type { V24FixtureTargetJob, V24FixtureTargetJobInput, V24FixtureTargetJobRepository } from "../ports/v24-fixture-target-jobs.js";

type JobRow = { job_id: string; input: V24FixtureTargetJobInput; state: V24FixtureTargetJob["state"]; attempt: number; lease_owner: string | null; lease_until: Date | null; target_id: string | null };
const map = (row: JobRow): V24FixtureTargetJob => ({ jobId: row.job_id, input: row.input, state: row.state, attempt: row.attempt, leaseOwner: row.lease_owner, leaseUntil: row.lease_until?.toISOString() ?? null, targetId: row.target_id });

/** Durable work is restricted to an existing owner-scoped V2.4 candidate-binding TestRun. */
export class PostgresV24FixtureTargetJobs implements V24FixtureTargetJobRepository {
  constructor(private readonly pool: Pool) {}
  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(735401, 25)");
      await client.query(`CREATE TABLE IF NOT EXISTS v24_fixture_target_jobs (
      job_id TEXT PRIMARY KEY, test_run_id UUID NOT NULL UNIQUE REFERENCES acceptance_stage_runs(test_run_id), owner_id TEXT NOT NULL,
      input JSONB NOT NULL, state TEXT NOT NULL CHECK (state IN ('QUEUED','CLAIMED','RETRY_WAIT','COMPLETED','FAILED')),
      attempt INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_until TIMESTAMPTZ, next_attempt_at TIMESTAMPTZ,
      target_id TEXT, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (state <> 'CLAIMED' OR (lease_owner IS NOT NULL AND lease_until IS NOT NULL))
      )`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async enqueue(input: V24FixtureTargetJobInput): Promise<{ job: V24FixtureTargetJob; created: boolean }> {
    const { scope, sourceId, dataVersion, asOf, evaluatedAt } = input;
    if (!scope.ownerId.trim() || !scope.accountId.trim() || scope.namespace !== `v24-paper-v2-${scope.testRunId}` || !sourceId.startsWith("fixture:") || !dataVersion.trim() || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(asOf) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(evaluatedAt) || !Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(evaluatedAt)) || Date.parse(asOf) > Date.parse(evaluatedAt)) throw new Error("C5_FIXTURE_TARGET_JOB_INVALID");
    const jobId = `c5-fixture-target:${createHash("sha256").update(JSON.stringify([scope.ownerId, scope.accountId, scope.namespace, scope.testRunId])).digest("hex")}`;
    const created = await this.pool.query<JobRow>(`INSERT INTO v24_fixture_target_jobs(job_id,test_run_id,owner_id,input,state)
      SELECT $1,test_run_id,owner_id,$4::jsonb,'QUEUED' FROM acceptance_stage_runs
      WHERE test_run_id=$2 AND owner_id=$3 AND namespace=$5 AND stage_id='V2.4' AND scenario_id='candidate-binding' AND status IN ('RUNNING','WAITING')
      ON CONFLICT DO NOTHING RETURNING *`, [jobId, scope.testRunId, scope.ownerId, JSON.stringify(input), scope.namespace]);
    if (created.rows[0]) return { job: map(created.rows[0]), created: true };
    const existing = await this.pool.query<JobRow>("SELECT * FROM v24_fixture_target_jobs WHERE job_id=$1 AND test_run_id=$2 AND owner_id=$3", [jobId, scope.testRunId, scope.ownerId]);
    if (!existing.rows[0] || !isDeepStrictEqual(existing.rows[0].input, JSON.parse(JSON.stringify(input)))) throw new Error("C5_FIXTURE_TARGET_JOB_SCOPE_OR_INPUT_CONFLICT");
    return { job: map(existing.rows[0]), created: false };
  }
  async findForRun(testRunId: string, ownerId: string): Promise<V24FixtureTargetJob | null> {
    const result = await this.pool.query<JobRow>("SELECT * FROM v24_fixture_target_jobs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async listSetupRuns(ownerId: string): Promise<Array<{ testRunId: string; status: string; createdAt: string }>> {
    const result = await this.pool.query<{ test_run_id: string; status: string; created_at: Date }>(`SELECT test_run_id,status,created_at FROM acceptance_stage_runs
      WHERE owner_id=$1 AND stage_id='V2.4' AND scenario_id='candidate-binding' AND scenario_version='3.0.0'
      ORDER BY created_at DESC,test_run_id DESC LIMIT 50`, [ownerId]);
    return result.rows.map((row) => ({ testRunId: row.test_run_id, status: row.status, createdAt: row.created_at.toISOString() }));
  }
  async claim(workerId: string, now: Date, leaseMs: number): Promise<V24FixtureTargetJob | null> {
    if (!workerId.trim() || workerId.length > 128 || !Number.isFinite(now.getTime()) || !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000) throw new Error("C5_FIXTURE_TARGET_JOB_LEASE_INVALID");
    const matchingTarget = `t.test_run_id=job.test_run_id AND t.owner_id=job.owner_id AND t.account_id=(job.input->'scope'->>'accountId')::uuid
      AND t.namespace=job.input->'scope'->>'namespace' AND t.payload->>'clientOrderId' IS NULL AND t.payload->'decision'->>'action'='PAUSED'
      AND t.payload->'dailyBarProvenance'->>'sourceId'=job.input->>'sourceId' AND t.payload->'dailyBarProvenance'->>'dataVersion'=job.input->>'dataVersion'
      AND t.payload->'dailyBarProvenance'->>'asOf'=job.input->>'asOf' AND (t.payload->>'evaluationAt')::timestamptz=(job.input->>'evaluatedAt')::timestamptz
      AND EXISTS (SELECT 1 FROM acceptance_stage_runs r WHERE r.test_run_id=job.test_run_id AND r.owner_id=job.owner_id AND r.status IN ('RUNNING','WAITING'))`;
    const result = await this.pool.query<JobRow>(`WITH expired AS (
      UPDATE v24_fixture_target_jobs job SET
        state=CASE WHEN EXISTS (SELECT 1 FROM v24_fixture_daily_targets t WHERE ${matchingTarget}) THEN 'COMPLETED' ELSE 'FAILED' END,
        target_id=(SELECT t.target_id FROM v24_fixture_daily_targets t WHERE ${matchingTarget}),
        lease_owner=NULL,lease_until=NULL,last_error=CASE WHEN EXISTS (SELECT 1 FROM v24_fixture_daily_targets t WHERE ${matchingTarget}) THEN NULL ELSE 'LEASE_EXPIRED_AFTER_MAX_ATTEMPTS' END,updated_at=$1
      WHERE state='CLAIMED' AND lease_until<=$1 AND attempt>=3 RETURNING job_id
    ), candidate AS (
      SELECT job.job_id FROM v24_fixture_target_jobs job JOIN acceptance_stage_runs r ON r.test_run_id=job.test_run_id AND r.owner_id=job.owner_id
      WHERE r.status IN ('RUNNING','WAITING') AND job.attempt<3 AND (job.state='QUEUED' OR (job.state='RETRY_WAIT' AND job.next_attempt_at<=$1) OR (job.state='CLAIMED' AND job.lease_until<=$1))
      ORDER BY job.updated_at,job.job_id LIMIT 1 FOR UPDATE OF job SKIP LOCKED
    ) UPDATE v24_fixture_target_jobs job SET state='CLAIMED',attempt=job.attempt+1,lease_owner=$2,lease_until=$1+($3*interval '1 millisecond'),next_attempt_at=NULL,updated_at=$1
      FROM candidate WHERE job.job_id=candidate.job_id RETURNING job.*`, [now, workerId, leaseMs]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async complete(job: V24FixtureTargetJob, workerId: string, now: Date, targetId: string): Promise<void> {
    const result = await this.pool.query(`UPDATE v24_fixture_target_jobs SET state='COMPLETED',target_id=$5,lease_owner=NULL,lease_until=NULL,last_error=NULL,updated_at=$4
      WHERE job_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND attempt=$3 AND lease_until>$4
      AND EXISTS (SELECT 1 FROM acceptance_stage_runs r WHERE r.test_run_id=v24_fixture_target_jobs.test_run_id AND r.owner_id=v24_fixture_target_jobs.owner_id AND r.status IN ('RUNNING','WAITING'))
      AND EXISTS (SELECT 1 FROM v24_fixture_daily_targets t WHERE t.target_id=$5 AND t.test_run_id=v24_fixture_target_jobs.test_run_id AND t.owner_id=v24_fixture_target_jobs.owner_id
        AND t.account_id=(v24_fixture_target_jobs.input->'scope'->>'accountId')::uuid AND t.namespace=v24_fixture_target_jobs.input->'scope'->>'namespace'
        AND t.payload->>'clientOrderId' IS NULL AND t.payload->'decision'->>'action'='PAUSED'
        AND t.payload->'dailyBarProvenance'->>'sourceId'=v24_fixture_target_jobs.input->>'sourceId'
        AND t.payload->'dailyBarProvenance'->>'dataVersion'=v24_fixture_target_jobs.input->>'dataVersion'
        AND t.payload->'dailyBarProvenance'->>'asOf'=v24_fixture_target_jobs.input->>'asOf'
        AND (t.payload->>'evaluationAt')::timestamptz=(v24_fixture_target_jobs.input->>'evaluatedAt')::timestamptz)`, [job.jobId, workerId, job.attempt, now, targetId]);
    if (result.rowCount !== 1) throw new Error("C5_FIXTURE_TARGET_JOB_LEASE_OR_TARGET_INVALID");
  }
  async retry(job: V24FixtureTargetJob, workerId: string, now: Date, reason: string, delayMs: number): Promise<void> {
    if (!reason.trim() || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 300000) throw new Error("C5_FIXTURE_TARGET_JOB_RETRY_INVALID");
    const result = await this.pool.query(`UPDATE v24_fixture_target_jobs SET state=CASE WHEN attempt>=3 THEN 'FAILED' ELSE 'RETRY_WAIT' END,
      lease_owner=NULL,lease_until=NULL,next_attempt_at=CASE WHEN attempt>=3 THEN NULL ELSE $4+($5*interval '1 millisecond') END,last_error=$6,updated_at=$4
      WHERE job_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND attempt=$3 AND lease_until>$4`, [job.jobId, workerId, job.attempt, now, delayMs, reason.slice(0, 500)]);
    if (result.rowCount !== 1) throw new Error("C5_FIXTURE_TARGET_JOB_LEASE_INVALID");
  }
}
