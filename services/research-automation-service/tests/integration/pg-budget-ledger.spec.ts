import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgBudgetLedger } from "../../src/adapters/pg-budget-ledger.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "research_automation_test") throw new Error("RESEARCH_AUTOMATION_DATABASE_URL must target the isolated research_automation_test database");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.1 budget ledger", () => {
  const pool = new Pool({ connectionString });
  const stageId = `test-${randomUUID()}`;
  const transientStageIds = [stageId];
  const ledger = new PgBudgetLedger(pool, 100, 80, 80, stageId);

  beforeAll(async () => ledger.initialize());
  afterAll(async () => {
    for (const testStageId of transientStageIds) {
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
    await modelLedger.markModelCallUnknown("exp-model", "model-run-1");
    await expect(modelLedger.snapshot(["exp-model", "not-present"])).resolves.toEqual([{
      experimentId: "exp-model", requestedCents: 80, reservedCents: 80, spentCents: 0, status: "RESERVED",
      modelCallSettledCents: 0, modelCallUnknownReservedCents: 60,
    }]);
    await expect(modelLedger.reserveModelCall("exp-model", "model-run-2", "c".repeat(64), 21)).rejects.toThrow("budget exhausted");
    await expect(modelLedger.settle("exp-model", 0)).rejects.toThrow("model call budget remains unresolved");

    const restartedLedger = new PgBudgetLedger(pool, 100, 80, 80, modelStageId);
    const recovered = await restartedLedger.reserveModelCall("exp-model", "model-run-1", "a".repeat(64), 60);
    expect(recovered).toMatchObject({ created: false, reservation: { status: "UNKNOWN", reservedCents: 60 } });
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
});
