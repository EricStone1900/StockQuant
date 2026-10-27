import { describe, expect, it } from "vitest";
import { withMinuteBarContextDefaults } from "../../src/domain/minute-import.js";

const base = { securityId: "600000.SH", market: "CN_A", frequency: "1m", barStart: "2026-10-22T01:30:00.000Z", barEnd: "2026-10-22T01:31:00.000Z", availableAt: "2026-10-22T01:31:00.000Z", open: 10, high: 10, low: 10, close: 10, volume: 100, amount: 1000, adjustment: "RAW" };

describe("MinuteBar context facts", () => {
  it("makes absent status and limit facts explicitly unknown", () => {
    expect(withMinuteBarContextDefaults(base)).toMatchObject({ tradingStatus: "UNKNOWN", tradingStatusReference: null, limitPriceReference: { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null } });
  });
  it("does not promote a claimed status without a source reference", () => {
    expect(withMinuteBarContextDefaults({ ...base, tradingStatus: "SUSPENDED", tradingStatusReference: " " })).toMatchObject({ tradingStatus: "UNKNOWN", tradingStatusReference: null });
  });
  it("requires source, rule version and both prices for an available limit reference", () => {
    const available = { status: "AVAILABLE" as const, upperLimit: 11, lowerLimit: 9, marketRuleSetVersion: "cn-a-2026-v1", sourceReference: "rules.csv#600000.SH" };
    expect(withMinuteBarContextDefaults({ ...base, limitPriceReference: available }).limitPriceReference).toEqual(available);
    expect(withMinuteBarContextDefaults({ ...base, limitPriceReference: { ...available, sourceReference: "" } }).limitPriceReference).toMatchObject({ status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null });
    expect(withMinuteBarContextDefaults({ ...base, limitPriceReference: { ...available, lowerLimit: 12 } }).limitPriceReference).toMatchObject({ status: "UNKNOWN", upperLimit: null, lowerLimit: null });
  });
});
