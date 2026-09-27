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
