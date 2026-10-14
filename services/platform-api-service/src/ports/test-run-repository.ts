import type { TestAssertion, TestRun, TestRunStatus } from "../domain/test-run.js";

export interface TestRunRepository {
  find(testRunId: string, ownerId: string): Promise<TestRun | null>;
  transitionStatus(testRunId: string, from: TestRunStatus, to: TestRunStatus, accountId?: string | null, error?: string | null): Promise<boolean>;
  updateStatus(testRunId: string, status: TestRunStatus, accountId?: string | null, error?: string | null): Promise<void>;
  replaceAssertions(testRunId: string, assertions: TestAssertion[]): Promise<void>;
}
