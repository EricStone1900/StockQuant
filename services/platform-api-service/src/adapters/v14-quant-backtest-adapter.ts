import type { V14DailyBacktestFixtureRequest, V14DailyBacktestFixtureResult } from "../contracts/generated-types.js";
import type { V14QuantBacktestPort, V14Scenario } from "../application/v14-backtest.js";
import type { V14QuantBacktestClient } from "../ports/v14-quant-backtest-client.js";

export class V14QuantBacktestAdapter implements V14QuantBacktestPort {
  constructor(private readonly client: V14QuantBacktestClient, private readonly policy: V14DailyBacktestFixtureRequest["policy"]) {}
  run(scenarioId: V14Scenario, seed: number, policy = this.policy, testRunId?: string): Promise<V14DailyBacktestFixtureResult> {
    return this.client.runV14DailyFixtureBacktest({ scenarioId, seed, policy, ...(testRunId ? { testRunId } : {}) });
  }
}
