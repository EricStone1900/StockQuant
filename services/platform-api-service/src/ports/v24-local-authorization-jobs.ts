import type { V24LocalPriceAuthorizationRequestV1 } from "../contracts/generated-types.js";
import type { V24DailyTargetScope } from "./v24-daily-target-repository.js";

export type V24LocalAuthorizationJobInput = V24DailyTargetScope & Omit<V24LocalPriceAuthorizationRequestV1, "ownerId" | "accountId" | "namespace" | "testRunId" | "targetId" | "clientOrderId"> & { sessionDate: string; mandateContentHash: string };
export type V24LocalAuthorizationJob = { jobId: string; input: V24LocalAuthorizationJobInput; state: "QUEUED" | "CLAIMED" | "RETRY_WAIT" | "COMPLETED" | "FAILED"; attempt: number; leaseOwner: string | null; leaseUntil: string | null; result: Record<string, unknown> | null; lastError?: string };
export interface V24LocalAuthorizationJobRepository {
  enqueue(input: V24LocalAuthorizationJobInput): Promise<{ job: V24LocalAuthorizationJob; created: boolean }>;
  find(testRunId: string, ownerId: string, sessionDate: string): Promise<V24LocalAuthorizationJob | null>;
  claim(workerId: string, now: Date, leaseMs: number): Promise<V24LocalAuthorizationJob | null>;
  complete(job: V24LocalAuthorizationJob, workerId: string, now: Date, result: Record<string, unknown>): Promise<void>;
  retry(job: V24LocalAuthorizationJob, workerId: string, now: Date, reason: string, delayMs: number): Promise<void>;
}
