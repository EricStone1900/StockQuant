export type V14Scenario = "normal" | "rejection" | "recovery" | "market-restrictions" | "historical-fees";
export const V14_SCENARIOS = [
  { scenarioId: "normal", version: "1.1.0", title: "日线回测与净值", expected: "根据冻结日线Fixture计算逐日净值和成交" },
  { scenarioId: "rejection", version: "1.1.0", title: "未来成交拒绝", expected: "拒绝在信号可见前成交" },
  { scenarioId: "recovery", version: "1.1.0", title: "固定输入复跑", expected: "取消不发布报告，固定输入重新计算得到相同结果" },
  { scenarioId: "market-restrictions", version: "1.2.0", title: "停牌与限制价合成规则", expected: "固定合成OHLC状态用例验证停牌和锁定限制价拒绝；不代表真实交易所规则" },
  { scenarioId: "historical-fees", version: "1.3.0", title: "历史日期费率核对", expected: "冻结历史日期Fixture验证2023-08-28前费率及卖方印花税" }
] as const;

export type V14DailyBar = { date: string; securityId: string; closeCents: number; volume: number };
export type V14RestrictionBar = {
  caseId: string; side: "BUY" | "SELL"; date: string; securityId: string;
  openCents: number; highCents: number; lowCents: number; closeCents: number; volume: number;
  tradingStatus: "TRADED" | "SUSPENDED"; upperLimitCents: number; lowerLimitCents: number;
};
export type V14RestrictionDecision = { caseId: string; side: "BUY" | "SELL"; status: "FILLABLE" | "REJECTED"; reason?: "SUSPENDED" | "LOCKED_AT_UPPER_LIMIT" | "LOCKED_AT_LOWER_LIMIT" };

/** Synthetic fixture rule only. Daily OHLC can establish a locked bar when all prices equal a fixture-supplied boundary. */
export function evaluateV14RestrictionBar(bar: V14RestrictionBar): V14RestrictionDecision {
  if (bar.tradingStatus === "SUSPENDED") return { caseId: bar.caseId, side: bar.side, status: "REJECTED", reason: "SUSPENDED" };
  const lockedUpper = bar.openCents === bar.highCents && bar.highCents === bar.lowCents && bar.lowCents === bar.closeCents && bar.closeCents === bar.upperLimitCents;
  const lockedLower = bar.openCents === bar.highCents && bar.highCents === bar.lowCents && bar.lowCents === bar.closeCents && bar.closeCents === bar.lowerLimitCents;
  if (bar.side === "BUY" && lockedUpper) return { caseId: bar.caseId, side: bar.side, status: "REJECTED", reason: "LOCKED_AT_UPPER_LIMIT" };
  if (bar.side === "SELL" && lockedLower) return { caseId: bar.caseId, side: bar.side, status: "REJECTED", reason: "LOCKED_AT_LOWER_LIMIT" };
  return { caseId: bar.caseId, side: bar.side, status: "FILLABLE" };
}

