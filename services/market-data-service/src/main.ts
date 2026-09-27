import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { CollectionRunConflict, CollectionRunRepository } from "./application/collection-run-repository.js";
import { CollectionScheduler } from "./application/collection-scheduler.js";
import { CollectionScheduleConflict, CollectionScheduleRepository } from "./application/collection-schedule-repository.js";
import { PersistentCollectionSchedulerWorker } from "./application/persistent-collection-scheduler.js";
import { PersistentCollectionExecutor, PythonMinuteCollectionAdapter } from "./application/collection-executor.js";
import { buildCoverage, validateBars, type QualityBar } from "./application/minute-quality.js";
import { BackfillConflict, CoverageRepository } from "./application/coverage-repository.js";
import { validateGapRequest } from "./application/coverage-request.js";
import { DataVersionConflict, ProjectAccessDenied, assertProjectAccess, exportWithManifest, paginateVersioned, physicalDedupeKey, type ProjectActor, type ProjectScope } from "./application/project-delivery.js";
import { parseProjectTokenConfig, ProjectAccessRepository, ProjectAuthenticationError, ProjectQuotaRepositoryError } from "./application/project-access-repository.js";
import { ArtifactDeliveryRepository } from "./application/artifact-delivery-repository.js";
import { AlertOutboxRepository } from "./application/alert-outbox-repository.js";
import { MinuteImportRepository, type MinuteImportBar } from "./application/minute-import-repository.js";
import { MAX_MINUTE_CSV_PREVIEW_BARS, minuteCsvImportIdentity, minuteCsvImportIdentityFromSha, previewMinuteCsv, previewMinuteCsvStream, type MinuteCsvMapping } from "./application/minute-csv-import.js";
import { previewMinuteParquetStream } from "./application/minute-parquet-import.js";
import { MinuteUploadConflict, MinuteUploadQuotaExceeded, MinuteUploadRepository, type MinuteUploadMetadata } from "./application/minute-upload-repository.js";
import { PostgresAdvisorySingleFlightGate, SingleFlightGate } from "./application/single-flight-gate.js";
import { HttpBodyTooLargeError, readHttpBody } from "./http-body.js";
import { decodeTencentQuote, previewTencentQuotes } from "./application/tencent-quote-preview.js";
import { cnAShareSession, isCalendarDate } from "./application/cn-a-share-calendar.js";
import { isAuthorizedPlatformApi, isProtectedPlatformApiRequest, loadMarketDataServiceTokens } from "./service-auth.js";

type Bar = { securityId: string; ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number; adjustment: "raw" };
class MinuteCsvFinalizeParseError extends Error {}
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
let serviceTokens: ReturnType<typeof loadMarketDataServiceTokens> | null = null;
try { serviceTokens = loadMarketDataServiceTokens(process.env); } catch { /* Import endpoints remain closed until the platform credential is configured. */ }
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");
const minuteFixture = resolve(root, "fixtures/v2/v2.2/minute_bars.csv");
const minuteBadFixture = resolve(root, "fixtures/v2/v2.2/minute_bars_bad.csv");
const minuteSourceIds = ["baostock", "sina", "eastmoney", "tdx"] as const;
function configuredMinuteSources(): string[] {
  return (process.env.STOCKQUANT_COLLECTION_SOURCES ?? "sina,baostock").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
const artifactTasks = new Map<string, { status: "RUNNING" | "CANCELLED" | "PUBLISHED"; artifactId?: string }>();
let watchlist: string[] = ["600000.SH", "000001.SZ", "600519.SH"];
let samplingMinutes = 30;
const sourceState = new Map<string, { status: "HEALTHY" | "OPEN"; failures: number }>;
for (const id of ["tencent-quote", "sina-quote", "eastmoney-news", "cls-news"]) sourceState.set(id, { status: "HEALTHY", failures: 0 });
const databasePool = process.env.STOCKQUANT_DATABASE_URL ? new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL }) : null;
const collectionRuns = databasePool ? new CollectionRunRepository(databasePool) : null;
const collectionSchedules = databasePool ? new CollectionScheduleRepository(databasePool) : null;
const coverageRepository = databasePool ? new CoverageRepository(databasePool) : null;
const projectAccessRepository = databasePool ? new ProjectAccessRepository(databasePool) : null;
const artifactDeliveryRepository = databasePool ? new ArtifactDeliveryRepository(databasePool) : null;
const alertOutboxRepository = databasePool ? new AlertOutboxRepository(databasePool) : null;
const minuteImportRepository = databasePool ? new MinuteImportRepository(databasePool) : null;
const minuteUploadRepository = databasePool ? new MinuteUploadRepository(databasePool) : null;
const collectionSecurityIds = (process.env.STOCKQUANT_COLLECTION_SECURITY_IDS ?? "600000.SH,000001.SZ,600519.SH").split(",").map((item) => item.trim()).filter(Boolean);
const collectionScheduler = new CollectionScheduler({ session: (date) => {
  const result = cnAShareSession(date);
  return { ...result, status: result.status as "TRADING" | "CLOSED" | "UNKNOWN" };
} }, { now: () => new Date() });
const persistentSchedulerWorker = databasePool && collectionRuns && collectionSchedules && process.env.STOCKQUANT_SCHEDULER_WORKER === "1"
  ? new PersistentCollectionSchedulerWorker(collectionSchedules, collectionRuns, collectionScheduler, process.env.STOCKQUANT_SCHEDULER_OWNER ?? `market-data-${process.pid}`)
  : null;
const collectionExecutor = collectionRuns && process.env.STOCKQUANT_COLLECTION_EXECUTOR === "1"
  ? new PersistentCollectionExecutor(collectionRuns, new PythonMinuteCollectionAdapter(), {
    securityIds: collectionSecurityIds,
    projectId: process.env.STOCKQUANT_COLLECTION_PROJECT_ID ?? "stockquant-local",
    dataVersion: process.env.STOCKQUANT_COLLECTION_DATA_VERSION ?? "cn-5m-raw-v1",
    subscriptionId: process.env.STOCKQUANT_COLLECTION_SUBSCRIPTION_ID,
    onRunCompleted: async (run) => {
      if (run.jobKind !== "BACKFILL" || !coverageRepository || !collectionRuns) return;
      const taskId = run.idempotencyKey.split("|", 1)[0];
      const task = await coverageRepository.findBackfill(taskId);
      if (!task || task.status !== "RUNNING") return;
      const summary = await collectionRuns.summarizeBackfill(taskId);
      if (summary.failed > 0) { await coverageRepository.failBackfill(taskId); return; }
      if (summary.total > 0 && summary.active === 0 && summary.completed === summary.total) {
        await coverageRepository.reconcileGaps(task.subscriptionId, task.fromDate, task.toDate, collectionSecurityIds, []);
        await coverageRepository.completeBackfill(taskId);
      }
    },
    onRunFailed: async (run) => {
      if (run.jobKind !== "BACKFILL" || !coverageRepository) return;
      const taskId = run.idempotencyKey.split("|", 1)[0];
      await coverageRepository.failBackfill(taskId);
    },
  })
  : null;

