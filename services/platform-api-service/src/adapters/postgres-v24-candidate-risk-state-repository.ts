import { isDeepStrictEqual } from "node:util";
import type { Pool } from "pg";
import { advanceV24CandidateRiskSession, applyV24CandidateRiskFacts, applyV24CandidateRiskFill, type V24CandidateRiskState, type V24CandidateRiskStateRepository } from "../application/v24-candidate-risk-state.js";

export class PostgresV24CandidateRiskStateRepository implements V24CandidateRiskStateRepository {
  constructor(private readonly pool: Pool) {}
  async migrate(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS v24_candidate_risk_states (
      test_run_id UUID PRIMARY KEY REFERENCES acceptance_stage_runs(test_run_id), owner_id TEXT NOT NULL,
      account_id UUID NOT NULL, namespace TEXT NOT NULL, payload JSONB NOT NULL,
      UNIQUE(test_run_id,owner_id,account_id,namespace)
    )`);
  }
  async saveInitial(state: V24CandidateRiskState): Promise<{ state: V24CandidateRiskState; created: boolean }> {
    const result = await this.pool.query<{ payload: V24CandidateRiskState }>(`INSERT INTO v24_candidate_risk_states(test_run_id,owner_id,account_id,namespace,payload)
      SELECT $1,$2,$3,$4,$5::jsonb FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND namespace=$4 AND stage_id='V2.4'
      ON CONFLICT DO NOTHING RETURNING payload`, [state.testRunId, state.ownerId, state.accountId, state.namespace, JSON.stringify(state)]);
    if (result.rows[0]) return { state: result.rows[0].payload, created: true };
    const existing = await this.find(state.testRunId, state.ownerId, state.accountId, state.namespace);
    if (!existing || !isDeepStrictEqual(existing, JSON.parse(JSON.stringify(state)))) throw new Error("C5_RISK_STATE_IMMUTABLE_CONFLICT");
    return { state: existing, created: false };
  }
  async find(testRunId: string, ownerId: string, accountId: string, namespace: string): Promise<V24CandidateRiskState | null> {
    const result = await this.pool.query<{ payload: V24CandidateRiskState }>("SELECT payload FROM v24_candidate_risk_states WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4", [testRunId, ownerId, accountId, namespace]);
    return result.rows[0]?.payload ?? null;
  }
  async applyFacts(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, facts: { dailyTurnover: string; grossExposure: string; cumulativeLoss: string }): Promise<V24CandidateRiskState> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ payload: V24CandidateRiskState }>("SELECT payload FROM v24_candidate_risk_states WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4 FOR UPDATE", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace]);
      if (!current.rows[0]) throw new Error("C5_RISK_STATE_NOT_FOUND");
      const state = applyV24CandidateRiskFacts(current.rows[0].payload, facts);
      await client.query("UPDATE v24_candidate_risk_states SET payload=$5::jsonb WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, JSON.stringify(state)]);
      await client.query("COMMIT");
      return state;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async applyFill(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, input: Parameters<typeof applyV24CandidateRiskFill>[1]): Promise<V24CandidateRiskState> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ payload: V24CandidateRiskState }>("SELECT payload FROM v24_candidate_risk_states WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4 FOR UPDATE", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace]);
      if (!current.rows[0]) throw new Error("C5_RISK_STATE_NOT_FOUND");
      const state = applyV24CandidateRiskFill(current.rows[0].payload, input);
      await client.query("UPDATE v24_candidate_risk_states SET payload=$5::jsonb WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, JSON.stringify(state)]);
      await client.query("COMMIT");
      return state;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async advanceSession(scope: Pick<V24CandidateRiskState, "testRunId" | "ownerId" | "accountId" | "namespace">, input: Parameters<typeof advanceV24CandidateRiskSession>[1]): Promise<V24CandidateRiskState> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query<{ payload: V24CandidateRiskState }>("SELECT payload FROM v24_candidate_risk_states WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4 FOR UPDATE", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace]);
      if (!current.rows[0]) throw new Error("C5_RISK_STATE_NOT_FOUND");
      const state = advanceV24CandidateRiskSession(current.rows[0].payload, input);
      await client.query("UPDATE v24_candidate_risk_states SET payload=$5::jsonb WHERE test_run_id=$1 AND owner_id=$2 AND account_id=$3 AND namespace=$4", [scope.testRunId, scope.ownerId, scope.accountId, scope.namespace, JSON.stringify(state)]);
      await client.query("COMMIT");
      return state;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
}