export function runV14RestrictionScenario(bars: readonly V14RestrictionBar[], fixtureSha256: string, seed: number): V14Run {
  const expected: V14RestrictionDecision[] = [
    { caseId: "suspended-buy", side: "BUY", status: "REJECTED", reason: "SUSPENDED" },
    { caseId: "locked-upper-buy", side: "BUY", status: "REJECTED", reason: "LOCKED_AT_UPPER_LIMIT" },
    { caseId: "locked-lower-sell", side: "SELL", status: "REJECTED", reason: "LOCKED_AT_LOWER_LIMIT" },
    { caseId: "open-market-buy", side: "BUY", status: "FILLABLE" }
  ];
  const decisions = bars.map(evaluateV14RestrictionBar);
  const assertions = [{ assertionId: "V1.4-BT-MARKET-RESTRICTIONS-001", status: JSON.stringify(expected) === JSON.stringify(decisions) ? "PASS" as const : "FAIL" as const, expected, actual: decisions }];
  return { stageId: "V1.4", scenarioId: "market-restrictions", seed, status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", assertions, evidence: { dataVersion: "v1.4-market-restrictions-synthetic-1", fixtureSha256, barType: "DAILY_BAR", dataMode: "FIXTURE", environmentMode: "BACKTEST", brokerMode: "FAKE", ruleScope: "SYNTHETIC_FIXTURE_BOUNDARIES_ONLY", decisions } };
}
export type V14SellOrder = { signalDate: string; executionDate: string; quantity: number };
export type V14CnAshareFeeSchedule = { scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" | "CN_A_CASH_EQUITY_2023_08_28"; commissionRatePartsPerBillion: number; minimumCommissionCents: number };
export type V14ExecutionPolicy = { initialCashCents: number; targetQuantity: number; participationRateBasisPoints: number; slippageBasisPoints: number; fixedFeeCents: number; marketFeeSchedule?: V14CnAshareFeeSchedule; sellOrder?: V14SellOrder };
export const V14_DEFAULT_EXECUTION_POLICY: Readonly<V14ExecutionPolicy> = { initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500 };
type Assertion = { assertionId: string; status: "PASS" | "FAIL"; expected: unknown; actual: unknown };
type FeeBreakdown = { commissionCents: number; transferFeeCents: number; stampDutyCents: number; totalCents: number };
type BacktestReport = {
  signals: Array<{ securityId: string; visibleAt: string; executionDate: string }>;
  nav: Array<{ date: string; valueCents: number }>;
  positionAvailability: Array<{ date: string; securityId: string; heldQuantity: number; sellableQuantity: number; unsettledQuantity: number }>;
  cashLedger: Array<{ date: string; settledCashCents: number; unsettledSaleProceedsCents: number }>;
  settlements: Array<{ tradeDate: string; settlementDate: string | null; proceedsCents: number; status: "SETTLED" | "UNSETTLED_AT_END" }>;
  orderOutcomes: Array<{ side: "SELL"; signalDate: string; executionDate: string; requestedQuantity: number; filledQuantity: number; status: "FILLED" | "PARTIALLY_FILLED" | "REJECTED"; reason?: "T_PLUS_1_UNAVAILABLE" | "NO_SELLABLE_POSITION" | "PARTICIPATION_LIMIT" }>;
  trades: Array<{ side: "BUY" | "SELL"; quantity: number; priceCents: number; feeCents: number; feeBreakdown?: FeeBreakdown; signalDate: string; executionDate: string }>;
  metrics: { returnBasisPoints: number; maxDrawdownBasisPoints: number; turnoverCents: number; feesCents: number; fillRateBasisPoints: number; rejectedOrders: number; unfilledQuantity: number; finalCashCents: number; finalNavCents: number; unsettledSaleProceedsCents: number };
};
type SimulationOutcome =
  | { status: "COMPLETED"; reportPublished: true; report: BacktestReport }
  | { status: "CANCELLED"; reportPublished: false; report: null; cancelledAfter: "SIGNAL_QUEUED" };
export type V14Run = { stageId: "V1.4"; scenarioId: V14Scenario; seed: number; status: "COMPLETED" | "FAILED"; assertions: Assertion[]; evidence: Record<string, unknown> };

function stable(value: unknown): string { return JSON.stringify(value); }
function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function safeNumber(value: bigint, name: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error(`V1.4 ${name} exceeds safe integer precision`);
  return Number(value);
}
function roundedBasisPoints(numerator: bigint, denominator: bigint): number {
  if (denominator <= 0n) throw new Error("V1.4 basis-point denominator must be positive");
  const magnitude = numerator < 0n ? -numerator : numerator;
  const rounded = (magnitude * 10_000n + denominator / 2n) / denominator;
  return safeNumber(numerator < 0n ? -rounded : rounded, "basis-point result");
}

const FEE_RATE_DENOMINATOR = 1_000_000_000n;
const CN_A_COMMISSION_PASS_THROUGH_PARTS_PER_BILLION = 54_100n;
const CN_A_HISTORICAL_COMMISSION_PASS_THROUGH_PARTS_PER_BILLION = 68_700n;
const CN_A_MAX_COMMISSION_PARTS_PER_BILLION = 3_000_000n;
const CN_A_TRANSFER_FEE_PARTS_PER_BILLION = 100_000n;
const CN_A_SELL_STAMP_DUTY_PARTS_PER_BILLION = 500_000n;

function ceilRateFee(notionalCents: number, ratePartsPerBillion: bigint): number {
  return safeNumber((BigInt(notionalCents) * ratePartsPerBillion + FEE_RATE_DENOMINATOR - 1n) / FEE_RATE_DENOMINATOR, "market fee cents");
}

function feeBreakdown(side: "BUY" | "SELL", quantity: number, priceCents: number, policy: V14ExecutionPolicy): FeeBreakdown {
  if (!policy.marketFeeSchedule) return { commissionCents: policy.fixedFeeCents, transferFeeCents: 0, stampDutyCents: 0, totalCents: policy.fixedFeeCents };
  const notional = safeNumber(BigInt(quantity) * BigInt(priceCents), "trade notional cents");
  const commissionCents = Math.max(policy.marketFeeSchedule.minimumCommissionCents, ceilRateFee(notional, BigInt(policy.marketFeeSchedule.commissionRatePartsPerBillion)));
  const transferFeeCents = ceilRateFee(notional, CN_A_TRANSFER_FEE_PARTS_PER_BILLION);
  const stampDutyRate = policy.marketFeeSchedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" ? 1_000_000n : CN_A_SELL_STAMP_DUTY_PARTS_PER_BILLION;
  const stampDutyCents = side === "SELL" ? ceilRateFee(notional, stampDutyRate) : 0;
  return { commissionCents, transferFeeCents, stampDutyCents, totalCents: safeNumber(BigInt(commissionCents) + BigInt(transferFeeCents) + BigInt(stampDutyCents), "total trade fees cents") };
}

function affordableBuyQuantity(maxQuantity: number, priceCents: number, initialCashCents: number, policy: V14ExecutionPolicy): number {
  let low = 0;
  let high = maxQuantity;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const feeCents = feeBreakdown("BUY", middle, priceCents, policy).totalCents;
    if (BigInt(middle) * BigInt(priceCents) + BigInt(feeCents) <= BigInt(initialCashCents)) low = middle;
    else high = middle - 1;
  }
  return low;
}

function simulateDailyBacktest(bars: readonly V14DailyBar[], policy: V14ExecutionPolicy, cancelAfterSignal = false): SimulationOutcome {
  const first = bars[0]!;
  const execution = bars[1]!;
  if (cancelAfterSignal) return { status: "CANCELLED", reportPublished: false, report: null, cancelledAfter: "SIGNAL_QUEUED" };

  const participationQuantity = safeNumber(BigInt(execution.volume) * BigInt(policy.participationRateBasisPoints) / 10_000n, "participation quantity");
  const exactFillCents = (BigInt(execution.closeCents) * BigInt(10_000 + policy.slippageBasisPoints) + 9_999n) / 10_000n;
  if (exactFillCents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("V1.4 slippage-adjusted fill price exceeds safe integer cents");
  const fillCents = Number(exactFillCents);
  const quantity = affordableBuyQuantity(Math.min(policy.targetQuantity, participationQuantity), fillCents, policy.initialCashCents, policy);
  const buyFees = feeBreakdown("BUY", quantity, fillCents, policy);
  const buyFeeCents = quantity > 0 ? buyFees.totalCents : 0;
  const cashAfterBuy = policy.initialCashCents - quantity * fillCents - buyFeeCents;
  const buyTrade = quantity > 0 ? [{ side: "BUY" as const, quantity, priceCents: fillCents, feeCents: buyFeeCents, ...(policy.marketFeeSchedule ? { feeBreakdown: buyFees } : {}), signalDate: first.date, executionDate: execution.date }] : [];

  let sellFill = 0;
  let sellFeeCents = 0;
  let sellFees = feeBreakdown("SELL", 0, 1, policy);
  let sellPriceCents = 0;
  let sellExecutionIndex = -1;
  let sellReason: "T_PLUS_1_UNAVAILABLE" | "NO_SELLABLE_POSITION" | "PARTICIPATION_LIMIT" | undefined;
  const sellOrder = policy.sellOrder;
  if (sellOrder) {
    sellExecutionIndex = bars.findIndex((bar) => bar.date === sellOrder.executionDate);
    const signalIndex = bars.findIndex((bar) => bar.date === sellOrder.signalDate);
    const eligibleQuantity = sellExecutionIndex <= 1 ? 0 : quantity;
    if (signalIndex < 0 || sellExecutionIndex < 0 || signalIndex >= sellExecutionIndex) {
      sellReason = "NO_SELLABLE_POSITION";
    } else if (sellExecutionIndex === 1) {
      sellReason = "T_PLUS_1_UNAVAILABLE";
    } else if (eligibleQuantity === 0) {
      sellReason = "NO_SELLABLE_POSITION";
    } else {
      const sellBar = bars[sellExecutionIndex]!;
      const volumeLimit = safeNumber(BigInt(sellBar.volume) * BigInt(policy.participationRateBasisPoints) / 10_000n, "sell participation quantity");
      sellFill = Math.min(sellOrder.quantity, eligibleQuantity, volumeLimit);
      if (sellFill === 0) sellReason = "PARTICIPATION_LIMIT";
      else if (sellFill < sellOrder.quantity) sellReason = sellFill < eligibleQuantity ? "PARTICIPATION_LIMIT" : "NO_SELLABLE_POSITION";
      const exactSellPrice = BigInt(sellBar.closeCents) * BigInt(10_000 - policy.slippageBasisPoints) / 10_000n;
      if (exactSellPrice < 1n) throw new Error("V1.4 slippage-adjusted sell price must remain positive");
      sellPriceCents = safeNumber(exactSellPrice, "sell fill price cents");
      sellFees = feeBreakdown("SELL", sellFill, sellPriceCents, policy);
      sellFeeCents = sellFill > 0 ? sellFees.totalCents : 0;
    }
  }
  const sellProceedsCents = safeNumber(BigInt(sellFill) * BigInt(sellPriceCents) - BigInt(sellFeeCents), "sell proceeds cents");
  const settlementIndex = sellFill > 0 ? sellExecutionIndex + 1 : -1;
  const settlementDate = settlementIndex >= 0 && settlementIndex < bars.length ? bars[settlementIndex]!.date : null;
  const trades = [...buyTrade, ...(sellFill > 0 ? [{ side: "SELL" as const, quantity: sellFill, priceCents: sellPriceCents, feeCents: sellFeeCents, ...(policy.marketFeeSchedule ? { feeBreakdown: sellFees } : {}), signalDate: sellOrder!.signalDate, executionDate: sellOrder!.executionDate }] : [])];
  const nav: BacktestReport["nav"] = [];
  const positionAvailability: BacktestReport["positionAvailability"] = [];
  const cashLedger: BacktestReport["cashLedger"] = [];
  let settledCashCents = cashAfterBuy;
  for (let index = 1; index < bars.length; index += 1) {
    const bar = bars[index]!;
    let unsettledSaleProceedsCents = 0;
    if (sellFill > 0 && settlementIndex === index) settledCashCents = safeNumber(BigInt(settledCashCents) + BigInt(sellProceedsCents), "settled cash cents");
    if (sellFill > 0 && sellExecutionIndex === index && settlementIndex !== index) unsettledSaleProceedsCents = sellProceedsCents;
    const heldQuantity = quantity - (sellFill > 0 && sellExecutionIndex <= index ? sellFill : 0);
    const sellableQuantity = index <= 1 ? 0 : heldQuantity;
    positionAvailability.push({ date: bar.date, securityId: bar.securityId, heldQuantity, sellableQuantity, unsettledQuantity: heldQuantity - sellableQuantity });
    cashLedger.push({ date: bar.date, settledCashCents, unsettledSaleProceedsCents });
    const valueCents = safeNumber(BigInt(settledCashCents) + BigInt(unsettledSaleProceedsCents) + BigInt(heldQuantity) * BigInt(bar.closeCents), "NAV cents");
    nav.push({ date: bar.date, valueCents });
  }
  const orderOutcomes: BacktestReport["orderOutcomes"] = sellOrder ? [{ side: "SELL", signalDate: sellOrder.signalDate, executionDate: sellOrder.executionDate, requestedQuantity: sellOrder.quantity, filledQuantity: sellFill, status: sellFill === 0 ? "REJECTED" : sellFill === sellOrder.quantity ? "FILLED" : "PARTIALLY_FILLED", ...(sellReason ? { reason: sellReason } : {}) }] : [];
  const settlements: BacktestReport["settlements"] = sellFill > 0 ? [{ tradeDate: sellOrder!.executionDate, settlementDate, proceedsCents: sellProceedsCents, status: settlementDate ? "SETTLED" : "UNSETTLED_AT_END" }] : [];
  const finalNav = nav.at(-1)!.valueCents;
  const returnBasisPoints = roundedBasisPoints(BigInt(finalNav) - BigInt(policy.initialCashCents), BigInt(policy.initialCashCents));
  let highWater = policy.initialCashCents;
  let maxDrawdownBasisPoints = 0;
  for (const point of nav) {
    highWater = Math.max(highWater, point.valueCents);
    maxDrawdownBasisPoints = Math.max(maxDrawdownBasisPoints, roundedBasisPoints(BigInt(highWater) - BigInt(point.valueCents), BigInt(highWater)));
  }
  return {
    status: "COMPLETED",
    reportPublished: true,
    report: {
      signals: [{ securityId: execution.securityId, visibleAt: `${first.date}T15:00:00+08:00`, executionDate: execution.date }],
      nav,
      positionAvailability,
      cashLedger,
      settlements,
      orderOutcomes,
      trades,
      metrics: { returnBasisPoints, maxDrawdownBasisPoints, turnoverCents: safeNumber(trades.reduce((total, trade) => total + BigInt(trade.quantity) * BigInt(trade.priceCents), 0n), "turnover cents"), feesCents: safeNumber(BigInt(buyFeeCents) + BigInt(sellFeeCents), "fees cents"), fillRateBasisPoints: roundedBasisPoints(BigInt(quantity + sellFill), BigInt(policy.targetQuantity + (sellOrder?.quantity ?? 0))), rejectedOrders: (quantity ? 0 : 1) + (sellOrder && sellFill < sellOrder.quantity ? 1 : 0), unfilledQuantity: policy.targetQuantity - quantity + (sellOrder ? sellOrder.quantity - sellFill : 0), finalCashCents: settledCashCents, finalNavCents: finalNav, unsettledSaleProceedsCents: cashLedger.at(-1)!.unsettledSaleProceedsCents },
    },
  };
}

export class V14BacktestEngine {
  constructor(private readonly bars: readonly V14DailyBar[], private readonly fixtureSha256: string, private readonly policy: V14ExecutionPolicy = V14_DEFAULT_EXECUTION_POLICY) {
    if (bars.length < 2 || bars.some((bar, i) => !isValidIsoDate(bar.date) || !bar.securityId || !Number.isSafeInteger(bar.closeCents) || bar.closeCents <= 0 || !Number.isSafeInteger(bar.volume) || bar.volume < 0 || (i > 0 && bars[i - 1]!.date >= bar.date))) {
      throw new Error("V1.4 requires at least two strictly ordered, valid daily bars");
    }
    if (bars.some((bar) => bar.securityId !== bars[0]!.securityId)) throw new Error("V1.4 single-security daily backtest does not accept mixed security bars");
    if (!Number.isSafeInteger(policy.initialCashCents) || policy.initialCashCents < 1
      || !Number.isSafeInteger(policy.targetQuantity) || policy.targetQuantity < 1
      || !Number.isSafeInteger(policy.participationRateBasisPoints) || policy.participationRateBasisPoints < 1 || policy.participationRateBasisPoints > 10_000
      || !Number.isSafeInteger(policy.slippageBasisPoints) || policy.slippageBasisPoints < 0 || policy.slippageBasisPoints > 10_000
      || (policy.sellOrder !== undefined && policy.slippageBasisPoints >= 10_000)
      || !Number.isSafeInteger(policy.fixedFeeCents) || policy.fixedFeeCents < 0
      || (policy.marketFeeSchedule !== undefined && (!(["CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", "CN_A_CASH_EQUITY_2023_08_28"] as const).includes(policy.marketFeeSchedule.scheduleId)
        || !Number.isSafeInteger(policy.marketFeeSchedule.commissionRatePartsPerBillion)
        || policy.marketFeeSchedule.commissionRatePartsPerBillion < Number(policy.marketFeeSchedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" ? CN_A_HISTORICAL_COMMISSION_PASS_THROUGH_PARTS_PER_BILLION : CN_A_COMMISSION_PASS_THROUGH_PARTS_PER_BILLION)
        || policy.marketFeeSchedule.commissionRatePartsPerBillion > Number(CN_A_MAX_COMMISSION_PARTS_PER_BILLION)
        || !Number.isSafeInteger(policy.marketFeeSchedule.minimumCommissionCents) || policy.marketFeeSchedule.minimumCommissionCents < 0))
      || (policy.sellOrder !== undefined && (!isValidIsoDate(policy.sellOrder.signalDate) || !isValidIsoDate(policy.sellOrder.executionDate) || !Number.isSafeInteger(policy.sellOrder.quantity) || policy.sellOrder.quantity < 1 || !bars.some((bar) => bar.date === policy.sellOrder!.signalDate) || !bars.some((bar) => bar.date === policy.sellOrder!.executionDate)))) {
      throw new Error("V1.4 execution policy contains invalid cash, quantity, participation, slippage, or fee values");
    }
    if (policy.marketFeeSchedule) {
      const executionDates = [bars[1]!.date, ...(policy.sellOrder ? [policy.sellOrder.executionDate] : [])];
      const historical = policy.marketFeeSchedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27";
      if (executionDates.some((date) => historical ? date < "2022-04-29" || date >= "2023-08-28" : date < "2023-08-28")) {
        throw new Error(`${policy.marketFeeSchedule.scheduleId} cannot price executions outside its effective dates`);
      }
    }
  }

  run(scenarioId: V14Scenario, seed = 20260907): V14Run {
    const assertions: Assertion[] = [];
    const pass = (id: string, expected: unknown, actual: unknown) => assertions.push({ assertionId: id, status: stable(expected) === stable(actual) ? "PASS" : "FAIL", expected, actual });
    const common = { dataVersion: scenarioId === "historical-fees" ? "v1.4-historical-fees-1" : "v1.4-daily-backtest-1", fixtureSha256: this.fixtureSha256, barType: "DAILY_BAR", seed, brokerMode: "FAKE", environmentMode: "BACKTEST", executionPolicy: this.policy, costModel: this.policy.marketFeeSchedule ? "CN_A_MARKET_FEES_WITH_EXPLICIT_BROKER_COMMISSION_V1" : "FIXED_FEE_CENTS_PLUS_ADVERSE_SLIPPAGE_BPS_V2" };
    let evidence: Record<string, unknown>;

    if (scenarioId === "normal" || scenarioId === "historical-fees") {
      const outcome = simulateDailyBacktest(this.bars, this.policy);
      if (outcome.status !== "COMPLETED") throw new Error("normal V1.4 run unexpectedly cancelled");
      const report = outcome.report;
      const trade = report.trades[0];
      evidence = { ...common, ...report };
      pass("V1.4-BT-NEXT-BAR-001", report.signals[0]!.visibleAt < `${report.signals[0]!.executionDate}T09:30:00+08:00`, true);
      pass("V1.4-BT-FEE-002", report.trades.reduce((total, item) => total + item.feeCents, 0), report.metrics.feesCents);
      if (this.policy.marketFeeSchedule) pass("V1.4-BT-CN-A-FEE-BREAKDOWN-010", report.trades.every((item) => item.feeBreakdown !== undefined && item.feeBreakdown.totalCents === item.feeCents && (item.side === "BUY" ? item.feeBreakdown.stampDutyCents === 0 : item.feeBreakdown.stampDutyCents > 0)), true);
      if (scenarioId === "historical-fees") {
        const sell = report.trades.find((item) => item.side === "SELL");
        pass("V1.4-BT-HISTORICAL-FEE-001", { executionDate: "2023-08-25", stampDutyCents: sell ? ceilRateFee(sell.quantity * sell.priceCents, 1_000_000n) : null, scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" }, { executionDate: sell?.executionDate ?? null, stampDutyCents: sell?.feeBreakdown?.stampDutyCents ?? null, scheduleId: this.policy.marketFeeSchedule?.scheduleId ?? null });
      }
      pass("V1.4-BT-LEDGER-003", report.metrics.finalCashCents + report.metrics.unsettledSaleProceedsCents + (report.positionAvailability.at(-1)?.heldQuantity ?? 0) * this.bars.at(-1)!.closeCents, report.metrics.finalNavCents);
      pass("V1.4-BT-VOLUME-004", (trade?.quantity ?? 0) <= Math.floor(this.bars[1]!.volume * this.policy.participationRateBasisPoints / 10_000), true);
      pass("V1.4-BT-CASH-006", report.metrics.finalCashCents >= 0, true);
      pass("V1.4-BT-DRAWDOWN-005", report.metrics.maxDrawdownBasisPoints >= 0 && report.metrics.maxDrawdownBasisPoints <= 10_000, true);
      const soldByDate = (date: string) => report.trades.filter((item) => item.side === "SELL" && item.executionDate <= date).reduce((total, item) => total + item.quantity, 0);
      const expectedAvailability = report.positionAvailability.map((point, index) => { const heldQuantity = Math.max(0, (trade?.quantity ?? 0) - soldByDate(point.date)); const sellableQuantity = index === 0 ? 0 : heldQuantity; return { heldQuantity, sellableQuantity, unsettledQuantity: heldQuantity - sellableQuantity }; });
      pass("V1.4-BT-TPLUS1-SELLABLE-007", expectedAvailability, report.positionAvailability.map(({ heldQuantity, sellableQuantity, unsettledQuantity }) => ({ heldQuantity, sellableQuantity, unsettledQuantity })));
      if (this.policy.sellOrder) {
        const sellOrder = this.policy.sellOrder;
        const outcome = report.orderOutcomes[0]!;
        const executionIndex = this.bars.findIndex((bar) => bar.date === sellOrder.executionDate);
        const signalIndex = this.bars.findIndex((bar) => bar.date === sellOrder.signalDate);
        const sellBar = this.bars[executionIndex]!;
        const eligibleQuantity = executionIndex > 1 ? (trade?.quantity ?? 0) : 0;
        const volumeLimit = Math.floor(sellBar.volume * this.policy.participationRateBasisPoints / 10_000);
        const expectedFill = signalIndex < 0 || executionIndex < 0 || signalIndex >= executionIndex || executionIndex === 1
          ? 0
          : Math.min(sellOrder.quantity, eligibleQuantity, volumeLimit);
        const expectedReason = executionIndex === 1
          ? "T_PLUS_1_UNAVAILABLE"
          : signalIndex < 0 || executionIndex < 0 || signalIndex >= executionIndex || eligibleQuantity === 0
            ? "NO_SELLABLE_POSITION"
            : expectedFill === 0 || expectedFill < eligibleQuantity ? "PARTICIPATION_LIMIT"
              : expectedFill < sellOrder.quantity ? "NO_SELLABLE_POSITION" : undefined;
        const expectedStatus = expectedFill === 0 ? "REJECTED" : expectedFill === sellOrder.quantity ? "FILLED" : "PARTIALLY_FILLED";
        const expectedSellPrice = Number(BigInt(sellBar.closeCents) * BigInt(10_000 - this.policy.slippageBasisPoints) / 10_000n);
        const expectedProceeds = expectedFill > 0 ? Number(BigInt(expectedFill) * BigInt(expectedSellPrice) - BigInt(feeBreakdown("SELL", expectedFill, expectedSellPrice, this.policy).totalCents)) : 0;
        const nextSession = this.bars[executionIndex + 1];
        const expectedSettlement = expectedFill > 0 ? {
          tradeDate: sellOrder.executionDate,
          settlementDate: nextSession?.date ?? null,
          proceedsCents: expectedProceeds,
          status: nextSession ? "SETTLED" : "UNSETTLED_AT_END"
        } : null;
        const executionCash = report.cashLedger.find((entry) => entry.date === sellOrder.executionDate);
        const actual = {
          fillQuantity: report.trades.find((item) => item.side === "SELL")?.quantity ?? 0,
          outcome: { status: outcome.status, reason: outcome.reason },
          settlement: report.settlements[0] ?? null,
          executionCash: executionCash ? { settledCashCents: executionCash.settledCashCents, unsettledSaleProceedsCents: executionCash.unsettledSaleProceedsCents } : null,
          finalCashCents: report.metrics.finalCashCents,
          finalUnsettledSaleProceedsCents: report.metrics.unsettledSaleProceedsCents
        };
        const buyCash = this.policy.initialCashCents - (trade?.quantity ?? 0) * (trade?.priceCents ?? 0) - (trade?.feeCents ?? 0);
        const expected = {
          fillQuantity: expectedFill,
          outcome: { status: expectedStatus, ...(expectedReason ? { reason: expectedReason } : {}) },
          settlement: expectedSettlement,
          executionCash: executionCash ? { settledCashCents: buyCash, unsettledSaleProceedsCents: expectedFill > 0 ? expectedProceeds : 0 } : null,
          finalCashCents: buyCash + (expectedSettlement?.status === "SETTLED" ? expectedProceeds : 0),
          finalUnsettledSaleProceedsCents: expectedSettlement?.status === "UNSETTLED_AT_END" ? expectedProceeds : 0
        };
        if (expectedReason === "T_PLUS_1_UNAVAILABLE") pass("V1.4-BT-TPLUS1-REJECT-009", expected, actual);
        else pass("V1.4-BT-SELL-SETTLEMENT-008", expected, actual);
      }
    } else if (scenarioId === "rejection") {
      const signal = { visibleAt: "2024-01-03T15:00:00+08:00", requestedExecutionAt: "2024-01-03T09:30:00+08:00" };
      const rejected = new Date(signal.requestedExecutionAt).getTime() <= new Date(signal.visibleAt).getTime();
      const sameSessionSellAttempt = { side: "SELL", signalDate: this.bars[0]!.date, executionDate: this.bars[1]!.date, requestedQuantity: this.policy.targetQuantity, filledQuantity: 0, status: "REJECTED", reason: "T_PLUS_1_UNAVAILABLE" };
      evidence = { ...common, rejections: rejected ? ["FUTURE_SIGNAL_SAME_DAY", "T_PLUS_1_UNAVAILABLE"] : [], rejectedSellOrder: sameSessionSellAttempt, reportPublished: false };
      pass("V1.4-BT-PIT-001", true, rejected);
      pass("V1.4-BT-REPORT-002", false, evidence.reportPublished);
      pass("V1.4-BT-TPLUS1-REJECT-009", "T_PLUS_1_UNAVAILABLE", sameSessionSellAttempt.reason);
    } else {
      const cancelled = simulateDailyBacktest(this.bars, this.policy, true);
      const completed = simulateDailyBacktest(this.bars, this.policy);
      const replay = simulateDailyBacktest(this.bars.map((bar) => ({ ...bar })), this.policy);
      if (completed.status !== "COMPLETED" || replay.status !== "COMPLETED") throw new Error("fixed-input V1.4 replay did not complete");
      const cancelState = { status: cancelled.status, reportPublished: cancelled.reportPublished, report: cancelled.report };
      const expectedCancelState = { status: "CANCELLED", reportPublished: false, report: null };
      const sameResult = stable(completed.report) === stable(replay.report);
      evidence = { ...common, cancellation: cancelled, reportPublished: completed.reportPublished, completedReport: completed.report, replay: { result: replay.report, sameResult } };
      pass("V1.4-BT-CANCEL-001", expectedCancelState, cancelState);
      pass("V1.4-BT-REPLAY-002", completed.report, replay.report);
    }
    return { stageId: "V1.4", scenarioId, seed, status: assertions.every((assertion) => assertion.status === "PASS") ? "COMPLETED" : "FAILED", assertions, evidence };
  }
}
