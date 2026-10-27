import type { Pool, PoolClient } from "pg";

export type SamplingTaskRunState = "QUEUED" | "CLAIMED" | "RETRY_WAIT" | "BLOCKED_SOURCE_AUTHORIZATION" | "COMPLETED" | "FAILED";
export type SamplingTaskRun = { taskId: string; state: SamplingTaskRunState; attempt: number; maxAttempts: number; leaseOwner: string | null; leaseUntil: string | null; nextAttemptAt: string | null; lastError: string | null; updatedAt: string };
type RunRow = { task_id: string; state: SamplingTaskRunState; attempt: number; max_attempts: number; lease_owner: string | null; lease_until: Date | null; next_attempt_at: Date | null; last_error: string | null; updated_at: Date };

export class PostgresSamplingTaskLifecycleRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_sampling_task_runs (
      task_id TEXT PRIMARY KEY REFERENCES market_data_snapshot_sampling_tasks(task_id) ON DELETE CASCADE ON UPDATE CASCADE,
      state TEXT NOT NULL CHECK (state IN ('QUEUED','CLAIMED','RETRY_WAIT','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED','FAILED')),
      attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
      lease_owner TEXT,
      lease_until TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK ((state = 'CLAIMED' AND lease_owner IS NOT NULL AND lease_until IS NOT NULL) OR state <> 'CLAIMED')
    )`);
    await queryable.query("CREATE INDEX IF NOT EXISTS market_data_sampling_task_runs_claim_idx ON market_data_sampling_task_runs(state, next_attempt_at, lease_until, updated_at)");
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_consumer_outbox (
      event_id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES market_data_snapshot_sampling_tasks(task_id) ON DELETE CASCADE,
      consumer TEXT NOT NULL CHECK (consumer IN ('monitorEvaluation')),
      payload JSONB NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('PENDING','CLAIMED','DELIVERED')) DEFAULT 'PENDING',
      attempt INTEGER NOT NULL DEFAULT 0,
      lease_owner TEXT,
      lease_until TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(task_id,consumer),
      CHECK ((state='CLAIMED' AND lease_owner IS NOT NULL AND lease_until IS NOT NULL) OR state<>'CLAIMED')
    )`);
    await queryable.query("CREATE INDEX IF NOT EXISTS market_data_consumer_outbox_claim_idx ON market_data_consumer_outbox(state,next_attempt_at,lease_until,created_at)");
  }

  async enqueue(taskId: string, maxAttempts = 3): Promise<SamplingTaskRun> {
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error("INVALID_SAMPLING_TASK_MAX_ATTEMPTS");
    await this.pool.query("INSERT INTO market_data_sampling_task_runs(task_id,state,max_attempts) VALUES($1,'QUEUED',$2) ON CONFLICT(task_id) DO NOTHING", [taskId, maxAttempts]);
    const row = await this.read(taskId);
    if (!row) throw new Error("SAMPLING_TASK_RUN_ENQUEUE_READ_FAILED");
    if (row.maxAttempts !== maxAttempts) throw new Error("SAMPLING_TASK_RUN_IDEMPOTENCY_CONFLICT");
    return row;
  }

  async claim(workerId: string, now: Date, leaseMs: number): Promise<SamplingTaskRun | null> {
    if (!workerId.trim() || workerId.length > 128 || !Number.isFinite(now.getTime()) || !Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) throw new Error("INVALID_SAMPLING_TASK_LEASE");
    const result = await this.pool.query<RunRow>(`WITH exhausted AS (
      UPDATE market_data_sampling_task_runs AS run
      SET state='FAILED',lease_owner=NULL,lease_until=NULL,next_attempt_at=NULL,
          last_error='LEASE_EXPIRED_AFTER_MAX_ATTEMPTS',updated_at=$1
      WHERE state='CLAIMED' AND lease_until <= $1 AND attempt >= max_attempts
        AND NOT EXISTS (SELECT 1 FROM market_data_snapshot_sampling_tasks task
          WHERE task.task_id=run.task_id AND task.status IN ('COMPLETED_FIXTURE','COMPLETED_REAL'))
      RETURNING task_id
    ), failed_tasks AS (
      UPDATE market_data_snapshot_sampling_tasks SET status='FAILED'
      WHERE task_id IN (SELECT task_id FROM exhausted) AND status='QUEUED'
    ), candidate AS (
      SELECT task_id FROM market_data_sampling_task_runs
      WHERE (attempt < max_attempts AND (
        state = 'QUEUED' OR (state = 'RETRY_WAIT' AND next_attempt_at <= $1) OR (state = 'CLAIMED' AND lease_until <= $1)
      )) OR (state='CLAIMED' AND lease_until <= $1 AND EXISTS (
        SELECT 1 FROM market_data_snapshot_sampling_tasks task WHERE task.task_id=market_data_sampling_task_runs.task_id
          AND task.status IN ('COMPLETED_FIXTURE','COMPLETED_REAL')
      )) ORDER BY updated_at, task_id LIMIT 1 FOR UPDATE SKIP LOCKED
    ) UPDATE market_data_sampling_task_runs AS run
      SET state='CLAIMED', attempt=LEAST(run.attempt+1,run.max_attempts), lease_owner=$2,
          lease_until=$1 + ($3 * interval '1 millisecond'), next_attempt_at=NULL, updated_at=$1
      FROM candidate WHERE run.task_id=candidate.task_id
      RETURNING run.task_id,run.state,run.attempt,run.max_attempts,run.lease_owner,run.lease_until,run.next_attempt_at,run.last_error,run.updated_at`, [now, workerId, leaseMs]);
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }

  async retry(taskId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<SamplingTaskRun> {
    if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 300_000 || !reason.trim()) throw new Error("INVALID_SAMPLING_TASK_RETRY");
    const result = await this.pool.query<RunRow>(`UPDATE market_data_sampling_task_runs
      SET state=CASE WHEN attempt >= max_attempts THEN 'FAILED' ELSE 'RETRY_WAIT' END,
          lease_owner=NULL, lease_until=NULL,
          next_attempt_at=CASE WHEN attempt >= max_attempts THEN NULL ELSE $3 + ($4 * interval '1 millisecond') END,
          last_error=$5, updated_at=$3
      WHERE task_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND lease_until > $3
      RETURNING task_id,state,attempt,max_attempts,lease_owner,lease_until,next_attempt_at,last_error,updated_at`, [taskId, workerId, now, delayMs, reason.slice(0, 1000)]);
    if (!result.rows[0]) throw new Error("SAMPLING_TASK_LEASE_NOT_OWNED");
    return mapRun(result.rows[0]);
  }

  async finish(taskId: string, workerId: string, now: Date, state: "BLOCKED_SOURCE_AUTHORIZATION" | "COMPLETED", reason: string | null = null): Promise<SamplingTaskRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<RunRow>(`UPDATE market_data_sampling_task_runs
      SET state=$3,lease_owner=NULL,lease_until=NULL,next_attempt_at=NULL,last_error=$5,updated_at=$4
      WHERE task_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND lease_until > $4
      RETURNING task_id,state,attempt,max_attempts,lease_owner,lease_until,next_attempt_at,last_error,updated_at`, [taskId, workerId, state, now, reason?.slice(0, 1000) ?? null]);
      if (!result.rows[0]) throw new Error("SAMPLING_TASK_LEASE_NOT_OWNED");
      if (state === "COMPLETED") {
        await client.query(`INSERT INTO market_data_consumer_outbox(event_id,task_id,consumer,payload)
          SELECT 'quote-available:' || task.task_id, task.task_id, 'monitorEvaluation', jsonb_build_object(
            'scope',task.scope_json,'taskId',task.task_id,'expectedSecurityIds',task.security_ids,
            'observations',COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'securityId',observation->>'securityId','snapshotId',observation->>'snapshotId',
              'sourceId',observation->>'sourceId','dataMode',observation->>'dataMode',
              'observedAt',observation->'observedAt','ingestedAt',observation->'ingestedAt','availableAt',observation->'availableAt',
              'ageSeconds',observation->'ageSeconds','freshness',observation->>'freshness','status',observation->>'status'
            )) FROM jsonb_array_elements(task.observations) AS observation),'[]'::jsonb))
          FROM market_data_snapshot_sampling_tasks AS task
          WHERE task.task_id=$1 AND task.status IN ('COMPLETED_FIXTURE','COMPLETED_REAL')
            AND task.scope_json->>'accountId' IS NOT NULL AND task.scope_json->>'namespace' IS NOT NULL
            AND task.scope_json->>'testRunId' IS NOT NULL AND jsonb_array_length(task.security_ids)>0
          ON CONFLICT(task_id,consumer) DO NOTHING`, [taskId]);
      }
      await client.query("COMMIT");
      return mapRun(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async claimConsumerEvent(workerId: string, now: Date, leaseMs: number): Promise<{ eventId: string; taskId: string; payload: Record<string, unknown>; attempt: number } | null> {
    const result = await this.pool.query<{event_id:string;task_id:string;payload:Record<string,unknown>;attempt:number}>(`WITH candidate AS (
      SELECT event_id FROM market_data_consumer_outbox WHERE consumer='monitorEvaluation' AND
      (state='PENDING' AND (next_attempt_at IS NULL OR next_attempt_at <= $1) OR state='CLAIMED' AND lease_until <= $1)
      AND EXISTS (SELECT 1 FROM market_data_sampling_policies WHERE policy_id='monitorEvaluation' AND (policy_json->>'enabled')::boolean=true)
      ORDER BY created_at,event_id LIMIT 1 FOR UPDATE SKIP LOCKED
    ) UPDATE market_data_consumer_outbox AS event SET state='CLAIMED',attempt=event.attempt+1,lease_owner=$2,
      lease_until=$1 + ($3 * interval '1 millisecond'),updated_at=$1 FROM candidate WHERE event.event_id=candidate.event_id
      RETURNING event.event_id,event.task_id,event.payload,event.attempt`, [now,workerId,leaseMs]);
    const row = result.rows[0];
    return row ? { eventId: row.event_id, taskId: row.task_id, payload: row.payload, attempt: row.attempt } : null;
  }

  async completeConsumerEvent(eventId: string, workerId: string, now: Date): Promise<void> {
    const result = await this.pool.query("UPDATE market_data_consumer_outbox SET state='DELIVERED',lease_owner=NULL,lease_until=NULL,next_attempt_at=NULL,last_error=NULL,updated_at=$3 WHERE event_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND lease_until>$3",[eventId,workerId,now]);
    if (result.rowCount !== 1) throw new Error("CONSUMER_EVENT_LEASE_NOT_OWNED");
  }

  async retryConsumerEvent(eventId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<void> {
    const result = await this.pool.query("UPDATE market_data_consumer_outbox SET state='PENDING',lease_owner=NULL,lease_until=NULL,next_attempt_at=$3 + ($4 * interval '1 millisecond'),last_error=$5,updated_at=$3 WHERE event_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND lease_until>$3",[eventId,workerId,now,delayMs,reason.slice(0,1000)]);
    if (result.rowCount !== 1) throw new Error("CONSUMER_EVENT_LEASE_NOT_OWNED");
  }

  async read(taskId: string): Promise<SamplingTaskRun | null> {
    const result = await this.pool.query<RunRow>("SELECT task_id,state,attempt,max_attempts,lease_owner,lease_until,next_attempt_at,last_error,updated_at FROM market_data_sampling_task_runs WHERE task_id=$1", [taskId]);
    return result.rows[0] ? mapRun(result.rows[0]) : null;
  }
}

function mapRun(row: RunRow): SamplingTaskRun {
  return { taskId: row.task_id, state: row.state, attempt: row.attempt, maxAttempts: row.max_attempts, leaseOwner: row.lease_owner, leaseUntil: row.lease_until?.toISOString() ?? null, nextAttemptAt: row.next_attempt_at?.toISOString() ?? null, lastError: row.last_error, updatedAt: row.updated_at.toISOString() };
}
