import { describe, expect, it } from "vitest";
import { compareMinuteDailyAggregate } from "../../src/application/minute-daily-aggregate.js";
import type { MinuteImportBar } from "../../src/domain/minute-import.js";

const bars: MinuteImportBar[] = [
  { securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: "2026-10-22T01:30:00.000Z", barEnd: "2026-10-22T01:35:00.000Z", availableAt: "2026-10-22T01:35:00.000Z", open: 10, high: 11, low: 9, close: 10.5, volume: 100, amount: 1000, adjustment: "RAW", tradingStatus: "UNKNOWN", tradingStatusReference: null, limitPriceReference: { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null } },
  { securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: "2026-10-22T01:35:00.000Z", barEnd: "2026-10-22T01:40:00.000Z", availableAt: "2026-10-22T01:40:00.000Z", open: 10.5, high: 12, low: 10, close: 11.5, volume: 200, amount: 2200, adjustment: "RAW", tradingStatus: "UNKNOWN", tradingStatusReference: null, limitPriceReference: { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null } },
];
const base = { bars, securityId: "600000.SH", tradingDate: "2026-10-22", frequency: "5m" as const, reference: { open: 10, high: 12, low: 9, close: 11.5, volume: 300, amount: 3200 }, referenceSource: "operator daily file", sourceReference: "local://daily-20261022.csv#600000.SH" };

describe("minute to daily aggregate comparison", () => {
  it("aggregates OHLCV and amount and records operator reference provenance", () => {
    expect(compareMinuteDailyAggregate(base)).toMatchObject({ status: "MATCH", observedBars: 2, aggregate: base.reference, differences: [], referenceVerification: "OPERATOR_SUPPLIED_NOT_INDEPENDENTLY_VERIFIED", completeness: "NOT_ASSESSED_BY_AGGREGATION" });
  });
  it("reports exact field differences", () => {
    const report = compareMinuteDailyAggregate({ ...base, reference: { ...base.reference, close: 11.4, volume: 301 } });
    expect(report.status).toBe("DIFFERENT");
    expect(report.differences).toEqual([
      { field: "close", aggregate: 11.5, reference: 11.4, delta: 0.1 },
      { field: "volume", aggregate: 300, reference: 301, delta: -1 },
    ]);
  });
  it("fails closed for wrong date, frequency, adjustment or duplicate bars", () => {
    const report = compareMinuteDailyAggregate({ ...base, bars: [bars[0]!, { ...bars[1]!, adjustment: "qfq" }, bars[1]!] });
    expect(report).toMatchObject({ status: "INCOMPLETE", aggregate: null });
    expect(report.issues).toEqual(expect.arrayContaining(["BAR_SCOPE_OR_SEMANTICS_MISMATCH", "DUPLICATE_MINUTE_BAR"]));
  });
  it("does not claim minute-bar completeness", () => {
    expect(compareMinuteDailyAggregate({ ...base, bars: bars.slice(0, 1) })).toMatchObject({ status: "DIFFERENT", completeness: "NOT_ASSESSED_BY_AGGREGATION", observedBars: 1 });
  });
  it("sums monetary values without binary floating-point drift", () => {
    const report = compareMinuteDailyAggregate({ ...base, bars: bars.map((bar) => ({ ...bar, amount: 0.1 })), reference: { ...base.reference, amount: 0.2 } });
    expect(report).toMatchObject({ status: "MATCH", aggregate: { amount: 0.2 }, differences: [] });
  });
  it("rejects an incoherent daily reference candle", () => {
    const report = compareMinuteDailyAggregate({ ...base, reference: { ...base.reference, high: 9 } });
    expect(report).toMatchObject({ status: "INCOMPLETE", aggregate: null });
    expect(report.issues).toContain("REFERENCE_OHLC_INVALID");
  });
});
