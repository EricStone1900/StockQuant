import { createHash } from "node:crypto";
import type { Pool } from "pg";
import type { DailyBarCompletionResult, DailyBarCompletionRequest } from "../application/v21-daily-bar-completion.js";
import type { DailyBarCompletionScope, DailyBarCompletionTask, DailyBarCompletionTaskState, DailyBarSourceRequest } from "../application/daily-bar-completion-queue.js";


function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  return JSON.stringify(value);
}
function scopeKey(scope: DailyBarCompletionScope): string { return JSON.stringify([scope.market, scope.ownerId, scope.accountId, scope.namespace, scope.testRunId]); }
type TaskRow = { task_id: string; state: DailyBarCompletionTaskState; scope_key: string; scope_json: DailyBarCompletionScope; fixture_version: string | null; fixture_sha256: string | null; source_request_json?: DailyBarSourceRequest | null; attempt: number; max_attempts: number; lease_owner: string | null; lease_until: Date | null; next_attempt_at: Date | null; last_error: string | null; completion_id: string | null; created_at: Date; updated_at: Date };

export class PostgresDailyBarCompletionRepository {
  constructor(private readonly pool: Pool) {}

  async migrateRealJobs(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("CREATE TABLE IF NOT EXISTS market_data_snapshot_schedules(schedule_key TEXT PRIMARY KEY,schedule_json JSONB NOT NULL,enabled BOOLEAN NOT NULL DEFAULT FALSE)");
    await queryable.query("ALTER TABLE market_data_daily_bar_completion_jobs ADD COLUMN IF NOT EXISTS source_request_json JSONB");
    await queryable.query("ALTER TABLE market_data_daily_bar_completion_jobs ALTER COLUMN fixture_version DROP NOT NULL, ALTER COLUMN fixture_sha256 DROP NOT NULL");
    await queryable.query("ALTER TABLE market_data_daily_bar_completion_jobs ADD CONSTRAINT daily_bar_job_input_kind CHECK ((source_request_json IS NULL AND fixture_version IS NOT NULL AND fixture_sha256 IS NOT NULL) OR (source_request_json IS NOT NULL AND fixture_version IS NULL AND fixture_sha256 IS NULL))");
  }

  async enqueueReal(scope: DailyBarCompletionScope, request: DailyBarSourceRequest): Promise<{ task: DailyBarCompletionTask; created: boolean }> {
    if (request.sourceId !== "eastmoney-daily" || !/^\d{4}-\d{2}-\d{2}$/u.test(request.sessionDate) || !request.dataVersion.trim() || !request.securityIds.length || request.securityIds.length > 100 || new Set(request.securityIds).size !== request.securityIds.length || request.securityIds.some((id) => !/^\d{6}\.(SH|SZ)$/u.test(id))) throw new Error("INVALID_DAILY_BAR_SOURCE_REQUEST");
    const frozen = { ...request, securityIds: [...request.securityIds].sort() };
    const taskId = `dailybarreal:${createHash("sha256").update(canonical({ scope, request: frozen })).digest("hex")}`;
    const inserted = await this.pool.query<TaskRow>(`INSERT INTO market_data_daily_bar_completion_jobs(task_id,scope_key,scope_json,source_request_json,state,max_attempts)
      VALUES($1,$2,$3::jsonb,$4::jsonb,'QUEUED',3) ON CONFLICT(task_id) DO NOTHING RETURNING *`, [taskId, scopeKey(scope), JSON.stringify(scope), JSON.stringify(frozen)]);
    if (inserted.rows[0]) return { task: mapTask(inserted.rows[0]), created: true };
    const existing = await this.pool.query<TaskRow>("SELECT * FROM market_data_daily_bar_completion_jobs WHERE task_id=$1", [taskId]);
    const row = existing.rows[0];
    if (!row || canonical(row.source_request_json) !== canonical(frozen) || canonical(row.scope_json) !== canonical(scope)) throw new Error("DAILY_BAR_TASK_IDEMPOTENCY_CONFLICT");
    return { task: mapTask(row), created: false };
  }