async function parse(path: string): Promise<Bar[]> {
  const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/).slice(1);
  return lines.map((line: string) => { const [securityId,ticker,date,open,high,low,close,volume,adjustment] = line.split(","); return { securityId,ticker,date,open:Number(open),high:Number(high),low:Number(low),close:Number(close),volume:Number(volume),adjustment: adjustment as "raw" }; });
}
function quality(bars: Bar[], asOf: string) {
  const errors = bars.filter((bar) => bar.date > asOf).map((bar) => ({ code: "FUTURE_DATA", ticker: bar.ticker, date: bar.date }));
  const invalid = bars.filter((bar) => !(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close));
  if (invalid.length) errors.push(...invalid.map((bar) => ({ code: "OHLC_INVALID", ticker: bar.ticker, date: bar.date })));
  return { status: errors.length ? "REJECTED" : "READY", errors };
}
async function json(res: ServerResponse, body: unknown, status = 200, headers: Record<string, string> = {}) { res.writeHead(status, { "content-type": "application/json", ...headers }); res.end(JSON.stringify(body)); }
function validIso(value: unknown): value is string { return typeof value === "string" && !Number.isNaN(Date.parse(value)); }
function validLocalDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value;
}
function authorizedCollectionControl(req: IncomingMessage): boolean {
  // Fail closed when the control token is not explicitly configured. A built-in
  // development token would expose schedule mutation endpoints on direct runs.
  const expected = process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN ?? "";
  const supplied = req.headers["x-stockquant-control-token"];
  if (typeof supplied !== "string" || supplied.length === 0 || expected.length === 0 || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}
function isUuid(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function shanghaiDate(value: string): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function validHash(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value); }
const localMinuteImportGate = new SingleFlightGate();
const postgresMinuteImportGate = databasePool ? new PostgresAdvisorySingleFlightGate(databasePool, [340244, 19785]) : null;
function needsMinuteImportSlot(req: IncomingMessage): boolean {
  if (req.method !== "POST") return false;
  const path = req.url?.split("?", 1)[0];
  return path === "/v2/minute/csv/preview" || path === "/v2/minute/csv/import" || /^\/v2\/minute\/(?:csv|parquet)\/uploads\/[0-9a-f-]+\/(?:preview|finalize)$/iu.test(path ?? "")
    || (process.env.NODE_ENV === "test" && process.env.STOCKQUANT_MINUTE_GATE_TEST_ENABLED === "true" && path === "/__test/minute-import-gate");
}
async function acquireMinuteImportSlot(): Promise<(() => Promise<void>) | null> {
  if (postgresMinuteImportGate) return postgresMinuteImportGate.tryAcquire();
  const release = localMinuteImportGate.tryAcquire();
  return release ? async () => release() : null;
}
function waitForResponseDrain(res: ServerResponse): Promise<void> {
  if (res.writableFinished || res.destroyed) return Promise.resolve();
  return new Promise((resolve) => { res.once("finish", resolve); res.once("close", resolve); });
}
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const pathname = req.url?.split("?", 1)[0] ?? "";
  if (isProtectedPlatformApiRequest(req.method ?? "", pathname) && (!serviceTokens || !isAuthorizedPlatformApi({
    serviceId: typeof req.headers["x-stockquant-service-id"] === "string" ? req.headers["x-stockquant-service-id"] : undefined,
    authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : undefined,
    tokens: serviceTokens,
  }))) return json(res, { code: "UNAUTHENTICATED_SERVICE", message: "platform API Bearer identity is required" }, 401);
  const gatedMinuteImport = needsMinuteImportSlot(req);
  let releaseMinuteImport: (() => Promise<void>) | null = null;
  if (gatedMinuteImport) {
    try { releaseMinuteImport = await acquireMinuteImportSlot(); }
    catch { return json(res, { code: "MINUTE_IMPORT_GATE_UNAVAILABLE", message: "minute import coordination is unavailable; retry when persistence recovers" }, 503); }
  }
  if (gatedMinuteImport && !releaseMinuteImport) return json(res, { code: "MINUTE_IMPORT_BUSY", message: "another memory-heavy minute import task is running; retry shortly" }, 429, { "retry-after": "1" });
  try {
    if (req.url?.split("?", 1)[0] === "/__test/minute-import-gate" && process.env.NODE_ENV === "test" && process.env.STOCKQUANT_MINUTE_GATE_TEST_ENABLED === "true" && req.method === "POST") {
      const holdMs = Number(new URL(req.url, "http://localhost").searchParams.get("holdMs"));
      if (!Number.isInteger(holdMs) || holdMs < 1 || holdMs > 5000) return json(res, { code: "INVALID_TEST_HOLD" }, 422);
      await new Promise((resolve) => setTimeout(resolve, holdMs));
      return json(res, { status: "RELEASED", holdMs });
    }
    if (req.url === "/live") return json(res, { status: "live", service: "market-data-service" });
    if (req.url === "/ready") return json(res, { status: "ready", service: "market-data-service", dataMode: "MIXED", liveQuoteMode: "LIVE_SOURCE", fixtureRoutesAvailable: true, collectionPersistence: collectionRuns ? "POSTGRES" : "DISABLED", collectionSchedulerWorker: persistentSchedulerWorker ? "ENABLED" : "DISABLED", collectionExecutor: collectionExecutor ? "ENABLED" : "DISABLED", collectionSecurityIds: (process.env.STOCKQUANT_COLLECTION_SECURITY_IDS ?? "600000.SH,000001.SZ,600519.SH").split(",").map((item) => item.trim()).filter(Boolean) });
    if (req.url === "/v2/collection-scheduler/status" && req.method === "GET") { const persistent = persistentSchedulerWorker?.status() ?? { enabled: false, lastSuccessfulTickAt: null, nextExecutionAt: null, lastSubmitted: 0 }; const executionMode = persistentSchedulerWorker && collectionExecutor ? "PERSISTENT_SOURCE_EXECUTION" : persistentSchedulerWorker ? "PERSISTENT_PLAN_ONLY" : "FIXTURE_PLAN_ONLY"; return json(res, { status: persistent.enabled ? "ENABLED" : "DISABLED", enabled: persistent.enabled, lastSuccessfulTickAt: persistent.lastSuccessfulTickAt, nextExecutionAt: persistent.nextExecutionAt, lastSubmitted: persistent.lastSubmitted, mode: executionMode, sourceOrder: configuredMinuteSources(), note: "健康检查包含最近成功 Tick 与下一触发时间；盘后无待执行窗口时保持低频轮询。" }); }
    if (req.url?.startsWith("/v2/collection/health") && req.method === "GET") {
      if (!coverageRepository || !databasePool) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const subscriptionId = new URL(req.url, "http://localhost").searchParams.get("subscriptionId");
      if (!subscriptionId) return json(res, { code: "INVALID_SUBSCRIPTION_ID" }, 422);
      const gaps = await coverageRepository.open(subscriptionId);
      const outbox = await databasePool.query("SELECT count(*)::int AS count FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE r.subscription_id=$1 AND r.status <> 'CANCELLED' AND o.sent_at IS NULL", [subscriptionId]);
      return json(res, { subscriptionId, openGaps: gaps.length, pendingOutbox: outbox.rows[0]?.count ?? 0 });
    }
    if (req.url === "/v2/minute/sources" && req.method === "GET") {
      const healthPath = process.env.STOCKQUANT_COLLECTION_SOURCE_HEALTH_PATH ?? "/var/lib/stockquant/source-health.json";
      const configured = configuredMinuteSources();
      const sourceState = (sourceId: string, state: Record<string, { state?: string; failures?: number; lastSuccessAt?: number | string | null; lastFailureAt?: number | string | null; lastErrorCode?: string | null }>) => ({ sourceId, kind: "MINUTE_BAR", enabled: configured.includes(sourceId), circuit: configured.includes(sourceId) ? state[sourceId]?.state ?? "UNKNOWN" : "DISABLED", failures: configured.includes(sourceId) ? Number(state[sourceId]?.failures ?? 0) : 0, lastSuccessAt: configured.includes(sourceId) ? state[sourceId]?.lastSuccessAt ?? null : null, lastFailureAt: configured.includes(sourceId) ? state[sourceId]?.lastFailureAt ?? null : null, lastErrorCode: configured.includes(sourceId) ? state[sourceId]?.lastErrorCode ?? null : null });
      try {
        const state = JSON.parse(await readFile(healthPath, "utf8")) as Record<string, { state?: string; failures?: number; lastSuccessAt?: number | string | null; lastFailureAt?: number | string | null; lastErrorCode?: string | null }>;
        return json(res, { configuredSources: configured, sources: minuteSourceIds.map((sourceId) => sourceState(sourceId, state)), checkedAt: new Date().toISOString() });
      } catch {
        return json(res, { configuredSources: configured, sources: minuteSourceIds.map((sourceId) => ({ sourceId, kind: "MINUTE_BAR", enabled: configured.includes(sourceId), circuit: configured.includes(sourceId) ? "UNKNOWN" : "DISABLED", failures: configured.includes(sourceId) ? null : 0, lastSuccessAt: null, lastFailureAt: null, lastErrorCode: null })), checkedAt: new Date().toISOString(), code: "SOURCE_HEALTH_UNAVAILABLE" }, 503);
      }
    }
    if (req.url === "/v2/collection-scheduler/enable" && req.method === "POST") { if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401); collectionScheduler.enable(); return json(res, { status: collectionScheduler.status() }); }
    if (req.url === "/v2/collection-scheduler/disable" && req.method === "POST") { if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401); collectionScheduler.disable(); return json(res, { status: collectionScheduler.status() }); }
    if (req.url?.startsWith("/v2/collection-scheduler/plan") && req.method === "GET") {
      const query = new URL(req.url, "http://localhost").searchParams;
      const subscriptionId = query.get("subscriptionId"); const from = query.get("from"); const to = query.get("to");
      if (!subscriptionId || !from || !to) return json(res, { code: "INVALID_SCHEDULE_QUERY", required: ["subscriptionId", "from", "to"] }, 422);
      return json(res, collectionScheduler.plan(subscriptionId, from, to));
    }
    if (req.url === "/v2/collection-schedules" && req.method === "GET") {
      if (!collectionSchedules) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      return json(res, { schedules: await collectionSchedules.enabled() });
    }
    if (req.url === "/v2/collection-schedules" && req.method === "POST") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!collectionSchedules) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      const required = ["subscriptionId", "subscriptionVersion", "fromDate", "toDate", "calendarVersion"];
      if (required.some((key) => body[key] === undefined) || typeof body.subscriptionId !== "string" || !body.subscriptionId.trim() || !Number.isInteger(body.subscriptionVersion) || Number(body.subscriptionVersion) <= 0 || !validLocalDate(body.fromDate) || !validLocalDate(body.toDate) || String(body.toDate) < String(body.fromDate) || typeof body.calendarVersion !== "string" || !body.calendarVersion.trim()) return json(res, { code: "INVALID_COLLECTION_SCHEDULE" }, 422);
      const schedule = await collectionSchedules.upsert({ subscriptionId: String(body.subscriptionId), subscriptionVersion: Number(body.subscriptionVersion), fromDate: String(body.fromDate), toDate: String(body.toDate), calendarVersion: String(body.calendarVersion) });
      return json(res, schedule, 201);
    }
    if (req.url === "/v2/collection-schedules/switch" && req.method === "POST") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!collectionSchedules) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      if (typeof body.sourceSubscriptionId !== "string" || typeof body.targetSubscriptionId !== "string" || !body.sourceSubscriptionId.trim() || !body.targetSubscriptionId.trim() || body.sourceSubscriptionId === body.targetSubscriptionId || body.sourceSubscriptionId.length > 128 || body.targetSubscriptionId.length > 128) return json(res, { code: "INVALID_SCHEDULE_SWITCH" }, 422);
      try { return json(res, await collectionSchedules.switchEnabled(body.sourceSubscriptionId, body.targetSubscriptionId)); }
      catch (error) { if (error instanceof CollectionScheduleConflict) return json(res, { code: "SCHEDULE_SWITCH_CONFLICT", message: error.message }, 409); throw error; }
    }
    const scheduleMatch = req.url?.match(/^\/v2\/collection-schedules\/([^/]+)(?:\/(enable|disable))?$/);
    if (scheduleMatch && req.method === "GET" && !scheduleMatch[2]) {
      if (!collectionSchedules) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const schedule = await collectionSchedules.find(scheduleMatch[1]);
      return schedule ? json(res, schedule) : json(res, { code: "NOT_FOUND" }, 404);
    }
    if (scheduleMatch && req.method === "POST" && scheduleMatch[2]) {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!collectionSchedules) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const schedule = await collectionSchedules.setEnabled(scheduleMatch[1], scheduleMatch[2] === "enable");
      return json(res, schedule);
    }
    if (req.url === "/v2/collection-runs" && req.method === "POST") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!collectionRuns) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      const required = ["subscriptionId", "subscriptionVersion", "windowStart", "windowEnd", "jobKind", "idempotencyKey", "requestHash"];
      if (required.some((key) => body[key] === undefined)) return json(res, { code: "INVALID_COLLECTION_RUN" }, 422);
      if (!Number.isInteger(body.subscriptionVersion) || Number(body.subscriptionVersion) <= 0 || !validIso(body.windowStart) || !validIso(body.windowEnd) || new Date(String(body.windowEnd)) <= new Date(String(body.windowStart)) || !["INTRADAY_WINDOW", "CLOSE_RECONCILIATION", "BACKFILL", "GAP_REPAIR"].includes(String(body.jobKind)) || !validHash(body.requestHash)) return json(res, { code: "INVALID_COLLECTION_RUN", reason: "invalid version, window, jobKind, or requestHash" }, 422);
      if (typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 1) return json(res, { code: "INVALID_COLLECTION_RUN", reason: "idempotencyKey is required" }, 422);
      if (collectionSchedules) {
        const schedule = await collectionSchedules.find(String(body.subscriptionId));
        if (!schedule) return json(res, { code: "SUBSCRIPTION_NOT_FOUND" }, 404);
        const startDate = shanghaiDate(String(body.windowStart));
        const endDate = shanghaiDate(String(body.windowEnd));
        if (startDate < schedule.fromDate || endDate > schedule.toDate || Number(body.subscriptionVersion) !== schedule.subscriptionVersion) return json(res, { code: "WINDOW_OUTSIDE_SUBSCRIPTION" }, 422);
      }
      const result = await collectionRuns.create({ subscriptionId: String(body.subscriptionId), subscriptionVersion: Number(body.subscriptionVersion), windowStart: String(body.windowStart), windowEnd: String(body.windowEnd), jobKind: body.jobKind as "INTRADAY_WINDOW" | "CLOSE_RECONCILIATION" | "BACKFILL" | "GAP_REPAIR", idempotencyKey: String(body.idempotencyKey), requestHash: String(body.requestHash) });
      return json(res, { ...result, run: result.run }, result.created ? 201 : 200);
    }
    const collectionRunMatch = req.url?.match(/^\/v2\/collection-runs\/([^/]+)(?:\/(resume))?$/);
    if (collectionRunMatch && req.method === "GET" && !collectionRunMatch[2]) {
      if (!collectionRuns) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const run = await collectionRuns.find(collectionRunMatch[1]);
      return run ? json(res, run) : json(res, { code: "NOT_FOUND" }, 404);
    }
    if (collectionRunMatch && req.method === "POST" && collectionRunMatch[2] === "resume") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!collectionRuns) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      if (!isUuid(collectionRunMatch[1])) return json(res, { code: "INVALID_RUN_ID" }, 422);
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      if (!Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) <= 0) return json(res, { code: "INVALID_RESUME", reason: "expectedVersion must be a positive integer" }, 422);
      try {
        if (!(await collectionRuns.find(collectionRunMatch[1]))) return json(res, { code: "NOT_FOUND" }, 404);
        return json(res, await collectionRuns.resume(collectionRunMatch[1], Number(body.expectedVersion)));
      } catch (error) {
        if (error instanceof Error && error.name === "CollectionRunConflict") return json(res, { code: "VERSION_CONFLICT", message: error.message }, 409);
        throw error;
      }
    }
    if (req.url === "/v2/sources" && req.method === "GET") return json(res, { sources: [
      { sourceId: "tencent-quote", kind: "QUOTE", url: "https://qt.gtimg.cn", status: "CONFIGURED", license: "public web endpoint; verify terms before production" },
      { sourceId: "sina-quote", kind: "QUOTE", url: "https://hq.sinajs.cn", status: "CONFIGURED", license: "public web endpoint; verify terms before production" },
      { sourceId: "eastmoney-rss", kind: "NEWS", url: "https://finance.eastmoney.com", status: "CONFIGURED", license: "public news pages; verify terms before production" },
      { sourceId: "cls-rss", kind: "NEWS", url: "https://www.cls.cn", status: "CONFIGURED", license: "public news pages; verify terms before production" }
    ].map((source) => ({ ...source, circuit: sourceState.get(source.sourceId)?.status ?? "HEALTHY" })), checkedAt: new Date().toISOString(), note: "Endpoint capability is verified by configured URL; production licensing and rate limits remain deployment checks." });
    if (req.url === "/v2/sampling" && req.method === "GET") return json(res, { intervalMinutes: samplingMinutes, allowed: [20, 30], tradingWindows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], lunchBreak: ["11:30", "13:00"], placeOrders: false });
    const calendarMatch = req.url?.match(/^\/v2\/calendar\/cn-a-share\/(\d{4}-\d{2}-\d{2})$/);
    if (calendarMatch && req.method === "GET") return isCalendarDate(calendarMatch[1]) ? json(res, cnAShareSession(calendarMatch[1])) : json(res, { code: "INVALID_DATE" }, 400);
    if (req.url === "/v2/sampling" && req.method === "PUT") { const body = JSON.parse(await readBody(req)); const value = Number(body.intervalMinutes); if (![20, 30].includes(value)) return json(res, { code: "INVALID_SAMPLING_INTERVAL", allowed: [20, 30] }, 422); samplingMinutes = value; return json(res, { intervalMinutes: samplingMinutes, placeOrders: false }); }
    const breakerMatch = req.url?.match(/^\/v2\/sources\/([^/]+)\/(fail|recover)$/);
    if (breakerMatch && req.method === "POST") { const state = sourceState.get(breakerMatch[1]); if (!state) return json(res, { code: "SOURCE_NOT_FOUND" }, 404); if (breakerMatch[2] === "fail") { state.failures += 1; state.status = "OPEN"; } else { state.failures = 0; state.status = "HEALTHY"; } return json(res, { sourceId: breakerMatch[1], circuit: state.status, failures: state.failures }); }
    if (req.url === "/v2/sources/smoke" && req.method === "GET") {
      const checks = await Promise.all([
        sourceCheck("tencent-quote", "https://qt.gtimg.cn/q=sh600000"),
        sourceCheck("sina-quote", "https://hq.sinajs.cn/list=sh600000"),
        sourceCheck("eastmoney-news", "https://finance.eastmoney.com/"),
        sourceCheck("cls-news", "https://www.cls.cn/")
      ]);
      return json(res, { checkedAt: new Date().toISOString(), checks, status: checks.every((item) => item.status === "PASS") ? "PASS" : "PARTIAL" });
    }
    if (req.url === "/v2/watchlist" && req.method === "GET") return json(res, { securities: watchlist, count: watchlist.length, max: 100, priority: "holdings_then_in_flight_then_candidates" });
    if (req.url === "/v2/watchlist" && req.method === "PUT") {
      const body = JSON.parse(await readBody(req)); const securities = Array.isArray(body.securities) ? body.securities.map(String) : [];
      if (securities.length > 100) return json(res, { code: "WATCHLIST_LIMIT", message: "watchlist cannot exceed 100 securities", max: 100 }, 422);
      watchlist = [...new Set(securities)] as string[]; return json(res, { securities: watchlist, count: watchlist.length, max: 100 });
    }
    if (req.url === "/v2/quote/preview" && req.method === "GET") {
      const symbols = watchlist.slice(0, 100); const codes = symbols.map((symbol) => `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`).join(",");
      try { const response = await fetch(`https://qt.gtimg.cn/q=${codes}`, { signal: AbortSignal.timeout(5000) }); const text = decodeTencentQuote(await response.arrayBuffer()); const ingestedAt = new Date().toISOString(); const securities = previewTencentQuotes(symbols, text, ingestedAt); return json(res, { sourceId: "tencent-quote", requestedSymbols: symbols, securities, count: securities.length, ingestedAt }); } catch (error) { return json(res, { sourceId: "tencent-quote", requestedSymbols: symbols, status: "STALE", securities: symbols.map((symbol) => ({ symbol, status: "SOURCE_ERROR", observedAt: null })), count: 0, ingestedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown" }); }
    }
    if (req.url === "/v2/news/preview" && req.method === "GET") return json(res, { items: [{ newsId: "v2-news-001", sourceId: "eastmoney-rss", title: "示例公告（验收样本）", publishedAt: "2026-09-09T00:00:00Z", revision: 1, symbols: ["600000.SH"] }], deduplicated: true, sourceStatus: "CONFIGURED" });
    if (req.url === "/v2/news/live" && req.method === "GET") {
      const observedAt = new Date().toISOString();
      const results = await Promise.all([
        liveNews("eastmoney-news", "https://finance.eastmoney.com/", observedAt),
        liveNews("cls-news", "https://www.cls.cn/", observedAt)
      ]);
      const items = results.filter((item): item is NonNullable<typeof item> => item !== null);
      const deduplicated = [...new Map(items.map((item) => [`${item.title}|${item.sourceId}`, item])).values()];
      return json(res, { observedAt, items: deduplicated, sourceCount: 2, deduplicated: deduplicated.length === items.length, status: deduplicated.length === 2 ? "PASS" : "PARTIAL" });
    }
    if (req.url === "/v2/minute/preview" && req.method === "GET") { const bars = await parseMinute(minuteFixture); return json(res, { fixtureVersion: "v2.2-minute-bars-1", rows: bars.length, securities: new Set(bars.map((bar) => bar.securityId)).size, quality: minuteQuality(bars), bars }); }
    if (req.url === "/v2/minute/quality" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { bars?: QualityBar[]; requireAmount?: boolean };
      if (!Array.isArray(body.bars)) return json(res, { code: "INVALID_QUALITY_INPUT" }, 422);
      const issues = validateBars(body.bars, body.requireAmount ?? true);
      return json(res, { status: issues.length ? "REJECTED" : "READY", rows: body.bars.length, issues }, issues.length ? 422 : 200);
    }
    if (req.url === "/v2/minute/coverage" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { securityIds?: string[]; fromDate?: string; toDate?: string; bars?: QualityBar[] };
      if (!Array.isArray(body.securityIds) || !body.fromDate || !body.toDate || !Array.isArray(body.bars)) return json(res, { code: "INVALID_COVERAGE_INPUT" }, 422);
      const report = buildCoverage(body.securityIds, body.fromDate, body.toDate, body.bars, { session: (date) => { const session = cnAShareSession(date); return { status: session.status as "TRADING" | "CLOSED" | "UNKNOWN", sessions: session.sessions }; } });
      return json(res, report, report.status === "PASS" ? 200 : 422);
    }
    if (req.url === "/v2/minute/gaps" && req.method === "POST") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!coverageRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const validation = validateGapRequest(JSON.parse(await readBody(req)));
      if (!validation.ok) return json(res, { code: validation.code }, 422);
      const { subscriptionId, fromDate, toDate, securityIds, gaps } = validation.value;
      const result = await coverageRepository.reconcileGaps(subscriptionId, fromDate, toDate, securityIds, gaps);
      return json(res, { subscriptionId, ...result, open: await coverageRepository.open(subscriptionId) });
    }
    const gapsMatch = req.url?.match(/^\/v2\/minute\/gaps\/([^/]+)$/);
    if (gapsMatch && req.method === "GET") {
      if (!coverageRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      return json(res, { subscriptionId: gapsMatch[1], open: await coverageRepository.open(gapsMatch[1]) });
    }
    if (req.url === "/v2/minute/backfills" && req.method === "POST") {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!coverageRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { subscriptionId?: string; fromDate?: string; toDate?: string; idempotencyKey?: string };
      if (!body.subscriptionId || !body.fromDate || !body.toDate || !body.idempotencyKey || !validLocalDate(body.fromDate) || !validLocalDate(body.toDate) || body.toDate < body.fromDate) return json(res, { code: "INVALID_BACKFILL_INPUT" }, 422);
      try {
        const result = await coverageRepository.createBackfill(body.subscriptionId, body.fromDate, body.toDate, body.idempotencyKey);
        if (!collectionRuns || !collectionSchedules) return json(res, result, result.created ? 201 : 200);
        if (result.task.status !== "QUEUED") return json(res, result, result.created ? 201 : 200);
        const schedule = await collectionSchedules.find(body.subscriptionId);
        if (!schedule) return json(res, { ...result, expandedRunCount: 0, expansionStatus: "WAITING_DEPENDENCY" }, 201);
        collectionScheduler.enable();
        const plan = collectionScheduler.plan(body.subscriptionId, body.fromDate, body.toDate, new Set(), null, 100_000);
        if (plan.truncated) return json(res, { ...result, expandedRunCount: 0, waitingDates: plan.waitingDates, expansionStatus: "TOO_LARGE", reason: "backfill exceeds the safe expansion limit of 100000 windows" }, 422);
        if (plan.waitingDates.length) return json(res, { ...result, expandedRunCount: 0, waitingDates: plan.waitingDates, expansionStatus: "WAITING_DEPENDENCY" }, 202);
        let expandedRunCount = 0;
        for (const window of plan.windows) {
          const idempotencyKey = `${result.task.taskId}|${window.windowStart}|${window.windowEnd}|BACKFILL`;
          const createdRun = await collectionRuns.create({ subscriptionId: body.subscriptionId, subscriptionVersion: schedule.subscriptionVersion, windowStart: window.windowStart, windowEnd: window.windowEnd, jobKind: "BACKFILL", idempotencyKey, requestHash: createHash("sha256").update(idempotencyKey).digest("hex") });
          if (createdRun.created) expandedRunCount += 1;
        }
        await coverageRepository.claimBackfill(result.task.taskId);
        return json(res, { ...result, task: { ...result.task, status: "RUNNING" }, expandedRunCount, waitingDates: plan.waitingDates, expansionStatus: "READY" }, result.created ? 201 : 200);
      } catch (error) {
        if (error instanceof BackfillConflict) return json(res, { code: "IDEMPOTENCY_CONFLICT", message: error.message }, 409);
        throw error;
      }
    }
    const backfillMatch = req.url?.match(/^\/v2\/minute\/backfills\/([^/]+)(?:\/(claim|complete|fail))?$/);
    if (backfillMatch && req.method === "GET" && !backfillMatch[2]) {
      if (!coverageRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const task = await coverageRepository.findBackfill(backfillMatch[1]);
      return task ? json(res, task) : json(res, { code: "NOT_FOUND" }, 404);
    }
    if (backfillMatch && req.method === "POST" && backfillMatch[2]) {
      if (!authorizedCollectionControl(req)) return json(res, { code: "UNAUTHENTICATED" }, 401);
      if (!coverageRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const action = backfillMatch[2];
      const task = action === "claim" ? await coverageRepository.claimBackfill(backfillMatch[1]) : action === "complete" ? await coverageRepository.completeBackfill(backfillMatch[1]) : await coverageRepository.failBackfill(backfillMatch[1]);
      return task ? json(res, task) : json(res, { code: "INVALID_BACKFILL_STATE" }, 409);
    }
    if (req.url === "/v2/projects/access" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { projectId?: string; resourceProjectId?: string; scope?: ProjectScope };
      const actor = await projectActorForRequest(req);
      if (!actor || !body.resourceProjectId || !body.scope) return json(res, { code: "UNAUTHENTICATED" }, 401);
      assertProjectAccess(actor, body.resourceProjectId, body.scope);
      return json(res, { projectId: actor.projectId, resourceProjectId: body.resourceProjectId, scope: body.scope, allowed: true });
    }
    if (req.url === "/v2/data/page" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { projectId?: string; dataVersion?: string; items?: unknown[]; cursor?: number; pageSize?: number };
      const actor = await projectActorForRequest(req);
      if (!actor || !body.projectId || !body.dataVersion || !Array.isArray(body.items)) return json(res, { code: "UNAUTHENTICATED_OR_INVALID_INPUT" }, 401);
      assertProjectAccess(actor, body.projectId, "DATA_READ");
      if (projectAccessRepository) await projectAccessRepository.recordQueueMetric(actor.projectId, "admitted");
      return json(res, paginateVersioned(body.items, body.dataVersion, body.dataVersion, Number(body.cursor ?? 0), Number(body.pageSize ?? 100)));
    }
    if (req.url === "/v2/data/artifact-rows" && req.method === "POST") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { projectId?: string; artifactId?: string; dataVersion?: string; items?: unknown[] };
      const actor = await projectActorForRequest(req);
      if (!actor || !body.projectId || !body.artifactId || !body.dataVersion || !Array.isArray(body.items)) return json(res, { code: "UNAUTHENTICATED_OR_INVALID_INPUT" }, 401);
      assertProjectAccess(actor, body.projectId, "DATA_WRITE");
      return json(res, { projectId: body.projectId, artifactId: body.artifactId, dataVersion: body.dataVersion, rowCount: await artifactDeliveryRepository.publishRows(body.projectId, body.artifactId, body.dataVersion, body.items) }, 201);
    }
    if (req.url === "/v2/data/artifact-page" && req.method === "POST") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { projectId?: string; artifactId?: string; dataVersion?: string; cursor?: string | number; pageSize?: number };
      const actor = await projectActorForRequest(req);
      if (!actor || !body.projectId || !body.artifactId || !body.dataVersion) return json(res, { code: "UNAUTHENTICATED_OR_INVALID_INPUT" }, 401);
      assertProjectAccess(actor, body.projectId, "DATA_READ");
      return json(res, await artifactDeliveryRepository.page(body.projectId, body.artifactId, body.dataVersion, Math.max(0, Number(body.cursor ?? 0)), Number(body.pageSize ?? 100)));
    }
    if (req.url === "/v2/data/export" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { projectId?: string; dataVersion?: string; items?: unknown[] };
      const actor = await projectActorForRequest(req);
      if (!actor || !body.projectId || !body.dataVersion || !Array.isArray(body.items)) return json(res, { code: "UNAUTHENTICATED_OR_INVALID_INPUT" }, 401);
      assertProjectAccess(actor, body.projectId, "DATA_EXPORT");
      return json(res, exportWithManifest(body.projectId, body.dataVersion, body.items));
    }
    if (req.url === "/v2/projects/queue-metrics" && req.method === "GET") {
      const actor = await projectActorForRequest(req);
      if (!actor) return json(res, { code: "UNAUTHENTICATED" }, 401);
      return json(res, projectAccessRepository ? await projectAccessRepository.queueMetrics(actor.projectId) : { projectId: actor.projectId, queued: 0, admitted: 0, rejected: 0 });
    }
    if (req.url === "/v2/data/dedupe-key" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { source?: string; market?: string; securityId?: string; frequency?: string; adjustment?: string; windowStart?: string; windowEnd?: string; adapterVersion?: string };
      const fields = [body.source, body.market, body.securityId, body.frequency, body.adjustment, body.windowStart, body.windowEnd, body.adapterVersion];
      if (fields.some((value) => !value)) return json(res, { code: "INVALID_DEDUPE_INPUT" }, 422);
      return json(res, { key: physicalDedupeKey(body as { source: string; market: string; securityId: string; frequency: string; adjustment: string; windowStart: string; windowEnd: string; adapterVersion: string }) });
    }
    if ((req.url === "/v2/minute/csv/preview" || req.url === "/v2/minute/csv/import") && req.method === "POST") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { content?: string; mapping?: MinuteCsvMapping; provenance?: { sourceName?: string; sourceReference?: string | null; licenseStatement?: string; licenseVerification?: string; acquiredAt?: string }; market?: string; frequency?: string; adjustment?: string; timezone?: string; timestampSemantics?: string; volumeUnit?: string; amountUnit?: string };
      if (typeof body.content !== "string" || Buffer.byteLength(body.content, "utf8") > 700_000 || !body.mapping || !body.provenance) return json(res, { code: "INVALID_CSV_UPLOAD" }, 422);
      const { sourceName, sourceReference, licenseStatement, licenseVerification, acquiredAt } = body.provenance;
      if (typeof sourceName !== "string" || !sourceName.trim() || sourceName.length > 160 || !(sourceReference === null || typeof sourceReference === "string" && sourceReference.length <= 500) || typeof licenseStatement !== "string" || !licenseStatement.trim() || licenseStatement.length > 500 || !["OPERATOR_CONFIRMED", "UNCONFIRMED"].includes(licenseVerification ?? "") || typeof acquiredAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(acquiredAt) || !Number.isFinite(Date.parse(acquiredAt))) return json(res, { code: "INVALID_CSV_PROVENANCE" }, 422);
      if (body.market !== "CN_A" || !["1m", "5m"].includes(body.frequency ?? "") || body.adjustment !== "RAW" || body.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(body.timestampSemantics ?? "") || body.volumeUnit !== "SHARES" || body.amountUnit !== "CNY") return json(res, { code: "UNSUPPORTED_CSV_SEMANTICS" }, 422);
      let preview;
      try { preview = await previewMinuteCsv({ content: body.content, mapping: body.mapping, market: "CN_A", frequency: body.frequency as "1m" | "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: body.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES", amountUnit: "CNY" }); }
      catch (error) { return json(res, { code: "CSV_PARSE_REJECTED", message: error instanceof Error ? error.message : "CSV is invalid" }, 422); }
      if (req.url === "/v2/minute/csv/preview") return json(res, { ...preview, semantics: { market: body.market, frequency: body.frequency, adjustment: body.adjustment, timezone: body.timezone, timestampSemantics: body.timestampSemantics, volumeUnit: body.volumeUnit, amountUnit: body.amountUnit }, provenance: body.provenance });
      const semantics = { market: "CN_A" as const, frequency: body.frequency as "1m" | "5m", adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: body.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES" as const, amountUnit: "CNY" as const };
      const provenance = { sourceName: sourceName.trim(), sourceReference: sourceReference === null ? null : sourceReference.trim() || null, licenseStatement: licenseStatement.trim(), licenseVerification: licenseVerification as "OPERATOR_CONFIRMED" | "UNCONFIRMED", acquiredAt: new Date(acquiredAt).toISOString() };
      const { sourceSha256, importKeySha256 } = minuteCsvImportIdentity(body.content, body.mapping, semantics, provenance);
      const rejected = preview.errors.length > 0 || preview.acceptedRows === 0;
      const imported = await minuteImportRepository.publish({ sourceSha256, importKeySha256, manifest: { mapping: Object.fromEntries(Object.entries(body.mapping).sort(([a], [b]) => a.localeCompare(b))), semantics, provenance, researchUseAllowed: provenance.licenseVerification === "OPERATOR_CONFIRMED" }, status: rejected ? "REJECTED" : "PUBLISHED", accepted: rejected ? 0 : preview.acceptedRows, errors: preview.errors, bars: rejected ? [] : preview.bars });
      return json(res, { ...imported.record, idempotent: imported.idempotent }, imported.idempotent ? 200 : rejected ? 422 : 201);
    }
    const minuteUploadCreateMatch = req.url?.match(/^\/v2\/minute\/(csv|parquet)\/uploads$/iu);
    if (minuteUploadCreateMatch && req.method === "POST") {
      if (!minuteUploadRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { uploadId?: string; expectedSha256?: string; expectedBytes?: number; metadata?: MinuteUploadMetadata };
      const ownerId = req.headers["x-stockquant-owner-id"];
      const metadata = body.metadata ? { ...body.metadata, fileFormat: body.metadata.fileFormat ?? "CSV" } : undefined;
      if (typeof ownerId !== "string" || typeof body.uploadId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId) || !metadata || typeof body.expectedBytes !== "number" || typeof body.expectedSha256 !== "string") return json(res, { code: "INVALID_UPLOAD_REQUEST" }, 422);
      if (metadata.fileFormat !== "CSV" && metadata.fileFormat !== "PARQUET") return json(res, { code: "UNSUPPORTED_FILE_FORMAT" }, 422);
      if (metadata.fileFormat !== minuteUploadCreateMatch[1].toUpperCase()) return json(res, { code: "UPLOAD_ROUTE_FORMAT_MISMATCH" }, 422);
      if (metadata.market !== "CN_A" || !["1m", "5m"].includes(metadata.frequency ?? "") || metadata.adjustment !== "RAW" || metadata.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(metadata.timestampSemantics ?? "") || metadata.volumeUnit !== "SHARES" || metadata.amountUnit !== "CNY") return json(res, { code: "UNSUPPORTED_MINUTE_FILE_SEMANTICS" }, 422);
      const provenance = metadata.provenance;
      if (!provenance || typeof provenance.sourceName !== "string" || !provenance.sourceName.trim() || provenance.sourceName.length > 160 || !(provenance.sourceReference === null || typeof provenance.sourceReference === "string" && provenance.sourceReference.length <= 500) || typeof provenance.licenseStatement !== "string" || !provenance.licenseStatement.trim() || provenance.licenseStatement.length > 500 || !["OPERATOR_CONFIRMED", "UNCONFIRMED"].includes(provenance.licenseVerification) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(provenance.acquiredAt) || !Number.isFinite(Date.parse(provenance.acquiredAt))) return json(res, { code: "INVALID_CSV_PROVENANCE" }, 422);
      const result = await minuteUploadRepository.create({ uploadId: body.uploadId, ownerId, expectedSha256: body.expectedSha256, expectedBytes: body.expectedBytes, metadata });
      return json(res, { ...result.progress, idempotent: result.idempotent }, result.idempotent ? 200 : 201);
    }
    const minuteUploadChunkMatch = req.url?.match(/^\/v2\/minute\/(csv|parquet)\/uploads\/([0-9a-f-]+)\/chunks\/(\d+)$/iu);
    if (minuteUploadChunkMatch && req.method === "PUT") {
      if (!minuteUploadRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const ownerId = req.headers["x-stockquant-owner-id"];
      if (typeof ownerId !== "string") return json(res, { code: "INVALID_UPLOAD_OWNER" }, 422);
      const body = JSON.parse(await readBody(req)) as { contentBase64?: string; sha256?: string };
      if (typeof body.contentBase64 !== "string" || typeof body.sha256 !== "string") return json(res, { code: "INVALID_UPLOAD_CHUNK" }, 422);
      const content = Buffer.from(body.contentBase64, "base64");
      if (!content.length || content.toString("base64") !== body.contentBase64) return json(res, { code: "INVALID_UPLOAD_CHUNK" }, 422);
      const result = await minuteUploadRepository.putChunk({ ownerId, uploadId: minuteUploadChunkMatch[2], index: Number(minuteUploadChunkMatch[3]), content, sha256: body.sha256 });
      return json(res, { ...result.progress, idempotent: result.idempotent });
    }
    const minuteUploadMatch = req.url?.match(/^\/v2\/minute\/(csv|parquet)\/uploads\/([0-9a-f-]+)(?:\/(preview|finalize|cancel))?$/iu);
    if (minuteUploadMatch) {
      if (!minuteUploadRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(minuteUploadMatch[2])) return json(res, { code: "INVALID_UPLOAD_ID" }, 422);
      const ownerId = req.headers["x-stockquant-owner-id"];
      if (typeof ownerId !== "string") return json(res, { code: "INVALID_UPLOAD_OWNER" }, 422);
      const uploadId = minuteUploadMatch[2]; const action = minuteUploadMatch[3];
      if (!action && req.method === "GET") return json(res, await minuteUploadRepository.progress(ownerId, uploadId));
      if (action === "cancel" && req.method === "POST") return json(res, await minuteUploadRepository.cancel(ownerId, uploadId));
      if (action === "preview" && req.method === "POST") {
        const upload = await minuteUploadRepository.beginFinalization(ownerId, uploadId);
        if (upload.alreadyCompleted) return json(res, upload.alreadyCompleted);
        try {
          const parseInput = { mapping: upload.metadata.mapping, market: "CN_A" as const, frequency: upload.metadata.frequency as "1m" | "5m", adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: upload.metadata.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES" as const, amountUnit: "CNY" as const };
          const chunks = minuteUploadRepository.readFinalizationChunks(ownerId, uploadId, upload.expectedChunks);
          const previewOptions = { maxRetainedBars: MAX_MINUTE_CSV_PREVIEW_BARS };
          const parsed = upload.metadata.fileFormat === "PARQUET"
            ? await previewMinuteParquetStream(parseInput, chunks, upload.metadata.mapping, previewOptions)
            : await previewMinuteCsvStream(parseInput, chunks, previewOptions);
          if (parsed.sourceSha256 !== upload.expectedSha256) return json(res, { code: "UPLOAD_HASH_MISMATCH" }, 409);
          return json(res, { ...parsed.preview, semantics: { market: upload.metadata.market, frequency: upload.metadata.frequency, adjustment: upload.metadata.adjustment, timezone: upload.metadata.timezone, timestampSemantics: upload.metadata.timestampSemantics, volumeUnit: upload.metadata.volumeUnit, amountUnit: upload.metadata.amountUnit }, provenance: upload.metadata.provenance });
        }
          catch (error) { return json(res, { code: upload.metadata.fileFormat === "PARQUET" ? "PARQUET_PARSE_REJECTED" : "CSV_PARSE_REJECTED", message: error instanceof Error ? error.message : "Minute file is invalid" }, 422); }
        finally { await minuteUploadRepository.releaseFinalization(ownerId, uploadId); }
      }
      if (action === "finalize" && req.method === "POST") {
        const upload = await minuteUploadRepository.beginFinalization(ownerId, uploadId);
        if (upload.alreadyCompleted) return json(res, { ...upload.alreadyCompleted, idempotent: true, uploadId }, 200);
        const provenance = upload.metadata.provenance;
        const manifest = { mapping: Object.fromEntries(Object.entries(upload.metadata.mapping).sort(([a], [b]) => a.localeCompare(b))), semantics: { fileFormat: upload.metadata.fileFormat ?? "CSV", market: upload.metadata.market, frequency: upload.metadata.frequency, adjustment: upload.metadata.adjustment, timezone: upload.metadata.timezone, timestampSemantics: upload.metadata.timestampSemantics, volumeUnit: upload.metadata.volumeUnit, amountUnit: upload.metadata.amountUnit }, provenance, researchUseAllowed: provenance.licenseVerification === "OPERATOR_CONFIRMED" };
        try {
          const imported = await minuteImportRepository!.publishStream({
            expectedSha256: upload.expectedSha256,
            manifest,
            importKeyForSha: (sha256) => minuteCsvImportIdentityFromSha(sha256, upload.metadata.mapping, upload.metadata, provenance).importKeySha256,
            parse: async (writeBarsBatch) => {
              let persistenceFailed = false;
              try {
                const parseInput = { mapping: upload.metadata.mapping, market: "CN_A" as const, frequency: upload.metadata.frequency as "1m" | "5m", adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: upload.metadata.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES" as const, amountUnit: "CNY" as const };
                const chunks = minuteUploadRepository.readFinalizationChunks(ownerId, uploadId, upload.expectedChunks);
                const options = { retainBars: false, batchSize: 1_000, onBarsBatch: async (bars: MinuteImportBar[]) => { try { await writeBarsBatch(bars); } catch (error) { persistenceFailed = true; throw error; } } };
                const parsed = upload.metadata.fileFormat === "PARQUET"
                  ? await previewMinuteParquetStream(parseInput, chunks, upload.metadata.mapping, options)
                  : await previewMinuteCsvStream(parseInput, chunks, options);
                return { sourceSha256: parsed.sourceSha256, accepted: parsed.preview.acceptedRows, errors: parsed.preview.errors };
              } catch (error) {
                if (persistenceFailed) throw error;
                throw new MinuteCsvFinalizeParseError(error instanceof Error ? error.message : "CSV is invalid");
              }
            },
          });
          const rejected = imported.record.status === "REJECTED";
          const result = { ...imported.record, idempotent: imported.idempotent };
          const progress = await minuteUploadRepository.complete(ownerId, uploadId, result);
          return json(res, { ...result, uploadId, uploadStatus: progress.status }, imported.idempotent ? 200 : rejected ? 422 : 201);
        } catch (error) {
          await minuteUploadRepository.releaseFinalization(ownerId, uploadId);
          if (error instanceof Error && error.message === "assembled upload size or SHA-256 does not match declaration") return json(res, { code: "UPLOAD_HASH_MISMATCH" }, 409);
          if (error instanceof MinuteCsvFinalizeParseError) return json(res, { code: upload.metadata.fileFormat === "PARQUET" ? "PARQUET_PARSE_REJECTED" : "CSV_PARSE_REJECTED", message: error.message }, 422);
          throw error;
        }
      }
      return json(res, { code: "METHOD_NOT_ALLOWED" }, 405);
    }
    if (req.url === "/v2/minute/import" && req.method === "POST") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { fixture?: string };
      if (body.fixture !== undefined && !["normal", "bad"].includes(body.fixture)) return json(res, { code: "UNKNOWN_FIXTURE" }, 422);
      const file = body.fixture === "bad" ? minuteBadFixture : minuteFixture;
      const content = await readFile(file);
      const sha256 = createHash("sha256").update(content).digest("hex");
      const bars = await parseMinute(file);
      const errors = minuteQuality(bars);
      const rejected = errors.length > 0;
      const imported = await minuteImportRepository.publish({ sourceSha256: sha256, status: rejected ? "REJECTED" : "PUBLISHED", accepted: rejected ? 0 : bars.length, errors, bars: rejected ? [] : bars });
      return json(res, { ...imported.record, idempotent: imported.idempotent }, imported.idempotent ? 200 : rejected ? 422 : 201);
    }
    const minuteBarsMatch = req.url?.match(/^\/v2\/minute\/imports\/([^/?]+)\/bars(?:\?.*)?$/);
    if (minuteBarsMatch && req.method === "GET") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const version = decodeURIComponent(minuteBarsMatch[1]);
      if (!(await minuteImportRepository.find(version))) return json(res, { code: "NOT_FOUND" }, 404);
      const url = new URL(req.url!, "http://127.0.0.1");
      const cursor = Number(url.searchParams.get("cursor") ?? 0);
      const pageSize = Number(url.searchParams.get("pageSize") ?? 100);
      const securityId = url.searchParams.get("securityId") ?? undefined;
      const fromBarStart = url.searchParams.get("fromBarStart") ?? undefined;
      const toBarStart = url.searchParams.get("toBarStart") ?? undefined;
      try { return json(res, await minuteImportRepository.page(version, cursor, pageSize, securityId, fromBarStart, toBarStart)); }
      catch (error) { return json(res, { code: "INVALID_PAGE", message: error instanceof Error ? error.message : "invalid page" }, 422); }
    }
    const minuteGet = req.url?.match(/^\/v2\/minute\/imports\/([^/?]+)$/);
    if (minuteGet && req.method === "GET") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const result = await minuteImportRepository.find(decodeURIComponent(minuteGet[1]));
      return result ? json(res, result) : json(res, { code: "NOT_FOUND" }, 404);
    }
    if (req.url === "/v1/fixtures/normal/preview") { const bars = await parse(fixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", barCount: bars.length, securityCount: new Set(bars.map((b)=>b.securityId)).size, quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/bad-future/preview") { const bars = await parse(badFixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/artifacts/normal/publish" && req.method === "POST") { const content = await readFile(fixture); return json(res, { artifactId: "artifact-v1.2-cn-daily-1", status: "PUBLISHED", immutable: true, sha256: createHash("sha256").update(content).digest("hex"), fixtureVersion: "v1.2-market-data-1" }); }
    if (req.url === "/v1/artifacts/tasks" && req.method === "POST") { const taskId = `artifact-task-${Date.now()}`; artifactTasks.set(taskId, { status: "RUNNING" }); return json(res, { taskId, status: "RUNNING" }, 202); }
    const cancelMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") { const task = artifactTasks.get(cancelMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); task.status = "CANCELLED"; return json(res, { taskId: cancelMatch[1], status: task.status }); }
    const taskMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === "GET") { const task = artifactTasks.get(taskMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); return json(res, { taskId: taskMatch[1], ...task }); }
    return json(res, { code: "NOT_FOUND", message: "route not found" }, 404);
  } catch (error) { const bodyTooLarge = error instanceof HttpBodyTooLargeError; const access = error instanceof ProjectAccessDenied || error instanceof ProjectAuthenticationError; const quota = error instanceof ProjectQuotaRepositoryError || error instanceof MinuteUploadQuotaExceeded; const conflict = error instanceof CollectionRunConflict || error instanceof CollectionScheduleConflict || error instanceof DataVersionConflict || error instanceof MinuteUploadConflict; return json(res, { code: bodyTooLarge ? "REQUEST_BODY_TOO_LARGE" : access ? "PROJECT_ACCESS_DENIED" : quota ? "PROJECT_QUOTA_EXCEEDED" : conflict ? "UPLOAD_CONFLICT" : "INTERNAL", message: error instanceof Error ? error.message : "unknown" }, bodyTooLarge ? 413 : access ? 403 : quota ? 429 : conflict ? 409 : 500); }
  finally { if (releaseMinuteImport) { await waitForResponseDrain(res); await releaseMinuteImport(); } }
});
async function projectActorForRequest(req: IncomingMessage): Promise<ProjectActor | null> {
  const projectId = req.headers["x-stockquant-project-id"];
  if (typeof projectId !== "string" || !projectId) return null;
  const token = req.headers["x-stockquant-project-token"];
  // Project identity and scopes are authorization facts, not caller claims.
  // Without the persistent credential registry, fail closed instead of trusting
  // x-stockquant-scopes (or an unverified project id) supplied by the caller.
  if (!projectAccessRepository) return null;
  if (typeof token !== "string" || !token) throw new ProjectAuthenticationError("project token required");
  const project = await projectAccessRepository.authenticate(projectId, token);
  return { projectId: project.projectId, scopes: new Set(project.scopes) };
}
function readBody(req: IncomingMessage): Promise<string> { return readHttpBody(req); }
type MinuteBar = { securityId: string; market: string; frequency: string; barStart: string; barEnd: string; availableAt: string; open: number; high: number; low: number; close: number; volume: number; amount: number; adjustment: string };
async function parseMinute(path: string): Promise<MinuteBar[]> { const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/).slice(1); return lines.map((line) => { const [securityId, market, frequency, barStart, barEnd, availableAt, open, high, low, close, volume, amount, adjustment] = line.split(","); return { securityId, market, frequency, barStart, barEnd, availableAt, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume), amount: Number(amount), adjustment }; }); }
function minuteQuality(bars: MinuteBar[]) { const errors: Array<Record<string, unknown>> = []; const seen = new Set<string>(); for (const [index, bar] of bars.entries()) { const key = `${bar.securityId}|${bar.barStart}`; if (seen.has(key)) errors.push({ code: "DUPLICATE_CONFLICT", row: index + 2, key }); seen.add(key); if (!(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close)) errors.push({ code: "OHLC_INVALID", row: index + 2 }); const time = bar.barStart.slice(11, 16); if ((time >= "11:30" && time < "13:00") || time < "09:30" || time >= "15:00") errors.push({ code: "NON_TRADING_SESSION", row: index + 2, time }); if (bar.volume < 0 || bar.amount < 0) errors.push({ code: "UNIT_INVALID", row: index + 2 }); } return errors; }
async function sourceCheck(sourceId: string, url: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } }); const text = await response.text(); return { sourceId, status: response.ok && text.length > 0 ? "PASS" : "FAIL", httpStatus: response.status, bytes: text.length }; } catch (error) { return { sourceId, status: "FAIL", error: error instanceof Error ? error.message : "unknown" }; } }
async function liveNews(sourceId: string, url: string, observedAt: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } }); const html = await response.text(); const match = html.match(/<title[^>]*>\s*([^<]{3,200})\s*<\/title>/i); if (!response.ok || !match) return null; const title = match[1].replace(/\s+/g, " ").trim(); return { newsId: createHash("sha256").update(`${sourceId}:${title}`).digest("hex").slice(0, 24), sourceId, title, publishedAt: null, observedAt, ingestedAt: observedAt, availableAt: observedAt, revision: 1, symbols: [] as string[] }; } catch { return null; } }
async function start(): Promise<void> {
  if (collectionRuns) await collectionRuns.migrate();
  if (collectionSchedules) await collectionSchedules.migrate();
  if (coverageRepository) await coverageRepository.migrate();
  if (artifactDeliveryRepository) await artifactDeliveryRepository.migrate();
  if (minuteImportRepository) await minuteImportRepository.migrate();
  if (minuteUploadRepository) await minuteUploadRepository.migrate();
  if (alertOutboxRepository) await alertOutboxRepository.migrate();
  if (projectAccessRepository) {
    await projectAccessRepository.migrate();
    for (const project of parseProjectTokenConfig(process.env.STOCKQUANT_PROJECT_TOKENS)) await projectAccessRepository.register(project.projectId, project.token, project.scopes, project.maxConcurrentRuns, project.maxSecurities);
  }
  server.listen(Number(process.env.STOCKQUANT_PORT ?? 3002), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
  if (persistentSchedulerWorker) persistentSchedulerWorker.start(Number(process.env.STOCKQUANT_SCHEDULER_INTERVAL_MS ?? 60_000));
  if (collectionExecutor) collectionExecutor.start(Number(process.env.STOCKQUANT_COLLECTION_EXECUTOR_INTERVAL_MS ?? 60_000));
}
void start().catch((error: unknown) => { console.error("market-data-service startup failed", error); process.exitCode = 1; });
