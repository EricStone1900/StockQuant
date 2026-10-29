// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json
import type * as Contracts from "./generated-types.js";

export type V13AutoMandateResponse<T = unknown> = { status: number; body?: T | Record<string, unknown> };

export class GeneratedTradeV13AutoMandateClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Decision Governance base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Trade service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async verifyC5LocalReservation(body: Record<string,unknown>, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/c5-local/orders/reservations/verify", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async authorizeOrder(mandateId: string, body: Contracts.V13AutoMandateOrderCommand, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/" + encodeURIComponent(mandateId) + "/orders/authorize";
    const headers = { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
  async settleReservation(reservationId: string, body: Contracts.V13AutoMandateSettlementCommand, timeoutMs = 5000): Promise<V13AutoMandateResponse> {
    const path = "/internal/v1/auto-mandates/reservations/" + encodeURIComponent(reservationId) + "/settle";
    const headers = { "content-type": "application/json", "x-stockquant-service-id": "trade-execution-service", authorization: "Bearer " + this.bearerToken };
    const response = await this.request(this.baseUrl + path, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value as Record<string,unknown> | undefined };
  }
}
