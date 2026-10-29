import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import type { V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";
import type { V24LocalOrderIntent } from "../ports/v24-local-order-intent.js";
import { PostgresV24LocalDailyTargetRepository } from "./postgres-v24-local-daily-target-repository.js";

export type { V24LocalOrderIntent } from "../ports/v24-local-order-intent.js";
const shanghaiDate = (time: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(time);
const shanghaiTime = (time: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(time);
/** Persist a local pre-execution intent only. It neither creates nor accepts a broker order. */
export class PostgresV24LocalOrderIntentRepository {
  private readonly targets: PostgresV24LocalDailyTargetRepository;
  constructor(private readonly pool: Pool) { this.targets = new PostgresV24LocalDailyTargetRepository(pool); }
  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); await client.query("SELECT pg_advisory_xact_lock(735401, 27)");
      await client.query(`CREATE TABLE IF NOT EXISTS v24_local_order_intents (
        target_id TEXT PRIMARY KEY REFERENCES v24_local_daily_targets(target_id), test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id),
        owner_id TEXT NOT NULL, account_id UUID NOT NULL, namespace TEXT NOT NULL, client_order_id TEXT NOT NULL,
        payload JSONB NOT NULL, UNIQUE(test_run_id,client_order_id)
      )`);
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
  async accept(scope: V24DailyTargetScope, targetId: string, acceptedAt: string): Promise<{ intent: V24LocalOrderIntent; created: boolean }> {
    const acceptedMs = /(?:Z|[+-]\d{2}:\d{2})$/u.test(acceptedAt) ? Date.parse(acceptedAt) : NaN;
    if (!Number.isFinite(acceptedMs) || !targetId) throw new Error("C5_LOCAL_INTENT_INPUT_INVALID");
    const target = await this.targets.find(scope, targetId);
    if (!target || target.dataMode !== "FIXTURE" || target.fixtureSha256 !== "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea" || target.strategySha256 !== "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8" || !target.dailyBarProvenance || target.dailyBarProvenance.completionIds.length !== 2 || target.dailyBarProvenance.completionIds[0] === target.dailyBarProvenance.completionIds[1] || !target.dailyBarProvenance.completionIds.every(Boolean) || !["BUY", "SELL"].includes(target.decision.action) || target.decision.quantity !== 100 || target.clientOrderId !== `v24-fixture-v2-${scope.testRunId}-${target.sessionDate.replaceAll("-", "")}`) throw new Error("C5_LOCAL_INTENT_TARGET_INVALID");
    const evaluation = Date.parse(target.evaluationAt);
    if (!Number.isFinite(evaluation) || acceptedMs < evaluation || shanghaiDate(acceptedMs) !== target.sessionDate || shanghaiTime(acceptedMs) < "09:31:00" || shanghaiTime(acceptedMs) >= "09:35:00") throw new Error("C5_LOCAL_INTENT_WINDOW_INVALID");
    const intent: V24LocalOrderIntent = { ...scope, targetId, clientOrderId: target.clientOrderId, security: "600000.SH", side: target.decision.action as "BUY" | "SELL", quantity: 100, acceptedAt: new Date(acceptedMs).toISOString(), status: "ACCEPTED_INTENT" };
    const inserted = await this.pool.query(`INSERT INTO v24_local_order_intents(target_id,test_run_id,owner_id,account_id,namespace,client_order_id,payload)
      SELECT t.target_id,t.test_run_id,t.owner_id,t.account_id,t.namespace,$6,$7::jsonb FROM v24_local_daily_targets t
      JOIN acceptance_stage_runs r ON r.test_run_id=t.test_run_id AND r.owner_id=t.owner_id AND r.namespace=t.namespace
      WHERE t.target_id=$1 AND t.test_run_id=$2 AND t.owner_id=$3 AND t.account_id=$4 AND t.namespace=$5 AND r.stage_id='V2.4' AND r.scenario_id='c5-local-engineering' AND r.scenario_version='1.0.0' AND r.status IN ('RUNNING','WAITING')
      ON CONFLICT DO NOTHING RETURNING payload`, [targetId, scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, intent.clientOrderId, JSON.stringify(intent)]);
    if (inserted.rows[0]) return { intent: inserted.rows[0].payload as V24LocalOrderIntent, created: true };
    const existing = await this.find(scope, intent.clientOrderId);
    if (!existing) throw new Error("C5_LOCAL_INTENT_SCOPE_OR_IDENTITY_CONFLICT");
    if (!isDeepStrictEqual(existing, intent)) throw new Error("C5_LOCAL_INTENT_IMMUTABLE_CONFLICT");
    return { intent: existing, created: false };
  }
  async find(scope: V24DailyTargetScope, clientOrderId: string): Promise<V24LocalOrderIntent | null> {
    const result = await this.pool.query(`SELECT i.payload FROM v24_local_order_intents i JOIN acceptance_stage_runs r ON r.test_run_id=i.test_run_id AND r.owner_id=i.owner_id AND r.namespace=i.namespace AND r.stage_id='V2.4' AND r.scenario_id='c5-local-engineering' AND r.scenario_version='1.0.0'
      WHERE i.test_run_id=$1 AND i.owner_id=$2 AND i.account_id=$3 AND i.namespace=$4 AND i.client_order_id=$5`, [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, clientOrderId]);
    return result.rows[0]?.payload as V24LocalOrderIntent ?? null;
  }
}
