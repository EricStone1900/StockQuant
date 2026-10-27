import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { PostgresV24CandidateRiskStateRepository } from "../../src/adapters/postgres-v24-candidate-risk-state-repository.js";
import { initializeV24CandidateRiskState } from "../../src/application/v24-candidate-risk-state.js";

const url = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (!url || !/^sq-test-postgres-[a-f0-9]+$/u.test(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER ?? "")) throw new Error("Disposable PostgreSQL wrapper is required for C5 candidate risk integration");
const pool = new Pool({ connectionString: url });
const repository = new PostgresV24CandidateRiskStateRepository(pool);

const seed = async () => {
  const testRunId = randomUUID();
  const scope = { ownerId: `c5-risk-owner-${testRunId}`, accountId: randomUUID(), namespace: `v24-paper-v2-${testRunId}`, testRunId };
  await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','normal','2.3.0',$2,$3,'RUNNING',20261025,'[]','{}')", [scope.testRunId, scope.ownerId, scope.namespace]);
  const state = initializeV24CandidateRiskState({ ...scope, sessionDate: "2026-10-16", initialCash: "10000.0000", maxGrossExposure: "2000.0000", maxDailyTurnover: "2000.0000", cumulativeLossLimit: "200.0000", mandateStatus: "ACTIVE" });
  await repository.saveInitial(state);
  return scope;
};

const fill = { externalFillId: "11111111-1111-4111-8111-111111111111", security: "600000.SH", quantity: 100, price: "10.2500", currency: "CNY", tradeDate: "2026-10-16", grossExposure: "1025.0000", cumulativeLoss: "5.0000", reconciliation: "MATCH" as const };

beforeAll(async () => { await new PostgresStageRunRepository(pool).migrate(); await repository.migrate(); });
afterAll(async () => { await pool.end(); });

describe("C5 candidate risk state in real isolated PostgreSQL", () => {
  it("serializes concurrent Fill delivery, preserves exact replay, and survives a reconnect", async () => {
    const scope = await seed();
    const results = await Promise.all([repository.applyFill(scope, fill), repository.applyFill(scope, fill)]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ dailyTurnover: "1025.0000", grossExposure: "1025.0000", cumulativeLoss: "5.0000", appliedFills: [{ externalFillId: fill.externalFillId }] });
    const reopenedPool = new Pool({ connectionString: url });
    try {
      const reopened = new PostgresV24CandidateRiskStateRepository(reopenedPool);
      expect(await reopened.applyFill(scope, fill)).toEqual(results[0]);
      await expect(reopened.applyFill(scope, { ...fill, price: "10.2600" })).rejects.toThrow("C5_RISK_FILL_CONFLICT");
      expect(await reopened.find(scope.testRunId, scope.ownerId, scope.accountId, scope.namespace)).toEqual(results[0]);
    } finally { await reopenedPool.end(); }
  });

  it("does not allow a foreign scope or unreconciled Fill to change state", async () => {
    const scope = await seed();
    await expect(repository.applyFill({ ...scope, ownerId: "foreign" }, fill)).rejects.toThrow("C5_RISK_STATE_NOT_FOUND");
    await expect(repository.applyFill(scope, { ...fill, reconciliation: "DISCREPANCY" as never })).rejects.toThrow("C5_RISK_FILL_INPUT_INVALID");
    expect(await repository.find(scope.testRunId, scope.ownerId, scope.accountId, scope.namespace)).toMatchObject({ dailyTurnover: "0.0000", appliedFills: [] });
  });
  it("requires recorded approval before rolling a threshold-paused day into a later active session", async () => {
    const scope = await seed();
    const paused = await repository.applyFacts(scope, { dailyTurnover: "2000.0001", grossExposure: "0.0000", cumulativeLoss: "0.0000" });
    expect(paused).toMatchObject({ status: "PAUSED", reason: "DAILY_TURNOVER_LIMIT" });
    await expect(repository.advanceSession(scope, { nextSessionDate: "2026-10-17", grossExposure: "0.0000", cumulativeLoss: "0.0000", reconciliation: "MATCH" })).rejects.toThrow("C5_RISK_SESSION_APPROVAL_REQUIRED");
    const resumed = await repository.advanceSession(scope, { nextSessionDate: "2026-10-17", grossExposure: "0.0000", cumulativeLoss: "0.0000", reconciliation: "MATCH", recoveryApproval: { approvedBy: "fixture-operator", approvedAt: "2026-10-17T09:30:00+08:00" } });
    expect(resumed).toMatchObject({ sessionDate: "2026-10-17", status: "ACTIVE", dailyTurnover: "0.0000", sessionTransitions: [{ approvedBy: "fixture-operator" }] });
  });
});
