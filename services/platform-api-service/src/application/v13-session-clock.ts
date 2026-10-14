import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type V13FixtureCalendarDay = {
  date: string;
  status: "TRADING" | "CLOSED" | "UNKNOWN";
  calendarVersion: string;
  sessions?: Array<{ start: string; end: string }>;
};

export const V13_US_CALENDAR_VERSION = "v1.3-us-synthetic-session-1";

export async function readV13UsSyntheticCalendarDay(date: string): Promise<V13FixtureCalendarDay> {
  const relative = "fixtures/v1/v1.3-us-synthetic-session-1";
  const roots = [path.resolve(process.cwd(), relative), path.resolve(process.cwd(), "../../", relative)];
  let bytes: Buffer | undefined;
  let manifestBytes: Buffer | undefined;
  for (const root of roots) {
    try {
      bytes = await readFile(path.join(root, "session-calendar.json"));
      manifestBytes = await readFile(path.join(root, "manifest.json"));
      break;
    } catch { /* try the repository-root and service-root layouts */ }
  }
  if (!bytes || !manifestBytes) throw new V13SessionClockError("CALENDAR_GAP", "US session Fixture files are unavailable");
  const manifest = JSON.parse(manifestBytes.toString("utf8")) as { fixtureVersion?: string; files?: Array<{ path?: string; bytes?: number; sha256?: string }> };
  const file = manifest.files?.find((item) => item.path?.endsWith("/session-calendar.json"));
  if (manifest.fixtureVersion !== V13_US_CALENDAR_VERSION || file?.sha256 !== createHash("sha256").update(bytes).digest("hex")) {
    throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "US session Fixture manifest or SHA-256 does not match");
  }
  const fixture = JSON.parse(bytes.toString("utf8")) as { calendarVersion?: string; market?: string; timeZone?: string; sessions?: Array<{ sessionDate?: string; status?: string; open?: string; close?: string }> };
  if (fixture.calendarVersion !== V13_US_CALENDAR_VERSION || fixture.market !== "US_EQUITY" || fixture.timeZone !== "America/New_York") throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "US session Fixture metadata is unsupported");
  const session = fixture.sessions?.find((item) => item.sessionDate === date);
  if (!session) return { date, status: "UNKNOWN", calendarVersion: V13_US_CALENDAR_VERSION };
  if (session.status === "CLOSED") return { date, status: "CLOSED", calendarVersion: V13_US_CALENDAR_VERSION };
  if (session.status !== "TRADING" || !session.open || !session.close) return { date, status: "UNKNOWN", calendarVersion: V13_US_CALENDAR_VERSION };
  return { date, status: "TRADING", calendarVersion: V13_US_CALENDAR_VERSION, sessions: [{ start: session.open, end: session.close }] };
}

export class V13SessionClockError extends Error {
  constructor(readonly code: "INVALID_CLOCK" | "CURRENT_SESSION_CLOSED" | "CALENDAR_GAP" | "CALENDAR_VERSION_CHANGED" | "NO_NEXT_SESSION", message: string) {
    super(message);
    this.name = "V13SessionClockError";
  }
}

function nextDate(date: string): string {
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) throw new V13SessionClockError("INVALID_CLOCK", "V1.3 Fixture clock does not contain a valid calendar date");
  return new Date(parsed + 86_400_000).toISOString().slice(0, 10);
}

function clockAtFirstOpen(day: V13FixtureCalendarDay): string {
  const first = day.sessions?.[0]?.start;
  if (!first || !/^\d{2}:\d{2}$/u.test(first)) throw new V13SessionClockError("CALENDAR_GAP", "next trading session has no valid open time");
  const [hour, minute] = first.split(":").map(Number);
  const openMinute = hour * 60 + minute + 1;
  return `${day.date}T${String(Math.floor(openMinute / 60)).padStart(2, "0")}:${String(openMinute % 60).padStart(2, "0")}:00+08:00`;
}

function zonedSessionClock(date: string, time: string, timeZone: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const target = Date.UTC(year!, month! - 1, day!, hour!, minute!);
  let instant = target;
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const values = Object.fromEntries(parts.formatToParts(new Date(instant)).map((part) => [part.type, part.value]));
    const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
    const delta = target - represented;
    if (delta === 0) break;
    instant += delta;
  }
  return new Date(instant).toISOString();
}

