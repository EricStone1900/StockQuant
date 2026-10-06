import { describe, expect, it } from "vitest";
import { assessV33PaperContinuityPreflight } from "../../src/application/v33-paper-continuity.js";

const capturedAt = "2026-10-03T04:00:00.000Z";
const scheduler = {
  status: "RUNNING", samplingIntervalMinutes: 30,
  lastSampleAt: "2026-10-03T03:45:00.000Z", nextSampleAt: "2026-10-03T04:15:00.000Z",
  tickCount: 42, mode: "PAPER", brokerMode: "FAKE",
};
const observation = {
  targetDays: 20, countedDays: 20, recordedCountedDays: 20,
  unverifiedCountedDays: 0, remainingDays: 0, status: "PASS",
  dates: [{ observationDate: "2026-10-02", observationCounted: true, evidenceQualification: "QUALIFIED" }],
};

describe("V3.3 Paper continuity preflight", () => {
  it("captures missing, stale, stopped, and unqualified prerequisites as blockers", () => {
    const result = assessV33PaperContinuityPreflight({
      capturedAt,
      scheduler: { ...scheduler, status: "STOPPED", lastSampleAt: "2026-10-03T01:00:00.000Z", nextSampleAt: null },
      observation: { ...observation, status: "WAITING", countedDays: 8, remainingDays: 12 },
    });

    expect(result).toMatchObject({
      status: "NOT_VERIFIED",
      preflightStatus: "BLOCKED",
      blockers: ["PAPER_SCHEDULER_NOT_FRESH_AND_SCHEDULED", "O2_OBSERVATION_NOT_QUALIFIED_20_OF_20"],
    });
  });

  it("marks the prerequisites ready without claiming concurrent continuity acceptance", () => {
    const result = assessV33PaperContinuityPreflight({ capturedAt, scheduler, observation });

    expect(result).toMatchObject({ status: "NOT_VERIFIED", preflightStatus: "READY_FOR_CONCURRENT_TEST", blockers: [] });
    expect(result).toHaveProperty("acceptanceRequirement");
  });

  it("reports the newest O2 date from the repository's descending date order", () => {
    const result = assessV33PaperContinuityPreflight({
      capturedAt,
      scheduler,
      observation: { ...observation, dates: [
        { observationDate: "2026-10-02", observationCounted: true, evidenceQualification: "QUALIFIED" },
        { observationDate: "2026-10-01", observationCounted: true, evidenceQualification: "QUALIFIED" },
      ] },
    });

    expect(result).toMatchObject({ observation: { latestDate: "2026-10-02" } });
  });

  it("fails closed on future samples, stale ticks, incomplete days, or unverified history", () => {
    for (const changed of [
      { scheduler: { ...scheduler, lastSampleAt: "2026-10-03T04:01:00.000Z" } },
      { scheduler: { ...scheduler, lastSampleAt: "2026-10-03T02:00:00.000Z" } },
      { scheduler: { ...scheduler, nextSampleAt: null } },
      { observation: { ...observation, unverifiedCountedDays: 1 } },
    ]) {
      const result = assessV33PaperContinuityPreflight({ capturedAt, scheduler, observation, ...changed } as Parameters<typeof assessV33PaperContinuityPreflight>[0]);
      expect(result).toMatchObject({ status: "NOT_VERIFIED", preflightStatus: "BLOCKED" });
    }
  });
});
