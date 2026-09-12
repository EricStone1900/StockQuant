import { describe, expect, it } from "vitest";
import { CollectionScheduler, CollectionSchedulerWorker, type CalendarSession } from "../../src/application/collection-scheduler.js";

const calendar = { session(date: string): CalendarSession {
  if (date === "2026-09-12") return { date, status: "CLOSED", calendarVersion: "fixture-cn-1" };
  if (date === "2026-09-14") return { date, status: "UNKNOWN", calendarVersion: "fixture-cn-1" };
  return { date, status: "TRADING", calendarVersion: "fixture-cn-1", sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] };
} };
const clock = { now: () => new Date("2026-09-11T06:00:00.000Z") };

describe("CollectionScheduler", () => {
  it("does not create windows while disabled and handles trading, lunch/closed and unknown dates", () => {
    const scheduler = new CollectionScheduler(calendar, clock, 5, 120);
    expect(scheduler.plan("sub", "2026-09-11", "2026-09-11").windows).toHaveLength(0);
    scheduler.enable();
    const plan = scheduler.plan("sub", "2026-09-11", "2026-09-14");
    expect(plan.windows).toHaveLength(4);
    expect(plan.windows[0].windowStart).toBe("2026-09-11T01:30:00.000Z");
    expect(plan.windows[0].windowEnd).toBe("2026-09-11T01:35:00.000Z");
    expect(plan.waitingDates).toEqual(["2026-09-14"]);
  });

  it("only emits closed windows after the publication delay and deduplicates retries", () => {
    const scheduler = new CollectionScheduler(calendar, clock, 5, 120);
    scheduler.enable();
    const first = scheduler.plan("sub", "2026-09-11", "2026-09-11");
    expect(first.windows.every((window) => window.backfill)).toBe(true);
    const existing = new Set([first.windows[0].idempotencyKey]);
    const retry = scheduler.plan("sub", "2026-09-11", "2026-09-11", existing);
    expect(retry.windows).toHaveLength(3);
    expect(new Set(retry.windows.map((window) => window.idempotencyKey)).size).toBe(3);
    expect(retry.nextExecutionAt).toBe(null);
  });

  it("supports pause and resume without changing logical window identity", () => {
    const scheduler = new CollectionScheduler(calendar, { now: () => new Date("2026-09-11T01:31:00.000Z") });
    scheduler.enable();
    const before = scheduler.plan("sub", "2026-09-11", "2026-09-11");
    expect(before.windows).toHaveLength(0);
    expect(before.nextExecutionAt).toBe("2026-09-11T01:37:00.000Z");
    scheduler.disable();
    expect(scheduler.plan("sub", "2026-09-11", "2026-09-11").windows).toHaveLength(0);
    scheduler.enable();
    const after = scheduler.plan("sub", "2026-09-11", "2026-09-11");
    expect(after.windows).toHaveLength(0);
    expect(after.nextExecutionAt).toBe("2026-09-11T01:37:00.000Z");
  });

  it("submits each due window through the worker tick and remains idempotent on retry", async () => {
    const scheduler = new CollectionScheduler(calendar, clock, 5, 120);
    scheduler.enable();
    const submitted: string[] = [];
    const worker = new CollectionSchedulerWorker(scheduler, async (window) => { submitted.push(window.idempotencyKey); });
    const first = await worker.tick({ subscriptionId: "sub", fromDate: "2026-09-11", toDate: "2026-09-11" });
    expect(first.windows).toHaveLength(4);
    expect(submitted).toHaveLength(4);
    const second = await worker.tick({ subscriptionId: "sub", fromDate: "2026-09-11", toDate: "2026-09-11", existingKeys: new Set(submitted) });
    expect(second.windows).toHaveLength(0);
    expect(submitted).toHaveLength(4);
  });
});
