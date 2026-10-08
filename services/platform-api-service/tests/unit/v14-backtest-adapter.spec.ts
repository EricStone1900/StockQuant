import { describe, expect, it, vi } from "vitest";
import type { V14DailyBacktestFixtureRequest, V14DailyBacktestFixtureResult } from "../../src/contracts/generated-types.js";
import { V14QuantBacktestAdapter } from "../../src/adapters/v14-quant-backtest-adapter.js";
import { validateV14ExecutionPolicy, V14_DEFAULT_EXECUTION_POLICY } from "../../src/application/v14-backtest.js";
import { GeneratedQuantV14BacktestClient, QuantV14BacktestHttpError } from "../../src/contracts/generated-quant-v14-backtest-client.js";

const result: V14DailyBacktestFixtureResult = { testRunId: "4c3c4fd1-0567-46c1-bf74-4ed54ac8896b", stageId: "V1.4", scenarioId: "normal", seed: 20260907, status: "COMPLETED", assertions: [], evidence: {}, durableReport: { resultSha256: "a".repeat(64), manifestSha256: "b".repeat(64) } };

describe("V1.4 Platform-to-Quant adapter", () => {
  it("sends only the frozen policy, scenario and seed to Quant", async () => {
    const runV14DailyFixtureBacktest = vi.fn(async (_input: V14DailyBacktestFixtureRequest) => result);
    const adapter = new V14QuantBacktestAdapter({ runV14DailyFixtureBacktest }, V14_DEFAULT_EXECUTION_POLICY);
    await expect(adapter.run("normal", 20260907)).resolves.toBe(result);
    expect(runV14DailyFixtureBacktest).toHaveBeenCalledWith({ scenarioId: "normal", seed: 20260907, policy: V14_DEFAULT_EXECUTION_POLICY });
  });

  it("passes a caller-selected, validated execution policy through to Quant", async () => {
    const policy = { initialCashCents: 102_000, targetQuantity: 50, participationRateBasisPoints: 200, slippageBasisPoints: 75, fixedFeeCents: 250 };
    const runV14DailyFixtureBacktest = vi.fn(async (_input: V14DailyBacktestFixtureRequest) => result);
    const adapter = new V14QuantBacktestAdapter({ runV14DailyFixtureBacktest }, V14_DEFAULT_EXECUTION_POLICY);
    await adapter.run("normal", 20260907, validateV14ExecutionPolicy(policy));
    expect(runV14DailyFixtureBacktest).toHaveBeenCalledWith({ scenarioId: "normal", seed: 20260907, policy });
  });

  it("rejects missing, extra, fractional and out-of-range policy fields", () => {
    expect(() => validateV14ExecutionPolicy({ initialCashCents: 100 })).toThrow(/exactly the supported fields/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, unknown: 1 })).toThrow(/exactly the supported fields/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, targetQuantity: 1.5 })).toThrow(/integer range/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, participationRateBasisPoints: 10_001 })).toThrow(/integer range/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, marketFeeSchedule: { scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", commissionRatePartsPerBillion: 54_100, minimumCommissionCents: 500 } })).toThrow(/selected schedule's exchange fees/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, sellOrder: { signalDate: "2024-01-04", executionDate: "2024-01-03", quantity: 10 } })).toThrow(/signal date before its execution/u);
    expect(() => validateV14ExecutionPolicy({ ...V14_DEFAULT_EXECUTION_POLICY, sellOrder: { signalDate: "2024-01-03", executionDate: "2024-01-04", quantity: 0 } })).toThrow(/positive safe integer/u);
  });

  it("accepts an exact next-session sell order and transmits it unchanged", async () => {
    const policy = { ...V14_DEFAULT_EXECUTION_POLICY, sellOrder: { signalDate: "2024-01-03", executionDate: "2024-01-04", quantity: 100 } };
    const runV14DailyFixtureBacktest = vi.fn(async (_input: V14DailyBacktestFixtureRequest) => result);
    const adapter = new V14QuantBacktestAdapter({ runV14DailyFixtureBacktest }, V14_DEFAULT_EXECUTION_POLICY);
    await adapter.run("normal", 20260907, validateV14ExecutionPolicy(policy));
    expect(runV14DailyFixtureBacktest).toHaveBeenCalledWith({ scenarioId: "normal", seed: 20260907, policy });
  });

  it("uses the service bearer and preserves typed HTTP rejection", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ status: "REJECTED" }), { status: 422, headers: { "content-type": "application/json" } }));
    const client = new GeneratedQuantV14BacktestClient("http://quant.test/", () => ({ authorization: "Bearer " + "q".repeat(32), "x-stockquant-service-id": "platform-api-service" }), request as typeof fetch);
    await expect(client.runV14DailyFixtureBacktest({ scenarioId: "normal", seed: 20260907, policy: V14_DEFAULT_EXECUTION_POLICY })).rejects.toBeInstanceOf(QuantV14BacktestHttpError);
    const [url, init] = request.mock.calls[0]!;
    expect(String(url)).toBe("http://quant.test/v1/research/backtests/daily-fixture");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer " + "q".repeat(32));
  });

  it("rejects a successful response bound to a different scenario", async () => {
    const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ...result, scenarioId: "recovery" }), { status: 200, headers: { "content-type": "application/json" } }));
    const client = new GeneratedQuantV14BacktestClient("http://quant.test", () => ({}), request as typeof fetch);
    await expect(client.runV14DailyFixtureBacktest({ scenarioId: "normal", seed: 20260907, policy: V14_DEFAULT_EXECUTION_POLICY })).rejects.toThrow(/does not match/u);
  });
});
