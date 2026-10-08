import { describe, expect, it } from "vitest";
import { resolveNextV13CnSession, V13SessionClockError, type V13FixtureCalendarDay } from "../../src/application/v13-session-clock.js";

const version = "sse-cn-a-share-2026-1";
const trading = (date: string, calendarVersion = version): V13FixtureCalendarDay => ({ date, status: "TRADING", calendarVersion, sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }] });
const closed = (date: string): V13FixtureCalendarDay => ({ date, status: "CLOSED", calendarVersion: version });

describe("V1.3 persistent session clock calendar resolution", () => {
  it("advances from the verified session to the next open, one minute after its first session begins", async () => {
    const dates: string[] = [];
    const resolved = await resolveNextV13CnSession("2026-09-28T09:31:00+08:00", async (date) => {
      dates.push(date);
      return date === "2026-09-28" || date === "2026-09-29" ? trading(date) : closed(date);
    });
    expect(resolved).toEqual({ clock: "2026-09-29T09:31:00+08:00", calendarVersion: version });
    expect(dates).toEqual(["2026-09-28", "2026-09-29"]);
  });

  it("skips verified closed dates while retaining the pinned calendar version", async () => {
    const resolved = await resolveNextV13CnSession("2026-09-24T09:31:00+08:00", async (date) => {
      if (date === "2026-09-24") return trading(date);
      if (["2026-09-25", "2026-09-26", "2026-09-27"].includes(date)) return closed(date);
      return trading(date);
    });
    expect(resolved.clock).toBe("2026-09-28T09:31:00+08:00");
  });

  it.each([
    { name: "closed current session", current: "2026-09-27T09:31:00+08:00", get: async (date: string) => closed(date), code: "CURRENT_SESSION_CLOSED" },
    { name: "unknown next calendar date", current: "2026-09-28T09:31:00+08:00", get: async (date: string) => date === "2026-09-28" ? trading(date) : ({ date, status: "UNKNOWN", calendarVersion: version } as V13FixtureCalendarDay), code: "CALENDAR_GAP" },
    { name: "calendar version change", current: "2026-09-28T09:31:00+08:00", get: async (date: string) => date === "2026-09-28" ? trading(date) : trading(date, "sse-cn-a-share-2026-2"), code: "CALENDAR_VERSION_CHANGED" },
  ])("fails closed for $name", async ({ current, get, code }) => {
    await expect(resolveNextV13CnSession(current, get)).rejects.toMatchObject<V13SessionClockError>({ code });
  });
});
