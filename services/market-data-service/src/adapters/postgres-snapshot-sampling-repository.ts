import type { Pool } from "pg";
import { createHash } from "node:crypto";

import type { SnapshotSamplingObservation } from "../ports/snapshot-observation.js";
export type { SnapshotSamplingObservation } from "../ports/snapshot-observation.js";
export type SnapshotSamplingScope = { market: "CN_A"; ownerId: string; accountId: string | null; namespace: string | null; testRunId: string | null };
export type SnapshotSamplingTask = { taskId: string; scheduledAt: string; intervalMinutes: 20 | 30; settingsVersion: number; calendarVersion: string; window: "morning" | "afternoon"; dataMode: "FIXTURE" | "REAL"; sourceId: string; scope: SnapshotSamplingScope; securityIds: string[]; status: "QUEUED" | "BLOCKED_SOURCE_AUTHORIZATION" | "COMPLETED_FIXTURE" | "COMPLETED_REAL" | "FAILED"; fixtureVersion: string | null; fixtureSha256: string | null; observations: SnapshotSamplingObservation[]; created: boolean };
export type SnapshotSamplingSourceHealth = { sourceId: string; state: "NEVER_RUN" | "QUEUED" | "RUNNING" | "RETRY_WAIT" | "BLOCKED_SOURCE_AUTHORIZATION" | "HEALTHY" | "FAILED"; lastAttemptAt: string | null; lastSuccessAt: string | null; lastFailureAt: string | null; lastErrorCode: string | null };

const defaultScope: SnapshotSamplingScope = { market: "CN_A", ownerId: "system", accountId: null, namespace: null, testRunId: null };

export class PostgresSnapshotSamplingRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_snapshot_sampling_tasks (
      task_id TEXT PRIMARY KEY,
      scheduled_at TIMESTAMPTZ NOT NULL,
      interval_minutes INTEGER NOT NULL CHECK (interval_minutes IN (20,30)),
      settings_version INTEGER NOT NULL CHECK (settings_version >= 0),
      calendar_version TEXT NOT NULL,
      window_name TEXT NOT NULL CHECK (window_name IN ('morning','afternoon')),
      data_mode TEXT NOT NULL DEFAULT 'REAL' CHECK (data_mode IN ('FIXTURE','REAL')),
      source_id TEXT NOT NULL DEFAULT 'legacy:unspecified',
      scope_key TEXT NOT NULL DEFAULT 'system',
      scope_json JSONB NOT NULL DEFAULT '{"market":"CN_A","ownerId":"system","accountId":null,"namespace":null,"testRunId":null}'::jsonb,
      security_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL CHECK (status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED_FIXTURE','COMPLETED_REAL','FAILED')),
      fixture_version TEXT,
      fixture_sha256 TEXT,
      observations JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  }

  async migrateFixtureResults(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_status_check CHECK (status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED_FIXTURE','FAILED'))");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS fixture_version TEXT");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS fixture_sha256 TEXT");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS observations JSONB NOT NULL DEFAULT '[]'::jsonb");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'REAL'");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_data_mode_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_data_mode_check CHECK (data_mode IN ('FIXTURE','REAL'))");
  }

  async migrateTaskIdentity(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS data_mode TEXT NOT NULL DEFAULT 'REAL'");
    await queryable.query("UPDATE market_data_snapshot_sampling_tasks SET data_mode = CASE WHEN status = 'COMPLETED_FIXTURE' THEN 'FIXTURE' ELSE 'REAL' END");
    await queryable.query("UPDATE market_data_snapshot_sampling_tasks SET task_id = 'CN_A:snapshot:' || data_mode || ':' || settings_version::text || ':system:' || to_char(scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') WHERE task_id NOT LIKE 'CN_A:snapshot:%'");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_data_mode_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_data_mode_check CHECK (data_mode IN ('FIXTURE','REAL'))");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_mode_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_mode_status_check CHECK ((data_mode = 'FIXTURE' AND status IN ('QUEUED','COMPLETED_FIXTURE','FAILED')) OR (data_mode = 'REAL' AND status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','FAILED')))");
  }

  async migrateTaskScope(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS scope_key TEXT NOT NULL DEFAULT 'system'");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS scope_json JSONB NOT NULL DEFAULT '{\"market\":\"CN_A\",\"ownerId\":\"system\",\"accountId\":null,\"namespace\":null,\"testRunId\":null}'::jsonb");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS security_ids JSONB NOT NULL DEFAULT '[]'::jsonb");
    await queryable.query("UPDATE market_data_snapshot_sampling_tasks SET task_id = 'CN_A:snapshot:' || data_mode || ':' || settings_version::text || ':system:' || to_char(scheduled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') WHERE task_id NOT LIKE 'CN_A:snapshot:%:system:%'");
  }

  async migratePendingTaskStatuses(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_status_check CHECK (status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED_FIXTURE','FAILED'))");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_mode_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_mode_status_check CHECK ((data_mode = 'FIXTURE' AND status IN ('QUEUED','COMPLETED_FIXTURE','FAILED')) OR (data_mode = 'REAL' AND status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','FAILED')))");
  }

  async migrateObservationProvenance(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query(`UPDATE market_data_snapshot_sampling_tasks AS task
      SET observations = (
        SELECT jsonb_agg(observation || jsonb_build_object(
          'sourceId', COALESCE(observation->>'sourceId', CASE WHEN task.data_mode='FIXTURE' AND task.fixture_version IS NOT NULL THEN 'fixture:' || task.fixture_version ELSE 'UNRECORDED' END),
          'dataMode', COALESCE(observation->>'dataMode', task.data_mode),
          'observedAt', COALESCE(observation->'observedAt', 'null'::jsonb),
          'ingestedAt', COALESCE(observation->'ingestedAt', 'null'::jsonb),
          'availableAt', COALESCE(observation->'availableAt', 'null'::jsonb),
          'ageSeconds', COALESCE(observation->'ageSeconds', 'null'::jsonb),
          'freshness', COALESCE(observation->>'freshness', 'UNKNOWN'),
          'status', CASE WHEN observation ? 'freshness' THEN COALESCE(observation->>'status', 'UNKNOWN') ELSE 'UNKNOWN' END
        ))
        FROM jsonb_array_elements(task.observations) AS observation
      )
      WHERE jsonb_typeof(task.observations)='array' AND jsonb_array_length(task.observations)>0
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(task.observations) AS observation WHERE NOT (observation ? 'sourceId' AND observation ? 'ingestedAt' AND observation ? 'availableAt' AND observation ? 'freshness'))`);
  }

  async migrateTaskSourceIdentity(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD COLUMN IF NOT EXISTS source_id TEXT");
    await queryable.query("UPDATE market_data_snapshot_sampling_tasks SET source_id = CASE WHEN data_mode='FIXTURE' AND fixture_version IS NOT NULL THEN 'fixture:' || fixture_version ELSE 'legacy:unspecified' END WHERE source_id IS NULL OR btrim(source_id)=''");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ALTER COLUMN source_id SET NOT NULL");
  }

  async migrateRealResults(queryable: Pick<Pool, "query"> = this.pool): Promise<void> {
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_status_check CHECK (status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED_FIXTURE','COMPLETED_REAL','FAILED'))");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_mode_status_check");
    await queryable.query("ALTER TABLE market_data_snapshot_sampling_tasks ADD CONSTRAINT market_data_snapshot_sampling_tasks_mode_status_check CHECK ((data_mode='FIXTURE' AND status IN ('QUEUED','COMPLETED_FIXTURE','FAILED')) OR (data_mode='REAL' AND status IN ('QUEUED','BLOCKED_SOURCE_AUTHORIZATION','COMPLETED_REAL','FAILED')))");
  }

  async record(input: Omit<SnapshotSamplingTask, "taskId" | "created" | "fixtureVersion" | "fixtureSha256" | "observations" | "dataMode" | "sourceId" | "scope" | "securityIds"> & { dataMode?: SnapshotSamplingTask["dataMode"]; sourceId?: string; scope?: SnapshotSamplingScope; securityIds?: string[]; fixtureVersion?: string | null; fixtureSha256?: string | null; observations?: SnapshotSamplingObservation[] }): Promise<SnapshotSamplingTask> {
    const dataMode = input.dataMode ?? (input.status === "COMPLETED_FIXTURE" ? "FIXTURE" : "REAL");
    const validStatus = dataMode === "FIXTURE"
      ? ["QUEUED", "COMPLETED_FIXTURE", "FAILED"].includes(input.status)
      : ["QUEUED", "BLOCKED_SOURCE_AUTHORIZATION", "COMPLETED_REAL", "FAILED"].includes(input.status);
    if (!validStatus) throw new Error("SNAPSHOT_TASK_MODE_STATUS_MISMATCH");
    const scope = input.scope ?? defaultScope;
    const scopeKey = samplingScopeKey(scope);
    const sourceId = input.sourceId ?? (dataMode === "FIXTURE" ? `fixture:${input.fixtureVersion ?? "unknown"}` : "legacy:unspecified");
    if (!sourceId.trim() || sourceId.length > 128) throw new Error("INVALID_SNAPSHOT_SOURCE_ID");
    const taskId = `CN_A:snapshot:${dataMode}:${sourceId}:${input.settingsVersion}:${scopeKey}:${input.scheduledAt}`;
    const observations = input.observations ?? [];
    const securityIds = [...new Set(input.securityIds ?? [])];
    const result = await this.pool.query<TaskRow>(`INSERT INTO market_data_snapshot_sampling_tasks(task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb) ON CONFLICT(task_id) DO NOTHING
      RETURNING task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations,true AS inserted`, [taskId, input.scheduledAt, input.intervalMinutes, input.settingsVersion, input.calendarVersion, input.window, dataMode, sourceId, scopeKey, JSON.stringify(scope), JSON.stringify(securityIds), input.status, input.fixtureVersion ?? null, input.fixtureSha256 ?? null, JSON.stringify(observations)]);
    if (result.rows[0]) return this.map(result.rows[0], true);
    const existing = await this.pool.query<TaskRow>("SELECT task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [taskId]);
    if (!existing.rows[0]) throw new Error("SNAPSHOT_TASK_IDEMPOTENCY_READ_FAILED");
    const row = existing.rows[0];
    if (row.interval_minutes !== input.intervalMinutes || row.calendar_version !== input.calendarVersion || row.window_name !== input.window || row.data_mode !== dataMode || row.source_id !== sourceId || row.scope_key !== scopeKey || stableJson(row.scope_json) !== stableJson(scope) || stableJson(row.security_ids) !== stableJson(securityIds) || (input.fixtureVersion != null && row.fixture_version !== input.fixtureVersion) || (input.fixtureSha256 != null && row.fixture_sha256 !== input.fixtureSha256) || (input.observations != null && input.observations.length > 0 && stableJson(row.observations) !== stableJson(input.observations))) {
      const error = new Error("SNAPSHOT_TASK_IDEMPOTENCY_CONFLICT"); error.name = "SnapshotTaskConflict"; throw error;
    }
    return this.map(existing.rows[0], false);
  }

  async completeFixture(taskId: string, fixtureVersion: string, fixtureSha256: string, observations: SnapshotSamplingObservation[]): Promise<SnapshotSamplingTask> {
    const updated = await this.pool.query<TaskRow>(`UPDATE market_data_snapshot_sampling_tasks SET status='COMPLETED_FIXTURE',fixture_version=$2,fixture_sha256=$3,source_id='fixture:' || $2,observations=$4::jsonb
      WHERE task_id=$1 AND data_mode='FIXTURE' AND status='QUEUED'
      RETURNING task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations`, [taskId, fixtureVersion, fixtureSha256, JSON.stringify(observations)]);
    if (updated.rows[0]) return this.map(updated.rows[0], false);
    const existing = await this.find(taskId);
    if (!existing || existing.dataMode !== "FIXTURE" || existing.status !== "COMPLETED_FIXTURE" || existing.fixtureVersion !== fixtureVersion || existing.fixtureSha256 !== fixtureSha256 || stableJson(existing.observations) !== stableJson(observations)) throw new Error("SNAPSHOT_FIXTURE_RESULT_CONFLICT");
    return existing;
  }

  async completeReal(taskId: string, sourceId: string, observations: SnapshotSamplingObservation[]): Promise<SnapshotSamplingTask> {
    const updated = await this.pool.query<TaskRow>(`UPDATE market_data_snapshot_sampling_tasks SET status='COMPLETED_REAL',observations=$3::jsonb
      WHERE task_id=$1 AND data_mode='REAL' AND source_id=$2 AND status='QUEUED'
      RETURNING task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations`, [taskId, sourceId, JSON.stringify(observations)]);
    if (updated.rows[0]) return this.map(updated.rows[0], false);
    const existing = await this.find(taskId);
    if (!existing || existing.dataMode !== "REAL" || existing.sourceId !== sourceId || existing.status !== "COMPLETED_REAL" || stableJson(existing.observations) !== stableJson(observations)) throw new Error("SNAPSHOT_REAL_RESULT_CONFLICT");
    return existing;
  }

  async blockUnauthorized(taskId: string): Promise<SnapshotSamplingTask> {
    const updated = await this.pool.query<TaskRow>(`UPDATE market_data_snapshot_sampling_tasks SET status='BLOCKED_SOURCE_AUTHORIZATION'
      WHERE task_id=$1 AND data_mode='REAL' AND status='QUEUED'
      RETURNING task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations`, [taskId]);
    if (updated.rows[0]) return this.map(updated.rows[0], false);
    const existing = await this.find(taskId);
    if (!existing || existing.dataMode !== "REAL" || existing.status !== "BLOCKED_SOURCE_AUTHORIZATION") throw new Error("SNAPSHOT_AUTHORIZATION_RESULT_CONFLICT");
    return existing;
  }

  async fail(taskId: string): Promise<void> {
    const result = await this.pool.query("UPDATE market_data_snapshot_sampling_tasks SET status='FAILED' WHERE task_id=$1 AND status='QUEUED'", [taskId]);
    if (result.rowCount === 0) {
      const existing = await this.find(taskId);
      if (!existing || existing.status !== "FAILED") throw new Error("SNAPSHOT_TASK_FAILURE_CONFLICT");
    }
  }

  async latest(scope?: SnapshotSamplingScope): Promise<SnapshotSamplingTask | null> {
    const result = scope
      ? await this.pool.query<TaskRow>("SELECT task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations FROM market_data_snapshot_sampling_tasks WHERE scope_key=$1 ORDER BY scheduled_at DESC,task_id DESC LIMIT 1", [samplingScopeKey(scope)])
      : await this.pool.query<TaskRow>("SELECT task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations FROM market_data_snapshot_sampling_tasks ORDER BY scheduled_at DESC,task_id DESC LIMIT 1");
    return result.rows[0] ? this.map(result.rows[0], false) : null;
  }

  /** Derives durable source health from REAL sampling tasks and their lifecycle records. It never probes a provider. */
  async sourceHealth(sourceIds: string[]): Promise<SnapshotSamplingSourceHealth[]> {
    const ids = [...new Set(sourceIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.some((id) => id.length > 128)) throw new Error("INVALID_SNAPSHOT_SOURCE_ID");
    if (ids.length === 0) return [];
    const result = await this.pool.query<{ source_id: string; state: SnapshotSamplingSourceHealth["state"] | null; last_attempt_at: Date | null; last_success_at: Date | null; last_failure_at: Date | null; last_error: string | null }>(`
      WITH requested AS (SELECT unnest($1::text[]) AS source_id), history AS (
        SELECT task.source_id, run.state, run.updated_at,
          CASE WHEN task.status='COMPLETED_REAL' AND run.state='COMPLETED' THEN run.updated_at END AS success_at,
          CASE WHEN task.status IN ('FAILED','BLOCKED_SOURCE_AUTHORIZATION') OR run.state IN ('FAILED','BLOCKED_SOURCE_AUTHORIZATION') THEN run.updated_at END AS failure_at,
          run.last_error,
          row_number() OVER (PARTITION BY task.source_id ORDER BY run.updated_at DESC, task.task_id DESC) AS latest
        FROM market_data_snapshot_sampling_tasks AS task
        JOIN market_data_sampling_task_runs AS run ON run.task_id=task.task_id
        WHERE task.data_mode='REAL' AND task.source_id = ANY($1::text[])
      ), aggregate_health AS (
        SELECT source_id, max(updated_at) AS last_attempt_at, max(success_at) AS last_success_at,
          max(failure_at) AS last_failure_at,
          (array_agg(state ORDER BY updated_at DESC) FILTER (WHERE latest=1))[1] AS latest_state,
          (array_agg(last_error ORDER BY failure_at DESC) FILTER (WHERE failure_at IS NOT NULL))[1] AS last_failure_error
        FROM history GROUP BY source_id
      )
      SELECT requested.source_id, aggregate_health.last_attempt_at, aggregate_health.last_success_at,
        aggregate_health.last_failure_at,
        CASE WHEN aggregate_health.latest_state IS NULL THEN NULL
          WHEN aggregate_health.latest_state='QUEUED' THEN 'QUEUED'
          WHEN aggregate_health.latest_state='CLAIMED' THEN 'RUNNING'
          WHEN aggregate_health.latest_state='RETRY_WAIT' THEN 'RETRY_WAIT'
          WHEN aggregate_health.latest_state='BLOCKED_SOURCE_AUTHORIZATION' THEN 'BLOCKED_SOURCE_AUTHORIZATION'
          WHEN aggregate_health.latest_state='COMPLETED' AND aggregate_health.last_success_at IS NOT NULL THEN 'HEALTHY'
          WHEN aggregate_health.latest_state='FAILED' THEN 'FAILED'
          ELSE 'QUEUED' END AS state,
        CASE WHEN aggregate_health.last_failure_at IS NULL THEN NULL
          WHEN aggregate_health.latest_state='BLOCKED_SOURCE_AUTHORIZATION' THEN 'SOURCE_AUTHORIZATION_REQUIRED'
          WHEN aggregate_health.last_failure_error ~ '^[A-Z][A-Z0-9_:-]{2,100}$' THEN aggregate_health.last_failure_error
          ELSE 'SNAPSHOT_PROVIDER_FAILED' END AS last_error
      FROM requested LEFT JOIN aggregate_health USING (source_id) ORDER BY requested.source_id`, [ids]);
    return result.rows.map((row) => ({ sourceId: row.source_id, state: row.state ?? "NEVER_RUN", lastAttemptAt: row.last_attempt_at?.toISOString() ?? null, lastSuccessAt: row.last_success_at?.toISOString() ?? null, lastFailureAt: row.last_failure_at?.toISOString() ?? null, lastErrorCode: row.last_error }));
  }

  async find(taskId: string): Promise<SnapshotSamplingTask | null> {
    const result = await this.pool.query<TaskRow>("SELECT task_id,scheduled_at,interval_minutes,settings_version,calendar_version,window_name,data_mode,source_id,scope_key,scope_json,security_ids,status,fixture_version,fixture_sha256,observations FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [taskId]);
    return result.rows[0] ? this.map(result.rows[0], false) : null;
  }

  private map(row: TaskRow, created: boolean): SnapshotSamplingTask {
    return { taskId: row.task_id, scheduledAt: new Date(row.scheduled_at).toISOString(), intervalMinutes: row.interval_minutes as 20 | 30, settingsVersion: row.settings_version, calendarVersion: row.calendar_version, window: row.window_name, dataMode: row.data_mode, sourceId: row.source_id, scope: row.scope_json, securityIds: row.security_ids, status: row.status, fixtureVersion: row.fixture_version, fixtureSha256: row.fixture_sha256, observations: row.observations, created };
  }
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}

function samplingScopeKey(scope: SnapshotSamplingScope): string {
  return scope.ownerId === "system" && !scope.accountId && !scope.namespace && !scope.testRunId ? "system" : createHash("sha256").update(stableJson(scope)).digest("hex");
}

type TaskRow = { task_id: string; scheduled_at: Date; interval_minutes: number; settings_version: number; calendar_version: string; window_name: "morning" | "afternoon"; data_mode: SnapshotSamplingTask["dataMode"]; source_id: string; scope_key: string; scope_json: SnapshotSamplingScope; security_ids: string[]; status: SnapshotSamplingTask["status"]; fixture_version: string | null; fixture_sha256: string | null; observations: SnapshotSamplingObservation[]; inserted?: boolean };
