import { randomUUID } from "node:crypto";
import { runV14RestrictionScenario, V14BacktestEngine, V14_DEFAULT_EXECUTION_POLICY, type V14ExecutionPolicy, type V14Scenario } from "../domain/v14-daily-backtest.js";
import type { V14DailyBacktestFixturePort } from "../ports/v14-daily-backtest-fixture.js";

export type V14DailyBacktestRequest = { scenarioId: V14Scenario; seed: number; policy: V14ExecutionPolicy };

export class V14DailyBacktestService {
  constructor(private readonly fixturePort: V14DailyBacktestFixturePort) {}
  run(request: V14DailyBacktestRequest) {
    if (!request || typeof request !== "object" || !["normal", "rejection", "recovery", "market-restrictions", "historical-fees"].includes(request.scenarioId) || !Number.isSafeInteger(request.seed) || request.seed < 0 || request.seed > 2_147_483_647 || !request.policy || typeof request.policy !== "object") throw new Error("invalid V1.4 daily backtest request");
    if (request.scenarioId === "market-restrictions") {
      const fixture = this.fixturePort.loadRestrictions();
      const result = runV14RestrictionScenario(fixture.bars, fixture.sha256, request.seed);
      result.evidence.codeVersion = process.env.STOCKQUANT_CODE_VERSION ?? "UNSET";
      return { ...result, testRunId: randomUUID() };
    }
    if (request.scenarioId === "historical-fees" && (request.policy.marketFeeSchedule?.scheduleId !== "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" || request.policy.sellOrder?.signalDate !== "2023-08-24" || request.policy.sellOrder.executionDate !== "2023-08-25")) throw new Error("historical-fees scenario requires its historical fee schedule and fixed 2023-08-24/25 sell fixture");
    const fixture = request.scenarioId === "historical-fees" ? this.fixturePort.loadHistoricalFees() : this.fixturePort.load();
    const engine = new V14BacktestEngine(fixture.bars, fixture.sha256, request.policy);
    const result = engine.run(request.scenarioId, request.seed);
    result.evidence.codeVersion = process.env.STOCKQUANT_CODE_VERSION ?? "UNSET";
    return { ...result, testRunId: randomUUID() };
  }
}
