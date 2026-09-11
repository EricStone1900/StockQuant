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

export class ContinuousPaperScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private state: SchedulerState = { status: "STOPPED", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" };
  constructor(private readonly clock: Clock = new SystemClock()) {}
  start() { if (this.state.status === "RUNNING") return this.state; this.state.status = "RUNNING"; this.tick(); this.timer = setInterval(() => this.tick(), this.state.samplingIntervalMinutes * 60_000); return this.state; }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; this.state.status = "STOPPED"; this.state.nextSampleAt = null; return this.state; }
  tick() { const now = this.clock.now(); this.state.lastSampleAt = now.toISOString(); this.state.nextSampleAt = new Date(now.getTime() + this.state.samplingIntervalMinutes * 60_000).toISOString(); this.state.tickCount += 1; return this.state; }
  status() { return { ...this.state }; }
}
