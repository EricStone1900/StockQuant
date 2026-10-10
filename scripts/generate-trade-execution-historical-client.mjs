import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/trade-execution-historical.v1.json");
const output = resolve(root, "services/historical-replay-worker/src/contracts/generated-trade-execution-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operation = document.paths?.["/internal/v1/historical-orders/execute"]?.post;
if (operation?.operationId !== "executeHistoricalFakeOrder" || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "historical-replay-worker" || !operation.security?.some((rule) => rule.ServiceBearer)) throw new Error("Expected the replay-worker-only historical FakeBroker operation");
if (!JSON.stringify(operation.requestBody).includes("historical-fake-execution-command.schema.json") || !JSON.stringify(operation.responses?.["200"]).includes("historical-fake-execution-result.schema.json")) throw new Error("Historical execution operation requires canonical request/response schemas");
const readOrder = document.paths?.["/internal/v1/historical-orders/{orderId}"]?.get;
if (readOrder?.operationId !== "readHistoricalFakeOrderById" || readOrder.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "historical-replay-worker" || !readOrder.parameters?.some((parameter) => parameter.name === "namespace" && parameter.in === "query" && parameter.required) || !JSON.stringify(readOrder.responses?.["200"]).includes("historical-fake-order-state.schema.json")) throw new Error("Historical original-order recovery operation is incomplete");

const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-historical.v1.json
import type * as Contracts from "./generated-types.js";

export class TradeExecutionHttpError extends Error {
  constructor(readonly status: number, readonly body: string) { super("Trade Execution returned HTTP " + status + (body ? ": " + body : "")); this.name = "TradeExecutionHttpError"; }
}

export class GeneratedTradeExecutionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Historical Replay service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
  }

  async executeHistoricalFakeOrder(body: Contracts.HistoricalFakeExecutionCommand, timeoutMs: number = 5000): Promise<Contracts.HistoricalFakeExecutionResult> {
    const response = await this.request(this.baseUrl + "/internal/v1/historical-orders/execute", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new TradeExecutionHttpError(response.status, await response.text().catch(() => ""));
    return await response.json() as Contracts.HistoricalFakeExecutionResult;
  }
  async readHistoricalFakeOrderById(orderId: string, namespace: string, timeoutMs: number = 5000): Promise<Contracts.HistoricalFakeOrderState> {
    const response = await this.request(this.baseUrl + "/internal/v1/historical-orders/" + encodeURIComponent(orderId) + "?namespace=" + encodeURIComponent(namespace), { headers: { "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new TradeExecutionHttpError(response.status, await response.text().catch(() => ""));
    return await response.json() as Contracts.HistoricalFakeOrderState;
  }
}
`;
const checkOnly = process.argv.includes("--check");
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (checkOnly) throw new Error("generated-trade-execution-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Historical Trade Execution OpenAPI client ${checkOnly ? "checked" : "generated"}: 2 operations -> services/historical-replay-worker/src/contracts/generated-trade-execution-client.ts`);
