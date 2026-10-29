import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import type { V24LocalAuthorizationJob, V24LocalAuthorizationJobInput, V24LocalAuthorizationJobRepository } from "../ports/v24-local-authorization-jobs.js";

type Row = { job_id: string; input: V24LocalAuthorizationJobInput; state: V24LocalAuthorizationJob["state"]; attempt: number; lease_owner: string | null; lease_until: Date | null; result: Record<string, unknown> | null; last_error: string | null };
const map = (row: Row): V24LocalAuthorizationJob => ({ jobId: row.job_id, input: row.input, state: row.state, attempt: row.attempt, leaseOwner: row.lease_owner, leaseUntil: row.lease_until?.toISOString() ?? null, result: row.result, ...(row.last_error ? { lastError: row.last_error } : {}) });

/** Independent durable queue for the C5 local chain; it never shares candidate-binding jobs. */
export class PostgresV24LocalAuthorizationJobs implements V24LocalAuthorizationJobRepository {
  constructor(private readonly pool: Pool) {}
  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(735401, 29)");
      await client.query(`CREATE TABLE IF NOT EXISTS v24_local_authorization_jobs (
        job_id TEXT PRIMARY KEY, test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id),
        owner_id TEXT NOT NULL, account_id UUID NOT NULL, namespace TEXT NOT NULL, session_date DATE NOT NULL,
        input JSONB NOT NULL, state TEXT NOT NULL CHECK(state IN ('QUEUED','CLAIMED','RETRY_WAIT','COMPLETED','FAILED')),
        attempt INTEGER NOT NULL DEFAULT 0 CHECK(attempt BETWEEN 0 AND 3), lease_owner TEXT, lease_until TIMESTAMPTZ,
        next_attempt_at TIMESTAMPTZ, result JSONB, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(test_run_id,session_date), CHECK(state <> 'CLAIMED' OR (lease_owner IS NOT NULL AND lease_until IS NOT NULL))
      )`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async enqueue(input: V24LocalAuthorizationJobInput): Promise<{ job: V24LocalAuthorizationJob; created: boolean }> {
    if (!input.ownerId.trim() || input.namespace !== `v24-paper-v2-${input.testRunId}` || !/^\d{4}-\d{2}-\d{2}$/u.test(input.sessionDate) || !/^[a-f0-9]{64}$/u.test(input.mandateContentHash) || !Number.isInteger(input.mandateVersion) || input.mandateVersion < 1 || !Number.isFinite(Date.parse(input.evaluatedAt))) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_INPUT_INVALID");
    const id = `c5-local-auth:${createHash("sha256").update(JSON.stringify([input.testRunId,input.sessionDate])).digest("hex")}`;
    const inserted = await this.pool.query<Row>(`INSERT INTO v24_local_authorization_jobs(job_id,test_run_id,owner_id,account_id,namespace,session_date,input,state)
      SELECT $1,test_run_id,owner_id,$5::uuid,$4,$6,$7::jsonb,'QUEUED' FROM acceptance_stage_runs
      WHERE test_run_id=$2 AND owner_id=$3 AND namespace=$4 AND evidence->>'accountId'=$5::text AND stage_id='V2.4' AND scenario_id='c5-local-engineering' AND scenario_version='1.0.0' AND status IN ('RUNNING','WAITING')
      ON CONFLICT DO NOTHING RETURNING *`, [id,input.testRunId,input.ownerId,input.namespace,input.accountId,input.sessionDate,JSON.stringify(input)]);
    if (inserted.rows[0]) return { job: map(inserted.rows[0]), created: true };
    const existing = await this.pool.query<Row>("SELECT * FROM v24_local_authorization_jobs WHERE job_id=$1 AND test_run_id=$2 AND owner_id=$3", [id,input.testRunId,input.ownerId]);
    if (!existing.rows[0] || !isDeepStrictEqual(existing.rows[0].input,JSON.parse(JSON.stringify(input)))) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_SCOPE_OR_INPUT_CONFLICT");
    return { job: map(existing.rows[0]), created: false };
  }
  async find(testRunId: string, ownerId: string, sessionDate: string): Promise<V24LocalAuthorizationJob | null> {
    const result = await this.pool.query<Row>("SELECT * FROM v24_local_authorization_jobs WHERE test_run_id=$1 AND owner_id=$2 AND session_date=$3",[testRunId,ownerId,sessionDate]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async claim(workerId: string, now: Date, leaseMs: number): Promise<V24LocalAuthorizationJob | null> {
    if (!workerId.trim() || !Number.isFinite(now.getTime()) || !Number.isInteger(leaseMs) || leaseMs < 1000 || leaseMs > 300000) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_LEASE_INVALID");
    const result = await this.pool.query<Row>(`WITH expired AS (
      UPDATE v24_local_authorization_jobs SET state='FAILED',lease_owner=NULL,lease_until=NULL,last_error='LEASE_EXPIRED_AFTER_MAX_ATTEMPTS',updated_at=$1
      WHERE state='CLAIMED' AND lease_until<=$1 AND attempt>=3 RETURNING job_id
    ), candidate AS (
      SELECT j.job_id FROM v24_local_authorization_jobs j JOIN acceptance_stage_runs r ON r.test_run_id=j.test_run_id AND r.owner_id=j.owner_id AND r.namespace=j.namespace
      WHERE r.status IN ('RUNNING','WAITING') AND j.attempt<3 AND
       (j.state='QUEUED' OR (j.state='RETRY_WAIT' AND j.next_attempt_at<=$1) OR (j.state='CLAIMED' AND j.lease_until<=$1))
      ORDER BY j.updated_at,j.job_id LIMIT 1 FOR UPDATE OF j SKIP LOCKED
    ) UPDATE v24_local_authorization_jobs j SET state='CLAIMED',attempt=j.attempt+1,lease_owner=$2,lease_until=$1+($3*interval '1 millisecond'),next_attempt_at=NULL,updated_at=$1
      FROM candidate WHERE j.job_id=candidate.job_id RETURNING j.*`,[now,workerId,leaseMs]);
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async complete(job: V24LocalAuthorizationJob, workerId: string, now: Date, result: Record<string, unknown>): Promise<void> {
    const saved = await this.pool.query("UPDATE v24_local_authorization_jobs SET state='COMPLETED',result=$5::jsonb,lease_owner=NULL,lease_until=NULL,last_error=NULL,updated_at=$4 WHERE job_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND attempt=$3 AND lease_until>$4",[job.jobId,workerId,job.attempt,now,JSON.stringify(result)]);
    if (saved.rowCount !== 1) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_LEASE_INVALID");
  }
  async retry(job: V24LocalAuthorizationJob, workerId: string, now: Date, reason: string, delayMs: number): Promise<void> {
    if (!reason.trim() || !Number.isInteger(delayMs) || delayMs < 0 || delayMs > 300000) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_RETRY_INVALID");
    const saved = await this.pool.query("UPDATE v24_local_authorization_jobs SET state=CASE WHEN attempt>=3 THEN 'FAILED' ELSE 'RETRY_WAIT' END,lease_owner=NULL,lease_until=NULL,next_attempt_at=CASE WHEN attempt>=3 THEN NULL ELSE $4+($5*interval '1 millisecond') END,last_error=$6,updated_at=$4 WHERE job_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND attempt=$3 AND lease_until>$4",[job.jobId,workerId,job.attempt,now,delayMs,reason.slice(0,500)]);
    if (saved.rowCount !== 1) throw new Error("C5_LOCAL_AUTHORIZATION_JOB_LEASE_INVALID");
  }
}
