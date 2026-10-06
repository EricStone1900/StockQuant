// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-historical.v1.json
import type * as Contracts from "./generated-types.js";

export class TradeExecutionHttpError extends Error {
  constructor(readonly status: number, readonly body: string) { super("Trade Execution returned HTTP " + status + (body ? ": " + body : "")); this.name = "TradeExecutionHttpError"; }
}

export class GeneratedTradeExecutionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Historical Replay service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async executeHistoricalFakeOrder(body: Contracts.HistoricalFakeExecutionCommand, timeoutMs: number = 5000): Promise<Contracts.HistoricalFakeExecutionResult> {
    const response = await this.request(this.baseUrl + "/internal/v1/historical-orders/execute", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new TradeExecutionHttpError(response.status, await response.text().catch(() => ""));
    return await response.json() as Contracts.HistoricalFakeExecutionResult;
  }
  async readHistoricalFakeOrderById(orderId: string, timeoutMs: number = 5000): Promise<Contracts.HistoricalFakeOrderState> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId), { headers: { "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new TradeExecutionHttpError(response.status, await response.text().catch(() => ""));
    return await response.json() as Contracts.HistoricalFakeOrderState;
  }
}
