import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import { samplingScopeKey } from "./postgres-snapshot-sampling-repository.js";
import { selectV24LocalSnapshot, type LocalSnapshotPlan, type LocalSnapshotScope, type LocalSnapshotTaskFact } from "../application/v24-local-snapshot-barrier.js";
import type { SnapshotSamplingObservation } from "../ports/snapshot-observation.js";

type FrozenSnapshot = { version: string; sha: string; snapshotId: string; scheduledAt: string; completedAt: string; price: string };
const FROZEN: Record<string, FrozenSnapshot> = {
  "2024-01-04": { version: "v24-c5-local-snapshot-20240104-1", sha: "e0f6ac31675e0386a485d95077d50f871cd01c3e61fc5b28b9cc183e497f410e", snapshotId: "fixture-c5-20240104-600000", scheduledAt: "2024-01-04T01:31:10.000Z", completedAt: "2024-01-04T01:31:11.000Z", price: "10.2500" },
  "2024-01-05": { version: "v24-c5-local-snapshot-20240105-1", sha: "18cd1ab7256dcf0f0a3b429e1d71f2f4506ed9022ecf615f17dbd39eb57b7007", snapshotId: "fixture-c5-20240105-600000", scheduledAt: "2024-01-05T01:31:10.000Z", completedAt: "2024-01-05T01:31:11.000Z", price: "10.0000" },
};
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
function frozenPlan(scope: LocalSnapshotScope, sessionDate: string): { plan: LocalSnapshotPlan; frozen: FrozenSnapshot } {
  const frozen = FROZEN[sessionDate];
  if (!frozen || scope.market !== "CN_A" || !scope.ownerId || !scope.accountId || !scope.testRunId || scope.namespace !== `v24-paper-v2-${scope.testRunId}`) throw new Error("C5_LOCAL_SNAPSHOT_SCOPE_INVALID");
  const sourceId = `fixture:${frozen.version}`;
  const taskId = `CN_A:snapshot:FIXTURE:${sourceId}:1:${samplingScopeKey(scope)}:${frozen.scheduledAt}`;
  const planId = `c5-snapshot-plan-${sha256(JSON.stringify([scope.ownerId, scope.accountId, scope.namespace, scope.testRunId, sessionDate, frozen.sha]))}`;
  return { plan: { planId, scope, securityId: "600000.SH", dataMode: "FIXTURE", tasks: [{ taskId, sourceId, scheduledAt: frozen.scheduledAt }] }, frozen };
}
function matchesFrozenTask(row: any, scope: LocalSnapshotScope, task: LocalSnapshotPlan["tasks"][number], frozen: FrozenSnapshot): boolean {
  const obs = row?.observations as SnapshotSamplingObservation[]; const observation = Array.isArray(obs) && obs.length === 1 ? obs[0] : undefined;
  return !!row && row.data_mode === "FIXTURE" && row.status === "COMPLETED_FIXTURE" && row.source_id === task.sourceId && row.fixture_version === frozen.version && row.fixture_sha256 === frozen.sha && row.settings_version === 1 && row.calendar_version === "c5-local-synthetic-sessions-1" && new Date(row.scheduled_at).toISOString() === frozen.scheduledAt && isDeepStrictEqual(row.scope_json, scope) && isDeepStrictEqual(row.security_ids, ["600000.SH"]) && !!observation && observation.snapshotId === frozen.snapshotId && observation.securityId === "600000.SH" && observation.sourceId === task.sourceId && observation.dataMode === "FIXTURE" && observation.price === frozen.price && observation.status === "READY" && observation.freshness === "FRESH" && Date.parse(observation.observedAt ?? "") === Date.parse(frozen.scheduledAt) && Date.parse(observation.ingestedAt ?? "") === Date.parse(frozen.completedAt) && Date.parse(observation.availableAt ?? "") === Date.parse(frozen.completedAt);
}
/** C5 synthetic-only immutable plan and replayable completion receipt, not a live-source watermark. */
export class PostgresV24LocalSnapshotBarrierRepository {
  constructor(private readonly pool: Pool) {}
  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(735402, 27)");
      await client.query(`CREATE TABLE IF NOT EXISTS market_data_v24_local_snapshot_plans (
        plan_id TEXT PRIMARY KEY, test_run_id UUID NOT NULL, owner_id TEXT NOT NULL, account_id UUID NOT NULL, namespace TEXT NOT NULL,
        session_date DATE NOT NULL, fixture_sha256 TEXT NOT NULL, payload JSONB NOT NULL, UNIQUE(test_run_id,session_date)
      );
      CREATE TABLE IF NOT EXISTS market_data_v24_local_snapshot_receipts (
        plan_id TEXT NOT NULL REFERENCES market_data_v24_local_snapshot_plans(plan_id), task_id TEXT NOT NULL REFERENCES market_data_snapshot_sampling_tasks(task_id),
        business_completed_at TIMESTAMPTZ NOT NULL, fixture_sha256 TEXT NOT NULL, PRIMARY KEY(plan_id,task_id)
      )`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async createPlan(scope: LocalSnapshotScope, sessionDate: string): Promise<{ plan: LocalSnapshotPlan; created: boolean }> {
    const { plan, frozen } = frozenPlan(scope, sessionDate);
    const result = await this.pool.query(`INSERT INTO market_data_v24_local_snapshot_plans(plan_id,test_run_id,owner_id,account_id,namespace,session_date,fixture_sha256,payload)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT DO NOTHING RETURNING payload`, [plan.planId, scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, sessionDate, frozen.sha, JSON.stringify(plan)]);
    if (result.rows[0]) return { plan: result.rows[0].payload as LocalSnapshotPlan, created: true };
    const existing = await this.readPlan(scope, sessionDate);
    if (!existing) throw new Error("C5_LOCAL_SNAPSHOT_PLAN_SCOPE_CONFLICT");
    if (!isDeepStrictEqual(existing, plan)) throw new Error("C5_LOCAL_SNAPSHOT_PLAN_IMMUTABLE_CONFLICT");
    return { plan: existing, created: false };
  }
  async readPlan(scope: LocalSnapshotScope, sessionDate: string): Promise<LocalSnapshotPlan | null> {
    const { plan, frozen } = frozenPlan(scope, sessionDate);
    const result = await this.pool.query("SELECT payload,fixture_sha256 FROM market_data_v24_local_snapshot_plans WHERE plan_id=$1 AND test_run_id=$2 AND owner_id=$3 AND account_id=$4 AND namespace=$5 AND session_date=$6", [plan.planId, scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, sessionDate]);
    if (!result.rows[0]) return null;
    if (result.rows[0].fixture_sha256 !== frozen.sha || !isDeepStrictEqual(result.rows[0].payload, plan)) throw new Error("C5_LOCAL_SNAPSHOT_PLAN_CORRUPT");
    return result.rows[0].payload as LocalSnapshotPlan;
  }
  /** Record only after the stored result exactly matches the pinned synthetic input. Retrying after a crash is safe. */
  async recordCompletion(scope: LocalSnapshotScope, sessionDate: string): Promise<{ recorded: boolean }> {
    const { plan, frozen } = frozenPlan(scope, sessionDate); const task = plan.tasks[0]!;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const p = await client.query("SELECT payload,fixture_sha256 FROM market_data_v24_local_snapshot_plans WHERE plan_id=$1 AND test_run_id=$2 AND owner_id=$3 AND account_id=$4 AND namespace=$5 FOR UPDATE", [plan.planId, scope.testRunId, scope.ownerId, scope.accountId, scope.namespace]);
      if (!p.rows[0] || p.rows[0].fixture_sha256 !== frozen.sha || !isDeepStrictEqual(p.rows[0].payload, plan)) throw new Error("C5_LOCAL_SNAPSHOT_PLAN_MISSING_OR_CORRUPT");
      const result = await client.query("SELECT * FROM market_data_snapshot_sampling_tasks WHERE task_id=$1 FOR UPDATE", [task.taskId]);
      const row = result.rows[0];
      if (!row || row.status !== "COMPLETED_FIXTURE") throw new Error("C5_LOCAL_SNAPSHOT_TASK_INCOMPLETE");
      if (!matchesFrozenTask(row, scope, task, frozen)) throw new Error("C5_LOCAL_SNAPSHOT_FACT_MISMATCH");
      const inserted = await client.query(`INSERT INTO market_data_v24_local_snapshot_receipts(plan_id,task_id,business_completed_at,fixture_sha256) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING task_id`, [plan.planId, task.taskId, frozen.completedAt, frozen.sha]);
      if (!inserted.rowCount) {
        const existing = await client.query("SELECT business_completed_at,fixture_sha256 FROM market_data_v24_local_snapshot_receipts WHERE plan_id=$1 AND task_id=$2", [plan.planId, task.taskId]);
        if (!existing.rows[0] || new Date(existing.rows[0].business_completed_at).toISOString() !== frozen.completedAt || existing.rows[0].fixture_sha256 !== frozen.sha) throw new Error("C5_LOCAL_SNAPSHOT_RECEIPT_CONFLICT");
      }
      await client.query("COMMIT"); return { recorded: Boolean(inserted.rowCount) };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async select(scope: LocalSnapshotScope, sessionDate: string, evaluatedAt: string) {
    const plan = await this.readPlan(scope, sessionDate);
    if (!plan) return { status: "WAITING" as const, reason: "TASKS_INCOMPLETE" as const };
    const frozen = frozenPlan(scope, sessionDate).frozen;
    const result = await this.pool.query(`SELECT t.*,r.business_completed_at,r.fixture_sha256 AS receipt_sha256
      FROM market_data_snapshot_sampling_tasks t LEFT JOIN market_data_v24_local_snapshot_receipts r ON r.plan_id=$1 AND r.task_id=t.task_id
      WHERE t.task_id=ANY($2::text[])`, [plan.planId, plan.tasks.map((item) => item.taskId)]);
    for (const row of result.rows) {
      if (row.business_completed_at != null && (new Date(row.business_completed_at).toISOString() !== frozen.completedAt || row.receipt_sha256 !== frozen.sha || !matchesFrozenTask(row, scope, plan.tasks[0]!, frozen))) throw new Error("C5_LOCAL_SNAPSHOT_RECEIPT_CORRUPT");
    }
    const tasks: LocalSnapshotTaskFact[] = result.rows.filter((row) => row.status !== "COMPLETED_FIXTURE" || row.business_completed_at != null).map((row) => ({ taskId: row.task_id, scope: row.scope_json, dataMode: row.data_mode, sourceId: row.source_id, scheduledAt: new Date(row.scheduled_at).toISOString(), status: row.status, completedAt: row.business_completed_at ? new Date(row.business_completed_at).toISOString() : null, observations: row.observations }));
    return selectV24LocalSnapshot({ plan, tasks, acceptedAt: `${sessionDate}T09:31:00+08:00`, evaluatedAt, windowEnd: `${sessionDate}T09:35:00+08:00` });
  }
}
