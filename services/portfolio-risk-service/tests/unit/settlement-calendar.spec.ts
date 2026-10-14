import { describe, expect, it } from "vitest";
import { assertPaperSettlement } from "../../src/application/settlement-calendar.js";

describe("strict Paper settlement calendar", () => {
  const valid = { market: "CN_A" as const, currency: "CNY", effectiveAt: "2024-01-05T01:01:00.000Z", settlement: { tradeDate: "2024-01-05", settlementDate: "2024-01-08", calendarVersion: "v1.4-synthetic-settlement-1", settlementErrorCode: null } };

  it("accepts only the explicitly manifested weekend-spanning market date", () => {
    expect(() => assertPaperSettlement(valid)).not.toThrow();
  });

  it("validates the manifest date in the market timezone across UTC midnight", () => {
    expect(() => assertPaperSettlement({ ...valid, effectiveAt: "2026-09-24T16:30:00.000Z", settlement: { tradeDate: "2026-09-25", settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-3", settlementErrorCode: null } })).not.toThrow();
    expect(() => assertPaperSettlement({ market: "US_EQUITY", currency: "USD", effectiveAt: "2026-09-25T03:30:00.000Z", settlement: { tradeDate: "2026-09-24", settlementDate: "2026-09-25", calendarVersion: "v1.4-synthetic-settlement-3", settlementErrorCode: null } })).not.toThrow();
    expect(() => assertPaperSettlement({ market: "US_EQUITY", currency: "USD", effectiveAt: "2026-09-25T04:30:00.000Z", settlement: { tradeDate: "2026-09-25", settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-3", settlementErrorCode: null } })).not.toThrow();
  });

  it("validates the second immutable Fixture revision used by bounded V1.3 Paper scenarios", () => {
    expect(() => assertPaperSettlement({ ...valid, effectiveAt: "2026-09-25T01:00:00.000Z", settlement: { tradeDate: "2026-09-25", settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-2", settlementErrorCode: null } })).not.toThrow();
    expect(() => assertPaperSettlement({ ...valid, effectiveAt: "2026-09-26T01:00:00.000Z", settlement: { tradeDate: "2026-09-26", settlementDate: null, calendarVersion: "v1.4-synthetic-settlement-2", settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" } })).not.toThrow();
    expect(() => assertPaperSettlement({ ...valid, effectiveAt: "2026-09-25T01:00:00.000Z", settlement: { tradeDate: "2026-09-25", settlementDate: null, calendarVersion: "v1.4-synthetic-settlement-2", settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" } })).toThrow("SETTLEMENT_CALENDAR_UNAVAILABLE");
  });

  it("rejects an inferred date, altered settlement date, wrong calendar, and mismatched currency", () => {
    expect(() => assertPaperSettlement({ ...valid, settlement: { ...valid.settlement, tradeDate: "2024-01-06" } })).toThrow("SETTLEMENT_TRADE_DATE_MISMATCH");
    expect(() => assertPaperSettlement({ ...valid, settlement: { ...valid.settlement, settlementDate: "2024-01-07" } })).toThrow("SETTLEMENT_DATE_MISMATCH");
    expect(() => assertPaperSettlement({ ...valid, settlement: { ...valid.settlement, calendarVersion: "untrusted" } })).toThrow("SETTLEMENT_CALENDAR_VERSION_MISMATCH");
    expect(() => assertPaperSettlement({ ...valid, currency: "USD" })).toThrow("SETTLEMENT_MARKET_CURRENCY_MISMATCH");
  });

  it("keeps unsupported dates pending instead of inferring a release date", () => {
    expect(() => assertPaperSettlement({ ...valid, effectiveAt: "2030-01-02T01:00:00.000Z", settlement: { ...valid.settlement, tradeDate: "2030-01-02" } })).toThrow("SETTLEMENT_CALENDAR_UNAVAILABLE");
  });
});
