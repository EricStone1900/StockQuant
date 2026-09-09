export type ScenarioId = "normal" | "rejection" | "recovery";
export type TestRunStatus = "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED";

export interface TestRun {
  testRunId: string;
  stageId: "V1.1";
  scenarioId: ScenarioId;
  scenarioVersion: "1.0.0";
  namespace: string;
  ownerId: string;
  status: TestRunStatus;
  seed: number;
  accountId: string | null;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

export interface TestAssertion {
  assertionId: string;
  status: "PASS" | "FAIL" | "WAITING";
  expected: unknown;
  actual: unknown;
  evidence: Record<string, unknown>;
}
