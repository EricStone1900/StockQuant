import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgBudgetLedger } from "../../src/adapters/pg-budget-ledger.js";
import { PgExperimentRepository } from "../../src/adapters/pg-experiment-repository.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "research_automation_test") throw new Error("RESEARCH_AUTOMATION_DATABASE_URL must target the isolated research_automation_test database");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.1 budget ledger", () => {
  const pool = new Pool({ connectionString });
  const stageId = `test-${randomUUID()}`;
  const transientStageIds = [stageId];
  const testRunId = randomUUID();
  const testRunStage = `test-run-${randomUUID()}`;
  transientStageIds.push(testRunStage);
  const ledger = new PgBudgetLedger(pool, 100, 80, 80, stageId);
  const testRunLedger = new PgBudgetLedger(pool, 200, 100, 80, testRunStage, 12, 200);

  beforeAll(async () => { await ledger.initialize(); await testRunLedger.initialize(); await new PgExperimentRepository(pool).initialize(); });
  afterAll(async () => {
    await pool.query("DELETE FROM research_experiments WHERE test_run_id=$1", [testRunId]);
    for (const testStageId of transientStageIds) {
      await pool.query("DELETE FROM research_budget_test_run_limits WHERE stage_id=$1", [testStageId]);
      await pool.query("DELETE FROM research_budget_allocations WHERE stage_id=$1", [testStageId]);
      await pool.query("DELETE FROM research_budget_stage_limits WHERE stage_id=$1", [testStageId]);
    }
    await pool.end();
  });

  it("preserves idempotent reservations, UNKNOWN holds, settlement, and stage limits", async () => {
    const initial = await ledger.reserve("exp-1", 80);
    await expect(ledger.reserve("exp-1", 80)).resolves.toEqual(initial);
    await expect(ledger.reserve("exp-1", 1)).rejects.toThrow("different budget");
    await expect(ledger.settle("exp-1", "UNKNOWN")).resolves.toMatchObject({ status: "UNKNOWN" });
    await expect(ledger.reserve("exp-1", 80)).rejects.toThrow("UNKNOWN");
    await expect(ledger.settle("exp-1", 10)).resolves.toMatchObject({ status: "SETTLED", spentCents: 10, reservedCents: 80 });
    await expect(ledger.settle("exp-1", 10)).resolves.toMatchObject({ status: "SETTLED", spentCents: 10 });
    await expect(ledger.settle("exp-1", 11)).rejects.toThrow("cannot be changed");
    await expect(ledger.reserve("exp-2", 80)).resolves.toMatchObject({ status: "RESERVED" });
    await expect(ledger.reserve("exp-3", 20)).rejects.toThrow("stage budget exhausted");
    await expect(ledger.get("exp-1")).resolves.toMatchObject({ status: "SETTLED", spentCents: 10 });
  });

  it("serializes concurrent reservations against the stage budget", async () => {
    const parallelStageId = `parallel-${randomUUID()}`;
    transientStageIds.push(parallelStageId);
    const parallel = new PgBudgetLedger(pool, 100, 80, 80, parallelStageId);
    await parallel.initialize();
    const results = await Promise.allSettled([parallel.reserve("exp-a", 60), parallel.reserve("exp-b", 60)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("atomically caps cumulative TestRun reservations and preserves UNKNOWN holds", async () => {
    const runCapStage = `run-cap-${randomUUID()}`;
    transientStageIds.push(runCapStage);
    const runCap = new PgBudgetLedger(pool, 300, 100, 80, runCapStage, 12, 100);
    await runCap.initialize();
    await runCap.reserve("run-cap-a", 60, testRunId);
    await runCap.settle("run-cap-a", 20);
    await expect(runCap.reserve("run-cap-b", 81, testRunId)).rejects.toThrow("TestRun budget exhausted");
    await runCap.reserve("run-cap-b", 80, testRunId);
    await runCap.settle("run-cap-b", "UNKNOWN");
    await expect(runCap.reserve("run-cap-c", 1, testRunId)).rejects.toThrow("TestRun budget exhausted");
    await expect(runCap.reserve("run-cap-other", 100, randomUUID())).resolves.toMatchObject({ status: "RESERVED" });
    const parallelStage = `run-cap-parallel-${randomUUID()}`;
    transientStageIds.push(parallelStage);
    const parallel = new PgBudgetLedger(pool, 300, 100, 80, parallelStage, 12, 100);
    await parallel.initialize();
    const results = await Promise.allSettled([parallel.reserve("parallel-a", 60, testRunId), parallel.reserve("parallel-b", 60, testRunId)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("persists an immutable per-TestRun cap and rejects over-cap reservations without ledger mutation", async () => {
    const boundedStage = `run-fixed-cap-${randomUUID()}`;
    transientStageIds.push(boundedStage);
    const bounded = new PgBudgetLedger(pool, 300, 100, 80, boundedStage, 12, 100);
    await bounded.initialize();
    const boundedRun = randomUUID();
    await expect(bounded.configureTestRunBudget(boundedRun, 50)).resolves.toBe(50);
    await expect(bounded.configureTestRunBudget(boundedRun, 50)).resolves.toBe(50);
    await bounded.reserve("prior-settled", 20, boundedRun);
    await bounded.settle("prior-settled", 20);
    await bounded.reserve("prior-reserved", 20, boundedRun);
    await expect(bounded.reserve("over-cap", 15, boundedRun)).rejects.toThrow("TestRun budget exhausted");
    await expect(bounded.get("over-cap")).resolves.toBeNull();
    await expect(bounded.get("prior-reserved")).resolves.toMatchObject({ status: "RESERVED", reservedCents: 20, spentCents: 0 });
    await expect(bounded.configureTestRunBudget(boundedRun, 51)).rejects.toThrow("immutable");
    await expect(bounded.configureTestRunBudget(randomUUID(), 101)).rejects.toThrow("invalid");
    const precommittedRun = randomUUID();
    await bounded.reserve("precommitted", 40, precommittedRun);
    await expect(bounded.configureTestRunBudget(precommittedRun, 30)).rejects.toThrow("below its existing commitment");
    await expect(bounded.get("precommitted")).resolves.toMatchObject({ status: "RESERVED", reservedCents: 40 });
  });

  it("persists one-based round allocations and atomically enforces each round cap", async () => {
    const roundStage = `round-cap-${randomUUID()}`;
    transientStageIds.push(roundStage);
    const rounds = new PgBudgetLedger(pool, 300, 100, 80, roundStage, 12, 100);
    await rounds.initialize();
    await rounds.reserve("exp-rounds", 100, randomUUID(), 2);
    await expect(rounds.reserveModelCall("exp-rounds", "missing-round", "a".repeat(64), 1)).rejects.toThrow("roundIndex is required");
    const first = await rounds.reserveModelCall("exp-rounds", "round-one", "b".repeat(64), 40, 1);
    expect(first.reservation.roundIndex).toBe(1);
    await rounds.dispatchModelCall("exp-rounds", "round-one");
    await rounds.markModelCallUnknown("exp-rounds", "round-one");
    await expect(rounds.reserveModelCall("exp-rounds", "round-one-retry", "c".repeat(64), 11, 1)).rejects.toThrow("round model-call budget exhausted");
    const second = await rounds.reserveModelCall("exp-rounds", "round-two", "d".repeat(64), 50, 2);
    expect(second.reservation.roundIndex).toBe(2);
    await expect(rounds.reserveModelCall("exp-rounds", "round-three", "e".repeat(64), 1, 3)).rejects.toThrow("roundIndex is outside");
    await expect(rounds.reserveModelCall("exp-rounds", "round-one", "b".repeat(64), 40, 2)).rejects.toThrow("reused with different");
    await expect(pool.query("SELECT round_index FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id='exp-rounds' ORDER BY model_run_id", [roundStage])).resolves.toMatchObject({ rows: [{ round_index: 1 }, { round_index: 2 }] });
  });

  it("persists a per-experiment call-count ceiling and rejects the next unique call", async () => {
    const cappedStage = `call-cap-${randomUUID()}`;
    transientStageIds.push(cappedStage);
    const capped = new PgBudgetLedger(pool, 100, 80, 80, cappedStage, 2);
    await capped.initialize();
    await capped.reserve("exp-cap", 80);
    for (const modelRunId of ["cap-call-1", "cap-call-2"]) {
      await capped.reserveModelCall("exp-cap", modelRunId, "a".repeat(64), 1);
      await capped.dispatchModelCall("exp-cap", modelRunId);
      await capped.settleModelCall("exp-cap", modelRunId, 1);
    }
    await expect(capped.reserveModelCall("exp-cap", "cap-call-3", "b".repeat(64), 1)).rejects.toThrow("call count limit");
    const restartedWithDifferentLimit = new PgBudgetLedger(pool, 100, 80, 80, cappedStage, 3);
    await expect(restartedWithDifferentLimit.initialize()).rejects.toThrow("persisted budget limits differ");
  });

  it("serializes per-request reservations and retains dispatched UNKNOWN cost until reconciliation", async () => {
    const modelStageId = `model-${randomUUID()}`;
    transientStageIds.push(modelStageId);
    const modelLedger = new PgBudgetLedger(pool, 100, 80, 80, modelStageId);
    await modelLedger.initialize();
    await modelLedger.reserve("exp-model", 80);

    const initial = await modelLedger.reserveModelCall("exp-model", "model-run-1", "a".repeat(64), 60);
    expect(initial).toMatchObject({ created: true, reservation: { status: "RESERVED", reservedCents: 60 } });
    expect(await modelLedger.reserveModelCall("exp-model", "model-run-1", "a".repeat(64), 60)).toMatchObject({ created: false, reservation: { status: "RESERVED" } });
    await expect(modelLedger.reserveModelCall("exp-model", "model-run-1", "b".repeat(64), 60)).rejects.toThrow("reused with different");
    await modelLedger.dispatchModelCall("exp-model", "model-run-1");
    const usageEvidence = { provider: "siliconflow", model: "Qwen/Qwen3-Embedding-4B", requestId: "trace-pg-1", inputTokens: 32, outputTokens: 0, tariffVersion: "2026-09-30", costBasis: "ESTIMATE" as const, invoiceReconciliation: "NOT_PERFORMED" as const };
    await modelLedger.recordModelCallEvidence("exp-model", "model-run-1", usageEvidence);
    await modelLedger.markModelCallUnknown("exp-model", "model-run-1");
    await expect(modelLedger.snapshot(["exp-model", "not-present"])).resolves.toEqual([{
      experimentId: "exp-model", requestedCents: 80, reservedCents: 80, rounds: 1, spentCents: 0, status: "RESERVED",
      modelCallSettledCents: 0, modelCallUnknownReservedCents: 60,
    }]);
    await expect(modelLedger.reserveModelCall("exp-model", "model-run-2", "c".repeat(64), 21)).rejects.toThrow("budget exhausted");
    await expect(modelLedger.settle("exp-model", 0)).rejects.toThrow("model call budget remains unresolved");

    const restartedLedger = new PgBudgetLedger(pool, 100, 80, 80, modelStageId);
    const recovered = await restartedLedger.reserveModelCall("exp-model", "model-run-1", "a".repeat(64), 60);
    expect(recovered).toMatchObject({ created: false, reservation: { status: "UNKNOWN", reservedCents: 60, providerEvidence: usageEvidence } });
    await expect(restartedLedger.recordModelCallEvidence("exp-model", "model-run-1", usageEvidence)).resolves.toMatchObject({ providerEvidence: usageEvidence });
    await restartedLedger.settleModelCall("exp-model", "model-run-1", 40);
    await expect(restartedLedger.snapshot(["exp-model"])).resolves.toMatchObject([{ modelCallSettledCents: 40, modelCallUnknownReservedCents: 0 }]);
    const parallel = await Promise.allSettled([
      modelLedger.reserveModelCall("exp-model", "model-run-2", "c".repeat(64), 40),
      modelLedger.reserveModelCall("exp-model", "model-run-3", "d".repeat(64), 40),
    ]);
    expect(parallel.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(parallel.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(restartedLedger.settleModelCall("exp-model", "model-run-1", 40)).resolves.toMatchObject({ status: "SETTLED", spentCents: 40 });
    const run2 = await modelLedger.getModelCall("exp-model", "model-run-2");
    const run3 = await modelLedger.getModelCall("exp-model", "model-run-3");
    const winner = run2?.status === "RESERVED" ? run2 : run3;
    expect(winner).toBeTruthy();
    if (!winner) throw new Error("one concurrent model call reservation should have succeeded");
    const loser = winner.modelRunId === "model-run-2" ? "model-run-3" : "model-run-2";
    await modelLedger.dispatchModelCall("exp-model", winner.modelRunId);
    await modelLedger.settleModelCall("exp-model", winner.modelRunId, 20);
    expect(await modelLedger.getModelCall("exp-model", loser)).toBeNull();
    await expect(modelLedger.settle("exp-model", 60)).resolves.toMatchObject({ status: "SETTLED", spentCents: 60 });
    await expect(modelLedger.reserveModelCall("exp-model", "model-run-4", "e".repeat(64), 1)).rejects.toThrow("unavailable");
  });

  it("summarizes every unique experiment for a TestRun across pages without summing retries", async () => {
    const testRunIndex = await pool.query<{ indexdef: string }>("SELECT indexdef FROM pg_indexes WHERE tablename='research_experiments' AND indexname='research_experiments_test_run_created_idx'");
    expect(testRunIndex.rows[0]?.indexdef).toContain("(test_run_id, created_at, experiment_id)");
    const experimentIds = [randomUUID(), randomUUID(), randomUUID()];
    for (const [index, experimentId] of experimentIds.entries()) {
      await pool.query(`INSERT INTO research_experiments(experiment_id,fixture_id,model_profile,test_run_id,rounds,budget_currency,budget_cents,environment_mode,broker_mode,idempotency_key,status,reason,created_at)
        VALUES($1,'fixture-v3.3','UNSET',$2,$3,'USD',$4,'RESEARCH','FAKE',$5,'PENDING_PREREQUISITES','synthetic budget summary fixture',now())`, [experimentId, testRunId, index + 1, index === 0 ? 80 : index === 1 ? 20 : 10, `summary-${experimentId}`]);
      await testRunLedger.reserve(experimentId, index === 0 ? 80 : index === 1 ? 20 : 10, testRunId, index + 1);
    }
    await testRunLedger.reserveModelCall(experimentIds[0], "attempt-one", "a".repeat(64), 60);
    await testRunLedger.dispatchModelCall(experimentIds[0], "attempt-one");
    await testRunLedger.settleModelCall(experimentIds[0], "attempt-one", 40);
    await testRunLedger.reserveModelCall(experimentIds[0], "retry-one", "b".repeat(64), 15);
    await testRunLedger.dispatchModelCall(experimentIds[0], "retry-one");
    await testRunLedger.markModelCallUnknown(experimentIds[0], "retry-one");
    await testRunLedger.settle(experimentIds[1], "UNKNOWN");

    const firstPage = await testRunLedger.snapshotForTestRun(testRunId, 0, 1);
    const secondPage = await testRunLedger.snapshotForTestRun(testRunId, 1, 1);
    const thirdPage = await testRunLedger.snapshotForTestRun(testRunId, 2, 1);
    expect(firstPage.rows).toHaveLength(1);
    expect(firstPage.hasMore).toBe(true);
    expect(secondPage.rows).toHaveLength(1);
    expect(secondPage.hasMore).toBe(true);
    expect(thirdPage.rows).toHaveLength(1);
    expect(thirdPage.hasMore).toBe(false);
    expect(new Set([...firstPage.rows, ...secondPage.rows, ...thirdPage.rows].map((row) => row.experimentId))).toEqual(new Set(experimentIds));
    expect(firstPage.totals).toEqual({ experiments: 3, requestedCents: 110, reservedCents: 110, settledCents: 40, unknownReservedCents: 35, modelCallCount: 2 });
    const pagedRows = [...firstPage.rows, ...secondPage.rows, ...thirdPage.rows];
    const attemptRow = pagedRows.find((row) => row.experimentId === experimentIds[0]);
    expect(attemptRow).toMatchObject({ rounds: 1, requestedCents: 80, reservedCents: 80, status: "RESERVED", settledCents: 40, unknownReservedCents: 15, modelCallCount: 2 });
    expect(pagedRows.find((row) => row.experimentId === experimentIds[1])).toMatchObject({ status: "UNKNOWN", reservedCents: 20, unknownReservedCents: 20 });
    const cursorPages = [await testRunLedger.snapshotForTestRun(testRunId, 0, 1, null)];
    while (cursorPages.at(-1)?.nextAfterCursor) cursorPages.push(await testRunLedger.snapshotForTestRun(testRunId, 0, 1, cursorPages.at(-1)?.nextAfterCursor ?? null));
    expect(cursorPages).toHaveLength(3);
    expect(cursorPages[0]?.totals).toEqual(firstPage.totals);
    expect(cursorPages.slice(1).every((page) => page.totals === null)).toBe(true);
    expect(cursorPages.flatMap((page) => page.rows.map((row) => row.experimentId))).toEqual([...firstPage.rows, ...secondPage.rows, ...thirdPage.rows].map((row) => row.experimentId));
    await expect(testRunLedger.snapshotForTestRun(testRunId, 1, 1, firstPage.nextAfterCursor)).rejects.toThrow("cursor pagination requires offset 0");
    await expect(testRunLedger.snapshotForTestRun(testRunId, 0, 1, "not-a-cursor")).rejects.toThrow("afterCursor is invalid");
    await expect(testRunLedger.snapshotForTestRun(randomUUID(), 0, 10)).resolves.toMatchObject({ rows: [], totals: { experiments: 0, requestedCents: 0 } });
  });

  it("settles an Experiment only from exactly one settled model-call ledger row per round", async () => {
    const ledgerStage = `ledger-settle-stage-${randomUUID()}`;
    transientStageIds.push(ledgerStage);
    const ledgerFromCalls = new PgBudgetLedger(pool, 300, 100, 80, ledgerStage, 12, 300);
    await ledgerFromCalls.initialize();
    const experimentId = `ledger-settle-${randomUUID()}`;
    const runId = randomUUID();
    await ledgerFromCalls.reserve(experimentId, 80, runId, 2);
    for (const [roundIndex, cents] of [[1, 23], [2, 23]] as const) {
      const modelRunId = `ledger-run-${roundIndex}-${randomUUID()}`;
      await ledgerFromCalls.reserveModelCall(experimentId, modelRunId, `${roundIndex}`.repeat(64), 40, roundIndex);
      await ledgerFromCalls.dispatchModelCall(experimentId, modelRunId);
      await ledgerFromCalls.settleModelCall(experimentId, modelRunId, cents);
    }
    await expect(ledgerFromCalls.settleFromModelCalls(experimentId, randomUUID(), 2)).rejects.toThrow("does not match the requested TestRun");
    await expect(ledgerFromCalls.settleFromModelCalls(experimentId, runId, 2)).resolves.toEqual({
      experimentId, testRunId: runId, requestedCents: 80, reservedCents: 80, spentCents: 46, status: "SETTLED", modelCallCount: 2,
      rounds: [{ roundIndex: 1, settledCents: 23 }, { roundIndex: 2, settledCents: 23 }],
    });
    await expect(ledgerFromCalls.settleFromModelCalls(experimentId, runId, 2)).resolves.toMatchObject({ status: "SETTLED", spentCents: 46 });
  });

  it("does not settle from a model-call ledger with an unresolved round", async () => {
    const ledgerStage = `ledger-unresolved-stage-${randomUUID()}`;
    transientStageIds.push(ledgerStage);
    const ledgerFromCalls = new PgBudgetLedger(pool, 300, 100, 80, ledgerStage, 12, 300);
    await ledgerFromCalls.initialize();
    const experimentId = `ledger-unresolved-${randomUUID()}`;
    const runId = randomUUID();
    await ledgerFromCalls.reserve(experimentId, 80, runId, 2);
    const first = "ledger-unresolved-one";
    await ledgerFromCalls.reserveModelCall(experimentId, first, "a".repeat(64), 40, 1);
    await ledgerFromCalls.dispatchModelCall(experimentId, first);
    await ledgerFromCalls.settleModelCall(experimentId, first, 23);
    const second = "ledger-unresolved-two";
    await ledgerFromCalls.reserveModelCall(experimentId, second, "b".repeat(64), 40, 2);
    await ledgerFromCalls.dispatchModelCall(experimentId, second);
    await ledgerFromCalls.markModelCallUnknown(experimentId, second);
    await expect(ledgerFromCalls.settleFromModelCalls(experimentId, runId, 2)).rejects.toThrow("exactly one settled model call and no unresolved attempts");
    await expect(ledgerFromCalls.get(experimentId)).resolves.toMatchObject({ status: "RESERVED", spentCents: 0 });
  });
});
