export type V13FixtureCalendarDay = {
  date: string;
  status: "TRADING" | "CLOSED" | "UNKNOWN";
  calendarVersion: string;
  sessions?: Array<{ start: string; end: string }>;
};

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
