import type { Pool, PoolClient } from "pg";

export type SamplingPolicyId = "snapshotSampling" | "monitorEvaluation" | "dailyBarCompletion" | "strategyEvaluation" | "orderExecution";
export type SamplingPolicy = {
  policyId: SamplingPolicyId;
  version: number;
  enabled: boolean;
  trigger: "FIXED_INTERVAL" | "ON_QUOTE_AVAILABLE" | "AFTER_SESSION_CLOSE" | "ON_DAILY_BAR_READY" | "C5_EXECUTION_WINDOW";
  intervalMinutes: 20 | 30 | null;
  timezone: "Asia/Shanghai";
  windows: Array<{ name: string; start: string; end: string }>;
  activationGate: "SOURCE_AUTHORIZATION" | "DATA_READY" | "OD007_APPROVAL" | "C5_APPROVAL";
  executor: "CONFIGURED" | "NOT_IMPLEMENTED";
  updatedAt: string | null;
};

const defaults: Record<SamplingPolicyId, Omit<SamplingPolicy, "version" | "updatedAt">> = {
  snapshotSampling: { policyId: "snapshotSampling", enabled: false, trigger: "FIXED_INTERVAL", intervalMinutes: 30, timezone: "Asia/Shanghai", windows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], activationGate: "SOURCE_AUTHORIZATION", executor: "CONFIGURED" },
  monitorEvaluation: { policyId: "monitorEvaluation", enabled: false, trigger: "ON_QUOTE_AVAILABLE", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "DATA_READY", executor: "CONFIGURED" },
  dailyBarCompletion: { policyId: "dailyBarCompletion", enabled: false, trigger: "AFTER_SESSION_CLOSE", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "DATA_READY", executor: "CONFIGURED" },
  strategyEvaluation: { policyId: "strategyEvaluation", enabled: false, trigger: "ON_DAILY_BAR_READY", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "OD007_APPROVAL", executor: "NOT_IMPLEMENTED" },
  orderExecution: { policyId: "orderExecution", enabled: false, trigger: "C5_EXECUTION_WINDOW", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "C5_APPROVAL", executor: "NOT_IMPLEMENTED" },
};

type PolicyRow = { policy_id: SamplingPolicyId; policy_version: number; policy_json: Omit<SamplingPolicy, "version" | "updatedAt">; updated_at: Date };

export class PostgresSamplingPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`CREATE TABLE IF NOT EXISTS market_data_sampling_policies (
      policy_id TEXT PRIMARY KEY CHECK (policy_id IN ('snapshotSampling','monitorEvaluation','dailyBarCompletion','strategyEvaluation','orderExecution')),
      policy_version INTEGER NOT NULL CHECK (policy_version >= 0),
      policy_json JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    for (const policyId of Object.keys(defaults) as SamplingPolicyId[]) {
      await queryable.query(`INSERT INTO market_data_sampling_policies(policy_id,policy_version,policy_json)
        VALUES($1,$2,$3::jsonb) ON CONFLICT(policy_id) DO NOTHING`, [policyId, policyId === "snapshotSampling" ? 0 : 1, JSON.stringify(defaults[policyId])]);
    }
  }

  async list(): Promise<SamplingPolicy[]> {
    const result = await this.pool.query<PolicyRow>("SELECT policy_id,policy_version,policy_json,updated_at FROM market_data_sampling_policies ORDER BY CASE policy_id WHEN 'snapshotSampling' THEN 1 WHEN 'monitorEvaluation' THEN 2 WHEN 'dailyBarCompletion' THEN 3 WHEN 'strategyEvaluation' THEN 4 ELSE 5 END");
    return result.rows.map((row) => ({ ...row.policy_json, policyId: row.policy_id, version: row.policy_version, updatedAt: new Date(row.updated_at).toISOString() }));
  }

  async updateSnapshotInterval(intervalMinutes: 20 | 30, version: number, queryable: Pool | PoolClient = this.pool): Promise<SamplingPolicy> {
    const result = await queryable.query<PolicyRow>(`UPDATE market_data_sampling_policies
      SET policy_version=$2, policy_json=jsonb_set(policy_json,'{intervalMinutes}',to_jsonb($1::integer)),updated_at=now()
      WHERE policy_id='snapshotSampling' RETURNING policy_id,policy_version,policy_json,updated_at`, [intervalMinutes, version]);
    const row = result.rows[0];
    if (!row) throw new Error("SNAPSHOT_SAMPLING_POLICY_NOT_INITIALIZED");
    return { ...row.policy_json, policyId: row.policy_id, version: row.policy_version, updatedAt: new Date(row.updated_at).toISOString() };
  }

  async setMonitorEvaluationEnabled(enabled: boolean, queryable: Pool | PoolClient = this.pool): Promise<SamplingPolicy> {
    if (typeof enabled !== "boolean") throw new Error("INVALID_MONITOR_EVALUATION_POLICY");
    const result = await queryable.query<PolicyRow>(`UPDATE market_data_sampling_policies
      SET policy_version=policy_version + CASE WHEN (policy_json->>'enabled')::boolean=$1 THEN 0 ELSE 1 END,
          policy_json=jsonb_set(policy_json,'{enabled}',to_jsonb($1::boolean)),updated_at=CASE WHEN (policy_json->>'enabled')::boolean=$1 THEN updated_at ELSE now() END
      WHERE policy_id='monitorEvaluation' RETURNING policy_id,policy_version,policy_json,updated_at`, [enabled]);
    const row = result.rows[0];
    if (!row) throw new Error("MONITOR_EVALUATION_POLICY_NOT_INITIALIZED");
    return { ...row.policy_json, policyId: row.policy_id, version: row.policy_version, updatedAt: new Date(row.updated_at).toISOString() };
  }

  async setDailyBarCompletionEnabled(enabled: boolean, queryable: Pool | PoolClient = this.pool): Promise<SamplingPolicy> {
    if (typeof enabled !== "boolean") throw new Error("INVALID_DAILY_BAR_COMPLETION_POLICY");
    const result = await queryable.query<PolicyRow>(`UPDATE market_data_sampling_policies
      SET policy_version=policy_version + CASE WHEN (policy_json->>'enabled')::boolean=$1 THEN 0 ELSE 1 END,
          policy_json=jsonb_set(jsonb_set(policy_json,'{enabled}',to_jsonb($1::boolean)),'{executor}','"CONFIGURED"'::jsonb),
          updated_at=CASE WHEN (policy_json->>'enabled')::boolean=$1 AND policy_json->>'executor'='CONFIGURED' THEN updated_at ELSE now() END
      WHERE policy_id='dailyBarCompletion' RETURNING policy_id,policy_version,policy_json,updated_at`, [enabled]);
    const row = result.rows[0];
    if (!row) throw new Error("DAILY_BAR_COMPLETION_POLICY_NOT_INITIALIZED");
    return { ...row.policy_json, policyId: row.policy_id, version: row.policy_version, updatedAt: new Date(row.updated_at).toISOString() };
  }
}
