import { describe, expect, it } from "vitest";
import { V14DailyBacktestService } from "../../src/application/v14-daily-backtest-service.js";
import { V14DailyBacktestFixtureAdapter } from "../../src/adapters/v14-daily-backtest-fixture.js";
import { V14_DEFAULT_EXECUTION_POLICY } from "../../src/domain/v14-daily-backtest.js";

describe("V1.4 Quant daily backtest application", () => {
  it("creates run identity and binds fixture Manifest to computed evidence", () => {
    const service = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
    const result = service.run({ scenarioId: "normal", seed: 20260907, policy: { ...V14_DEFAULT_EXECUTION_POLICY } });
    expect(result.testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(result.evidence.fixtureSha256).toBe("88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef");
    expect(result.evidence.codeVersion).toBe(process.env.STOCKQUANT_CODE_VERSION ?? "UNSET");
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("persists the synthetic restrictions fixture identity and all fixed domain assertions", () => {
    const service = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
    const result = service.run({ scenarioId: "market-restrictions", seed: 20260907, policy: { ...V14_DEFAULT_EXECUTION_POLICY } });
    expect(result.scenarioId).toBe("market-restrictions");
    expect(result.evidence).toMatchObject({ fixtureSha256: "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a", dataMode: "FIXTURE", ruleScope: "SYNTHETIC_FIXTURE_BOUNDARIES_ONLY" });
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("runs historical fees against its separately hashed, date-matched fixture", () => {
    const service = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
    const result = service.run({ scenarioId: "historical-fees", seed: 20260907, policy: {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      marketFeeSchedule: { scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", commissionRatePartsPerBillion: 2_000_000, minimumCommissionCents: 500 },
      sellOrder: { signalDate: "2023-08-24", executionDate: "2023-08-25", quantity: 100 }
    } });
    expect(result.evidence).toMatchObject({ dataVersion: "v1.4-historical-fees-1", fixtureSha256: "5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573" });
    expect(result.assertions.find(({ assertionId }) => assertionId === "V1.4-BT-HISTORICAL-FEE-001")?.status).toBe("PASS");
  });

  it("binds the run to an explicitly supplied workspace code digest", () => {
    const previous = process.env.STOCKQUANT_CODE_VERSION;
    process.env.STOCKQUANT_CODE_VERSION = "sha256:" + "a".repeat(64);
    try {
      const service = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
      const result = service.run({ scenarioId: "normal", seed: 20260907, policy: { ...V14_DEFAULT_EXECUTION_POLICY } });
      expect(result.evidence.codeVersion).toBe(`sha256:${"a".repeat(64)}`);
    } finally {
      if (previous === undefined) delete process.env.STOCKQUANT_CODE_VERSION;
      else process.env.STOCKQUANT_CODE_VERSION = previous;
    }
  });

  it("rejects an invalid scenario, seed, or unsafe execution policy", () => {
    const service = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
    const policy = { ...V14_DEFAULT_EXECUTION_POLICY };
    expect(() => service.run({ scenarioId: "other" as "normal", seed: 1, policy })).toThrow(/invalid V1.4/u);
    expect(() => service.run({ scenarioId: "normal", seed: 2_147_483_648, policy })).toThrow(/invalid V1.4/u);
    expect(() => service.run({ scenarioId: "normal", seed: 1, policy: { ...policy, slippageBasisPoints: -1 } })).toThrow(/invalid cash/u);
  });
});
