import type { CollectionRun, CollectionRunRequest } from "../domain/collection-run.js";
export type { CollectionRun, CollectionRunRequest, CollectionRunStatus } from "../domain/collection-run.js";
export interface CollectionRunPort {
  create(request: CollectionRunRequest): Promise<{ run: CollectionRun; created: boolean }>;
  runnableRunIds(limit?: number, subscriptionId?: string): Promise<string[]>;
  claim(runId: string, leaseSeconds: number): Promise<CollectionRun | null>;
  checkpoint(runId: string, fencingToken: number, checkpoint: Record<string, unknown>): Promise<CollectionRun>;
  publishRows(input: { runId: string; fencingToken: number; artifactId: string; sha256: string; projectId: string; dataVersion: string; rows: unknown[] }): Promise<CollectionRun>;
  releaseToRetry(runId: string, fencingToken: number, retrySeconds?: number): Promise<CollectionRun>;
  fail?(runId: string, fencingToken: number, reason: string): Promise<CollectionRun>;
}