export async function resolveNextV13UsSession(currentClock: string, calendar: (date: string) => Promise<V13FixtureCalendarDay>) {
  const match = /^(\d{4}-\d{2}-\d{2})T/u.exec(currentClock);
  if (!match || !Number.isFinite(Date.parse(currentClock))) throw new V13SessionClockError("INVALID_CLOCK", "V1.3 Fixture clock must be a valid ISO timestamp");
  const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(currentClock));
  const current = await calendar(currentDate);
  if (current.date !== currentDate || current.status !== "TRADING") throw new V13SessionClockError("CURRENT_SESSION_CLOSED", "current US Fixture date is not a verified trading session");
  if (current.calendarVersion !== V13_US_CALENDAR_VERSION) throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "US Fixture calendar version is unsupported");
  let date = currentDate;
  for (let offset = 0; offset < 15; offset += 1) {
    date = nextDate(date);
    const day = await calendar(date);
    if (day.date !== date || day.status === "UNKNOWN") throw new V13SessionClockError("CALENDAR_GAP", `US Fixture calendar does not verify ${date}`);
    if (day.calendarVersion !== current.calendarVersion) throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "US Fixture calendar version changed while resolving the next session");
    if (day.status === "TRADING") {
      const first = day.sessions?.[0]?.start;
      if (!first || !/^\d{2}:\d{2}$/u.test(first)) throw new V13SessionClockError("CALENDAR_GAP", "next US trading session has no valid open time");
      const [hour, minute] = first.split(":").map(Number);
      const nextMinute = hour! * 60 + minute! + 1;
      const localTime = `${String(Math.floor(nextMinute / 60)).padStart(2, "0")}:${String(nextMinute % 60).padStart(2, "0")}`;
      return { clock: zonedSessionClock(day.date, localTime, "America/New_York"), calendarVersion: day.calendarVersion };
    }
  }
  throw new V13SessionClockError("NO_NEXT_SESSION", "no verified US Fixture trading session was found in the bounded look-ahead window");
}

export async function resolveFirstV13UsSession(currentClock: string, calendar: (date: string) => Promise<V13FixtureCalendarDay>) {
  if (!Number.isFinite(Date.parse(currentClock))) throw new V13SessionClockError("INVALID_CLOCK", "V1.3 Fixture clock must be a valid ISO timestamp");
  let date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(currentClock));
  for (let offset = 0; offset < 15; offset += 1) {
    const day = await calendar(date);
    if (day.date !== date || day.status === "UNKNOWN") throw new V13SessionClockError("CALENDAR_GAP", `US Fixture calendar does not verify ${date}`);
    if (day.calendarVersion !== V13_US_CALENDAR_VERSION) throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "US Fixture calendar version is unsupported");
    if (day.status === "TRADING") {
      const first = day.sessions?.[0]?.start;
      if (!first || !/^\d{2}:\d{2}$/u.test(first)) throw new V13SessionClockError("CALENDAR_GAP", "first US trading session has no valid open time");
      const [hour, minute] = first.split(":").map(Number);
      const nextMinute = hour! * 60 + minute! + 1;
      return { clock: zonedSessionClock(date, `${String(Math.floor(nextMinute / 60)).padStart(2, "0")}:${String(nextMinute % 60).padStart(2, "0")}`, "America/New_York"), calendarVersion: day.calendarVersion };
    }
    date = nextDate(date);
  }
  throw new V13SessionClockError("NO_NEXT_SESSION", "no verified US Fixture trading session was found in the bounded look-ahead window");
}

export async function resolveNextV13CnSession(
  currentClock: string,
  calendar: (date: string) => Promise<V13FixtureCalendarDay>,
): Promise<{ clock: string; calendarVersion: string }> {
  const match = /^(\d{4}-\d{2}-\d{2})T/u.exec(currentClock);
  if (!match || !Number.isFinite(Date.parse(currentClock))) throw new V13SessionClockError("INVALID_CLOCK", "V1.3 Fixture clock must be a valid ISO timestamp");
  const currentDate = match[1];
  const current = await calendar(currentDate);
  if (current.date !== currentDate || current.status !== "TRADING") throw new V13SessionClockError("CURRENT_SESSION_CLOSED", "current Fixture date is not a verified trading session");
  if (!current.calendarVersion || current.calendarVersion !== "sse-cn-a-share-2026-1") throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "current Fixture calendar version is unsupported");

  let date = currentDate;
  for (let offset = 0; offset < 15; offset += 1) {
    date = nextDate(date);
    const day = await calendar(date);
    if (day.date !== date || day.status === "UNKNOWN") throw new V13SessionClockError("CALENDAR_GAP", `Fixture calendar does not verify ${date}`);
    if (day.calendarVersion !== current.calendarVersion) throw new V13SessionClockError("CALENDAR_VERSION_CHANGED", "Fixture calendar version changed while resolving the next session");
    if (day.status === "TRADING") return { clock: clockAtFirstOpen(day), calendarVersion: day.calendarVersion };
  }
  throw new V13SessionClockError("NO_NEXT_SESSION", "no verified Fixture trading session was found in the bounded look-ahead window");
}
