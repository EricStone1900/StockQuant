import { describe, expect, it } from "vitest";
import { DailyBarCloseScheduler } from "../../src/application/daily-bar-close-scheduler.js";
import type { DailyBarCompletionScope } from "../../src/application/daily-bar-completion-queue.js";

const scope: DailyBarCompletionScope = { market: "CN_A", ownerId: "owner", accountId: "11111111-1111-4111-8111-111111111112", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111113" };
const fixture = { version: "v2.1-daily-bars-1", sha256: "b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4", sessionDate: "2026-10-16" };

function harness(enabled = true) {
  let instant = new Date("2026-10-16T06:59:00.000Z");
  let triggered = false;
  let enqueues = 0;
  const scheduler = new DailyBarCloseScheduler({
    scheduledScopes: async () => [scope],
    hasTriggered: async () => triggered,
    markScheduleTriggered: async () => { if (triggered) return false; triggered = true; return true; },
  }, { enqueue: async () => ({ task: { taskId: "dailybartask:test" }, created: enqueues++ === 0 }) }, async () => enabled, { now: () => instant }, "daily-test", fixture);
  return { scheduler, setInstant: (value: string) => { instant = new Date(value); }, count: () => enqueues };
}

describe("V2.1 after-close DAILY_BAR scheduler", () => {
  it("waits until the known session close and schedules the scoped Fixture once", async () => {
    const test = harness();
    expect((await test.scheduler.tick()).state).toBe("BEFORE_CLOSE");
    test.setInstant("2026-10-16T07:01:00.000Z");
    expect(await test.scheduler.tick()).toMatchObject({ state: "SCHEDULED", sessionDate: "2026-10-16", enqueued: 1 });
    expect(await test.scheduler.tick()).toMatchObject({ state: "ALREADY_SCHEDULED", enqueued: 0 });
    expect(test.count()).toBe(1);
  });

  it("does not schedule when disabled, on a closed day, outside Fixture coverage, or with no scope", async () => {
    const disabled = harness(false); disabled.setInstant("2026-10-16T07:01:00.000Z");
    expect((await disabled.scheduler.tick()).state).toBe("DISABLED");
    const closed = harness(); closed.setInstant("2026-10-17T07:01:00.000Z");
    expect((await closed.scheduler.tick()).state).toBe("CLOSED");
    const outsideFixture = harness(); outsideFixture.setInstant("2026-10-19T07:01:00.000Z");
    expect((await outsideFixture.scheduler.tick()).state).toBe("NO_FIXTURE_FOR_SESSION");
    expect(outsideFixture.count()).toBe(0);
  });
});
