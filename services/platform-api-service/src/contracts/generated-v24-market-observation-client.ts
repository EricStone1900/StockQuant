// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-calendar.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedV24MarketObservationClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly bearerToken: string, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("Platform service bearer token is not configured");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async getCnAShareCalendarSession(date: string, timeoutMs: number = 5000): Promise<Contracts.CnAShareCalendarSession> {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("date must use YYYY-MM-DD");
    const response = await this.request(this.baseUrl + "/v2/calendar/cn-a-share/" + encodeURIComponent(date), { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error("Market Data calendar returned HTTP " + response.status);
    return await response.json() as Contracts.CnAShareCalendarSession;
  }

  async getV24AuthorizedQuotePreview(timeoutMs: number = 8000): Promise<Contracts.LiveQuotePreview> {
    const response = await this.request(this.baseUrl + "/v2/quote/preview", { headers: { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + this.bearerToken }, signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error("Market Data quote preview returned HTTP " + response.status);
    return value as Contracts.LiveQuotePreview;
  }
}
