import type { V14DailyBacktestFixtureRequest, V14DailyBacktestFixtureResult } from "../contracts/generated-types.js";

export type V14Scenario = V14DailyBacktestFixtureRequest["scenarioId"];
export const V14_SCENARIOS = [
  { scenarioId: "normal", version: "1.1.0", title: "日线回测与净值", expected: "根据冻结日线Fixture计算逐日净值和成交" },
  { scenarioId: "rejection", version: "1.1.0", title: "未来成交拒绝", expected: "拒绝在信号可见前成交" },
  { scenarioId: "recovery", version: "1.1.0", title: "固定输入复跑", expected: "取消不发布报告，固定输入重新计算得到相同结果" },
  { scenarioId: "market-restrictions", version: "1.2.0", title: "停牌与限制价合成规则", expected: "固定合成OHLC状态用例验证停牌和锁定限制价拒绝；不代表真实交易所规则" },
  { scenarioId: "historical-fees", version: "1.3.0", title: "历史日期费率核对", expected: "冻结历史日期Fixture验证2023-08-28前费率及卖方印花税" },
  { scenarioId: "corporate-actions", version: "1.4.0", title: "拆股与现金分红手算", expected: "RAW成交价不复权；拆股调整股数，除权日确认分红应收、支付日结算；重复事件只应用一次" }
] as const;

export const V14_DEFAULT_EXECUTION_POLICY: Readonly<V14DailyBacktestFixtureRequest["policy"]> = {
  initialCashCents: 1_000_000,
  targetQuantity: 100,
  participationRateBasisPoints: 100,
  slippageBasisPoints: 0,
  fixedFeeCents: 500
};
export const V14_CORPORATE_ACTION_POLICY: Readonly<V14DailyBacktestFixtureRequest["policy"]> = {
  initialCashCents: 200_000, targetQuantity: 100, participationRateBasisPoints: 10_000, slippageBasisPoints: 0, fixedFeeCents: 0
};

export interface V14QuantBacktestPort {
  run(scenarioId: V14Scenario, seed: number, policy?: V14DailyBacktestFixtureRequest["policy"], testRunId?: string): Promise<V14DailyBacktestFixtureResult>;
}

export function validateV14ExecutionPolicy(value: unknown): V14DailyBacktestFixtureRequest["policy"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("V1.4 execution policy must be an object");
  const candidate = value as Record<string, unknown>;
  const keys = ["initialCashCents", "targetQuantity", "participationRateBasisPoints", "slippageBasisPoints", "fixedFeeCents"];
  if (keys.some((key) => !Object.hasOwn(candidate, key)) || Object.keys(candidate).some((key) => !keys.includes(key) && !["sellOrder", "marketFeeSchedule"].includes(key))) throw new Error("V1.4 execution policy must contain exactly the supported fields");
  const limits = {
    initialCashCents: [1, Number.MAX_SAFE_INTEGER],
    targetQuantity: [1, Number.MAX_SAFE_INTEGER],
    participationRateBasisPoints: [1, 10_000],
    slippageBasisPoints: [0, 10_000],
    fixedFeeCents: [0, Number.MAX_SAFE_INTEGER]
  } as const;
  for (const key of keys) {
    const item = candidate[key];
    const [minimum, maximum] = limits[key as keyof typeof limits];
    if (typeof item !== "number" || !Number.isSafeInteger(item) || item < minimum || item > maximum) throw new Error(`V1.4 execution policy field ${key} is outside its integer range`);
  }
  if (candidate.marketFeeSchedule !== undefined) {
    const schedule = candidate.marketFeeSchedule;
    if (!schedule || typeof schedule !== "object" || Array.isArray(schedule)) throw new Error("V1.4 marketFeeSchedule must be an object");
    const record = schedule as Record<string, unknown>;
    const scheduleKeys = ["scheduleId", "commissionRatePartsPerBillion", "minimumCommissionCents"];
    if (Object.keys(record).length !== scheduleKeys.length || scheduleKeys.some((key) => !Object.hasOwn(record, key)) || !["CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", "CN_A_CASH_EQUITY_2023_08_28"].includes(String(record.scheduleId))) throw new Error("V1.4 marketFeeSchedule must contain a supported dated CN_A schedule");
    const minimumRate = record.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" ? 68_700 : 54_100;
    if (typeof record.commissionRatePartsPerBillion !== "number" || !Number.isSafeInteger(record.commissionRatePartsPerBillion) || record.commissionRatePartsPerBillion < minimumRate || record.commissionRatePartsPerBillion > 3_000_000) throw new Error("V1.4 CN_A commission rate must include the selected schedule's exchange fees and stay within the published ceiling");
    if (typeof record.minimumCommissionCents !== "number" || !Number.isSafeInteger(record.minimumCommissionCents) || record.minimumCommissionCents < 0) throw new Error("V1.4 minimumCommissionCents must be a non-negative safe integer");
  }
  if (candidate.sellOrder !== undefined) {
    const sellOrder = candidate.sellOrder;
    if (!sellOrder || typeof sellOrder !== "object" || Array.isArray(sellOrder)) throw new Error("V1.4 sellOrder must be an object");
    const order = sellOrder as Record<string, unknown>;
    if (Object.keys(order).length !== 3 || Object.keys(order).some((key) => !["signalDate", "executionDate", "quantity"].includes(key))) throw new Error("V1.4 sellOrder must contain exactly signalDate, executionDate and quantity");
    if (typeof order.signalDate !== "string" || !/^\d{4}-\d\d-\d\d$/.test(order.signalDate) || typeof order.executionDate !== "string" || !/^\d{4}-\d\d-\d\d$/.test(order.executionDate) || order.signalDate >= order.executionDate) throw new Error("V1.4 sellOrder must have a valid signal date before its execution date");
    if (typeof order.quantity !== "number" || !Number.isSafeInteger(order.quantity) || order.quantity < 1) throw new Error("V1.4 sellOrder quantity must be a positive safe integer");
  }
  return candidate as V14DailyBacktestFixtureRequest["policy"];
}
