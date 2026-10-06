import { describe, expect, it, vi } from "vitest";
import { V24ContinuousPaperEngine } from "../../src/application/v24-continuous-paper.js";
import { ContinuousPaperScheduler, parseV24SamplingInterval, type Clock } from "../../src/application/v24-scheduler.js";
import { shouldCountDailyObservation } from "../../src/application/v24-live-observation.js";
import { summarizeObservationFinalizations, type ObservationDayQuality, type ObservationFinalization } from "../../src/adapters/postgres-v24-observation-repository.js";

describe("V2.4 continuous paper scenarios", () => {
  const engine = new V24ContinuousPaperEngine();
  it("does not claim an active Mandate, observed quote, ledger result, or reconciliation before those paths run", () => {
    const run = engine.run("normal");
    expect(run.status).toBe("WAITING");
    expect(run.brokerMode).toBe("FAKE");
    expect(run.executionGate.status).toBe("BLOCKED");
    expect(run.mandate.status).toBe("PREPARATION_ONLY");
    expect(run.source.status).toBe("NOT_RUN");
    expect(run.orders).toEqual([]);
    expect(run.fills).toEqual([]);
    expect(run.reconciliation.status).toBe("NOT_RUN");
    expect(run.assertions.every((assertion: any) => assertion.status === "WAITING")).toBe(true);
  });
  it("does not claim stale-quote rejection or duplicate-event protection without running those paths", () => {
    const run = engine.run("rejection");
    expect(run.status).toBe("WAITING");
    expect(run.rejections).toBeUndefined();
    expect(run.assertions[0].actual).toBe("NOT_RUN");
  });
  it("does not claim recovery or reconciliation without running those paths", () => {
    const run = engine.run("recovery");
    expect(run.status).toBe("WAITING");
    expect(run.recovery).toBeUndefined();
    expect(run.reconciliation.status).toBe("NOT_RUN");
  });
  it("uses an injected clock for deterministic sampling ticks", async () => {
    const clock: Clock = { now: () => new Date("2026-09-11T01:00:00.000Z") };
    const scheduler = new ContinuousPaperScheduler(clock);
    expect((await scheduler.start()).status).toBe("RUNNING");
    expect(scheduler.status().lastSampleAt).toBe("2026-09-11T01:00:00.000Z");
    expect(scheduler.status().tickCount).toBe(1);
    await scheduler.stop();
    expect(scheduler.status().status).toBe("STOPPED");
  });
  it("converts a timer that wakes after a missed window into a recovery check", async () => {
    vi.useFakeTimers();
    try {
      let current = new Date("2026-09-25T01:30:00.000Z");
      const seen: string[] = [];
      const scheduler = new ContinuousPaperScheduler({ now: () => new Date(current) }, null, { handleTick: async ({ kind, scheduledFor }) => { seen.push(`${kind}:${scheduledFor}`); } });
      await scheduler.start();
      expect(seen).toEqual(["RECOVERY_CHECK:null"]);
      current = new Date("2026-09-25T05:00:00.000Z");
      await vi.advanceTimersByTimeAsync(60_000);
      expect(seen).toEqual(["RECOVERY_CHECK:null", "RECOVERY_CHECK:null"]);
      await scheduler.stop();
    } finally {
      vi.useRealTimers();
    }
  });
  it("accepts only the supported environment interval and applies it to a stopped scheduler", async () => {
    expect(parseV24SamplingInterval(undefined)).toBe(30);
    expect(parseV24SamplingInterval("20")).toBe(20);
    expect(parseV24SamplingInterval("30")).toBe(30);
    expect(() => parseV24SamplingInterval("15")).toThrow("must be 20 or 30");
    const clock: Clock = { now: () => new Date("2026-09-25T01:33:00.000Z") };
    const store = {
      loadSchedulerState: async () => ({ status: "STOPPED" as const, samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER" as const, brokerMode: "FAKE" as const }),
      saveSchedulerState: async () => undefined,
    };
    const scheduler = new ContinuousPaperScheduler(clock, store, null, 20);
    await scheduler.start();
    expect(scheduler.status()).toMatchObject({ samplingIntervalMinutes: 20, nextSampleAt: "2026-09-25T01:50:00.000Z" });
    await scheduler.stop();
  });
  it("fails closed on an invalid persisted interval before recovery events or timers start", async () => {
    const clock: Clock = { now: () => new Date("2026-09-25T01:33:00.000Z") };
    const calls: string[] = [];
    const store = {
      loadSchedulerState: async () => ({ status: "RUNNING" as const, samplingIntervalMinutes: 15, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER" as const, brokerMode: "FAKE" as const }),
      saveSchedulerState: async () => { calls.push("persist"); },
    };
    const scheduler = new ContinuousPaperScheduler(clock, store, { handleTick: async () => { calls.push("tick"); } });
    await expect(scheduler.start()).rejects.toThrow("persisted V2.4 sampling interval must be 20 or 30 minutes");
    expect(calls).toEqual([]);
    expect(scheduler.status()).toMatchObject({ status: "RUNNING", samplingIntervalMinutes: 15, tickCount: 0 });
  });
  it("does not count an end-of-day observation with unresolved errors", () => {
    const quality: ObservationDayQuality = { samplingIntervalMinutes: 30, samplingEvents: 10, uniqueSamplingWindows: 10, missingSamplingWindows: [], duplicateSamplingEvents: 0, executionEvents: 1, uniqueExecutionWindows: 1, invalidSamplingEvents: 0, invalidExecutionEvents: 0, expectedSecuritySamples: 20, validSecuritySamples: 20, invalidSecuritySamples: 0, errors: [] };
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: [], quality })).toBe(true);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: ["The operation was aborted due to timeout"], quality })).toBe(false);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: [], quality: { ...quality, samplingEvents: 0 } })).toBe(false);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "SAMPLING_SLOT", reconciliationStatus: "PASS", errors: [] })).toBe(false);
  });

  it("counts immutable end-of-day finalizations even when a later recovery event exists", () => {
    const finalizations = [
      { observationDate: "2026-09-21", observationCounted: true, record: { observationDate: "2026-09-21", sourceAvailable: true, lastSnapshotAt: "2026-09-21T01:30:00.000Z", dataAgeSeconds: 5, samplingEvery30Minutes: true, enteredExecutionWindow: true, signalStatus: "HOLD", simulatedOrderStatus: "NONE", fillStatus: "NONE", reconciliationStatus: "PASS", outageStatus: "NONE", testRunId: "00000000-0000-4000-8000-000000000001", errors: [], recoveryActions: [], evidence: { eventKind: "END_OF_DAY", actualTradingDay: "TRADING", dataMode: "LIVE_SOURCE", sourceUsage: { status: "CONFIGURED_WITH_APPROVAL_REFERENCE", authorizationEvidenceRef: "approval-2026-09-20", dataVersion: "sse-5m-20260920-v1" }, observationQuality: { samplingIntervalMinutes: 30, samplingEvents: 10, uniqueSamplingWindows: 10, missingSamplingWindows: [], duplicateSamplingEvents: 0, executionEvents: 1, uniqueExecutionWindows: 1, invalidSamplingEvents: 0, invalidExecutionEvents: 0, expectedSecuritySamples: 20, validSecuritySamples: 20, invalidSecuritySamples: 0, errors: [] } } } },
      { observationDate: "2026-09-20", observationCounted: false },
    ] as ObservationFinalization[];
    expect(summarizeObservationFinalizations(finalizations, 20)).toMatchObject({ countedDays: 1, recordedCountedDays: 1, unverifiedCountedDays: 0, remainingDays: 19, status: "WAITING" });
  });

  it("preserves but does not re-accept historical counted days without quote provenance and per-security evidence", () => {
    const legacy = { observationDate: "2026-09-29", observationCounted: true, record: { errors: [], reconciliationStatus: "PASS", evidence: { eventKind: "END_OF_DAY", actualTradingDay: "TRADING", dataMode: "LIVE_SOURCE", observationQuality: { samplingEvents: 10 } } } } as unknown as ObservationFinalization;
    const summary = summarizeObservationFinalizations([legacy], 20);
    expect(summary).toMatchObject({ countedDays: 0, recordedCountedDays: 1, unverifiedCountedDays: 1, remainingDays: 20, status: "WAITING" });
    expect(summary.dates[0]).toMatchObject({ observationCounted: true, evidenceQualification: "UNVERIFIED", qualificationErrors: expect.arrayContaining(["SOURCE_AUTHORIZATION_OR_DATA_VERSION_MISSING", "MARKET_DATA_SAMPLE_EVIDENCE_INCOMPLETE"]) });
  });
});
