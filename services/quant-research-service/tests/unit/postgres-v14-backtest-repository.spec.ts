import { describe, expect, it, vi } from "vitest";
import { PostgresV14BacktestRepository } from "../../src/adapters/postgres-v14-backtest-repository.js";
import type { V14Run } from "../../src/domain/v14-daily-backtest.js";

const run: V14Run = {
  stageId: "V1.4", scenarioId: "normal", seed: 20260907, status: "COMPLETED",
  assertions: [],
  evidence: { dataVersion: "v1.4-daily-backtest-1", fixtureSha256: "a".repeat(64), codeVersion: "test", executionPolicy: { initialCashCents: 100, targetQuantity: 1, participationRateBasisPoints: 10000, slippageBasisPoints: 0, fixedFeeCents: 0 }, costModel: "fixed" },
};

describe("Quant V1.4 durable BacktestRun and Manifest", () => {
  it("writes immutable result and hash-bound manifest in one transaction", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const client = { query, release: vi.fn() };
    const repo = new PostgresV14BacktestRepository({ connect: async () => client } as never);
    const hashes = await repo.save("00000000-0000-4000-8000-000000000001", run);
    expect(hashes.resultSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(hashes.manifestSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(query.mock.calls.map(([sql]) => String(sql).trim().split(/\s+/u)[0])).toEqual(["BEGIN", "INSERT", "INSERT", "COMMIT"]);
    expect(query.mock.calls[1]?.[0]).toContain("research_backtest_runs");
    expect(query.mock.calls[2]?.[0]).toContain("research_backtest_manifests");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back if either durable record fails", async () => {
    const query = vi.fn().mockImplementation(async (sql: string) => {
      if (String(sql).includes("research_backtest_manifests")) throw new Error("write failed");
      return { rows: [] };
    });
    const client = { query, release: vi.fn() };
    const repo = new PostgresV14BacktestRepository({ connect: async () => client } as never);
    await expect(repo.save("00000000-0000-4000-8000-000000000001", run)).rejects.toThrow("write failed");
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});
