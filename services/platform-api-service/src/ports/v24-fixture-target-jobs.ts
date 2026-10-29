import type { V24DailyTargetScope } from "./v24-daily-target-repository.js";

export type V24FixtureTargetJobInput = { scope: V24DailyTargetScope; sourceId: string; dataVersion: string; asOf: string; evaluatedAt: string };
export type V24FixtureTargetJob = { jobId: string; input: V24FixtureTargetJobInput; state: "QUEUED" | "CLAIMED" | "RETRY_WAIT" | "COMPLETED" | "FAILED"; attempt: number; leaseOwner: string | null; leaseUntil: string | null; targetId: string | null };
export interface V24FixtureTargetJobRepository {
  claim(workerId: string, now: Date, leaseMs: number): Promise<V24FixtureTargetJob | null>;
  complete(job: V24FixtureTargetJob, workerId: string, now: Date, targetId: string): Promise<void>;
  retry(job: V24FixtureTargetJob, workerId: string, now: Date, reason: string, delayMs: number): Promise<void>;
}
