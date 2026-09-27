import { describe, expect, it } from "vitest";
import { cnAShareSession, isCalendarDate } from "../../src/application/cn-a-share-calendar.js";

describe("CN A-share versioned calendar", () => {
  it("accepts actual ISO calendar dates and rejects impossible dates", () => {
    expect(isCalendarDate("2026-02-28")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-99-99")).toBe(false);
    expect(isCalendarDate("not-a-date")).toBe(false);
  });

  it("returns the expected trading and closed sessions inside covered year", () => {
    expect(cnAShareSession("2026-09-28")).toMatchObject({ status: "TRADING", calendarVersion: "sse-cn-a-share-2026-1", sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }] });
    expect(cnAShareSession("2026-09-27")).toMatchObject({ status: "CLOSED", calendarVersion: "sse-cn-a-share-2026-1" });
    expect(cnAShareSession("2026-10-02").status).toBe("CLOSED");
  });

  it("returns UNKNOWN rather than extrapolating beyond calendar coverage", () => {
    expect(cnAShareSession("2027-01-04")).toEqual({ date: "2027-01-04", status: "UNKNOWN", calendarVersion: "sse-cn-a-share-2026-1", reason: "calendar coverage is limited to 2026" });
  });
});
