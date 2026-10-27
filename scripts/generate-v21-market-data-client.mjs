import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "packages/contracts/openapi/market-data-calendar.v1.json");
const output = resolve(root, "services/platform-api-service/src/contracts/generated-v21-market-data-client.ts");
const document = JSON.parse(await readFile(source, "utf8"));
const operations = [
  ["/v2/sources", "get", "getV21SourceInventory", "market-data/source-inventory-v1.schema.json"],
  ["/v2/sampling", "get", "getV21SamplingConfig", "market-data/sampling-config-v1.schema.json"],
  ["/v2/sampling/schedules", "put", "updateV21SnapshotSchedule", "market-data/snapshot-schedule-v1.schema.json", "market-data/snapshot-schedule-v1.schema.json"],
  ["/v2/sampling/tasks/tick", "post", "evaluateV21SnapshotSamplingTick", "market-data/sampling-task-decision-v1.schema.json"],
  ["/v2/sampling/tasks/tick-fixture", "post", "evaluateV21SnapshotSamplingFixtureTick", "market-data/sampling-task-decision-v1.schema.json"],
  ["/v2/sampling/tasks/latest", "get", "getV21LatestSnapshotSamplingTask", "market-data/sampling-task-latest-v1.schema.json"],
  ["/v2/daily-bars/fixture/complete", "post", "completeV21DailyBarFixture", "market-data/daily-bar-completion-task-result-v1.schema.json", "market-data/daily-bar-completion-request-v1.schema.json"],
  ["/v2/daily-bars/real/complete", "post", "completeV21RealDailyBar", "market-data/daily-bar-completion-task-result-v1.schema.json", "market-data/daily-bar-completion-request-v1.schema.json"],
  ["/v2/daily-bars/completions/latest", "get", "getV21LatestDailyBarCompletion", "market-data/daily-bar-completion-latest-v1.schema.json"],
  ["/v2/watchlist", "get", "getV21Watchlist", "market-data/watchlist-v1.schema.json"],
  ["/v2/news/preview", "get", "getV21NewsPreview", "market-data/news-preview-v1.schema.json"],
  ["/v2/news/live", "get", "getV21LiveNews", "market-data/live-news-preview-v1.schema.json"],
  ["/v2/news/fixture/ingest", "post", "ingestV21NewsFixture", "market-data/news-fixture-ingest-v1.schema.json"],
  ["/v2/news/fixture/history", "get", "getV21NewsFixtureHistory", "market-data/news-fixture-history-v1.schema.json"],
  ["/v2/sources/smoke", "get", "getV21SourceSmoke", "market-data/source-smoke-v1.schema.json"],
  ["/v2/quote/preview", "get", "getV24AuthorizedQuotePreview", "live-quote-preview-v1.schema.json"],
  ["/v2/sampling", "put", "updateV21SamplingConfig", "market-data/sampling-config-v1.schema.json"],
  ["/v2/sampling/monitor-policy", "put", "updateV21MonitorEvaluationPolicy", "market-data/monitor-evaluation-policy-result-v1.schema.json", "market-data/monitor-evaluation-policy-update-v1.schema.json"],
  ["/v2/watchlist", "put", "updateV21Watchlist", "market-data/watchlist-v1.schema.json"],
  ["/v2/watchlist/scoped", "get", "getV21ScopedWatchlist", "market-data/scoped-watchlist-v1.schema.json"],
  ["/v2/watchlist/scoped", "put", "updateV21ScopedWatchlist", "market-data/scoped-watchlist-v1.schema.json", "market-data/scoped-watchlist-update-v1.schema.json"],
  ["/v2/sources/{sourceId}/fail", "post", "openV21SourceCircuit", "market-data/source-circuit-state-v1.schema.json"],
  ["/v2/sources/{sourceId}/recover", "post", "recoverV21SourceCircuit", "market-data/source-circuit-state-v1.schema.json"],
  ["/v1/fixtures/normal/preview", "get", "getV12NormalFixturePreview", "market-data/v12-fixture-preview-v1.schema.json"],
  ["/v1/fixtures/bad-future/preview", "get", "getV12FutureFixturePreview", "market-data/v12-fixture-preview-v1.schema.json"],
  ["/v1/fixtures/research-preview", "get", "getV12ResearchFixturePreview", "market-data/v12-research-fixture-preview-v1.schema.json"],
  ["/v2/collection-schedules/{subscriptionId}", "get", "getCollectionScheduleForPlatform", "market-data/collection-schedule-view-v1.schema.json"],
  ["/v2/minute/gaps/{subscriptionId}", "get", "getMinuteGapsForPlatform", "market-data/minute-open-gaps-v1.schema.json"],
  ["/v2/alerts", "get", "getMarketDataAlertIncidents", "market-data/alert-incidents-v1.schema.json"],
  ["/v2/alerts/paper-reconciliation", "post", "recordPaperReconciliationAlert", "market-data/paper-reconciliation-alert-result-v1.schema.json", "market-data/paper-reconciliation-alert-request-v1.schema.json"],
  ["/v2/alerts/{incidentId}/acknowledge", "post", "acknowledgeMarketDataAlertIncident", "market-data/market-data-alert-incident-v1.schema.json", "market-data/alert-acknowledge-request-v1.schema.json"]
];
for (const [path, method, operationId, schema, requestSchema] of operations) {
  const operation = document.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !JSON.stringify(operation.responses?.["200"]).includes(schema)) throw new Error(`Expected bearer-protected ${operationId} OpenAPI operation`);
  if (requestSchema && !JSON.stringify(operation.requestBody).includes(requestSchema)) throw new Error(`Expected ${requestSchema} request body for ${operationId}`);
}
const expected = `// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/openapi/market-data-calendar.v1.json
import type * as Contracts from "./generated-types.js";

export class GeneratedV21MarketDataClient {
  private readonly baseUrl: string;
  constructor(baseUrl: string, private readonly headers: () => Record<string, string>, private readonly request: typeof fetch = fetch) {
    if (!/^https?:\\/\\//u.test(baseUrl)) throw new Error("Market Data base URL must be HTTP(S)");
    this.baseUrl = baseUrl.replace(/\\/+$/u, "");
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
  updateV21SnapshotSchedule(body: Contracts.MarketDataSnapshotSchedule): Promise<Contracts.MarketDataSnapshotSchedule> { return this.call("/v2/sampling/schedules", "snapshot schedule", "PUT", body); }
  evaluateV21SnapshotSamplingTick(body: { scheduledAt: string; sourceId: "tencent-quote" | "sina-quote"; scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string } }): Promise<unknown> { return this.call("/v2/sampling/tasks/tick", "sampling task tick", "POST", body); }
  evaluateV21SnapshotSamplingFixtureTick(body: { scheduledAt: string; scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }; acceptanceIntervalMinutes?: 20 | 30; fixtureVariant?: "fresh" | "stale" }): Promise<unknown> { return this.call("/v2/sampling/tasks/tick-fixture", "sampling Fixture task tick", "POST", body); }
  getV21LatestSnapshotSamplingTask(scope: { ownerId: string; accountId: string; namespace: string; testRunId: string }): Promise<unknown> { const query = new URLSearchParams(scope); return this.call("/v2/sampling/tasks/latest?" + query, "latest sampling task"); }
  completeV21DailyBarFixture(scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }, fixtureVersion: "v2.1-daily-bars-1" | "v24-c5-daily-bars-1" = "v2.1-daily-bars-1"): Promise<Contracts.MarketDataDailyBarCompletionTaskResult> { return this.call("/v2/daily-bars/fixture/complete", "daily bar Fixture completion", "POST", { scope, fixtureVersion }); }
  completeV21RealDailyBar(scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }): Promise<Contracts.MarketDataDailyBarCompletionTaskResult> { return this.call("/v2/daily-bars/real/complete", "real daily bar completion", "POST", { scope }); }
  getV21LatestDailyBarCompletion(scope: { ownerId: string; accountId: string; namespace: string; testRunId: string }): Promise<Contracts.MarketDataLatestDailyBarCompletion> { const query = new URLSearchParams(scope); return this.call("/v2/daily-bars/completions/latest?" + query, "latest daily bar completion"); }
  updateV21DailyBarSchedule(body: Contracts.DailyBarScheduleRequestV1): Promise<Contracts.DailyBarScheduleResultV1> { return this.call("/v2/daily-bars/schedules", "daily bar close schedule", "PUT", body); }
  getV21Watchlist(): Promise<Contracts.MarketDataWatchlist> { return this.call("/v2/watchlist", "watchlist"); }
  getV21ScopedWatchlist(scope: { ownerId: string; accountId: string; namespace: string; testRunId: string }): Promise<Contracts.ScopedWatchlist> { const query = new URLSearchParams(scope); return this.call("/v2/watchlist/scoped?" + query, "scoped watchlist"); }
  getV21NewsPreview(): Promise<Contracts.MarketDataNewsPreview> { return this.call("/v2/news/preview", "news preview"); }
  getV21LiveNews(): Promise<Contracts.MarketDataLiveNewsPreview> { return this.call("/v2/news/live", "live news", "GET", undefined, 8000); }
  ingestV21NewsFixture(): Promise<unknown> { return this.call("/v2/news/fixture/ingest", "news fixture ingest", "POST", {}); }
  getV21NewsFixtureHistory(): Promise<unknown> { return this.call("/v2/news/fixture/history", "news fixture history"); }
  getV21SourceSmoke(): Promise<Contracts.MarketDataSourceSmoke> { return this.call("/v2/sources/smoke", "source smoke", "GET", undefined, 25000); }
  getV21QuotePreview(): Promise<Contracts.LiveQuotePreview> { return this.call("/v2/quote/preview", "quote preview", "GET", undefined, 8000); }
  updateV21SamplingConfig(body: Contracts.MarketDataSamplingUpdate): Promise<Contracts.MarketDataSamplingConfig> { return this.call("/v2/sampling", "sampling config", "PUT", body); }
  updateV21MonitorEvaluationPolicy(body: Contracts.MarketDataMonitorEvaluationPolicyUpdate): Promise<Contracts.MarketDataMonitorEvaluationPolicyResult> { return this.call("/v2/sampling/monitor-policy", "Monitor evaluation policy", "PUT", body); }
  updateV21Watchlist(body: Contracts.MarketDataWatchlistUpdate): Promise<Contracts.MarketDataWatchlist> { return this.call("/v2/watchlist", "watchlist", "PUT", body); }
  updateV21ScopedWatchlist(body: Contracts.ScopedWatchlistUpdate): Promise<Contracts.ScopedWatchlist> { return this.call("/v2/watchlist/scoped", "scoped watchlist", "PUT", body); }
  openV21SourceCircuit(sourceId: string): Promise<Contracts.MarketDataSourceCircuitState> { return this.call("/v2/sources/" + encodeURIComponent(sourceId) + "/fail", "source circuit", "POST"); }
  recoverV21SourceCircuit(sourceId: string): Promise<Contracts.MarketDataSourceCircuitState> { return this.call("/v2/sources/" + encodeURIComponent(sourceId) + "/recover", "source circuit", "POST"); }
  getV12NormalFixturePreview(): Promise<Contracts.V12FixturePreview> { return this.call("/v1/fixtures/normal/preview", "V1.2 normal Fixture preview"); }
  getV12FutureFixturePreview(): Promise<Contracts.V12FixturePreview> { return this.call("/v1/fixtures/bad-future/preview", "V1.2 future Fixture preview"); }
  getV12ResearchFixturePreview(): Promise<Contracts.V12ResearchFixturePreview> { return this.call("/v1/fixtures/research-preview", "V1.2 dual-market research Fixture preview"); }
  getCollectionScheduleForPlatform(subscriptionId: string): Promise<Contracts.CollectionScheduleView> { return this.call("/v2/collection-schedules/" + encodeURIComponent(subscriptionId), "collection schedule"); }
  getMinuteGapsForPlatform(subscriptionId: string): Promise<Contracts.MinuteOpenGaps> { return this.call("/v2/minute/gaps/" + encodeURIComponent(subscriptionId), "open minute gaps"); }
  getMarketDataAlertIncidents(): Promise<Contracts.MarketDataAlertIncidents> { return this.call("/v2/alerts", "active alert incidents"); }
  recordPaperReconciliationAlert(body: Contracts.PaperReconciliationAlertRequestV1): Promise<Contracts.PaperReconciliationAlertResultV1> { return this.call("/v2/alerts/paper-reconciliation", "Paper reconciliation alert", "POST", body); }
  acknowledgeMarketDataAlertIncident(incidentId: string, body: Contracts.MarketDataAlertAcknowledgeRequest): Promise<Contracts.MarketDataAlertIncidentV1> { return this.call("/v2/alerts/" + encodeURIComponent(incidentId) + "/acknowledge", "alert incident acknowledgement", "POST", body); }
}

export class MarketDataV21HttpError extends Error {
  constructor(readonly status: number, readonly body: unknown, message: string) { super(message); this.name = "MarketDataV21HttpError"; }
}
`;
let actual;
try { actual = await readFile(output, "utf8"); } catch {}
if (actual !== expected) {
  if (process.argv.includes("--check")) throw new Error("generated-v21-market-data-client.ts is stale; run pnpm contracts:generate");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, expected);
}
console.log(`Market Data read OpenAPI client ${process.argv.includes("--check") ? "checked" : "generated"}: ${operations.length} operations`);
