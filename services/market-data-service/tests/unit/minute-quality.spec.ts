import { describe, expect, it } from "vitest";
import { buildCoverage, expectedWindows, prioritizeGaps, validateBars, type QualityBar } from "../../src/application/minute-quality.js";

const calendar = { session: (date: string) => date === "2026-09-12" ? { status: "CLOSED" as const } : date === "2026-09-14" ? { status: "UNKNOWN" as const } : { status: "TRADING" as const, sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] } };
const bars: QualityBar[] = expectedWindows(["600000.SH"], "2026-09-11", "2026-09-11", calendar).map((item) => ({ ...item, open: 10, high: 11, low: 9, close: 10, volume: 100, amount: 1000 }));

describe("minute quality and coverage", () => {
  it("accepts complete trading windows and excludes closed dates", () => {
    expect(expectedWindows(["600000.SH"], "2026-09-11", "2026-09-12", calendar)).toHaveLength(4);
    expect(buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", bars, calendar)).toMatchObject({ status: "PASS", expectedBars: 4, missingBars: 0 });
  });
  it("records missing, duplicate and invalid rows without fabricating bars", () => {
    const report = buildCoverage(["600000.SH"], "2026-09-11", "2026-09-11", [...bars.slice(0, 3), bars[0], { ...bars[1], high: 8 }], calendar);
    expect(report.status).toBe("INCOMPLETE");
    expect(report.missingBars).toBe(1);
    expect(report.duplicateBars).toBe(2);
    expect(report.issues.some((issue) => issue.code === "OHLC_INVALID")).toBe(true);
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
});
