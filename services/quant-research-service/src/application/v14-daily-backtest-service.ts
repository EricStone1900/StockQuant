import { randomUUID } from "node:crypto";
import { runV14CorporateActionScenario, runV14RestrictionScenario, V14BacktestEngine, V14_DEFAULT_EXECUTION_POLICY, type V14ExecutionPolicy, type V14Scenario } from "../domain/v14-daily-backtest.js";
import type { V14DailyBacktestFixturePort } from "../ports/v14-daily-backtest-fixture.js";

export type V14DailyBacktestRequest = { scenarioId: V14Scenario; seed: number; policy: V14ExecutionPolicy; testRunId?: string };
const V14_CORPORATE_ACTION_POLICY: Readonly<V14ExecutionPolicy> = { initialCashCents: 200_000, targetQuantity: 100, participationRateBasisPoints: 10_000, slippageBasisPoints: 0, fixedFeeCents: 0 };

export class V14DailyBacktestService {
  constructor(private readonly fixturePort: V14DailyBacktestFixturePort) {}
  run(request: V14DailyBacktestRequest) {
    if (!request || typeof request !== "object" || !["normal", "rejection", "recovery", "market-restrictions", "historical-fees", "corporate-actions"].includes(request.scenarioId) || !Number.isSafeInteger(request.seed) || request.seed < 0 || request.seed > 2_147_483_647 || !request.policy || typeof request.policy !== "object") throw new Error("invalid V1.4 daily backtest request");
    const testRunId = request.testRunId ?? randomUUID();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new Error("V1.4 testRunId must be a UUID");
    if (request.scenarioId === "market-restrictions") {
      const fixture = this.fixturePort.loadRestrictions();
      const result = runV14RestrictionScenario(fixture.bars, fixture.sha256, request.seed);
      result.evidence.executionPolicy = request.policy;
      result.evidence.codeVersion = process.env.STOCKQUANT_CODE_VERSION ?? "UNSET";
      return { ...result, testRunId };
    }
    if (request.scenarioId === "corporate-actions") {
      if (request.policy.initialCashCents !== V14_CORPORATE_ACTION_POLICY.initialCashCents || request.policy.targetQuantity !== V14_CORPORATE_ACTION_POLICY.targetQuantity || request.policy.participationRateBasisPoints !== V14_CORPORATE_ACTION_POLICY.participationRateBasisPoints || request.policy.slippageBasisPoints !== V14_CORPORATE_ACTION_POLICY.slippageBasisPoints || request.policy.fixedFeeCents !== V14_CORPORATE_ACTION_POLICY.fixedFeeCents || request.policy.marketFeeSchedule !== undefined || request.policy.sellOrder !== undefined || Object.keys(request.policy).length !== 5) throw new Error("V1.4 corporate-actions requires its frozen 200000-cent/100-share/zero-fee Fixture policy");
      const fixture = this.fixturePort.loadCorporateActions();
      const result = runV14CorporateActionScenario(fixture.bars, fixture.actions, fixture.sha256, request.seed);
      result.evidence.executionPolicy = request.policy;
      result.evidence.codeVersion = process.env.STOCKQUANT_CODE_VERSION ?? "UNSET";
      return { ...result, testRunId };
    }
    if (request.scenarioId === "historical-fees" && (request.policy.marketFeeSchedule?.scheduleId !== "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" || request.policy.sellOrder?.signalDate !== "2023-08-24" || request.policy.sellOrder.executionDate !== "2023-08-25")) throw new Error("historical-fees scenario requires its historical fee schedule and fixed 2023-08-24/25 sell fixture");
    const fixture = request.scenarioId === "historical-fees" ? this.fixturePort.loadHistoricalFees() : this.fixturePort.load();
    const engine = new V14BacktestEngine(fixture.bars, fixture.sha256, request.policy);
    const result = engine.run(request.scenarioId, request.seed);
    result.evidence.executionPolicy = request.policy;
    result.evidence.codeVersion = process.env.STOCKQUANT_CODE_VERSION ?? "UNSET";
    return { ...result, testRunId };
  }
}
