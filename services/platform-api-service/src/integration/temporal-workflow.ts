import { proxyActivities } from "@temporalio/workflow";
import type { V15NoTradeInput, V15Session, V15Account } from "../application/v15-no-trade.js";
import type { V15AutoExecutionResult, V15AutoOrderResult } from "../application/v15-auto-trade.js";

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
  executeAutoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>): Promise<V15AutoExecutionResult>;
  completeAutoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, orders: V15AutoOrderResult[]): Promise<unknown>;
  completeCancelledAutoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, result: V15AutoExecutionResult): Promise<unknown>;
  completeRecovery(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, orders: V15AutoOrderResult[]): Promise<unknown>;
  rejectPausedMandate(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>): Promise<unknown[]>;
  completePausedRejection(input: V15NoTradeInput, rejections: unknown[]): Promise<unknown>;
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

export async function v15AutoTradeWorkflow(input: V15NoTradeInput): Promise<{ status: "WAITING"; markets: number }> {
  try {
    if (input.scenarioId !== "auto-trade") throw new Error("V1.5 AUTO workflow received a different scenario");
    const accounts = await noTradeActivities.prepareNoTrade(input);
    const result = await noTradeActivities.executeAutoTrade(input, accounts);
    if (result.cancelled) await noTradeActivities.completeCancelledAutoTrade(input, accounts, result);
    else await noTradeActivities.completeAutoTrade(input, accounts, result.orders);
    return { status: "WAITING", markets: result.orders.length };
  } catch (error) {
    await noTradeActivities.failNoTrade(input, error instanceof Error ? error.message : "V1.5 AUTO trade workflow failed");
    throw error;
  }
}

export async function v15RecoveryWorkflow(input: V15NoTradeInput): Promise<{ status: "WAITING"; markets: number }> {
  try {
    if (input.scenarioId !== "recovery") throw new Error("V1.5 recovery workflow received a different scenario");
    const accounts = await noTradeActivities.prepareNoTrade(input);
    const result = await noTradeActivities.executeAutoTrade(input, accounts);
    await noTradeActivities.completeRecovery(input, accounts, result.orders);
    return { status: "WAITING", markets: result.orders.length };
  } catch (error) {
    await noTradeActivities.failNoTrade(input, error instanceof Error ? error.message : "V1.5 UNKNOWN recovery workflow failed");
    throw error;
  }
}

export async function v15PausedRejectionWorkflow(input: V15NoTradeInput): Promise<{ status: "WAITING"; markets: number }> {
  try {
    if (input.scenarioId !== "rejection") throw new Error("V1.5 paused rejection workflow received a different scenario");
    const accounts = await noTradeActivities.prepareNoTrade(input);
    const results = await noTradeActivities.rejectPausedMandate(input, accounts);
    await noTradeActivities.completePausedRejection(input, results);
    return { status: "WAITING", markets: results.length };
  } catch (error) {
    await noTradeActivities.failNoTrade(input, error instanceof Error ? error.message : "V1.5 paused rejection workflow failed");
    throw error;
  }
}
