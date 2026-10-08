import { Client, Connection } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import { randomUUID } from "node:crypto";
import type { V15Account, V15NoTradeInput, V15Session } from "../application/v15-no-trade.js";
import { v15EventWorkflow, v15NoTradeWorkflow } from "./temporal-workflow.js";

const taskQueue = process.env.STOCKQUANT_TEMPORAL_TASK_QUEUE ?? "stockquant-v1-5";
const address = process.env.STOCKQUANT_TEMPORAL_ADDRESS;
let client: Client | undefined;
let workerPromise: Promise<void> | undefined;
let attempts = 0;

export type V15NoTradeRuntimeActivities = {
  prepareNoTrade(input: V15NoTradeInput): Promise<Record<"CN_A" | "US_EQUITY", V15Account>>;
  verifyNoTradeSessions(input: V15NoTradeInput, sessions: V15Session[], baseline: V15Account): Promise<unknown[]>;
  completeNoTrade(input: V15NoTradeInput, accounts: Record<"CN_A" | "US_EQUITY", V15Account>, observations: unknown[]): Promise<unknown>;
  failNoTrade(input: V15NoTradeInput, message: string): Promise<unknown>;
};

export async function startTemporalRuntime(v15Activities?: V15NoTradeRuntimeActivities): Promise<void> {
  if (!address) return;
  const connection = await NativeConnection.connect({ address });
  const worker = await Worker.create({
    connection,
    namespace: process.env.STOCKQUANT_TEMPORAL_NAMESPACE ?? "default",
    taskQueue,
    workflowsPath: new URL("./temporal-workflow.js", import.meta.url).pathname,
    activities: {
      normalizeEvent: async (eventId: string) => {
        attempts += 1;
        if (process.env.STOCKQUANT_TEMPORAL_INJECT_FAILURE === "true" && attempts === 1) throw new Error("injected activity failure");
        return eventId;
      },
      ...(v15Activities ?? {}),
    }
  });
  workerPromise = worker.run();
}

export async function runTemporalProbe(): Promise<Record<string, unknown>> {
  if (!address) return { status: "NOT_RUN", error: "STOCKQUANT_TEMPORAL_ADDRESS is not configured" };
  const connection = await Connection.connect({ address });
  client = client ?? new Client({ connection, namespace: process.env.STOCKQUANT_TEMPORAL_NAMESPACE ?? "default" });
  const workflowId = `v15-api-${randomUUID()}`;
  const eventId = `evt-${randomUUID()}`;
  const handle = await client.workflow.start(v15EventWorkflow, { args: [eventId], taskQueue, workflowId });
  const result = await handle.result();
  return { status: "PASS", workflowId, activityResult: result, activityAttempts: attempts, activityRetry: attempts > 1 };
}

export async function startV15NoTradeWorkflow(input: V15NoTradeInput): Promise<{ workflowId: string; started: boolean }> {
  if (!address) throw new Error("STOCKQUANT_TEMPORAL_ADDRESS is not configured");
  const connection = await Connection.connect({ address });
  client = client ?? new Client({ connection, namespace: process.env.STOCKQUANT_TEMPORAL_NAMESPACE ?? "default" });
  const workflowId = `v15-no-trade-${input.testRunId}`;
  try {
    await client.workflow.start(v15NoTradeWorkflow, { args: [input], taskQueue, workflowId, workflowIdReusePolicy: "REJECT_DUPLICATE" });
    return { workflowId, started: true };
  } catch (error) {
    if (error instanceof Error && error.name === "WorkflowExecutionAlreadyStartedError") return { workflowId, started: false };
    throw error;
  }
}

export function temporalRuntimeStarted(): boolean { return Boolean(workerPromise); }
