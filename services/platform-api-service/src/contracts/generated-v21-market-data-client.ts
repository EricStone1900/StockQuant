// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-calendar.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedV21MarketDataClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }
  private async call<T>(path: string, label: string, method = "GET", body?: unknown, timeoutMs = 5000): Promise<T> {
    const headers = this.headers();
    const response = await this.request(this.baseUrl + path, { method, headers: body === undefined ? headers : { ...headers, "content-type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new MarketDataV21HttpError(response.status, value, "Market Data " + label + " returned HTTP " + response.status);
    return value as T;
  }
  getV21SourceInventory(): Promise<Contracts.MarketDataSourceInventory> { return this.call("/v2/sources", "source inventory"); }
  getV21SamplingConfig(): Promise<Contracts.MarketDataSamplingConfig> { return this.call("/v2/sampling", "sampling config"); }
  getV21Watchlist(): Promise<Contracts.MarketDataWatchlist> { return this.call("/v2/watchlist", "watchlist"); }
  getV21NewsPreview(): Promise<Contracts.MarketDataNewsPreview> { return this.call("/v2/news/preview", "news preview"); }
  getV21LiveNews(): Promise<Contracts.MarketDataLiveNewsPreview> { return this.call("/v2/news/live", "live news", "GET", undefined, 8000); }
  getV21SourceSmoke(): Promise<Contracts.MarketDataSourceSmoke> { return this.call("/v2/sources/smoke", "source smoke", "GET", undefined, 25000); }
  getV21QuotePreview(): Promise<Contracts.LiveQuotePreview> { return this.call("/v2/quote/preview", "quote preview", "GET", undefined, 8000); }
  updateV21SamplingConfig(body: Contracts.MarketDataSamplingUpdate): Promise<Contracts.MarketDataSamplingConfig> { return this.call("/v2/sampling", "sampling config", "PUT", body); }
  updateV21Watchlist(body: Contracts.MarketDataWatchlistUpdate): Promise<Contracts.MarketDataWatchlist> { return this.call("/v2/watchlist", "watchlist", "PUT", body); }
  openV21SourceCircuit(sourceId: string): Promise<Contracts.MarketDataSourceCircuitState> { return this.call("/v2/sources/" + encodeURIComponent(sourceId) + "/fail", "source circuit", "POST"); }
  recoverV21SourceCircuit(sourceId: string): Promise<Contracts.MarketDataSourceCircuitState> { return this.call("/v2/sources/" + encodeURIComponent(sourceId) + "/recover", "source circuit", "POST"); }
  getV12NormalFixturePreview(): Promise<Contracts.V12FixturePreview> { return this.call("/v1/fixtures/normal/preview", "V1.2 normal Fixture preview"); }
  getV12FutureFixturePreview(): Promise<Contracts.V12FixturePreview> { return this.call("/v1/fixtures/bad-future/preview", "V1.2 future Fixture preview"); }
  getV12ResearchFixturePreview(): Promise<Contracts.V12ResearchFixturePreview> { return this.call("/v1/fixtures/research-preview", "V1.2 dual-market research Fixture preview"); }
  getCollectionScheduleForPlatform(subscriptionId: string): Promise<Contracts.CollectionScheduleView> { return this.call("/v2/collection-schedules/" + encodeURIComponent(subscriptionId), "collection schedule"); }
  getMinuteGapsForPlatform(subscriptionId: string): Promise<Contracts.MinuteOpenGaps> { return this.call("/v2/minute/gaps/" + encodeURIComponent(subscriptionId), "open minute gaps"); }
  getMarketDataAlertIncidents(): Promise<Contracts.MarketDataAlertIncidents> { return this.call("/v2/alerts", "active alert incidents"); }
  acknowledgeMarketDataAlertIncident(incidentId: string, body: Contracts.MarketDataAlertAcknowledgeRequest): Promise<Contracts.MarketDataAlertIncidentV1> { return this.call("/v2/alerts/" + encodeURIComponent(incidentId) + "/acknowledge", "alert incident acknowledgement", "POST", body); }
}

export class MarketDataV21HttpError extends Error {
  constructor(readonly status: number, readonly body: unknown, message: string) { super(message); this.name = "MarketDataV21HttpError"; }
}
