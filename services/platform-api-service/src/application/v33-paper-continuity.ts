export type V33PaperSchedulerSnapshot = {
  status: string;
  samplingIntervalMinutes: number;
  lastSampleAt: string | null;
  nextSampleAt: string | null;
  tickCount: number;
  mode: string;
  brokerMode: string;
};

export type V33PaperObservationSnapshot = {
  targetDays: number;
  countedDays: number;
  recordedCountedDays: number;
  unverifiedCountedDays: number;
  remainingDays: number;
  status: string;
  dates: Array<{ observationDate: string; observationCounted: boolean; evidenceQualification?: string }>;
};

/**
 * Collects read-only preflight facts for a V3.3 run. Passing this preflight is
 * deliberately not acceptance: continuity must still be measured while the
 * research workload itself is running.
 */
export function assessV33PaperContinuityPreflight(input: {
  capturedAt: string;
  scheduler: V33PaperSchedulerSnapshot;
  observation: V33PaperObservationSnapshot | null;
}): Record<string, unknown> {
  const now = Date.parse(input.capturedAt);
  const lastSample = input.scheduler.lastSampleAt === null ? Number.NaN : Date.parse(input.scheduler.lastSampleAt);
  const nextSample = input.scheduler.nextSampleAt === null ? Number.NaN : Date.parse(input.scheduler.nextSampleAt);
  const freshnessLimitMs = Math.max(1, input.scheduler.samplingIntervalMinutes) * 2 * 60_000;
  const schedulerFresh = Number.isFinite(now) && Number.isFinite(lastSample)
    && lastSample <= now && now - lastSample <= freshnessLimitMs;
  const schedulerScheduled = Number.isFinite(now) && Number.isFinite(nextSample) && nextSample > now;
  const schedulerReady = input.scheduler.status === "RUNNING"
    && input.scheduler.mode === "PAPER"
    && input.scheduler.brokerMode === "FAKE"
    && schedulerFresh && schedulerScheduled;
  const observation = input.observation;
  const observationReady = observation !== null
    && observation.status === "PASS"
    && observation.targetDays === 20
    && observation.countedDays >= 20
    && observation.remainingDays === 0
    && observation.unverifiedCountedDays === 0;
  const blockers = [
    ...(!schedulerReady ? ["PAPER_SCHEDULER_NOT_FRESH_AND_SCHEDULED"] : []),
    ...(!observationReady ? ["O2_OBSERVATION_NOT_QUALIFIED_20_OF_20"] : []),
  ];

  return {
    schemaVersion: "v3.3-paper-continuity-preflight-v1",
    capturedAt: input.capturedAt,
    status: "NOT_VERIFIED",
    preflightStatus: blockers.length === 0 ? "READY_FOR_CONCURRENT_TEST" : "BLOCKED",
    scheduler: {
      status: input.scheduler.status,
      mode: input.scheduler.mode,
      brokerMode: input.scheduler.brokerMode,
      samplingIntervalMinutes: input.scheduler.samplingIntervalMinutes,
      lastSampleAt: input.scheduler.lastSampleAt,
      nextSampleAt: input.scheduler.nextSampleAt,
      tickCount: input.scheduler.tickCount,
      fresh: schedulerFresh,
      nextSampleScheduled: schedulerScheduled,
    },
    observation: observation === null ? null : {
      status: observation.status,
      targetDays: observation.targetDays,
      countedDays: observation.countedDays,
      recordedCountedDays: observation.recordedCountedDays,
      unverifiedCountedDays: observation.unverifiedCountedDays,
      remainingDays: observation.remainingDays,
      latestDate: observation.dates.at(0)?.observationDate ?? null,
    },
    blockers,
    acceptanceRequirement: "Run a measured research fault/load scenario concurrently with the authorized core Paper workflow and verify Paper latency, errors, reconciliation, and resource limits.",
  };
}
