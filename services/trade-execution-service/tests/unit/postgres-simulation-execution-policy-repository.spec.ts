import { describe, expect, it } from "vitest";
import type { Pool } from "pg";
import type { V24ExecutionPolicy } from "../../src/domain/v24-execution-policy.js";
import { PostgresSimulationExecutionPolicyRepository } from "../../src/adapters/postgres-simulation-execution-policy-repository.js";

const policy: V24ExecutionPolicy = {
  schemaVersion: "v24-paper-execution-policy-v1", policyId: "v24-snapshot-paper-policy", policyVersion: "1.0.0",
  status: "PREPARATION_ONLY", environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false,
  supportedMarkets: ["CN_A"], signal: { frequency: "DAILY_BAR", asOfRequired: true, strategyVersion: "UNSET" },
  execution: { model: "SNAPSHOT", windowTimeZone: "Asia/Shanghai", windowStart: "09:31", windowEndExclusive: "09:35", requiresMandate: true, mandateVersion: "UNSET" },
  quoteRules: { priceBasis: "FIRST_QUALIFYING_SNAPSHOT", mustBeObservedAfterAcceptance: true, freshnessLimitSeconds: 1800, maxDeviationBps: null },
  approval: { riskPolicyVersion: "UNSET", feePolicyVersion: "UNSET" },
  risk: { requiresPassingEvaluation: true, requiresResourceReservation: true },
  configurationGaps: ["STRATEGY_VERSION", "MANDATE_VERSION", "MAX_DEVIATION_BPS", "RISK_POLICY_VERSION", "FEE_POLICY_VERSION", "US_MARKET_POLICY"]
};

function reorderKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reorderKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => right.localeCompare(left)).map(([key, child]) => [key, reorderKeys(child)]));
  return value;
}

describe("PostgresSimulationExecutionPolicyRepository", () => {
  it("keeps policy versions immutable and validates JSONB key reordering by canonical digest", async () => {
    let stored: { policy_sha256: string; policy_json: V24ExecutionPolicy } | null = null;
    const pool = { query: async (sql: string, values: unknown[] = []) => {
      if (sql.includes("INSERT INTO simulation_execution_policies")) {
        if (!stored) stored = { policy_sha256: values[7] as string, policy_json: JSON.parse(values[8] as string) as V24ExecutionPolicy };
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes("SELECT policy_sha256 FROM simulation_execution_policies")) return { rowCount: stored ? 1 : 0, rows: stored ? [{ policy_sha256: stored.policy_sha256 }] : [] };
      if (sql.includes("SELECT policy_json, policy_sha256 FROM simulation_execution_policies")) {
        return { rowCount: stored ? 1 : 0, rows: stored ? [{ policy_json: reorderKeys(stored.policy_json) as V24ExecutionPolicy, policy_sha256: stored.policy_sha256 }] : [] };
      }
      throw new Error("unexpected SQL");
    } } as unknown as Pool;
    const repository = new PostgresSimulationExecutionPolicyRepository(pool);
    await repository.savePreparationPolicy(policy);
    await expect(repository.load(policy.policyId, policy.policyVersion)).resolves.toEqual(policy);
    await expect(repository.savePreparationPolicy({ ...policy, quoteRules: { ...policy.quoteRules, freshnessLimitSeconds: 900 } })).rejects.toThrow("SIMULATION_POLICY_VERSION_IS_IMMUTABLE");
  });

  it("rejects any attempt to persist a live, non-fake, or enabled policy before database access", async () => {
    let queries = 0;
    const pool = { query: async () => { queries += 1; return { rowCount: 0, rows: [] }; } } as unknown as Pool;
    const repository = new PostgresSimulationExecutionPolicyRepository(pool);
    await expect(repository.savePreparationPolicy({ ...policy, liveTradingEnabled: true } as unknown as V24ExecutionPolicy)).rejects.toThrow("SIMULATION_POLICY_MUST_REMAIN_PREPARATION_ONLY_PAPER_FAKE");
    await expect(repository.savePreparationPolicy({ ...policy, brokerMode: "REAL" } as unknown as V24ExecutionPolicy)).rejects.toThrow("SIMULATION_POLICY_MUST_REMAIN_PREPARATION_ONLY_PAPER_FAKE");
    expect(queries).toBe(0);
  });
});
