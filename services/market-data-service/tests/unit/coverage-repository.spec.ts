import { describe, expect, it } from "vitest";
import { CoverageRepository } from "../../src/application/coverage-repository.js";

function row(status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED") {
  return { task_id: "task-1", subscription_id: "dc08a", from_date: "2026-09-14", to_date: "2026-09-16", idempotency_key: "key", status };
}

describe("CoverageRepository backfill lifecycle", () => {
  it("claims, completes and fails only through valid state transitions", async () => {
    const task = row("QUEUED");
    const pool = { query: async (sql: string) => {
      if (sql.startsWith("UPDATE") && sql.includes("SET status='COMPLETED'")) { if (task.status !== "RUNNING") return { rowCount: 0, rows: [] }; task.status = "COMPLETED"; return { rowCount: 1, rows: [task] }; }
      if (sql.startsWith("UPDATE") && sql.includes("SET status='FAILED'")) { if (task.status !== "RUNNING") return { rowCount: 0, rows: [] }; task.status = "FAILED"; return { rowCount: 1, rows: [task] }; }
      if (sql.startsWith("UPDATE") && sql.includes("SET status='RUNNING'")) { if (task.status !== "QUEUED") return { rowCount: 0, rows: [] }; task.status = "RUNNING"; return { rowCount: 1, rows: [task] }; }
      return { rowCount: 1, rows: [task] };
    } } as never;
    const repository = new CoverageRepository(pool);
    expect((await repository.claimBackfill("task-1"))?.status).toBe("RUNNING");
    expect(await repository.claimBackfill("task-1")).toBeNull();
    expect((await repository.completeBackfill("task-1"))?.status).toBe("COMPLETED");
    expect(await repository.failBackfill("task-1")).toBeNull();
  });
});
