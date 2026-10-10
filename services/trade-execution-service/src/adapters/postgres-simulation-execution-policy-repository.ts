import { createHash } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { V24ExecutionPolicy } from "../domain/v24-execution-policy.js";
import type { SimulationExecutionPolicyRepository } from "../ports/simulation-execution-policy-repository.js";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(policy: V24ExecutionPolicy): string {
  return createHash("sha256").update(canonical(policy)).digest("hex");
}

function validatePreparationPolicy(policy: V24ExecutionPolicy): void {
  if (policy.schemaVersion !== "v24-paper-execution-policy-v1"
    || policy.policyId !== "v24-snapshot-paper-policy"
    || policy.status !== "PREPARATION_ONLY"
    || policy.environmentMode !== "PAPER"
    || policy.brokerMode !== "FAKE"
    || policy.liveTradingEnabled !== false
    || !Array.isArray(policy.supportedMarkets)
    || policy.supportedMarkets.length !== 1
    || policy.supportedMarkets[0] !== "CN_A") {
    throw new Error("SIMULATION_POLICY_MUST_REMAIN_PREPARATION_ONLY_PAPER_FAKE");
  }
  if (!policy.policyVersion || policy.execution.model !== "SNAPSHOT"
    || policy.execution.windowTimeZone !== "Asia/Shanghai"
    || !Number.isSafeInteger(policy.quoteRules.freshnessLimitSeconds)
    || policy.quoteRules.freshnessLimitSeconds <= 0) {
    throw new Error("SIMULATION_POLICY_INVALID");
  }
}

export class PostgresSimulationExecutionPolicyRepository implements SimulationExecutionPolicyRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(queryable: Pool | PoolClient = this.pool): Promise<void> {
    await queryable.query(`
      CREATE TABLE IF NOT EXISTS simulation_execution_policies (
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        schema_version TEXT NOT NULL CHECK (schema_version = 'v24-paper-execution-policy-v1'),
        status TEXT NOT NULL CHECK (status = 'PREPARATION_ONLY'),
        environment_mode TEXT NOT NULL CHECK (environment_mode = 'PAPER'),
        broker_mode TEXT NOT NULL CHECK (broker_mode = 'FAKE'),
        live_trading_enabled BOOLEAN NOT NULL CHECK (live_trading_enabled = false),
        policy_sha256 TEXT NOT NULL CHECK (policy_sha256 ~ '^[0-9a-f]{64}$'),
        policy_json JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (policy_id, policy_version),
        CHECK (policy_json->>'policyId' = policy_id),
        CHECK (policy_json->>'policyVersion' = policy_version),
        CHECK (policy_json->>'schemaVersion' = schema_version),
        CHECK (policy_json->>'status' = status),
        CHECK (policy_json->>'environmentMode' = environment_mode),
        CHECK (policy_json->>'brokerMode' = broker_mode),
        CHECK ((policy_json->>'liveTradingEnabled')::boolean = live_trading_enabled)
      );
      CREATE OR REPLACE FUNCTION reject_simulation_execution_policy_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'SIMULATION_POLICY_VERSION_IS_IMMUTABLE';
      END;
      $$ LANGUAGE plpgsql;
      DO $$
      BEGIN
        PERFORM pg_advisory_xact_lock(hashtext('stockquant:simulation_execution_policies:immutable-trigger'));
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='simulation_execution_policies'::regclass AND tgname='simulation_execution_policies_immutable' AND NOT tgisinternal) THEN
          CREATE TRIGGER simulation_execution_policies_immutable
            BEFORE UPDATE OR DELETE ON simulation_execution_policies
            FOR EACH ROW EXECUTE FUNCTION reject_simulation_execution_policy_mutation();
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='simulation_execution_policies'::regclass AND tgname='simulation_execution_policies_no_truncate' AND NOT tgisinternal) THEN
          CREATE TRIGGER simulation_execution_policies_no_truncate
            BEFORE TRUNCATE ON simulation_execution_policies
            FOR EACH STATEMENT EXECUTE FUNCTION reject_simulation_execution_policy_mutation();
        END IF;
      END $$
    `);
  }

  async savePreparationPolicy(policy: V24ExecutionPolicy): Promise<void> {
    validatePreparationPolicy(policy);
    const policySha256 = digest(policy);
    await this.pool.query(`
      INSERT INTO simulation_execution_policies
        (policy_id, policy_version, schema_version, status, environment_mode, broker_mode,
         live_trading_enabled, policy_sha256, policy_json)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      ON CONFLICT (policy_id, policy_version) DO NOTHING
    `, [policy.policyId, policy.policyVersion, policy.schemaVersion, policy.status, policy.environmentMode,
      policy.brokerMode, policy.liveTradingEnabled, policySha256, JSON.stringify(policy)]);
    const stored = await this.pool.query<{ policy_sha256: string }>(
      "SELECT policy_sha256 FROM simulation_execution_policies WHERE policy_id=$1 AND policy_version=$2",
      [policy.policyId, policy.policyVersion]);
    if (stored.rowCount !== 1 || stored.rows[0].policy_sha256 !== policySha256) {
      throw new Error("SIMULATION_POLICY_VERSION_IS_IMMUTABLE");
    }
  }

  async load(policyId: string, policyVersion: string): Promise<V24ExecutionPolicy | null> {
    const result = await this.pool.query<{ policy_json: V24ExecutionPolicy; policy_sha256: string }>(
      "SELECT policy_json, policy_sha256 FROM simulation_execution_policies WHERE policy_id=$1 AND policy_version=$2",
      [policyId, policyVersion]);
    if (result.rowCount !== 1) return null;
    const policy = result.rows[0].policy_json;
    validatePreparationPolicy(policy);
    if (digest(policy) !== result.rows[0].policy_sha256) throw new Error("SIMULATION_POLICY_DIGEST_MISMATCH");
    return policy;
  }
}
