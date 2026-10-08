import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { loadV14DailyBacktestFixture, loadV14RestrictionFixture } from "../../src/adapters/v14-daily-backtest-fixture.js";
import { evaluateV14RestrictionBar, V14BacktestEngine, type V14ExecutionPolicy } from "../../src/domain/v14-daily-backtest.js";

describe("V1.4 fixture-backed daily backtest", () => {
  it("uses frozen synthetic restriction cases to reject suspension and locked limits by side", () => {
    const restrictions = loadV14RestrictionFixture();
    expect(restrictions.sha256).toBe("45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a");
    expect(restrictions.bars.map(evaluateV14RestrictionBar)).toEqual([
      { caseId: "suspended-buy", side: "BUY", status: "REJECTED", reason: "SUSPENDED" },
      { caseId: "locked-upper-buy", side: "BUY", status: "REJECTED", reason: "LOCKED_AT_UPPER_LIMIT" },
      { caseId: "locked-lower-sell", side: "SELL", status: "REJECTED", reason: "LOCKED_AT_LOWER_LIMIT" },
      { caseId: "open-market-buy", side: "BUY", status: "FILLABLE" }
    ]);
  });

  it("does not infer a locked limit from a bar whose daily range includes other prices", () => {
    const restrictions = loadV14RestrictionFixture();
    expect(evaluateV14RestrictionBar({ ...restrictions.bars[3]!, openCents: 1100, highCents: 1120, lowCents: 1090, closeCents: 1110 })).toEqual({ caseId: "open-market-buy", side: "BUY", status: "FILLABLE" });
  });

  const fixture = loadV14DailyBacktestFixture();
  const engine = new V14BacktestEngine(fixture.bars, fixture.sha256);

  it("derives next-bar execution, costs, cash and NAV from fixture rows", () => {
    const run = engine.run("normal");
    expect(run.status).toBe("COMPLETED");
    expect(run.evidence.fixtureSha256).toBe(fixture.sha256);
    expect(run.evidence.trades).toEqual([{ side: "BUY", quantity: 100, priceCents: 1010, feeCents: 500, signalDate: "2024-01-02", executionDate: "2024-01-03" }]);
    expect(run.evidence.positionAvailability).toEqual([
      { date: "2024-01-03", securityId: "600000.SH", heldQuantity: 100, sellableQuantity: 0, unsettledQuantity: 100 },
      { date: "2024-01-04", securityId: "600000.SH", heldQuantity: 100, sellableQuantity: 100, unsettledQuantity: 0 },
      { date: "2024-01-05", securityId: "600000.SH", heldQuantity: 100, sellableQuantity: 100, unsettledQuantity: 0 }
    ]);
    expect(run.evidence.metrics).toMatchObject({ feesCents: 500, finalCashCents: 898500, finalNavCents: 1_000_000, returnBasisPoints: 0, maxDrawdownBasisPoints: 5 });
    expect(run.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("rejects an execution timestamp earlier than the signal visibility timestamp", () => {
    const run = engine.run("rejection");
    expect(run.status).toBe("COMPLETED");
    expect(run.evidence.rejections).toEqual(["FUTURE_SIGNAL_SAME_DAY", "T_PLUS_1_UNAVAILABLE"]);
    expect(run.assertions.find((assertion) => assertion.assertionId === "V1.4-BT-PIT-001")?.actual).toBe(true);
  });

  it("cancels before publishing, then reruns the same input into the same full report", () => {
    const run = engine.run("recovery");
    expect(run.status).toBe("COMPLETED");
    expect(run.evidence.cancellation).toMatchObject({ status: "CANCELLED", reportPublished: false, report: null, cancelledAfter: "SIGNAL_QUEUED" });
    expect(run.evidence.reportPublished).toBe(true);
    expect(run.evidence.replay).toMatchObject({ sameResult: true });
    expect((run.evidence.replay as { result: unknown }).result).toEqual(run.evidence.completedReport);
  });

  it("rejects fixture mutation before simulation", () => {
    expect(() => loadV14DailyBacktestFixture("/private/tmp/stockquant-v14-missing-fixture-root")).toThrow();
    expect(() => new V14BacktestEngine([{ date: "2024-01-03", securityId: "600000.SH", closeCents: 1000, volume: 1 }, { date: "2024-01-02", securityId: "600000.SH", closeCents: 1010, volume: 1 }], fixture.sha256)).toThrow(/strictly ordered/);
    expect(() => new V14BacktestEngine(fixture.bars.map((bar, index) => index === 2 ? { ...bar, date: "2024-02-30" } : bar), fixture.sha256)).toThrow(/valid daily bars/);
    expect(() => new V14BacktestEngine(fixture.bars.map((bar, index) => index === 2 ? { ...bar, securityId: "AAPL.US" } : bar), fixture.sha256)).toThrow(/mixed security/);
  });

  it("applies adverse buy slippage and limits fills to affordable whole shares", () => {
    const policy: V14ExecutionPolicy = { initialCashCents: 102_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 100, fixedFeeCents: 500 };
    const run = new V14BacktestEngine(fixture.bars, fixture.sha256, policy).run("normal");
    const evidence = run.evidence as { trades: Array<{ quantity: number; priceCents: number; feeCents: number }>; metrics: { finalCashCents: number; unfilledQuantity: number; fillRateBasisPoints: number; maxDrawdownBasisPoints: number } };
    expect(run.status).toBe("COMPLETED");
    expect(evidence.trades).toEqual([{ side: "BUY", quantity: 99, priceCents: 1021, feeCents: 500, signalDate: "2024-01-02", executionDate: "2024-01-03" }]);
    expect(evidence.metrics).toMatchObject({ finalCashCents: 421, unfilledQuantity: 1, fillRateBasisPoints: 9900, maxDrawdownBasisPoints: 156 });
    expect(evidence.metrics.finalCashCents).toBeGreaterThanOrEqual(0);
    expect(run.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("applies configurable CN A-share commission, transfer fee and sell-side stamp duty", () => {
    const policy: V14ExecutionPolicy = {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      marketFeeSchedule: { scheduleId: "CN_A_CASH_EQUITY_2023_08_28", commissionRatePartsPerBillion: 2_000_000, minimumCommissionCents: 500 },
      sellOrder: { signalDate: "2024-01-03", executionDate: "2024-01-04", quantity: 100 }
    };
    const run = new V14BacktestEngine(fixture.bars, fixture.sha256, policy).run("normal");
    const evidence = run.evidence as { trades: Array<{ side: string; feeCents: number; feeBreakdown?: unknown }>; settlements: Array<{ proceedsCents: number }>; metrics: { feesCents: number } };
    expect(evidence.trades).toEqual([
      { side: "BUY", quantity: 100, priceCents: 1010, feeCents: 511, feeBreakdown: { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 0, totalCents: 511 }, signalDate: "2024-01-02", executionDate: "2024-01-03" },
      { side: "SELL", quantity: 100, priceCents: 1020, feeCents: 562, feeBreakdown: { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 51, totalCents: 562 }, signalDate: "2024-01-03", executionDate: "2024-01-04" }
    ]);
    expect(evidence.settlements).toEqual([{ tradeDate: "2024-01-04", settlementDate: "2024-01-05", proceedsCents: 101_438, status: "SETTLED" }]);
    expect(evidence.metrics.feesCents).toBe(1_073);
    expect(run.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("fails closed when a dated CN A-share fee schedule is applied before its effective date", () => {
    const preEffectiveBars = fixture.bars.map((bar, index) => ({
      ...bar,
      date: ["2023-08-24", "2023-08-25", "2023-08-28", "2023-08-29"][index]!,
    }));
    const policy: V14ExecutionPolicy = {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      marketFeeSchedule: { scheduleId: "CN_A_CASH_EQUITY_2023_08_28", commissionRatePartsPerBillion: 2_000_000, minimumCommissionCents: 500 },
    };
    expect(() => new V14BacktestEngine(preEffectiveBars, fixture.sha256, policy)).toThrow(/outside its effective dates/u);

    const boundaryBars = preEffectiveBars.map((bar, index) => ({
      ...bar,
      date: ["2023-08-25", "2023-08-28", "2023-08-29", "2023-08-30"][index]!,
    }));
    expect(() => new V14BacktestEngine(boundaryBars, fixture.sha256, policy)).not.toThrow();
  });

  it("uses the pre-2023-08-28 seller stamp duty only within the historical schedule window", () => {
    const historicalBars = fixture.bars.map((bar, index) => ({ ...bar, date: ["2023-08-23", "2023-08-24", "2023-08-25", "2023-08-28"][index]! }));
    const policy: V14ExecutionPolicy = {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      marketFeeSchedule: { scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27", commissionRatePartsPerBillion: 2_000_000, minimumCommissionCents: 500 },
      sellOrder: { signalDate: "2023-08-24", executionDate: "2023-08-25", quantity: 100 }
    };
    const run = new V14BacktestEngine(historicalBars, fixture.sha256, policy).run("normal");
    const evidence = run.evidence as { trades: Array<{ feeBreakdown: { stampDutyCents: number; transferFeeCents: number } }> };
    expect(evidence.trades.map((trade) => trade.feeBreakdown)).toEqual([
      { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 0, totalCents: 511 },
      { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 102, totalCents: 613 }
    ]);
    const crossesBoundary = { ...policy, sellOrder: { signalDate: "2023-08-25", executionDate: "2023-08-28", quantity: 100 } };
    expect(() => new V14BacktestEngine(historicalBars, fixture.sha256, crossesBoundary)).toThrow(/outside its effective dates/u);
  });

  it("reports a zero fill when participation volume is below one share or cash cannot cover costs", () => {
    const oneShareLimit = fixture.bars.map((bar, index) => index === 1 ? { ...bar, volume: 99 } : bar);
    const lowVolume = new V14BacktestEngine(oneShareLimit, fixture.sha256).run("normal");
    const lowVolumeEvidence = lowVolume.evidence as { trades: unknown[]; metrics: { rejectedOrders: number; unfilledQuantity: number; feesCents: number; finalCashCents: number } };
    expect(lowVolumeEvidence.trades).toEqual([]);
    expect(lowVolumeEvidence.metrics).toMatchObject({ rejectedOrders: 1, partiallyFilledOrders: 0, unfilledQuantity: 100, feesCents: 0, finalCashCents: 1_000_000 });
    expect(lowVolume.evidence.orderOutcomes).toEqual([{ side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 100, filledQuantity: 0, status: "REJECTED", reason: "ZERO_VOLUME" }]);

    const noCash = new V14BacktestEngine(fixture.bars, fixture.sha256, { initialCashCents: 500, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500 }).run("normal");
    const noCashEvidence = noCash.evidence as { trades: unknown[]; metrics: { rejectedOrders: number; unfilledQuantity: number; feesCents: number; finalCashCents: number } };
    expect(noCashEvidence.trades).toEqual([]);
    expect(noCashEvidence.metrics).toMatchObject({ rejectedOrders: 1, partiallyFilledOrders: 0, unfilledQuantity: 100, feesCents: 0, finalCashCents: 500 });
    expect(noCash.evidence.orderOutcomes).toEqual([{ side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 100, filledQuantity: 0, status: "REJECTED", reason: "INSUFFICIENT_CASH" }]);
  });

  it("fills a sell only from T+1 sellable shares and settles sale cash on the next Fixture session", () => {
    const policy: V14ExecutionPolicy = {
      ...{ initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500 },
      sellOrder: { signalDate: "2024-01-03", executionDate: "2024-01-04", quantity: 100 }
    };
    const run = new V14BacktestEngine(fixture.bars, fixture.sha256, policy).run("normal");
    const evidence = run.evidence as { trades: Array<{ side: string; quantity: number; priceCents: number; feeCents: number }>; settlements: Array<{ tradeDate: string; settlementDate: string | null; proceedsCents: number; status: string }>; cashLedger: Array<{ date: string; settledCashCents: number; unsettledSaleProceedsCents: number }>; positionAvailability: Array<{ date: string; heldQuantity: number }>; metrics: { finalCashCents: number; finalNavCents: number; feesCents: number } };
    expect(evidence.trades).toEqual([
      { side: "BUY", quantity: 100, priceCents: 1010, feeCents: 500, signalDate: "2024-01-02", executionDate: "2024-01-03" },
      { side: "SELL", quantity: 100, priceCents: 1020, feeCents: 500, signalDate: "2024-01-03", executionDate: "2024-01-04" }
    ]);
    expect(evidence.settlements).toEqual([{ tradeDate: "2024-01-04", settlementDate: "2024-01-05", proceedsCents: 101_500, status: "SETTLED" }]);
    expect(evidence.cashLedger).toEqual([
      { date: "2024-01-03", settledCashCents: 898_500, unsettledSaleProceedsCents: 0 },
      { date: "2024-01-04", settledCashCents: 898_500, unsettledSaleProceedsCents: 101_500 },
      { date: "2024-01-05", settledCashCents: 1_000_000, unsettledSaleProceedsCents: 0 }
    ]);
    expect(evidence.positionAvailability).toEqual([
      { date: "2024-01-03", securityId: "600000.SH", heldQuantity: 100, sellableQuantity: 0, unsettledQuantity: 100 },
      { date: "2024-01-04", securityId: "600000.SH", heldQuantity: 0, sellableQuantity: 0, unsettledQuantity: 0 },
      { date: "2024-01-05", securityId: "600000.SH", heldQuantity: 0, sellableQuantity: 0, unsettledQuantity: 0 }
    ]);
    expect(evidence.metrics).toMatchObject({ finalCashCents: 1_000_000, finalNavCents: 1_000_000, feesCents: 1_000 });
    expect(run.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("keeps a volume-limited final-session sale as an unsettled receivable without inflating settled cash", () => {
    const bars = fixture.bars.map((bar, index) => index === 3 ? { ...bar, volume: 5_000 } : bar);
    const variantSha256 = createHash("sha256").update(JSON.stringify(bars)).digest("hex");
    const policy: V14ExecutionPolicy = {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      sellOrder: { signalDate: "2024-01-04", executionDate: "2024-01-05", quantity: 100 }
    };
    const run = new V14BacktestEngine(bars, variantSha256, policy).run("normal");
    const evidence = run.evidence as {
      trades: Array<{ side: string; quantity: number }>;
      orderOutcomes: Array<{ status: string; reason?: string; filledQuantity: number }>;
      settlements: Array<{ settlementDate: string | null; proceedsCents: number; status: string }>;
      cashLedger: Array<{ settledCashCents: number; unsettledSaleProceedsCents: number }>;
      metrics: { finalCashCents: number; finalNavCents: number; unsettledSaleProceedsCents: number };
    };
    expect(evidence.trades.map(({ side, quantity }) => ({ side, quantity }))).toEqual([{ side: "BUY", quantity: 100 }, { side: "SELL", quantity: 50 }]);
    expect(evidence.orderOutcomes).toEqual([
      { side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 100, filledQuantity: 100, status: "FILLED" },
      { side: "SELL", signalDate: "2024-01-04", executionDate: "2024-01-05", requestedQuantity: 100, filledQuantity: 50, status: "PARTIALLY_FILLED", reason: "PARTICIPATION_LIMIT" }
    ]);
    expect(evidence.settlements).toEqual([{ tradeDate: "2024-01-05", settlementDate: null, proceedsCents: 50_250, status: "UNSETTLED_AT_END" }]);
    expect(evidence.cashLedger.at(-1)).toEqual({ date: "2024-01-05", settledCashCents: 898_500, unsettledSaleProceedsCents: 50_250 });
    expect(evidence.metrics).toMatchObject({ finalCashCents: 898_500, unsettledSaleProceedsCents: 50_250, finalNavCents: 999_500 });
    expect(run.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("rejects a sell that shares the buy execution session under the A-share T+1 rule", () => {
    const policy: V14ExecutionPolicy = {
      initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500,
      sellOrder: { signalDate: "2024-01-02", executionDate: "2024-01-03", quantity: 100 }
    };
    const run = new V14BacktestEngine(fixture.bars, fixture.sha256, policy).run("normal");
    const evidence = run.evidence as { trades: Array<{ side: string }>; orderOutcomes: Array<{ status: string; reason?: string; filledQuantity: number }> };
    expect(evidence.trades.map((trade) => trade.side)).toEqual(["BUY"]);
    expect(evidence.orderOutcomes).toEqual([
      { side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 100, filledQuantity: 100, status: "FILLED" },
      { side: "SELL", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 100, filledQuantity: 0, status: "REJECTED", reason: "T_PLUS_1_UNAVAILABLE" }
    ]);
    expect(run.status).toBe("COMPLETED");
  });

  it("rejects a sell policy whose maximum adverse slippage would produce a zero price", () => {
    expect(() => new V14BacktestEngine(fixture.bars, fixture.sha256, {
      initialCashCents: 1_000_000,
      targetQuantity: 100,
      participationRateBasisPoints: 10_000,
      slippageBasisPoints: 10_000,
      fixedFeeCents: 500,
      sellOrder: { signalDate: "2024-01-03", executionDate: "2024-01-04", quantity: 100 }
    })).toThrow(/invalid cash, quantity, participation, slippage, or fee values/);
  });

  it("fails closed when marked NAV cannot be represented exactly in integer cents", () => {
    const bars = fixture.bars.map((bar, index) => index === fixture.bars.length - 1 ? { ...bar, closeCents: Number.MAX_SAFE_INTEGER } : bar);
    const policy: V14ExecutionPolicy = { initialCashCents: 2_000, targetQuantity: 1, participationRateBasisPoints: 10_000, slippageBasisPoints: 0, fixedFeeCents: 0 };
    expect(() => new V14BacktestEngine(bars, fixture.sha256, policy).run("normal")).toThrow(/NAV cents exceeds safe integer precision/);
  });
});
