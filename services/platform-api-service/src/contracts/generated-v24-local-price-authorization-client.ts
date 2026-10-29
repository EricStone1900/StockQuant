// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/v24-local-price-facts.v1.json
import type { V24LocalPriceAuthorizationRequestV1 } from "./generated-types.js";
export type V24LocalPriceAuthorizationResponse = { status: number; body?: Record<string, unknown> };
export class GeneratedPlatformV24LocalPriceAuthorizationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl) || !/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("C5 local Governance client configuration invalid");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  async authorize(body: V24LocalPriceAuthorizationRequestV1, timeoutMs = 5000): Promise<V24LocalPriceAuthorizationResponse> {
    const response = await this.request(this.baseUrl + "/internal/v1/c5-local/orders/authorize", { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as unknown;
    return { status: response.status, body: value && typeof value === "object" ? value as Record<string, unknown> : undefined };
  }
}
