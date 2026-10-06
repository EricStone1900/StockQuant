// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/trade-execution-v24-readiness.v1.json
import type * as Contracts from "./generated-types.js";

export type PlatformPaperReadinessResult = { status: number; body?: Contracts.V24PaperReadiness | Record<string, unknown> };

export class GeneratedPlatformPaperReadinessClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Trade Execution base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async getV24PaperExecutionReadiness(market: "CN_A" | "US_EQUITY", timeoutMs: number = 5000): Promise<PlatformPaperReadinessResult> {
    if (market !== "CN_A" && market !== "US_EQUITY") throw new Error("market must be CN_A or US_EQUITY");
    const response = await this.request(this.baseUrl + "/internal/v1/v24/paper-readiness?market=" + encodeURIComponent(market), { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => undefined) as Contracts.V24PaperReadiness | Record<string, unknown> | undefined;
    return { status: response.status, body: value };
  }
}
