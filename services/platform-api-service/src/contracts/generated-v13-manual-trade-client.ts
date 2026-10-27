// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedPlatformV13ManualTradeClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async executeApprovedManualProposal(body: Contracts.V13ManualPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-manual-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async executeSequencedManualProposal(body: Contracts.V13ManualPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async recordSequencedFillReport(orderId: string, body: { externalFillId: string; sequence: number; cumulativeQuantity: number; price: string; fee: string; effectiveAt: string; evidenceRef: string }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/simulated-fill-reports", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async requestFakeBrokerCancel(orderId: string): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/cancel", { method: "POST", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async resolveFakeBrokerCancel(orderId: string, body: { outcome: "ACCEPTED" | "REJECTED"; reason: string; sequence: number }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/orders/" + encodeURIComponent(orderId) + "/cancel-result", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async executeAutoPolicyProposal(body: Contracts.V13AutoPaperExecutionCommand): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/paper-orders/execute-auto-proposal", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readOrderByClientId(namespace: string, clientOrderId: string): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams({ namespace, clientOrderId });
    const response = await this.request(this.baseUrl + "/internal/v1/orders/by-client-id?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readIndependentAssets(namespace: string, accountId: string): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams({ namespace, accountId });
    const response = await this.request(this.baseUrl + "/internal/v1/v13/accounts/assets?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async readInFlightOrders(accountId: string, scope: { namespace: string; ownerId: string; testRunId: string }): Promise<{ status: number; body?: unknown }> {
    const query = new URLSearchParams(scope);
    const response = await this.request(this.baseUrl + "/internal/v1/accounts/" + encodeURIComponent(accountId) + "/in-flight-orders?" + query, { method: "GET", headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async settleForSession(body: { namespace: string; accountId: string; ownerId: string; testRunId: string; asOf: string }): Promise<{ status: number; body?: unknown }> {
    const response = await this.request(this.baseUrl + "/internal/v1/v13/accounts/settlements", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
  async correctFillFee(orderId: string, externalFillId: string, body: Contracts.FillFeeCorrectionCommand): Promise<{ status: number; body?: unknown }> {
    const path = "/internal/v1/orders/" + encodeURIComponent(orderId) + "/fills/" + encodeURIComponent(externalFillId) + "/fee-corrections";
    const response = await this.request(this.baseUrl + path, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  }
}
