import type { DailyDirectionInput } from "../application/v24-daily-direction.js";

export type V24DailyTargetScope = { ownerId: string; accountId: string; namespace: string; testRunId: string };
export type V24DailyTarget = V24DailyTargetScope & {
  targetId: string;
  dataMode: "FIXTURE";
  strategyVersion: string;
  strategySha256: string;
  fixtureSha256: string;
  dailyBarProvenance?: { sourceId: string; dataVersion: string; completionIds: [string, string]; calendarVersion: string; asOf: string };
  sessionDate: string;
  evaluationAt: string;
  input: Omit<DailyDirectionInput, "clock">;
  decision: { action: "BUY" | "SELL" | "HOLD" | "PAUSED"; quantity: number; reason: string };
  targetQuantity: number | null;
  clientOrderId: string | null;
};
export interface V24DailyTargetRepository {
  save(target: V24DailyTarget): Promise<{ target: V24DailyTarget; created: boolean }>;
  find(scope: V24DailyTargetScope, targetId: string): Promise<V24DailyTarget | null>;
}
