import { describe, expect, it } from "vitest";
import { calculateHistoricalExecution } from "../../../trade-execution-service/src/domain/historical-execution.js";
import { loadV14RestrictionFixture } from "../../src/adapters/v14-daily-backtest-fixture.js";
import { evaluateV14RestrictionBar, V14BacktestEngine, type V14DailyBar, type V14ExecutionPolicy } from "../../src/domain/v14-daily-backtest.js";

const bars: V14DailyBar[] = [
  { date: "2024-01-02", securityId: "600000.SH", closeCents: 1_000, volume: 100 },
  { date: "2024-01-03", securityId: "600000.SH", closeCents: 1_000, volume: 100 },
  { date: "2024-01-04", securityId: "600000.SH", closeCents: 1_000, volume: 100 },
  { date: "2024-01-05", securityId: "600000.SH", closeCents: 1_000, volume: 100 },
];

const policy: V14ExecutionPolicy = {
  initialCashCents: 200_000,
  targetQuantity: 29,
  participationRateBasisPoints: 2_900,
  slippageBasisPoints: 0,
  fixedFeeCents: 29,
};

function decimalFromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, "0")}00`;
}

describe("V1.4 backtest versus Trade Execution deterministic fill rules", () => {
  it.each([
    { caseId: "suspended-buy", reason: "SUSPENDED" },
    { caseId: "locked-upper-buy", reason: "LOCKED_AT_UPPER_LIMIT" },
    { caseId: "locked-lower-sell", reason: "LOCKED_AT_LOWER_LIMIT" },
    { caseId: "open-market-buy", reason: undefined },
  ] as const)("matches FakeBroker restriction decision for $caseId", ({ caseId, reason }) => {
    const fixture = loadV14RestrictionFixture();
    expect(fixture.sha256).toBe("45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a");
    const bar = fixture.bars.find((candidate) => candidate.caseId === caseId);
    expect(bar).toBeDefined();
    const quant = evaluateV14RestrictionBar(bar!);
    const paper = calculateHistoricalExecution({
      namespace: "v1.4-restriction-parity",
      accountId: "restriction-parity-account",
      clientOrderId: caseId,
      security: bar!.securityId,
      requestedQuantity: 29,
      side: bar!.side,
      bar: {
        timestamp: `${bar!.date}T09:30:00+08:00`,
        open: decimalFromCents(bar!.openCents),
        high: decimalFromCents(bar!.highCents),
        low: decimalFromCents(bar!.lowCents),
        close: decimalFromCents(bar!.closeCents),
        volume: bar!.volume,
        tradingStatus: bar!.tradingStatus,
        upperLimit: decimalFromCents(bar!.upperLimitCents),
        lowerLimit: decimalFromCents(bar!.lowerLimitCents),
      },
      participationRate: 1,
      slippageBps: 0,
      currency: "CNY",
    }, { orderId: `order-${caseId}`, externalFillId: `fill-${caseId}` });

    if (reason) {
      expect(quant).toMatchObject({ status: "REJECTED", reason });
      expect(paper).toMatchObject({ status: "REJECTED", rejectionReason: reason });
      expect(paper.fill).toBeUndefined();
    } else {
      expect(quant.status).toBe("FILLABLE");
      expect(paper.status).toBe("FILLED");
      expect(paper.fill).toBeDefined();
    }
  });

  it.each([
    { side: "BUY" as const, date: "2024-01-03", signalDate: "2024-01-02", slippageBasisPoints: 0 },
    { side: "BUY" as const, date: "2024-01-03", signalDate: "2024-01-02", slippageBasisPoints: 55 },
    { side: "SELL" as const, date: "2024-01-05", signalDate: "2024-01-04", slippageBasisPoints: 0 },
    { side: "SELL" as const, date: "2024-01-05", signalDate: "2024-01-04", slippageBasisPoints: 55 },
  ])("matches the $side fill quantity, price, fee and next-session timing at $slippageBasisPoints bps", ({ side, date, signalDate, slippageBasisPoints }) => {
    const sellOrder = side === "SELL" ? { signalDate, executionDate: date, quantity: 29 } : undefined;
    const marketFeeSchedule = {
      scheduleId: "CN_A_CASH_EQUITY_2023_08_28" as const,
      commissionRatePartsPerBillion: 54_100,
      minimumCommissionCents: 5,
    };
    const executionPolicy = { ...policy, slippageBasisPoints, marketFeeSchedule, ...(sellOrder ? { sellOrder } : {}) };
    const report = new V14BacktestEngine(bars, "fixture-parity-test", executionPolicy).run("normal").evidence as {
      trades: Array<{ side: "BUY" | "SELL"; quantity: number; priceCents: number; feeCents: number; executionDate: string }>;
    };
    const backtestFill = report.trades.find((trade) => trade.side === side);
    expect(backtestFill).toBeDefined();

    const tradeExecutionFill = calculateHistoricalExecution({
      namespace: "v1.4-parity",
      accountId: "parity-account",
      clientOrderId: `parity-${side.toLowerCase()}`,
      security: "600000.SH",
      requestedQuantity: 29,
      side,
      bar: { timestamp: `${date}T09:30:00+08:00`, open: "10.00", volume: 100 },
      participationRate: 0.29,
      slippageBps: slippageBasisPoints,
      currency: "CNY",
      marketFeeSchedule,
    }, { orderId: "order", externalFillId: "fill" });

    expect(tradeExecutionFill.status).toBe("FILLED");
    expect(tradeExecutionFill.fill).toBeDefined();
    const comparableFill = {
      quantity: backtestFill!.quantity,
      price: decimalFromCents(backtestFill!.priceCents),
      session: backtestFill!.executionDate,
    };
    expect(comparableFill).toEqual({
      quantity: tradeExecutionFill.fill!.quantity,
      price: tradeExecutionFill.fill!.price,
      session: date,
    });
    expect(decimalFromCents(backtestFill!.feeCents)).toBe(tradeExecutionFill.fill!.fee);
  });

  it.each([
    { side: "BUY" as const, date: "2024-01-03", signalDate: "2024-01-02" },
    { side: "SELL" as const, date: "2024-01-05", signalDate: "2024-01-04" },
  ])("matches the fixed synthetic USD fixture fee and 55bps slippage for $side", ({ side, date, signalDate }) => {
    const usBars = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"].map((dateValue) => ({ date: dateValue, securityId: "AAPL", closeCents: 1_000, volume: 1_000 }));
    const sellOrder = side === "SELL" ? { signalDate, executionDate: date, quantity: 100 } : undefined;
    const report = new V14BacktestEngine(usBars, "fixture-us-parity-test", {
      initialCashCents: 200_000, targetQuantity: 100, participationRateBasisPoints: 2_900, slippageBasisPoints: 55, fixedFeeCents: 100,
      ...(sellOrder ? { sellOrder } : {}),
    }).run("normal").evidence as { trades: Array<{ side: "BUY" | "SELL"; quantity: number; priceCents: number; feeCents: number; executionDate: string }> };
    const backtestFill = report.trades.find((trade) => trade.side === side);
    expect(backtestFill).toBeDefined();
    const paper = calculateHistoricalExecution({
      namespace: "v1.4-us-parity", accountId: "us-parity-account", clientOrderId: `us-${side.toLowerCase()}`,
      security: "AAPL", requestedQuantity: 100, side,
      bar: { timestamp: `${date}T14:30:00.000Z`, open: "10.00", volume: 1_000 },
      participationRate: 0.29, slippageBps: 55, currency: "USD",
    }, { orderId: `us-order-${side.toLowerCase()}`, externalFillId: `us-fill-${side.toLowerCase()}` });

    expect(paper.status).toBe("FILLED");
    expect({ quantity: backtestFill!.quantity, price: decimalFromCents(backtestFill!.priceCents), fee: decimalFromCents(backtestFill!.feeCents), session: backtestFill!.executionDate })
      .toEqual({ quantity: paper.fill!.quantity, price: paper.fill!.price, fee: paper.fill!.fee, session: date });
  });

  it("matches partial BUY fills and reports a distinct partially-filled order", () => {
    const partialPolicy: V14ExecutionPolicy = { ...policy, targetQuantity: 29, participationRateBasisPoints: 2_500, fixedFeeCents: 25 };
    const backtest = new V14BacktestEngine(bars, "fixture-parity-partial-buy", partialPolicy).run("normal");
    const report = backtest.evidence as {
      trades: Array<{ side: "BUY" | "SELL"; quantity: number; priceCents: number; feeCents: number; executionDate: string }>;
      orderOutcomes: Array<{ side: "BUY" | "SELL"; status: string; filledQuantity: number; reason?: string }>;
      metrics: { rejectedOrders: number; partiallyFilledOrders: number };
    };
    const fakeBroker = calculateHistoricalExecution({
      namespace: "v1.4-parity", accountId: "parity-account", clientOrderId: "parity-partial-buy",
      security: "600000.SH", requestedQuantity: 29,
      bar: { timestamp: "2024-01-03T09:30:00+08:00", open: "10.00", volume: 100 },
      participationRate: 0.25, slippageBps: 0, currency: "CNY",
    }, { orderId: "order-partial", externalFillId: "fill-partial" });
    const buy = report.trades.find((trade) => trade.side === "BUY");
    const outcome = report.orderOutcomes.find((item) => item.side === "BUY");
    expect(outcome).toMatchObject({ status: "PARTIALLY_FILLED", filledQuantity: 25, reason: "PARTICIPATION_LIMIT" });
    expect(report.metrics).toMatchObject({ rejectedOrders: 0, partiallyFilledOrders: 1 });
    expect(fakeBroker.status).toBe("PARTIALLY_FILLED");
    expect({ quantity: buy?.quantity, price: decimalFromCents(buy!.priceCents), fee: decimalFromCents(buy!.feeCents), session: buy?.executionDate })
      .toEqual({ quantity: fakeBroker.fill!.quantity, price: fakeBroker.fill!.price, fee: fakeBroker.fill!.fee, session: "2024-01-03" });
  });

  it("records the same zero-participation rejection as FakeBroker without inventing a fill", () => {
    const noVolumeBars = bars.map((bar, index) => index === 1 ? { ...bar, volume: 0 } : bar);
    const backtest = new V14BacktestEngine(noVolumeBars, "fixture-parity-zero-volume", policy).run("normal");
    const report = backtest.evidence as { trades: unknown[]; orderOutcomes: Array<{ side: string; status: string; reason?: string; filledQuantity: number }> };
    const fakeBroker = calculateHistoricalExecution({
      namespace: "v1.4-parity", accountId: "parity-account", clientOrderId: "parity-zero-volume",
      security: "600000.SH", requestedQuantity: 29,
      bar: { timestamp: "2024-01-03T09:30:00+08:00", open: "10.00", volume: 0 },
      participationRate: 0.29, slippageBps: 0, currency: "CNY",
    }, { orderId: "order-zero", externalFillId: "fill-zero" });
    expect(report.trades).toEqual([]);
    expect(report.orderOutcomes).toEqual([{ side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 29, filledQuantity: 0, status: "REJECTED", reason: "ZERO_VOLUME" }]);
    expect(fakeBroker.status).toBe("REJECTED");
    expect(fakeBroker.rejectionReason).toBe("ZERO_VOLUME");
    expect(fakeBroker.fill).toBeUndefined();
  });
});
