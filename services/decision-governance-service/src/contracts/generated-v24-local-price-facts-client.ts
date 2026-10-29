// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/v24-local-price-facts.v1.json
import type { V24LocalPriceFactsV1 } from "./generated-types.js";
export class GeneratedV24LocalPriceFactsClient {
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl) || !/^[A-Za-z0-9_-]{32,}$/u.test(token)) throw new Error("local facts client configuration invalid");
  }
  async read(query: { ownerId: string; accountId: string; namespace: string; testRunId: string; targetId: string; clientOrderId: string; evaluatedAt: string }): Promise<V24LocalPriceFactsV1 | null> {
    const response = await this.request(this.baseUrl.replace(/\/+$/u, "") + "/internal/v1/c5-local/price-facts?" + new URLSearchParams(query), { method: "GET", headers: { "x-stockquant-service-id": "decision-governance-service", authorization: "Bearer " + this.token }, signal: AbortSignal.timeout(5000) });
    if (response.status === 404 || response.status === 409) return null;
    if (!response.ok) throw new Error("C5_LOCAL_FACTS_UNAVAILABLE");
    return await response.json() as V24LocalPriceFactsV1;
  }
}
