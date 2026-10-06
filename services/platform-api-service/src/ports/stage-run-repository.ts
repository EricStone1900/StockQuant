export type StoredStageRun = {
  testRunId: string; stageId: string; scenarioId: string; scenarioVersion: string; ownerId: string;
  namespace: string; status: string; seed: number; assertions: unknown[]; evidence: Record<string, unknown>;
  createdAt: string; completedAt: string | null;
};

export type NewStageRun = Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace?: string };
export type V33WorkflowStatus = "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED";
export interface StageRunRepository {
  save(run: NewStageRun): Promise<StoredStageRun>;
  find(testRunId: string, ownerId: string): Promise<StoredStageRun | null>;
  transitionV33Workflow(input: {
    testRunId: string;
    ownerId: string;
    expectedStatus: V33WorkflowStatus;
    status: V33WorkflowStatus;
    assertions: unknown[];
    evidence: Record<string, unknown>;
  }): Promise<StoredStageRun>;
  newId(): string;
}
