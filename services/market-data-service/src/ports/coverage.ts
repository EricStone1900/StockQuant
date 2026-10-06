import type { BackfillTask, GapRecord, PersistedGap } from "../domain/coverage.js";
export interface CoveragePort {
  migrate(): Promise<void>;
  upsertGaps(subscriptionId: string, gaps: GapRecord[]): Promise<number>;
  reconcileGaps(subscriptionId: string, fromDate: string, toDate: string, securityIds: string[], gaps: GapRecord[]): Promise<{ opened: number; closed: number }>;
  open(subscriptionId: string): Promise<PersistedGap[]>;
  close(gapId: string, status?: "CLOSED" | "UNRECOVERABLE"): Promise<void>;
  createBackfill(subscriptionId: string, fromDate: string, toDate: string, idempotencyKey: string): Promise<{ task: BackfillTask; created: boolean }>;
  findBackfill(taskId: string): Promise<BackfillTask | null>;
  claimBackfill(taskId: string): Promise<BackfillTask | null>;
  completeBackfill(taskId: string): Promise<BackfillTask | null>;
  failBackfill(taskId: string): Promise<BackfillTask | null>;
}
