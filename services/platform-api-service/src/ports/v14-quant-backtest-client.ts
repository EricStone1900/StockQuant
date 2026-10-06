import type { V14DailyBacktestFixtureRequest, V14DailyBacktestFixtureResult } from "../contracts/generated-types.js";

export interface V14QuantBacktestClient {
  runV14DailyFixtureBacktest(input: V14DailyBacktestFixtureRequest): Promise<V14DailyBacktestFixtureResult>;
}
