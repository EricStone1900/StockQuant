// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-historical.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedPlatformPaperExecutionClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async executeV24FixtureSnapshotOrder(command: Contracts.V24PaperExecutionCommand, timeoutMs: number = 30000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/v24/paper-orders/execute-snapshot", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(timeoutMs) });
  }

  async executeC5LocalPaperOrder(authorization: Contracts.C5LocalFakeBrokerExecutionCommand["authorization"], timeoutMs: number = 20000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/c5-local/paper-orders/execute", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify({ authorization }), signal: AbortSignal.timeout(timeoutMs) });
  }

  async settleC5LocalPaperSession(command: Contracts.C5LocalSessionSettlementCommand): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/c5-local/accounts/settlements", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(command), signal: AbortSignal.timeout(15000) });
  }

  async readV24FakeOrderByClientIdentity(namespace: string, clientOrderId: string, timeoutMs: number = 5000): Promise<Response> {
    if (!namespace || !clientOrderId) throw new Error("namespace and clientOrderId are required");
    const query = new URLSearchParams({ namespace, clientOrderId });
    return this.request(this.baseUrl + "/internal/v1/orders/by-client-id?" + query, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
  }

  async readV24PaperReconciliationSummary(namespace: string, timeoutMs: number = 5000): Promise<Response> {
    if (!namespace) throw new Error("namespace is required");
    return this.request(this.baseUrl + "/internal/v1/reconciliation/summary?namespace=" + encodeURIComponent(namespace), { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
  }

  async recordSimulatedFakeBrokerExternalOrder(order: Contracts.FakeBrokerSimulatedExternalOrder, timeoutMs: number = 5000): Promise<Response> {
    return this.request(this.baseUrl + "/internal/v1/fake-broker/external-orders", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(order), signal: AbortSignal.timeout(timeoutMs) });
  }
}
