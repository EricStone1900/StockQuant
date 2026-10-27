import type { DailyBarCompletionRequest, DailyBarCompletionResult } from "./v21-daily-bar-completion.js";

export type DailyBarCompletionScope = DailyBarCompletionRequest["scope"];
export type DailyBarCompletionTaskState = "QUEUED" | "CLAIMED" | "RETRY_WAIT" | "COMPLETED" | "FAILED";
export type DailyBarSourceRequest = { sourceId: "eastmoney-daily"; sessionDate: string; securityIds: string[]; dataVersion: string };
export type DailyBarCompletionTask = {
  taskId: string;
  state: DailyBarCompletionTaskState;
  scope: DailyBarCompletionScope;
  fixtureVersion: string | null;
  fixtureSha256: string | null;
  sourceRequest?: DailyBarSourceRequest | null;
  attempt: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseUntil: string | null;
  nextAttemptAt: string | null;
  lastError: string | null;
  completionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export interface DailyBarCompletionQueue {
  claim(workerId: string, now: Date, leaseMs: number): Promise<DailyBarCompletionTask | null>;
  complete(taskId: string, workerId: string, now: Date, result: DailyBarCompletionResult): Promise<void>;
  retry(taskId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<DailyBarCompletionTaskState>;
}
