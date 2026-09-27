import { describe, expect, it } from "vitest";
import { V24ContinuousPaperEngine } from "../../src/application/v24-continuous-paper.js";
import { ContinuousPaperScheduler, type Clock } from "../../src/application/v24-scheduler.js";
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
  it("does not count an end-of-day observation with unresolved errors", () => {
    const quality: ObservationDayQuality = { samplingEvents: 10, uniqueSamplingWindows: 10, missingSamplingWindows: [], duplicateSamplingEvents: 0, executionEvents: 1, uniqueExecutionWindows: 1, invalidSamplingEvents: 0, invalidExecutionEvents: 0, expectedSecuritySamples: 20, validSecuritySamples: 20, invalidSecuritySamples: 0, errors: [] };
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: [], quality })).toBe(true);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: ["The operation was aborted due to timeout"], quality })).toBe(false);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "END_OF_DAY", reconciliationStatus: "PASS", errors: [], quality: { ...quality, samplingEvents: 0 } })).toBe(false);
    expect(shouldCountDailyObservation({ actualTradingDay: true, kind: "SAMPLING_SLOT", reconciliationStatus: "PASS", errors: [] })).toBe(false);
  });

  it("counts immutable end-of-day finalizations even when a later recovery event exists", () => {
    const finalizations = [
      { observationDate: "2026-09-21", observationCounted: true },
      { observationDate: "2026-09-20", observationCounted: false },
    ] as ObservationFinalization[];
    expect(summarizeObservationFinalizations(finalizations, 20)).toMatchObject({ countedDays: 1, remainingDays: 19, status: "WAITING" });
  });
});
