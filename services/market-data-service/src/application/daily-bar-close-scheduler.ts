import { decideCnAShareDailyBarClose } from "./cn-a-share-calendar.js";
import type { DailyBarCompletionScope } from "./daily-bar-completion-queue.js";

export interface DailyBarCloseScheduleRepository {
  scheduledScopes(): Promise<DailyBarCompletionScope[]>;
  hasTriggered(scope: DailyBarCompletionScope, sessionDate: string): Promise<boolean>;
  markScheduleTriggered(scope: DailyBarCompletionScope, sessionDate: string): Promise<boolean>;
}

export interface DailyBarCloseQueue {
  enqueue(input: { scope: DailyBarCompletionScope; fixtureVersion: string; fixtureSha256: string }): Promise<{ task: { taskId: string }; created: boolean }>;
}

/** Opt-in close scheduler. The frozen V2.1 Fixture is intentionally limited to its declared session date. */
export class DailyBarCloseScheduler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private lastTickAt: string | null = null;
  private lastResult: string | null = null;

  constructor(
    private readonly schedules: DailyBarCloseScheduleRepository,
    private readonly queue: DailyBarCloseQueue,
    private readonly policyEnabled: () => Promise<boolean>,
    private readonly clock: { now(): Date },
    private readonly workerId: string,
    private readonly fixture: { version: string; sha256: string; sessionDate: string },
    private readonly enqueueReal?: (scope: DailyBarCompletionScope, sessionDate: string) => Promise<{ created: boolean }>,
  ) {
    if (!workerId.trim() || workerId.length > 128) throw new Error("INVALID_DAILY_BAR_SCHEDULER_ID");
    if (!fixture.version.trim() || !/^[a-f0-9]{64}$/u.test(fixture.sha256) || !/^\d{4}-\d{2}-\d{2}$/u.test(fixture.sessionDate)) throw new Error("INVALID_DAILY_BAR_SCHEDULER_FIXTURE");
  }

  async tick(): Promise<{ state: "DISABLED" | "BEFORE_CLOSE" | "CLOSED" | "UNKNOWN_CALENDAR" | "NO_SCOPES" | "NO_FIXTURE_FOR_SESSION" | "SCHEDULED" | "ALREADY_SCHEDULED" | "BUSY"; sessionDate: string | null; enqueued: number }> {
    if (this.ticking) return { state: "BUSY", sessionDate: null, enqueued: 0 };
    this.ticking = true;
    try {
      const now = this.clock.now();
      this.lastTickAt = now.toISOString();
      if (!await this.policyEnabled()) { this.lastResult = "DISABLED"; return { state: "DISABLED", sessionDate: null, enqueued: 0 }; }
      const decision = decideCnAShareDailyBarClose(now.toISOString());
      if (decision.status !== "DUE") {
        this.lastResult = decision.status;
        return { state: decision.status === "BEFORE_CLOSE" ? "BEFORE_CLOSE" : decision.status, sessionDate: decision.localDate, enqueued: 0 };
      }
      if (!this.enqueueReal && decision.localDate !== this.fixture.sessionDate) {
        this.lastResult = "NO_FIXTURE_FOR_SESSION";
        return { state: "NO_FIXTURE_FOR_SESSION", sessionDate: decision.localDate, enqueued: 0 };
      }
      const scopes = await this.schedules.scheduledScopes();
      if (!scopes.length) { this.lastResult = "NO_SCOPES"; return { state: "NO_SCOPES", sessionDate: decision.localDate, enqueued: 0 }; }
      let enqueued = 0;
      for (const scope of scopes) {
        if (await this.schedules.hasTriggered(scope, decision.localDate)) continue;
        const result = this.enqueueReal ? await this.enqueueReal(scope, decision.localDate) : await this.queue.enqueue({ scope, fixtureVersion: this.fixture.version, fixtureSha256: this.fixture.sha256 });
        if (result.created) enqueued += 1;
        await this.schedules.markScheduleTriggered(scope, decision.localDate);
      }
      this.lastResult = enqueued ? "SCHEDULED" : "ALREADY_SCHEDULED";
      return { state: enqueued ? "SCHEDULED" : "ALREADY_SCHEDULED", sessionDate: decision.localDate, enqueued };
    } finally { this.ticking = false; }
  }

  status(): { enabled: boolean; workerId: string; lastTickAt: string | null; lastResult: string | null } {
    return { enabled: this.timer !== null, workerId: this.workerId, lastTickAt: this.lastTickAt, lastResult: this.lastResult };
  }
  start(intervalMs = 30_000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs) || intervalMs < 1_000 || intervalMs > 300_000) throw new Error("INVALID_DAILY_BAR_SCHEDULER_INTERVAL");
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("daily bar close scheduler tick failed", error)); }, intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("daily bar close scheduler initial tick failed", error));
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
