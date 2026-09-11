export interface Clock { now(): Date }
export class SystemClock implements Clock { now() { return new Date(); } }

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
export interface SchedulerTickHandler {
  handleTick(input: { now: Date; previousSampleAt: string | null; kind: SchedulerEventKind; scheduledFor: string | null }): Promise<void>;
}

const shanghai = (date: Date) => {
  const values = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = (type: string) => values.find((item) => item.type === type)?.value ?? "00";
  return { date: `${value("year")}-${value("month")}-${value("day")}` };
};
const atShanghai = (date: string, time: string) => new Date(`${date}T${time}+08:00`);
const formatDate = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(date);
const nextWeekday = (date: string) => { let candidate = atShanghai(date, "12:00:00"); do { candidate = new Date(candidate.getTime() + 86_400_000); } while ([0, 6].includes(candidate.getUTCDay())); return formatDate(candidate); };
const samplingSlots = ["09:30:00", "10:00:00", "10:30:00", "11:00:00", "11:30:00", "13:00:00", "13:30:00", "14:00:00", "14:30:00", "15:00:00"];

export class ContinuousPaperScheduler {
  private samplingTimer: ReturnType<typeof setTimeout> | null = null;
  private executionTimer: ReturnType<typeof setTimeout> | null = null;
  private eodTimer: ReturnType<typeof setTimeout> | null = null;
  private state: SchedulerState = { status: "STOPPED", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" };

  constructor(private readonly clock: Clock = new SystemClock(), private readonly store: SchedulerStore | null = null, private readonly handler: SchedulerTickHandler | null = null) {}

  async start(): Promise<SchedulerState> {
    if (this.store) { const persisted = await this.store.loadSchedulerState(); if (persisted) this.state = { ...this.state, ...persisted, mode: "PAPER", brokerMode: "FAKE" }; }
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
    const target = this.nextAt(samplingSlots); this.state.nextSampleAt = target.toISOString(); void this.persist();
    this.samplingTimer = setTimeout(() => { void this.run("SAMPLING_SLOT", target.toISOString()).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleSampling(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private scheduleExecution(): void {
    const target = this.nextAt(["09:31:00"]);
    this.executionTimer = setTimeout(() => { void this.run("EXECUTION_WINDOW", target.toISOString()).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleExecution(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private scheduleEod(): void {
    const target = this.nextAt(["15:10:00"]);
    this.eodTimer = setTimeout(() => { void this.run("END_OF_DAY", target.toISOString()).catch(() => undefined).finally(() => { if (this.state.status === "RUNNING") this.scheduleEod(); }); }, Math.max(1, target.getTime() - this.clock.now().getTime()));
  }
  private nextAt(slots: string[]): Date {
    const now = this.clock.now(); const today = shanghai(now).date;
    const sameDay = slots.map((slot) => atShanghai(today, slot)).find((candidate) => candidate.getTime() > now.getTime());
    return sameDay ?? atShanghai(nextWeekday(today), slots[0]);
  }
  private async run(kind: SchedulerEventKind, scheduledFor: string | null): Promise<void> {
    const now = this.clock.now(); const previousSampleAt = this.state.lastSampleAt;
    if (this.handler) await this.handler.handleTick({ now, previousSampleAt, kind, scheduledFor });
    this.state.lastSampleAt = now.toISOString(); this.state.tickCount += 1; await this.persist();
  }
  private async persist(): Promise<void> { if (this.store) await this.store.saveSchedulerState(this.state); }
}
