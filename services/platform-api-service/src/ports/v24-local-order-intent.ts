import type { V24DailyTargetScope } from "./v24-daily-target-repository.js";

export type V24LocalOrderIntent = V24DailyTargetScope & { targetId: string; clientOrderId: string; security: "600000.SH"; side: "BUY" | "SELL"; quantity: 100; acceptedAt: string; status: "ACCEPTED_INTENT" };
export interface V24LocalOrderIntentRepository {
  accept(scope: V24DailyTargetScope, targetId: string, acceptedAt: string): Promise<{ intent: V24LocalOrderIntent; created: boolean }>;
  find(scope: V24DailyTargetScope, clientOrderId: string): Promise<V24LocalOrderIntent | null>;
}
