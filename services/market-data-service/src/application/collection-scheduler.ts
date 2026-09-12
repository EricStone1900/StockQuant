export type SessionStatus = "TRADING" | "CLOSED" | "UNKNOWN";
export type CalendarSession = { date: string; status: SessionStatus; calendarVersion: string; sessions?: Array<{ start: string; end: string }> };
export type Calendar = { session(date: string): CalendarSession };
export type Clock = { now(): Date };
export type CollectionWindow = {
  subscriptionId: string;
  windowStart: string;
  windowEnd: string;
  jobKind: "INTRADAY_WINDOW" | "GAP_REPAIR";
  idempotencyKey: string;
  calendarVersion: string;
  backfill: boolean;
};

const SHANGHAI_OFFSET_MINUTES = 8 * 60;
const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
const localDateTimeToUtc = (date: string, hhmm: string): Date => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), hours, minutes - SHANGHAI_OFFSET_MINUTES));
};
const addMinutes = (value: Date, minutes: number): Date => new Date(value.getTime() + minutes * 60_000);
const iso = (value: Date): string => value.toISOString();

export class CollectionScheduler {
  private state: "DISABLED" | "ENABLED" = "DISABLED";

  constructor(private readonly calendar: Calendar, private readonly clock: Clock, private readonly windowMinutes = 5, private readonly publishDelaySeconds = 120) {}

  enable(): void { this.state = "ENABLED"; }
  disable(): void { this.state = "DISABLED"; }
  status(): "DISABLED" | "ENABLED" { return this.state; }

  plan(subscriptionId: string, fromDate: string, toDate: string, existingKeys = new Set<string>(), watermarkEnd: string | null = null, maxWindows = 500): { windows: CollectionWindow[]; waitingDates: string[]; nextExecutionAt: string | null } {
    if (this.state === "DISABLED") return { windows: [], waitingDates: [], nextExecutionAt: null };
    const windows: CollectionWindow[] = [];
    const waitingDates: string[] = [];
    const now = this.clock.now();
    for (let cursor = new Date(`${fromDate}T12:00:00Z`); dateOnly(cursor) <= toDate && windows.length < maxWindows; cursor = addMinutes(cursor, 24 * 60)) {
      const date = dateOnly(cursor);
      const session = this.calendar.session(date);
      if (session.status === "UNKNOWN") { waitingDates.push(date); continue; }
      if (session.status !== "TRADING") continue;
      for (const slot of session.sessions ?? []) {
        for (let start = localDateTimeToUtc(date, slot.start), end = addMinutes(start, this.windowMinutes); end <= localDateTimeToUtc(date, slot.end); start = end, end = addMinutes(start, this.windowMinutes)) {
          const windowEnd = end;
          if (addMinutes(windowEnd, this.publishDelaySeconds / 60) > now) continue;
          const windowStartIso = iso(start);
          const windowEndIso = iso(windowEnd);
          if (watermarkEnd && windowEndIso <= watermarkEnd) continue;
          const idempotencyKey = `${subscriptionId}|1|${windowStartIso}|${windowEndIso}|INTRADAY_WINDOW`;
          if (existingKeys.has(idempotencyKey)) continue;
          windows.push({ subscriptionId, windowStart: windowStartIso, windowEnd: windowEndIso, jobKind: "INTRADAY_WINDOW", idempotencyKey, calendarVersion: session.calendarVersion, backfill: windowEnd < addMinutes(now, -this.windowMinutes) });
          if (windows.length >= maxWindows) break;
        }
        if (windows.length >= maxWindows) break;
      }
    }
    const future = this.nextWindow(subscriptionId, fromDate, toDate, now);
    return { windows, waitingDates, nextExecutionAt: future };
  }

  private nextWindow(subscriptionId: string, fromDate: string, toDate: string, now: Date): string | null {
    for (let cursor = new Date(`${fromDate}T12:00:00Z`); dateOnly(cursor) <= toDate; cursor = addMinutes(cursor, 24 * 60)) {
      const date = dateOnly(cursor); const session = this.calendar.session(date);
      if (session.status !== "TRADING") continue;
      for (const slot of session.sessions ?? []) {
        for (let start = localDateTimeToUtc(date, slot.start), end = addMinutes(start, this.windowMinutes); end <= localDateTimeToUtc(date, slot.end); start = end, end = addMinutes(start, this.windowMinutes)) {
          if (end > now) return iso(addMinutes(end, this.publishDelaySeconds / 60));
        }
      }
    }
    return null;
  }
}

export type ScheduleTick = { subscriptionId: string; fromDate: string; toDate: string; existingKeys?: Set<string> };

export class CollectionSchedulerWorker {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly scheduler: CollectionScheduler, private readonly submit: (window: CollectionWindow) => Promise<void>) {}

  async tick(input: ScheduleTick): Promise<ReturnType<CollectionScheduler["plan"]>> {
    const plan = this.scheduler.plan(input.subscriptionId, input.fromDate, input.toDate, input.existingKeys);
    for (const window of plan.windows) await this.submit(window);
    return plan;
  }

  start(intervalMs: number, input: ScheduleTick): void {
    if (this.timer) return;
    this.scheduler.enable();
    this.timer = setInterval(() => { void this.tick(input); }, intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.scheduler.disable();
  }
}
