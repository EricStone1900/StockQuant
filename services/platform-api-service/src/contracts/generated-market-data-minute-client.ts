// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-minute-import.v1.json
import type * as Contracts from "./generated-types.js";

export class MarketDataMinuteHttpError extends Error {
  constructor(readonly status: number, readonly body: unknown) { super("Market Data minute import returned HTTP " + status); this.name = "MarketDataMinuteHttpError"; }
}

export class GeneratedMarketDataMinuteClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\/\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async importMarketDataMinuteCsv(body: Contracts.MinuteCsvImportRequest, timeoutMs = 30000): Promise<Contracts.MinuteImportRecord> {
    const response = await this.request(this.baseUrl + "/v2/minute/csv/import", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const value = await response.json().catch(() => ({}));
    if (![200, 201].includes(response.status)) throw new MarketDataMinuteHttpError(response.status, value);
    return value as Contracts.MinuteImportRecord;
  }

  async previewMarketDataMinuteFixture(): Promise<Contracts.MinuteFixturePreview> {
    return this.call<Contracts.MinuteFixturePreview>("/v2/minute/preview", "GET");
  }

  async importMarketDataMinuteFixture(body: Contracts.MinuteFixtureImportRequest): Promise<Contracts.MinuteImportRecord> {
    const response = await this.request(this.baseUrl + "/v2/minute/import", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (![200, 201, 422].includes(response.status)) throw new MarketDataMinuteHttpError(response.status, value);
    return value as Contracts.MinuteImportRecord;
  }

  async createMarketDataMinuteUpload(format: "csv" | "parquet", body: Contracts.MinuteCsvUploadCreateRequest, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(`/v2/minute/${format}/uploads`, "POST", body, ownerId);
  }

  async putMarketDataMinuteUploadChunk(format: "csv" | "parquet", uploadId: string, index: number, body: Contracts.MinuteCsvUploadChunkRequest, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(`/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}/chunks/${index}`, "PUT", body, ownerId);
  }

  async getMarketDataMinuteUpload(format: "csv" | "parquet", uploadId: string, ownerId: string): Promise<Contracts.MinuteCsvUploadProgress> {
    return this.call<Contracts.MinuteCsvUploadProgress>(`/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}`, "GET", undefined, ownerId);
  }

  async getMarketDataMinuteUploadFinalization(format: "csv" | "parquet", uploadId: string, ownerId: string): Promise<unknown> {
    return this.call<unknown>(`/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}/finalization`, "GET", undefined, ownerId);
  }

  async actOnMarketDataMinuteUpload(format: "csv" | "parquet", uploadId: string, action: "preview" | "finalize" | "finalize-queued" | "cancel", ownerId: string): Promise<unknown> {
    return this.call<unknown>(`/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}/${action}`, "POST", {}, ownerId);
  }

  async previewMarketDataMinuteCsv(body: Contracts.MinuteCsvImportRequest): Promise<unknown> {
    return this.call<unknown>("/v2/minute/csv/preview", "POST", body);
  }

  async getMarketDataMinuteImport(version: string): Promise<Contracts.MinuteImportRecord> {
    return this.call<Contracts.MinuteImportRecord>(`/v2/minute/imports/${encodeURIComponent(version)}`, "GET");
  }

  async pageMarketDataMinuteImportBars(version: string, query: { cursor?: string; pageSize?: string; securityId?: string; fromBarStart?: string; toBarStart?: string }): Promise<Contracts.MinuteBarPage> {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter((entry): entry is [string, string] => entry[1] !== undefined)));
    return this.call<Contracts.MinuteBarPage>(`/v2/minute/imports/${encodeURIComponent(version)}/bars?${params.toString()}`, "GET");
  }

  async checkMarketDataMinuteDailyAggregate(version: string, body: { securityId: string; tradingDate: string; frequency: "1m" | "5m"; reference: { open: number; high: number; low: number; close: number; volume: number; amount: number }; referenceSource: string; sourceReference: string }): Promise<unknown> {
    return this.call<unknown>(`/v2/minute/imports/${encodeURIComponent(version)}/daily-aggregate-check`, "POST", body);
  }

  async calculateMarketDataMinuteCoverage(body: { securityIds: string[]; fromDate: string; toDate: string; windowMinutes: 1 | 5; bars: Array<{ securityId: string; barStart: string; barEnd: string; open: number; high: number; low: number; close: number; volume: number; amount: number | null }> }): Promise<unknown> {
    const response = await this.request(this.baseUrl + "/v2/minute/coverage", { method: "POST", headers: { ...this.headers(), "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (![200, 422].includes(response.status)) throw new MarketDataMinuteHttpError(response.status, value);
    return value;
  }

  async checkMarketDataMinuteImportReplayReadiness(version: string): Promise<{ status: "READY" | "BLOCKED"; reasons: string[]; from: string | null; to: string | null; securities: string[] }> {
    return this.call(`/v2/minute/imports/${encodeURIComponent(version)}/replay-readiness`, "GET");
  }

  async registerMarketDataHistoricalContextVersion(body: { kind: "SECURITY_UNIVERSE" | "MARKET_RULE_SET" | "CORPORATE_ACTIONS"; version: string; content: Record<string, unknown>; sha256: string; validFrom: string; validTo: string; sourceReference: string; attestedBy: string }): Promise<unknown> {
    return this.call("/v2/historical-context/versions", "POST", body);
  }

  private async call<T>(path: string, method: "GET" | "POST" | "PUT", body?: unknown, ownerId?: string): Promise<T> {
    const response = await this.request(this.baseUrl + path, { method, headers: { ...this.headers(), ...(ownerId === undefined ? {} : { "x-stockquant-owner-id": ownerId }), ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw new MarketDataMinuteHttpError(response.status, value);
    return value as T;
  }
}
