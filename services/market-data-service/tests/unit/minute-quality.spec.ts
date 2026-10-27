import { describe, expect, it } from "vitest";
import { buildCoverage, expectedWindows, prioritizeGaps, validateBars, type QualityBar } from "../../src/application/minute-quality.js";

const calendar = { session: (date: string) => date === "2026-09-12" ? { status: "CLOSED" as const } : date === "2026-09-14" ? { status: "UNKNOWN" as const } : { status: "TRADING" as const, sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] } };
const bars: QualityBar[] = expectedWindows(["600000.SH"], "2026-09-11", "2026-09-11", calendar).map((item) => ({ ...item, open: 10, high: 11, low: 9, close: 10, volume: 100, amount: 1000 }));

describe("minute quality and coverage", () => {
  it("accepts complete trading windows and excludes closed dates", () => {
    expect(expectedWindows(["600000.SH"], "2026-09-11", "2026-09-12", calendar)).toHaveLength(4);
    expect(buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", bars, calendar)).toMatchObject({ status: "PASS", expectedBars: 4, missingBars: 0 });
  });
  it("builds one-minute and five-minute coverage grids from the selected frequency", () => {
    expect(buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [], calendar, { windowMinutes: 1 })).toMatchObject({ expectedBars: 20, unknownBars: 20 });
    expect(buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [], calendar, { windowMinutes: 5 })).toMatchObject({ expectedBars: 4, unknownBars: 4 });
  });
  it("keeps an unverified absent bar unknown while reporting duplicates and invalid rows", () => {
    const report = buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [...bars.slice(0, 3), bars[0], { ...bars[1], high: 8 }], calendar);
    expect(report.status).toBe("INCOMPLETE");
    expect(report.missingBars).toBe(0);
    expect(report.unknownBars).toBe(1);
    expect(report.duplicateBars).toBe(2);
    expect(report.issues.some((issue) => issue.code === "OHLC_INVALID")).toBe(true);
  });
  it("distinguishes confirmed missing bars and declared suspensions by per-bar evidence", () => {
    const windows = expectedWindows(["600000.SH"], "2026-09-11", "2026-09-11", calendar);
    const report = buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [], calendar, { tradingStatusEvidence: [
      { ...windows[0], status: "TRADING", sourceReference: "status-record:1" },
      { ...windows[1], status: "SUSPENDED", sourceReference: "status-record:2" },
    ] });
    expect(report).toMatchObject({ status: "INCOMPLETE", expectedBars: 4, missingBars: 1, unknownBars: 2, suspendedBars: 1 });
    expect(report.gaps).toEqual([expect.objectContaining({ reason: "MISSING", evidenceReference: "status-record:1" })]);
    expect(report.barStatuses.map((item) => item.status)).toEqual(["MISSING", "SUSPENDED", "UNKNOWN", "UNKNOWN"]);
  });
  it("fails closed for invalid or conflicting status evidence", () => {
    const slot = expectedWindows(["600000.SH"], "2026-09-11", "2026-09-11", calendar)[0];
    const report = buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [], calendar, { tradingStatusEvidence: [
      { ...slot, status: "TRADING", sourceReference: "status-record:1" },
      { ...slot, status: "SUSPENDED", sourceReference: "status-record:2" },
    ] });
    expect(report.missingBars).toBe(0);
    expect(report.unknownBars).toBe(4);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "INVALID_TRADING_STATUS_EVIDENCE" }));
  });
  it("waits when a date is outside calendar authority and prioritizes old gaps", () => {
    const waiting = buildCoverage(["600000.SH"], "2026-09-14", "2026-09-14", [], calendar);
    expect(waiting.status).toBe("WAITING_DEPENDENCY");
    const ordered = prioritizeGaps([{ gapId: "new", securityId: "x", barStart: "2026-09-11T01:30:00Z", barEnd: "2026-09-11T01:35:00Z", reason: "MISSING", priority: "P1" }, { gapId: "old", securityId: "x", barStart: "2026-09-01T01:30:00Z", barEnd: "2026-09-01T01:35:00Z", reason: "MISSING", priority: "P1" }], Date.parse("2026-09-12T00:00:00Z"));
    expect(ordered[0].gapId).toBe("old");
    expect(ordered[0].priority).toBe("P0");
  });
  it("rejects missing amount for strict consumers", () => {
    expect(validateBars([{ ...bars[0], amount: null }])).toContainEqual(expect.objectContaining({ code: "AMOUNT_UNAVAILABLE" }));
  });
  it("uses only cited applicability and limit facts for per-bar rejection", () => {
    const base = { ...bars[0]!, tradingStatus: "TRADING" as const, tradingStatusReference: "source://status/600000/20260911", limitPriceReference: { status: "AVAILABLE" as const, upperLimit: 10.5, lowerLimit: 9.5, marketRuleSetVersion: "rules-v1", sourceReference: "source://limits/600000/20260911" } };
    expect(validateBars([base])).toContainEqual(expect.objectContaining({ code: "LIMIT_PRICE_BREACH" }));
    expect(validateBars([{ ...base, tradingStatus: "SUSPENDED", high: 10.2, low: 9.8 }])).toContainEqual(expect.objectContaining({ code: "BAR_PRESENT_WHILE_SUSPENDED" }));
    expect(validateBars([{ ...base, tradingStatusReference: null }])).toContainEqual(expect.objectContaining({ code: "INVALID_TRADING_STATUS_EVIDENCE" }));
    expect(validateBars([{ ...bars[0]!, tradingStatus: "UNKNOWN", limitPriceReference: { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null } }])).toEqual([]);
  });
});
