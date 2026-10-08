import { proxyActivities } from "@temporalio/workflow";
import type { V15NoTradeInput, V15Session, V15Account } from "../application/v15-no-trade.js";

const activities = proxyActivities<{ normalizeEvent: (eventId: string) => Promise<string> }>({
  startToCloseTimeout: "10 seconds",
  retry: { maximumAttempts: 3 }
});

export async function v15EventWorkflow(eventId: string): Promise<string> {
  return activities.normalizeEvent(eventId);
}

type V15Activities = {
  prepareNoTrade(input: V15NoTradeInput): Promise<Record<"CN_A" | "US_EQUITY", V15Account>>;
  verifyNoTradeSessions(input: V15NoTradeInput, sessions: V15Session[], baseline: V15Account): Promise<Awaited<ReturnType<typeof import("../application/v15-no-trade.js").verifyV15NoTradeSession>>[]>;
  completeNoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, observations: Awaited<ReturnType<typeof import("../application/v15-no-trade.js").verifyV15NoTradeSession>>[]): Promise<unknown>;
  failNoTrade(input: V15NoTradeInput, message: string): Promise<unknown>;
};

const noTradeActivities = proxyActivities<V15Activities>({
  startToCloseTimeout: "90 seconds",
  retry: { maximumAttempts: 5, initialInterval: "1 second", maximumInterval: "10 seconds" },
});

export async function v15NoTradeWorkflow(input: V15NoTradeInput): Promise<{ status: "WAITING"; observations: number }> {
  try {
    const accounts = await noTradeActivities.prepareNoTrade(input);
    const observations: Awaited<ReturnType<typeof import("../application/v15-no-trade.js").verifyV15NoTradeSession>>[] = [];
    for (const market of ["CN_A", "US_EQUITY"] as const) {
      const sessions = input.sessions.filter((session) => session.market === market);
      observations.push(...await noTradeActivities.verifyNoTradeSessions(input, sessions, accounts[market]));
    }
    await noTradeActivities.completeNoTrade(input, accounts, observations);
    return { status: "WAITING", observations: observations.length };
  } catch (error) {
    await noTradeActivities.failNoTrade(input, error instanceof Error ? error.message : "V1.5 NO_TRADE workflow failed");
    throw error;
  }
}