  async migrate(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_daily_bar_completion_tasks (
      completion_id TEXT PRIMARY KEY,
      scope_key TEXT NOT NULL,
      scope_json JSONB NOT NULL,
      session_date DATE NOT NULL,
      source_id TEXT NOT NULL,
      data_mode TEXT NOT NULL CHECK (data_mode IN ('FIXTURE','REAL')),
      result_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await queryable.query("CREATE INDEX IF NOT EXISTS market_data_daily_bar_completion_scope_idx ON market_data_daily_bar_completion_tasks(scope_key, created_at DESC)");
  }

  async migrateJobs(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_daily_bar_completion_jobs (
      task_id TEXT PRIMARY KEY,
      scope_key TEXT NOT NULL,
      scope_json JSONB NOT NULL,
      fixture_version TEXT NOT NULL,
      fixture_sha256 TEXT NOT NULL CHECK (fixture_sha256 ~ '^[a-f0-9]{64}$'),
      state TEXT NOT NULL CHECK (state IN ('QUEUED','CLAIMED','RETRY_WAIT','COMPLETED','FAILED')),
      attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts BETWEEN 1 AND 10),
      lease_owner TEXT,
      lease_until TIMESTAMPTZ,
      next_attempt_at TIMESTAMPTZ,
      last_error TEXT,
      completion_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK ((state='CLAIMED' AND lease_owner IS NOT NULL AND lease_until IS NOT NULL) OR state<>'CLAIMED')
    )`);
    await queryable.query("CREATE INDEX IF NOT EXISTS market_data_daily_bar_completion_jobs_claim_idx ON market_data_daily_bar_completion_jobs(state,next_attempt_at,lease_until,updated_at)");
    await queryable.query("CREATE INDEX IF NOT EXISTS market_data_daily_bar_completion_jobs_scope_idx ON market_data_daily_bar_completion_jobs(scope_key,created_at DESC)");
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_daily_bar_schedules (
      scope_key TEXT PRIMARY KEY,
      scope_json JSONB NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      last_triggered_session DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    await queryable.query("ALTER TABLE market_data_daily_bar_schedules ADD COLUMN IF NOT EXISTS last_triggered_session DATE");
  }

  async setSchedule(scope: DailyBarCompletionScope, enabled: boolean): Promise<void> {
    const key = scopeKey(scope);
    await this.pool.query(`INSERT INTO market_data_daily_bar_schedules(scope_key,scope_json,enabled)
      VALUES($1,$2::jsonb,$3) ON CONFLICT(scope_key) DO UPDATE SET
      scope_json=EXCLUDED.scope_json,enabled=EXCLUDED.enabled,updated_at=now()`, [key, JSON.stringify(scope), enabled]);
  }

  async scheduledScopes(): Promise<DailyBarCompletionScope[]> {
    const result = await this.pool.query<{ scope_json: DailyBarCompletionScope }>(`SELECT schedule.scope_json FROM market_data_daily_bar_schedules schedule
      JOIN market_data_watchlists watchlist ON watchlist.owner_id=schedule.scope_json->>'ownerId'
        AND watchlist.account_id=(schedule.scope_json->>'accountId')::uuid
        AND watchlist.test_run_id=(schedule.scope_json->>'testRunId')::uuid
        AND watchlist.namespace=schedule.scope_json->>'namespace'
      WHERE schedule.enabled=true AND jsonb_array_length(watchlist.securities) BETWEEN 1 AND 100
      ORDER BY schedule.scope_key`);
    return result.rows.map((row) => row.scope_json);
  }

  async enabledScheduleCount(): Promise<number> {
    const result = await this.pool.query<{ count: number }>("SELECT count(*)::int AS count FROM market_data_daily_bar_schedules WHERE enabled=true");
    return result.rows[0]?.count ?? 0;
  }

  async hasTriggered(scope: DailyBarCompletionScope, sessionDate: string): Promise<boolean> {
    const result = await this.pool.query<{ triggered: boolean }>("SELECT last_triggered_session >= $2::date AS triggered FROM market_data_daily_bar_schedules WHERE scope_key=$1 AND enabled=true", [scopeKey(scope), sessionDate]);
    return result.rows[0]?.triggered ?? false;
  }

  async markScheduleTriggered(scope: DailyBarCompletionScope, sessionDate: string): Promise<boolean> {
    const result = await this.pool.query("UPDATE market_data_daily_bar_schedules SET last_triggered_session=$2::date,updated_at=now() WHERE scope_key=$1 AND enabled=true AND (last_triggered_session IS NULL OR last_triggered_session<$2::date)", [scopeKey(scope), sessionDate]);
    return result.rowCount === 1;
  }

  async enqueue(input: { scope: DailyBarCompletionScope; fixtureVersion: string; fixtureSha256: string; maxAttempts?: number }): Promise<{ task: DailyBarCompletionTask; created: boolean }> {
    const maxAttempts = input.maxAttempts ?? 3;
    if (!input.fixtureVersion.trim() || !/^[a-f0-9]{64}$/u.test(input.fixtureSha256) || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) throw new Error("INVALID_DAILY_BAR_TASK");
    const key = scopeKey(input.scope);
    const taskId = `dailybartask:${createHash("sha256").update(canonical({ scope: input.scope, fixtureVersion: input.fixtureVersion, fixtureSha256: input.fixtureSha256 })).digest("hex")}`;
    const inserted = await this.pool.query<TaskRow>(`INSERT INTO market_data_daily_bar_completion_jobs(task_id,scope_key,scope_json,fixture_version,fixture_sha256,state,max_attempts)
      VALUES($1,$2,$3::jsonb,$4,$5,'QUEUED',$6) ON CONFLICT(task_id) DO NOTHING
      RETURNING task_id,state,scope_key,scope_json,fixture_version,fixture_sha256,attempt,max_attempts,lease_owner,lease_until,next_attempt_at,last_error,completion_id,created_at,updated_at`, [taskId, key, JSON.stringify(input.scope), input.fixtureVersion, input.fixtureSha256, maxAttempts]);
    if (inserted.rows[0]) return { task: mapTask(inserted.rows[0]), created: true };
    const existing = await this.pool.query<TaskRow>("SELECT task_id,state,scope_key,scope_json,fixture_version,fixture_sha256,attempt,max_attempts,lease_owner,lease_until,next_attempt_at,last_error,completion_id,created_at,updated_at FROM market_data_daily_bar_completion_jobs WHERE task_id=$1", [taskId]);
    const row = existing.rows[0];
    if (!row) throw new Error("DAILY_BAR_TASK_IDEMPOTENCY_READ_FAILED");
    if (row.scope_key !== key || row.fixture_version !== input.fixtureVersion || row.fixture_sha256 !== input.fixtureSha256 || row.max_attempts !== maxAttempts || canonical(row.scope_json) !== canonical(input.scope)) throw new Error("DAILY_BAR_TASK_IDEMPOTENCY_CONFLICT");
    return { task: mapTask(row), created: false };
  }

  async claim(workerId: string, now: Date, leaseMs: number): Promise<DailyBarCompletionTask | null> {
    if (!workerId.trim() || workerId.length > 128 || !Number.isFinite(now.getTime()) || !Number.isInteger(leaseMs) || leaseMs < 1_000 || leaseMs > 300_000) throw new Error("INVALID_DAILY_BAR_TASK_LEASE");
    const result = await this.pool.query<TaskRow>(`WITH exhausted AS (
      UPDATE market_data_daily_bar_completion_jobs SET state='FAILED',lease_owner=NULL,lease_until=NULL,next_attempt_at=NULL,
        last_error=COALESCE(last_error,'LEASE_EXPIRED_AFTER_MAX_ATTEMPTS'),updated_at=$1
      WHERE state='CLAIMED' AND lease_until<=$1 AND attempt>=max_attempts RETURNING task_id
    ), candidate AS (
      SELECT task_id FROM market_data_daily_bar_completion_jobs WHERE attempt<max_attempts AND (
        state='QUEUED' OR (state='RETRY_WAIT' AND next_attempt_at<=$1) OR (state='CLAIMED' AND lease_until<=$1)
      ) ORDER BY created_at,task_id LIMIT 1 FOR UPDATE SKIP LOCKED
    ) UPDATE market_data_daily_bar_completion_jobs AS job SET state='CLAIMED',attempt=job.attempt+1,lease_owner=$2,
      lease_until=$1+($3*interval '1 millisecond'),next_attempt_at=NULL,updated_at=$1
      FROM candidate WHERE job.task_id=candidate.task_id
      RETURNING job.task_id,job.state,job.scope_json,job.fixture_version,job.fixture_sha256,job.source_request_json,job.attempt,job.max_attempts,job.lease_owner,job.lease_until,job.next_attempt_at,job.last_error,job.completion_id,job.created_at,job.updated_at`, [now, workerId, leaseMs]);
    return result.rows[0] ? mapTask(result.rows[0]) : null;
  }

  async retry(taskId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<DailyBarCompletionTaskState> {
    if (!Number.isInteger(delayMs) || delayMs < 0 || delayMs > 300_000 || !reason.trim()) throw new Error("INVALID_DAILY_BAR_TASK_RETRY");
    const result = await this.pool.query<{ state: DailyBarCompletionTaskState }>(`UPDATE market_data_daily_bar_completion_jobs SET
      state=CASE WHEN attempt>=max_attempts THEN 'FAILED' ELSE 'RETRY_WAIT' END,lease_owner=NULL,lease_until=NULL,
      next_attempt_at=CASE WHEN attempt>=max_attempts THEN NULL ELSE $3+($4*interval '1 millisecond') END,last_error=$5,updated_at=$3
      WHERE task_id=$1 AND state='CLAIMED' AND lease_owner=$2 AND lease_until>$3 RETURNING state`, [taskId, workerId, now, delayMs, reason.slice(0, 1000)]);
    if (!result.rows[0]) throw new Error("DAILY_BAR_TASK_LEASE_NOT_OWNED");
    return result.rows[0].state;
  }

  async complete(taskId: string, workerId: string, now: Date, completion: DailyBarCompletionResult): Promise<void> {
    if (!completion.completionId || !["COMPLETED_FIXTURE", "COMPLETED_REAL"].includes(completion.status)) throw new Error("DAILY_BAR_COMPLETION_NOT_PERSISTABLE");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query<TaskRow>("SELECT * FROM market_data_daily_bar_completion_jobs WHERE task_id=$1 FOR UPDATE", [taskId]);
      const task = selected.rows[0];
      if (!task || task.state !== "CLAIMED" || task.lease_owner !== workerId || !task.lease_until || task.lease_until <= now) throw new Error("DAILY_BAR_TASK_LEASE_NOT_OWNED");
      if (completion.fixtureVersion !== task.fixture_version || scopeKey(completion.scope) !== task.scope_key) throw new Error("DAILY_BAR_TASK_RESULT_SCOPE_CONFLICT");
      if (task.source_request_json) {
        const request = task.source_request_json;
        if (completion.status !== "COMPLETED_REAL" || completion.sourceId !== request.sourceId || completion.sessionDate !== request.sessionDate || completion.dataVersion !== request.dataVersion || canonical(completion.bars.map((bar) => bar.securityId).sort()) !== canonical([...request.securityIds].sort())) throw new Error("DAILY_BAR_SOURCE_RESULT_CONFLICT");
      } else if (completion.status !== "COMPLETED_FIXTURE") throw new Error("DAILY_BAR_RESULT_MODE_CONFLICT");
      const inserted = await client.query<{ result_json: DailyBarCompletionResult }>(`INSERT INTO market_data_daily_bar_completion_tasks(completion_id,scope_key,scope_json,session_date,source_id,data_mode,result_json)
        VALUES($1,$2,$3::jsonb,$4,$5,$6,$7::jsonb) ON CONFLICT(completion_id) DO NOTHING RETURNING result_json`, [completion.completionId, task.scope_key, JSON.stringify(task.scope_json), completion.sessionDate, completion.sourceId, completion.dataMode, JSON.stringify(completion)]);
      if (!inserted.rows[0]) {
        const existing = await client.query<{ scope_key: string; result_json: DailyBarCompletionResult }>("SELECT scope_key,result_json FROM market_data_daily_bar_completion_tasks WHERE completion_id=$1", [completion.completionId]);
        const row = existing.rows[0];
        if (!row || row.scope_key !== task.scope_key || canonical(row.result_json) !== canonical(completion)) throw new Error("DAILY_BAR_COMPLETION_IDEMPOTENCY_CONFLICT");
      }
      await client.query("UPDATE market_data_daily_bar_completion_jobs SET state='COMPLETED',lease_owner=NULL,lease_until=NULL,next_attempt_at=NULL,last_error=NULL,completion_id=$2,updated_at=$3 WHERE task_id=$1", [taskId, completion.completionId, now]);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; }
    finally { client.release(); }
  }

  async latest(scope: DailyBarCompletionScope): Promise<{ task: DailyBarCompletionTask; completion: DailyBarCompletionResult | null } | null> {
    const key = scopeKey(scope);
    const result = await this.pool.query<TaskRow & { result_json: DailyBarCompletionResult | null }>(`SELECT job.task_id,job.state,job.scope_json,job.fixture_version,job.fixture_sha256,job.source_request_json,job.attempt,job.max_attempts,job.lease_owner,job.lease_until,job.next_attempt_at,job.last_error,job.completion_id,job.created_at,job.updated_at,result.result_json
      FROM market_data_daily_bar_completion_jobs job LEFT JOIN market_data_daily_bar_completion_tasks result ON result.completion_id=job.completion_id
      WHERE job.scope_key=$1 ORDER BY job.created_at DESC,job.task_id DESC LIMIT 1`, [key]);
    return result.rows[0] ? { task: mapTask(result.rows[0]), completion: result.rows[0].result_json } : null;
  }
}

function mapTask(row: TaskRow): DailyBarCompletionTask {
  return { taskId: row.task_id, state: row.state, scope: row.scope_json, fixtureVersion: row.fixture_version, fixtureSha256: row.fixture_sha256, ...(row.source_request_json ? { sourceRequest: row.source_request_json } : {}), attempt: row.attempt, maxAttempts: row.max_attempts, leaseOwner: row.lease_owner, leaseUntil: row.lease_until?.toISOString() ?? null, nextAttemptAt: row.next_attempt_at?.toISOString() ?? null, lastError: row.last_error, completionId: row.completion_id, createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString() };
}
