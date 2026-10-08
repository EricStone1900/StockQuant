export type StoredStageRun = {
  testRunId: string; stageId: string; scenarioId: string; scenarioVersion: string; ownerId: string;
  namespace: string; status: string; seed: number; assertions: unknown[]; evidence: Record<string, unknown>;
  createdAt: string; completedAt: string | null;
};

export type NewStageRun = Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace?: string };
export type V33WorkflowStatus = "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type V13SessionAdvance = {
  sequence: number; fromClock: string; toClock: string; calendarVersion: string; idempotencyKey: string; recordedAt: string;
};
export interface StageRunRepository {
  enqueueV15NoTrade(run: NewStageRun, payload: Record<string, unknown>): Promise<void>;
  claimV15Dispatches(limit: number): Promise<Array<{ eventId: string; payload: Record<string, unknown> }>>;
  markV15DispatchPublished(eventId: string): Promise<void>;
  save(run: NewStageRun): Promise<StoredStageRun>;
  find(testRunId: string, ownerId: string): Promise<StoredStageRun | null>;
  listRunnableV12Runs(): Promise<StoredStageRun[]>;
  withV12RunLock<T>(testRunId: string, work: () => Promise<T>): Promise<T | undefined>;
  updateV12Progress(testRunId: string, ownerId: string, progress: Record<string, unknown>): Promise<boolean>;
  requestV12Cancellation(testRunId: string, ownerId: string): Promise<StoredStageRun>;
  finishV12Run(testRunId: string, ownerId: string, status: "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun>;
  transitionV33Workflow(input: {
    testRunId: string;
    ownerId: string;
    expectedStatus: V33WorkflowStatus;
    status: V33WorkflowStatus;
    assertions: unknown[];
    evidence: Record<string, unknown>;
  }): Promise<StoredStageRun>;
  advanceV13Session(input: { testRunId: string; ownerId: string; expectedClock: string; nextClock: string; calendarVersion: string }): Promise<{ run: StoredStageRun; event: V13SessionAdvance; replayed: boolean }>;
  listV13SessionAdvances(testRunId: string, ownerId: string): Promise<V13SessionAdvance[]>;
  newId(): string;
}

export interface V14BacktestRunRepository {
  newId(): string;
  save(run: NewStageRun): Promise<StoredStageRun>;
  find(testRunId: string, ownerId: string): Promise<StoredStageRun | null>;
  listRunnableV14Runs(): Promise<StoredStageRun[]>;
  withV14RunLock<T>(testRunId: string, work: () => Promise<T>): Promise<T | undefined>;
  updateV14Progress(testRunId: string, ownerId: string, progress: Record<string, unknown>): Promise<boolean>;
  requestV14Cancellation(testRunId: string, ownerId: string): Promise<StoredStageRun>;
  finishV14Run(testRunId: string, ownerId: string, status: "COMPLETED" | "FAILED" | "CANCELLED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun>;
}
