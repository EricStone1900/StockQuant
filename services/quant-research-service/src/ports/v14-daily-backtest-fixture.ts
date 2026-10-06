import type { V14DailyBar, V14RestrictionBar } from "../domain/v14-daily-backtest.js";

export type V14DailyBacktestFixture = { bars: V14DailyBar[]; sha256: string };
export type V14RestrictionFixture = { bars: V14RestrictionBar[]; sha256: string };

export interface V14DailyBacktestFixturePort {
  load(): V14DailyBacktestFixture;
  loadHistoricalFees(): V14DailyBacktestFixture;
  loadRestrictions(): V14RestrictionFixture;
}
