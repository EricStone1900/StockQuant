import type { ReplayStatus } from "../domain/lifecycle.js";

export interface ReplayRunRecord {
  testRunId: string;
  namespace: string;
  ownerId: string;
  scenarioId: string;
  status: ReplayStatus;
  requestHash: string | null;
  checkpoint: any;
  result: any;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ReplayRunRepository {
  initialize(): Promise<void>;
  ready(): Promise<void>;
  withRunLock<T>(testRunId: string, operation: () => Promise<T>): Promise<T>;
  find(testRunId: string): Promise<ReplayRunRecord | null>;
  insert(input: Pick<ReplayRunRecord, "testRunId" | "namespace" | "ownerId" | "scenarioId" | "requestHash" | "checkpoint">, ignoreConflict?: boolean): Promise<void>;
  markRunning(testRunId: string, requestHash: string): Promise<void>;
  setStatus(testRunId: string, status: ReplayStatus): Promise<void>;
  saveCheckpoint(testRunId: string, checkpoint: unknown, result: unknown): Promise<void>;
  complete(testRunId: string, result: unknown): Promise<void>;
  fail(testRunId: string): Promise<void>;
  saveResult(testRunId: string, result: unknown): Promise<void>;
}
