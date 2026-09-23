import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgBudgetLedger } from "../../src/adapters/pg-budget-ledger.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
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
});
