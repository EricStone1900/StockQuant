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
import { decodeTencentQuote, previewTencentQuotes } from "./application/tencent-quote-preview.js";

type Bar = { securityId: string; ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number; adjustment: "raw" };
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");
const minuteFixture = resolve(root, "fixtures/v2/v2.2/minute_bars.csv");
const minuteBadFixture = resolve(root, "fixtures/v2/v2.2/minute_bars_bad.csv");
const minuteSourceIds = ["baostock", "sina", "eastmoney"] as const;
function configuredMinuteSources(): string[] {
  return (process.env.STOCKQUANT_COLLECTION_SOURCES ?? "sina,baostock").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
const artifactTasks = new Map<string, { status: "RUNNING" | "CANCELLED" | "PUBLISHED"; artifactId?: string }>();
const minuteImports = new Map<string, { importId: string; version: string; status: string; accepted: number; errors: unknown[]; sha256: string }>();
let watchlist: string[] = ["600000.SH", "000001.SZ", "600519.SH"];
let samplingMinutes = 30;
// Source: SSE 2026 holiday notice (上证公告〔2025〕45号).  This is a
// versioned, deliberately small calendar for the V2.4 observation period;
// callers receive UNKNOWN rather than silently treating dates outside its
// authority as trading days.
const cnAShareCalendar2026 = {
  version: "sse-cn-a-share-2026-1",
  source: "https://www.sse.com.cn/disclosure/announcement/general/c/c_20251222_10802507.shtml",
  closedRanges: [["2026-01-01", "2026-01-04"], ["2026-02-14", "2026-02-23"], ["2026-04-04", "2026-04-06"], ["2026-05-01", "2026-05-05"], ["2026-06-19", "2026-06-21"], ["2026-09-25", "2026-09-27"], ["2026-10-01", "2026-10-07"]]
} as const;
function cnAShareSession(date: string) {
  if (!/^2026-\d\d-\d\d$/.test(date)) return { date, status: "UNKNOWN", calendarVersion: cnAShareCalendar2026.version, reason: "calendar coverage is limited to 2026" };
  const day = new Date(`${date}T12:00:00+08:00`).getDay();
  const holiday = cnAShareCalendar2026.closedRanges.some(([start, end]) => date >= start && date <= end);
  return { date, status: day === 0 || day === 6 || holiday ? "CLOSED" : "TRADING", calendarVersion: cnAShareCalendar2026.version, source: cnAShareCalendar2026.source, sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }] };
}
const sourceState = new Map<string, { status: "HEALTHY" | "OPEN"; failures: number }>;
for (const id of ["tencent-quote", "sina-quote", "eastmoney-news", "cls-news"]) sourceState.set(id, { status: "HEALTHY", failures: 0 });
const databasePool = process.env.STOCKQUANT_DATABASE_URL ? new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL }) : null;
const collectionRuns = databasePool ? new CollectionRunRepository(databasePool) : null;
const collectionSchedules = databasePool ? new CollectionScheduleRepository(databasePool) : null;
const coverageRepository = databasePool ? new CoverageRepository(databasePool) : null;
const projectAccessRepository = databasePool ? new ProjectAccessRepository(databasePool) : null;
const artifactDeliveryRepository = databasePool ? new ArtifactDeliveryRepository(databasePool) : null;
const alertOutboxRepository = databasePool ? new AlertOutboxRepository(databasePool) : null;
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
async function json(res: ServerResponse, body: unknown, status = 200) { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); }
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
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
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
    if (calendarMatch && req.method === "GET") return json(res, cnAShareSession(calendarMatch[1]));
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
      try { const response = await fetch(`https://qt.gtimg.cn/q=${codes}`, { signal: AbortSignal.timeout(5000) }); const text = decodeTencentQuote(await response.arrayBuffer()); const ingestedAt = new Date().toISOString(); const securities = previewTencentQuotes(symbols, text, ingestedAt); return json(res, { sourceId: "tencent-quote", securities, count: securities.length, ingestedAt }); } catch (error) { return json(res, { sourceId: "tencent-quote", status: "STALE", securities: symbols, ingestedAt: new Date().toISOString(), error: error instanceof Error ? error.message : "unknown" }); }
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
    if (req.url === "/v2/minute/import" && req.method === "POST") { const body = JSON.parse(await readBody(req)); const file = body.fixture === "bad" ? minuteBadFixture : minuteFixture; const content = await readFile(file); const sha256 = createHash("sha256").update(content).digest("hex"); const existing = [...minuteImports.values()].find((item) => item.sha256 === sha256); if (existing) return json(res, { ...existing, idempotent: true }); const bars = await parseMinute(file); const errors = minuteQuality(bars); const accepted = errors.length ? 0 : bars.length; const result = { importId: `minute-import-${Date.now()}`, version: `v2.2-import-${sha256.slice(0, 12)}`, status: errors.length ? "REJECTED" : "PUBLISHED", accepted, errors, sha256 }; minuteImports.set(result.version, result); return json(res, { ...result, idempotent: false }, errors.length ? 422 : 201); }
    const minuteGet = req.url?.match(/^\/v2\/minute\/imports\/([^/]+)$/); if (minuteGet && req.method === "GET") { const result = minuteImports.get(minuteGet[1]); if (!result) return json(res, { code: "NOT_FOUND" }, 404); return json(res, result); }
    if (req.url === "/v1/fixtures/normal/preview") { const bars = await parse(fixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", barCount: bars.length, securityCount: new Set(bars.map((b)=>b.securityId)).size, quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/bad-future/preview") { const bars = await parse(badFixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/artifacts/normal/publish" && req.method === "POST") { const content = await readFile(fixture); return json(res, { artifactId: "artifact-v1.2-cn-daily-1", status: "PUBLISHED", immutable: true, sha256: createHash("sha256").update(content).digest("hex"), fixtureVersion: "v1.2-market-data-1" }); }
    if (req.url === "/v1/artifacts/tasks" && req.method === "POST") { const taskId = `artifact-task-${Date.now()}`; artifactTasks.set(taskId, { status: "RUNNING" }); return json(res, { taskId, status: "RUNNING" }, 202); }
    const cancelMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") { const task = artifactTasks.get(cancelMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); task.status = "CANCELLED"; return json(res, { taskId: cancelMatch[1], status: task.status }); }
    const taskMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === "GET") { const task = artifactTasks.get(taskMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); return json(res, { taskId: taskMatch[1], ...task }); }
    return json(res, { code: "NOT_FOUND", message: "route not found" }, 404);
  } catch (error) { const access = error instanceof ProjectAccessDenied || error instanceof ProjectAuthenticationError; const quota = error instanceof ProjectQuotaRepositoryError; const conflict = error instanceof CollectionRunConflict || error instanceof CollectionScheduleConflict || error instanceof DataVersionConflict; return json(res, { code: access ? "PROJECT_ACCESS_DENIED" : quota ? "PROJECT_QUOTA_EXCEEDED" : conflict ? "COLLECTION_RUN_CONFLICT" : "INTERNAL", message: error instanceof Error ? error.message : "unknown" }, access ? 403 : quota ? 429 : conflict ? 409 : 500); }
});
async function projectActorForRequest(req: IncomingMessage): Promise<ProjectActor | null> {
  const projectId = req.headers["x-stockquant-project-id"];
  if (typeof projectId !== "string" || !projectId) return null;
  const token = req.headers["x-stockquant-project-token"];
  if (projectAccessRepository) {
    if (typeof token !== "string" || !token) throw new ProjectAuthenticationError("project token required");
    const project = await projectAccessRepository.authenticate(projectId, token);
    return { projectId: project.projectId, scopes: new Set(project.scopes) };
  }
  const rawScopes = req.headers["x-stockquant-scopes"];
  const scopes = new Set((typeof rawScopes === "string" ? rawScopes.split(",") : []).filter((scope): scope is ProjectScope => ["DATA_READ", "DATA_WRITE", "DATA_EXPORT"].includes(scope)));
  return { projectId, scopes };
}
function readBody(req: IncomingMessage): Promise<string> { return new Promise((resolveBody, reject) => { let value = ""; req.on("data", (chunk) => { value += chunk; if (value.length > 1_000_000) reject(new Error("body too large")); }); req.on("end", () => resolveBody(value)); req.on("error", reject); }); }
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
