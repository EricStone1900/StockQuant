export type ObservationRecord = {
  observationDate: string; sourceAvailable: boolean | null; lastSnapshotAt: string | null; dataAgeSeconds: number | null;
  samplingEvery30Minutes: boolean | null; enteredExecutionWindow: boolean | null;
  signalStatus: "UNKNOWN" | "HOLD" | "SIGNAL" | "NOT_IMPLEMENTED";
  simulatedOrderStatus: "UNKNOWN" | "NONE" | "CREATED" | "NOT_IMPLEMENTED";
  fillStatus: "UNKNOWN" | "NONE" | "FILLED" | "NOT_IMPLEMENTED";
  reconciliationStatus: "UNKNOWN" | "PASS" | "FAIL" | "NOT_IMPLEMENTED";
  outageStatus: "NONE" | "DISCONNECTED" | "SLEEP" | "STALE" | "UNKNOWN";
  testRunId: string | null; errors: string[]; recoveryActions: string[]; evidence: Record<string, unknown>;
};

export type ObservationDayQuality = {
  samplingIntervalMinutes: 20 | 30 | null; samplingEvents: number; uniqueSamplingWindows: number; missingSamplingWindows: string[];
  duplicateSamplingEvents: number; executionEvents: number; uniqueExecutionWindows: number; invalidSamplingEvents: number;
  invalidExecutionEvents: number; expectedSecuritySamples: number; validSecuritySamples: number; invalidSecuritySamples: number; errors: string[];
};

export interface ObservationRepository {
  ensureDailyTestRun(observationDate: string): Promise<string>;
  errorsForDate(observationDate: string): Promise<string[]>;
  qualityForDate(observationDate: string): Promise<ObservationDayQuality>;
  upsertObservation(record: ObservationRecord): Promise<void>;
  completeDailyTestRun(observationDate: string, testRunId: string, evidence: Record<string, unknown>): Promise<void>;
}
