export type GapRecord = { gapId: string; securityId: string; barStart: string; barEnd: string; reason: "MISSING" | "DUPLICATE_CONFLICT"; priority: "P0" | "P1" | "P2"; evidenceReference?: string };
export type PersistedGap = GapRecord & { subscriptionId: string; status: "OPEN" | "CLOSED" | "UNRECOVERABLE" };
export type BackfillTask = { taskId: string; subscriptionId: string; fromDate: string; toDate: string; idempotencyKey: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" };
export class BackfillConflict extends Error { constructor(message: string) { super(message); this.name = "BackfillConflict"; } }
