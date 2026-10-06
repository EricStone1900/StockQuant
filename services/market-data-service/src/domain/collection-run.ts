export type CollectionRunStatus = "QUEUED" | "RUNNING" | "WAITING_RETRY" | "WAITING_DEPENDENCY" | "PARTIAL" | "COMPLETED" | "FAILED" | "PAUSED" | "CANCELLED";
export type CollectionRunRequest = {
  subscriptionId: string; subscriptionVersion: number; windowStart: string; windowEnd: string;
  jobKind: "INTRADAY_WINDOW" | "CLOSE_RECONCILIATION" | "BACKFILL" | "GAP_REPAIR";
  idempotencyKey: string; requestHash: string;
};
export type CollectionRun = CollectionRunRequest & {
  runId: string; status: CollectionRunStatus; version: number; checkpoint: Record<string, unknown> | null;
  fencingToken: number; leaseUntil: string | null; retryAt: string | null; publishedArtifactId: string | null;
};
export class CollectionRunConflict extends Error {
  constructor(message: string) { super(message); this.name = "CollectionRunConflict"; }
}

export type CollectionOutboxEvent = { eventId: string; eventKey: string; runId: string; eventType: "collection.run.completed.v1"; payload: Record<string, unknown>; sentAt: string | null };
export type CollectionArtifact = { artifactId: string; runId: string; sha256: string; rowCount: number };
