import type { CnAShareCalendarSession } from "../contracts/generated-types.js";

const calendar2026 = {
  version: "sse-cn-a-share-2026-1",
  source: "https://www.sse.com.cn/disclosure/announcement/general/c/c_20251222_10802507.shtml",
  closedRanges: [["2026-01-01", "2026-01-04"], ["2026-02-14", "2026-02-23"], ["2026-04-04", "2026-04-06"], ["2026-05-01", "2026-05-05"], ["2026-06-19", "2026-06-21"], ["2026-09-25", "2026-09-27"], ["2026-10-01", "2026-10-07"]]
} as const;

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function cnAShareSession(date: string): CnAShareCalendarSession {
  if (!isCalendarDate(date) || !date.startsWith("2026-")) return { date, status: "UNKNOWN", calendarVersion: calendar2026.version, reason: "calendar coverage is limited to 2026" };
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const holiday = calendar2026.closedRanges.some(([start, end]) => date >= start && date <= end);
  return { date, status: weekday === 0 || weekday === 6 || holiday ? "CLOSED" : "TRADING", calendarVersion: calendar2026.version, source: calendar2026.source, sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }] };
}

export type SamplingWindowDecision = { status: "ELIGIBLE" | "CLOSED" | "NOT_SAMPLING_TICK" | "UNKNOWN_CALENDAR"; localTime: string; calendarVersion: string; window: "morning" | "afternoon" | null };

export type DailyBarCloseDecision = { status: "DUE" | "BEFORE_CLOSE" | "CLOSED" | "UNKNOWN_CALENDAR"; localDate: string; localTime: string; calendarVersion: string };

/** A daily completion trigger becomes due only after the known A-share session close. */
export function decideCnAShareDailyBarClose(instant: string): DailyBarCloseDecision {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return { status: "UNKNOWN_CALENDAR", localDate: "UNKNOWN", localTime: "UNKNOWN", calendarVersion: "UNAVAILABLE" };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const localDate = `${get("year")}-${get("month")}-${get("day")}`;
  const localTime = `${get("hour")}:${get("minute")}`;
  const session = cnAShareSession(localDate);
  if (session.status === "UNKNOWN") return { status: "UNKNOWN_CALENDAR", localDate, localTime, calendarVersion: session.calendarVersion };
  if (session.status !== "TRADING") return { status: "CLOSED", localDate, localTime, calendarVersion: session.calendarVersion };
  return { status: localTime >= "15:00" ? "DUE" : "BEFORE_CLOSE", localDate, localTime, calendarVersion: session.calendarVersion };
}

/** Deterministic session gate; the caller supplies the run-scoped instant. */
export function decideCnAShareSamplingTick(instant: string, intervalMinutes: 20 | 30): SamplingWindowDecision {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime())) return { status: "UNKNOWN_CALENDAR", localTime: "INVALID_INSTANT", calendarVersion: "UNAVAILABLE", window: null };
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const day = `${get("year")}-${get("month")}-${get("day")}`;
  const localTime = `${get("hour")}:${get("minute")}`;
  const session = cnAShareSession(day);
  if (session.status === "UNKNOWN") return { status: "UNKNOWN_CALENDAR", localTime, calendarVersion: session.calendarVersion, window: null };
  if (session.status !== "TRADING") return { status: "CLOSED", localTime, calendarVersion: session.calendarVersion, window: null };
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const morningStart = 9 * 60 + 30; const morningEnd = 11 * 60 + 30;
  const afternoonStart = 13 * 60; const afternoonEnd = 15 * 60;
  const start = minutes >= morningStart && minutes < morningEnd ? morningStart : minutes >= afternoonStart && minutes < afternoonEnd ? afternoonStart : null;
  const window = start === morningStart ? "morning" : start === afternoonStart ? "afternoon" : null;
  if (start === null) return { status: "CLOSED", localTime, calendarVersion: session.calendarVersion, window: null };
  const offset = minutes - start;
  return { status: offset % intervalMinutes === 0 ? "ELIGIBLE" : "NOT_SAMPLING_TICK", localTime, calendarVersion: session.calendarVersion, window };
}
