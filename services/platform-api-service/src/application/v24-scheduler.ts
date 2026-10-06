export interface Clock { now(): Date }
export class SystemClock implements Clock { now() { return new Date(); } }
export function parseV24SamplingInterval(value: string | undefined): 20 | 30 {
  if (value === undefined || value === "") return 30;
  if (value === "20" || value === "30") return Number(value) as 20 | 30;
  throw new Error("STOCKQUANT_V24_SAMPLING_INTERVAL_MINUTES must be 20 or 30");
}

export type SchedulerState = {
  status: "STOPPED" | "RUNNING";
  samplingIntervalMinutes: number;
  executionWindow: string;
  lastSampleAt: string | null;
  nextSampleAt: string | null;
  tickCount: number;
  mode: "PAPER";
  brokerMode: "FAKE";
};

export interface SchedulerStore {
  loadSchedulerState(): Promise<SchedulerState | null>;
  saveSchedulerState(state: SchedulerState): Promise<void>;
}

export type SchedulerEventKind = "RECOVERY_CHECK" | "SAMPLING_SLOT" | "EXECUTION_WINDOW" | "END_OF_DAY";
const V24_SCHEDULER_MAX_EVENT_DELAY_MS = 60_000;
export interface SchedulerTickHandler {
  handleTick(input: { now: Date; previousSampleAt: string | null; kind: SchedulerEventKind; scheduledFor: string | null; samplingIntervalMinutes?: number }): Promise<void>;
}

const shanghai = (date: Date) => {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => values.find((item) => item.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}` };
};
const atShanghai = (date: string, time: string) => new Date(`${date}T${time}+08:00`);
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
const nextWeekday = (date: string) => { let candidate = atShanghai(date, "12:00:00"); do { candidate = new Date(candidate.getTime() + 86_400_000); } while ([0, 6].includes(candidate.getUTCDay())); return formatDate(candidate); };
export function v24SamplingSlots(intervalMinutes: number): string[] {
  if (intervalMinutes !== 20 && intervalMinutes !== 30) throw new Error("sampling interval must be 20 or 30 minutes");
  const slots: string[] = [];
  for (const [start, end] of [[9 * 60 + 30, 11 * 60 + 30], [13 * 60, 15 * 60]]) {
    for (let minute = start; minute <= end; minute += intervalMinutes) {
      slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`);
    }
  }
  return slots;
}

export class ContinuousPaperScheduler {
  private samplingTimer: ReturnType<typeof setTimeout> | null = null;
  private executionTimer: ReturnType<typeof setTimeout> | null = null;
  private eodTimer: ReturnType<typeof setTimeout> | null = null;
  private state: SchedulerState = { status: "STOPPED", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" };

  constructor(private readonly clock: Clock = new SystemClock(), private readonly store: SchedulerStore | null = null, private readonly handler: SchedulerTickHandler | null = null, private readonly configuredSamplingIntervalMinutes: 20 | 30 = 30) {}

  async start(): Promise<SchedulerState> {
    if (this.store) {
      const persisted = await this.store.loadSchedulerState();
      if (persisted) this.state = { ...this.state, ...persisted, mode: "PAPER", brokerMode: "FAKE" };
      if (this.state.samplingIntervalMinutes !== 20 && this.state.samplingIntervalMinutes !== 30) {
        throw new Error("persisted V2.4 sampling interval must be 20 or 30 minutes");
      }
      if (this.state.status === "STOPPED") this.state.samplingIntervalMinutes = this.configuredSamplingIntervalMinutes;
    } else this.state.samplingIntervalMinutes = this.configuredSamplingIntervalMinutes;
    if (this.state.status === "RUNNING" && this.samplingTimer) return this.status();
    this.state.status = "RUNNING";
    await this.run("RECOVERY_CHECK", null);
    this.scheduleAll();
    return this.status();
  }

  async stop(): Promise<SchedulerState> {
    for (const timer of [this.samplingTimer, this.executionTimer, this.eodTimer]) if (timer) clearTimeout(timer);
    this.samplingTimer = this.executionTimer = this.eodTimer = null;
    this.state.status = "STOPPED"; this.state.nextSampleAt = null; await this.persist(); return this.status();
  }
  async tick(): Promise<SchedulerState> { await this.run("RECOVERY_CHECK", null); return this.status(); }
  status() { return { ...this.state }; }

  private scheduleAll(): void { this.scheduleSampling(); this.scheduleExecution(); this.scheduleEod(); }
  private scheduleSampling(): void {
    const target = this.nextAt(v24SamplingSlots(this.state.samplingIntervalMinutes)); this.state.nextSampleAt = target.toISOString(); void this.persist();
    this.samplingTimer = setTimeout(() => { void this.runScheduled("SAMPLING_SLOT", target).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleSampling(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private scheduleExecution(): void {
    const target = this.nextAt(["09:31:00"]);
    this.executionTimer = setTimeout(() => { void this.runScheduled("EXECUTION_WINDOW", target).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleExecution(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private scheduleEod(): void {
    const target = this.nextAt(["15:10:00"]);
    this.eodTimer = setTimeout(() => { void this.runScheduled("END_OF_DAY", target).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleEod(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private nextAt(slots: string[]): Date {
    const now = this.clock.now(); const today = shanghai(now).date;
    const sameDay = slots.map((slot) => atShanghai(today, slot)).find((candidate) => candidate.getTime() > now.getTime());
    return sameDay ?? atShanghai(nextWeekday(today), slots[0]);
  }
  private async run(kind: SchedulerEventKind, scheduledFor: string | null): Promise<void> {
    const now = this.clock.now(); const previousSampleAt = this.state.lastSampleAt;
    if (this.handler) await this.handler.handleTick({ now, previousSampleAt, kind, scheduledFor, samplingIntervalMinutes: this.state.samplingIntervalMinutes });
    this.state.lastSampleAt = now.toISOString(); this.state.tickCount += 1; await this.persist();
  }
  private async runScheduled(kind: SchedulerEventKind, scheduledAt: Date): Promise<void> {
    const delayMs = this.clock.now().getTime() - scheduledAt.getTime();
    if (Math.abs(delayMs) > V24_SCHEDULER_MAX_EVENT_DELAY_MS) {
      await this.run("RECOVERY_CHECK", null);
      return;
    }
    await this.run(kind, scheduledAt.toISOString());
  }
  private async persist(): Promise<void> { if (this.store) await this.store.saveSchedulerState(this.state); }
}
