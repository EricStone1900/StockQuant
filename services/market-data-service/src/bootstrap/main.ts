import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";
import { Pool } from "pg";
import { CollectionRunRepository } from "../adapters/postgres-collection-run-repository.js";
import { CollectionRunConflict } from "../domain/collection-run.js";
import { CollectionScheduler } from "../application/collection-scheduler.js";
import { CollectionScheduleRepository } from "../adapters/postgres-collection-schedule-repository.js";
import { CollectionScheduleConflict } from "../domain/collection-schedule.js";
import { PersistentCollectionSchedulerWorker } from "../application/persistent-collection-scheduler.js";
import { PersistentCollectionExecutor, PythonMinuteCollectionAdapter } from "../application/collection-executor.js";
import { buildCoverage, validateBars, type QualityBar } from "../application/minute-quality.js";
import { compareMinuteDailyAggregate } from "../application/minute-daily-aggregate.js";
import { CoverageRepository } from "../adapters/postgres-coverage-repository.js";
import { BackfillConflict } from "../domain/coverage.js";
import { validateGapRequest } from "../application/coverage-request.js";
import { DataVersionConflict, ProjectAccessDenied, assertProjectAccess, exportWithManifest, paginateVersioned, physicalDedupeKey, type ProjectActor, type ProjectScope } from "../application/project-delivery.js";
import { parseProjectTokenConfig } from "../application/project-token-config.js";
import { ProjectAccessRepository } from "../adapters/postgres-project-access-repository.js";
import { migrateDailyBarCloseSchedulerSchema, migrateDailyBarCompletionSchema, migrateMarketDataSchema, migrateMonitorConsumerOutboxSchema } from "../adapters/postgres-schema-migrations.js";
import { PostgresV24LocalSnapshotBarrierRepository } from "../adapters/postgres-v24-local-snapshot-barrier-repository.js";
import { V24LocalSnapshotWorker, isV24LocalSnapshotFixture } from "../application/v24-local-snapshot-worker.js";
import { ProjectAuthenticationError, ProjectQuotaRepositoryError } from "../ports/project-access.js";
import { ArtifactDeliveryRepository } from "../adapters/postgres-artifact-delivery-repository.js";
import { ArtifactTaskExecutor } from "../application/artifact-task-executor.js";
import { AlertOutboxRepository } from "../adapters/postgres-alert-outbox-repository.js";
import { PublicSourceHttpAdapter } from "../adapters/public-source-http-adapter.js";
import { TencentSnapshotSamplingProvider } from "../adapters/tencent-snapshot-sampling-provider.js";
import { SinaSnapshotSamplingProvider } from "../adapters/sina-snapshot-sampling-provider.js";
import { EastmoneyDailyBarProvider } from "../adapters/eastmoney-daily-bar-provider.js";
import { validateDailyBarCompletion } from "../application/v21-daily-bar-completion.js";
import { isHistoricalResearchSourceAuthorized } from "../application/external-source-authorization.js";
import { MinuteImportRepository } from "../adapters/postgres-minute-import-repository.js";
import { MinuteImportStorageQuotaExceeded, withMinuteBarContextDefaults, type MinuteImportBar } from "../domain/minute-import.js";
import { MAX_MINUTE_CSV_PREVIEW_BARS, historicalContextStatus, minuteCsvImportIdentity, minuteCsvImportIdentityFromSha, previewMinuteCsv, previewMinuteCsvStream, type MinuteCsvHistoricalContext, type MinuteCsvMapping } from "../application/minute-csv-import.js";
import { previewMinuteParquetStream } from "../application/minute-parquet-import.js";
import { MinuteUploadRepository } from "../adapters/postgres-minute-upload-repository.js";
import { MINUTE_UPLOAD_CHUNK_BYTES, MinuteUploadConflict, MinuteUploadQuotaExceeded, type MinuteUploadMetadata } from "../domain/minute-upload.js";
import { SingleFlightGate } from "../application/single-flight-gate.js";
import { PostgresAdvisorySingleFlightGate } from "../adapters/postgres-single-flight-gate.js";
import { HttpBodyTooLargeError, readHttpBody } from "../http-body.js";
import { cnAShareSession, decideCnAShareDailyBarClose, decideCnAShareSamplingTick, isCalendarDate } from "../application/cn-a-share-calendar.js";
import { isAuthorizedPlatformApi, isProtectedPlatformApiRequest, loadMarketDataServiceTokens } from "../service-auth.js";
import { externalSourceUseAuthorized, missingSourceAuthorizationConfig, shouldEnableCollectionExecutor, shouldEnableCollectionScheduler } from "../application/external-source-authorization.js";
import { normalizeWatchlist, prioritizeWatchlist, type WatchlistPriorityInput } from "../application/watchlist.js";
import { PostgresWatchlistRepository } from "../adapters/postgres-watchlist-repository.js";
import { PostgresSamplingSettingsRepository } from "../adapters/postgres-sampling-settings-repository.js";
import { PostgresSamplingPolicyRepository } from "../adapters/postgres-sampling-policy-repository.js";
import { PostgresNewsRevisionRepository, type NewsRevisionInput } from "../adapters/postgres-news-revision-repository.js";
import { collectV21News } from "../application/v21-news-collection.js";
import { PostgresSnapshotSamplingRepository, type SnapshotSamplingScope } from "../adapters/postgres-snapshot-sampling-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "../adapters/postgres-sampling-task-lifecycle-repository.js";
import { PostgresDailyBarCompletionRepository } from "../adapters/postgres-daily-bar-completion-repository.js";
import type { DailyBarCompletionScope } from "../application/daily-bar-completion-queue.js";
import { SamplingTaskWorker } from "../application/sampling-task-worker.js";
import { SnapshotSamplingScheduler } from "../application/snapshot-sampling-scheduler.js";
import { PostgresSnapshotScheduleRepository } from "../adapters/postgres-snapshot-schedule-repository.js";
import { MonitorOutboxWorker } from "../application/monitor-outbox-worker.js";
import { isSnapshotSamplingProviderEnabled, normalizeSnapshotSamplingProviderResult, type SnapshotSamplingProvider } from "../application/snapshot-sampling-provider.js";
import { parseV21SnapshotSamplingFixture } from "../application/v21-snapshot-sampling-fixture.js";
import { parseV21DailyBarCompletionFixture } from "../application/v21-daily-bar-fixture.js";
import { DailyBarCompletionWorker } from "../application/daily-bar-completion-worker.js";
import { DailyBarCloseScheduler } from "../application/daily-bar-close-scheduler.js";
import { classifyQuoteAge } from "../application/v21-market-observation.js";
import { canPublishV12DailyFixture, parseV12DailyFixture, validateV12DailyBars, type V12DailyBar, type V12QualityError } from "../application/v12-daily-fixture.js";

class MinuteCsvFinalizeParseError extends Error {}
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
let serviceTokens: ReturnType<typeof loadMarketDataServiceTokens> | null = null;
try { serviceTokens = loadMarketDataServiceTokens(process.env); } catch { /* Import endpoints remain closed until the platform credential is configured. */ }
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");
const v12ResearchFixtureRoot = resolve(root, "fixtures/v1/v1.2/v1.2-market-data-5");
const minuteFixture = resolve(root, "fixtures/v2/v2.2/minute_bars.csv");
const minuteBadFixture = resolve(root, "fixtures/v2/v2.2/minute_bars_bad.csv");
const minuteSourceIds = ["baostock", "sina", "eastmoney", "tdx"] as const;
function configuredMinuteSources(): string[] {
  return (process.env.STOCKQUANT_COLLECTION_SOURCES ?? "sina,baostock").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
}
let watchlist: string[] = ["600000.SH", "000001.SZ", "600519.SH"];
const sourceState = new Map<string, { status: "HEALTHY" | "OPEN"; failures: number }>;
for (const id of ["tencent-quote", "sina-quote", "eastmoney-news", "cls-news"]) sourceState.set(id, { status: "HEALTHY", failures: 0 });
const databasePool = process.env.STOCKQUANT_DATABASE_URL ? new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL }) : null;
const publicSourceHttp = new PublicSourceHttpAdapter();
const snapshotSamplingProviders = new Map<string, SnapshotSamplingProvider>([
  ["tencent-quote", new TencentSnapshotSamplingProvider(publicSourceHttp)],
  ["sina-quote", new SinaSnapshotSamplingProvider(publicSourceHttp)],
]);
const collectionRuns = databasePool ? new CollectionRunRepository(databasePool) : null;
const collectionSchedules = databasePool ? new CollectionScheduleRepository(databasePool) : null;
const coverageRepository = databasePool ? new CoverageRepository(databasePool) : null;
const projectAccessRepository = databasePool ? new ProjectAccessRepository(databasePool) : null;
const artifactDeliveryRepository = databasePool ? new ArtifactDeliveryRepository(databasePool) : null;
const artifactTaskExecutor = artifactDeliveryRepository ? new ArtifactTaskExecutor(
  artifactDeliveryRepository,
  async (fixtureVersion) => {
    if (fixtureVersion !== "v1.2-market-data-1") throw new Error(`unsupported immutable Fixture version: ${fixtureVersion}`);
    return readFile(fixture);
  },
  process.env.STOCKQUANT_ARTIFACT_TASK_WORKER_ID ?? `artifact-worker-${process.pid}`,
  Number(process.env.STOCKQUANT_ARTIFACT_TASK_LEASE_MS ?? 30_000),
) : null;
const alertOutboxRepository = databasePool ? new AlertOutboxRepository(databasePool) : null;
const minuteImportRepository = databasePool ? new MinuteImportRepository(databasePool) : null;
const minuteUploadRepository = databasePool ? new MinuteUploadRepository(databasePool) : null;
const watchlistRepository = databasePool ? new PostgresWatchlistRepository(databasePool) : null;
const samplingSettingsRepository = databasePool ? new PostgresSamplingSettingsRepository(databasePool) : null;
const samplingPolicyRepository = databasePool ? new PostgresSamplingPolicyRepository(databasePool) : null;
const newsRevisionRepository = databasePool ? new PostgresNewsRevisionRepository(databasePool) : null;
const snapshotSamplingRepository = databasePool ? new PostgresSnapshotSamplingRepository(databasePool) : null;
const localSnapshotBarrier = databasePool ? new PostgresV24LocalSnapshotBarrierRepository(databasePool) : null;
const localSnapshotWorker = snapshotSamplingRepository && localSnapshotBarrier ? new V24LocalSnapshotWorker(snapshotSamplingRepository, localSnapshotBarrier, root) : null;
const samplingTaskLifecycleRepository = databasePool ? new PostgresSamplingTaskLifecycleRepository(databasePool) : null;
const snapshotScheduleRepository = databasePool ? new PostgresSnapshotScheduleRepository(databasePool) : null;
const snapshotScheduler = snapshotScheduleRepository && samplingSettingsRepository && snapshotSamplingRepository && samplingTaskLifecycleRepository ? new SnapshotSamplingScheduler(
  () => snapshotScheduleRepository.enabled(), () => samplingSettingsRepository.get(),
  async (schedule, tick) => {
    if (!externalSourceUseAuthorized("QUOTE", [schedule.sourceId]) || !isSnapshotSamplingProviderEnabled(true)) return { created: false };
    const pool = await watchlistRepository!.get({ ownerId: schedule.scope.ownerId, accountId: schedule.scope.accountId, testRunId: schedule.scope.testRunId });
    if (!pool || pool.namespace !== schedule.scope.namespace || !pool.securities.length) return { created: false };
    const task = await snapshotSamplingRepository.record({ ...tick, settingsVersion: tick.version, dataMode: "REAL", sourceId: schedule.sourceId, scope: schedule.scope, securityIds: pool.securities, status: "QUEUED" });
    await samplingTaskLifecycleRepository.enqueue(task.taskId);
    return { created: task.created };
  }, { now: () => new Date() },
) : null;
const dailyBarCompletionRepository = databasePool ? new PostgresDailyBarCompletionRepository(databasePool) : null;
const dailyBarFixtures: Record<string, { manifestPath: string; fixturePath: string }> = {
  "v2.1-daily-bars-1": { manifestPath: "fixtures/v2/v2.1-daily-bar-completion/manifest.json", fixturePath: "fixtures/v2/v2.1-daily-bar-completion/bars.json" },
  "v24-c5-daily-bars-1": { manifestPath: "fixtures/v2/v2.4/c5-daily-bar-completion/manifest.json", fixturePath: "fixtures/v2/v2.4/c5-daily-bar-completion/bars.json" },
  "v24-c5-prior-20261014-1": { manifestPath: "fixtures/v2/v2.4/c5-prior-daily-20261014/manifest.json", fixturePath: "fixtures/v2/v2.4/c5-prior-daily-20261014/bars.json" },
  "v24-c5-prior-20261015-1": { manifestPath: "fixtures/v2/v2.4/c5-prior-daily-20261015/manifest.json", fixturePath: "fixtures/v2/v2.4/c5-prior-daily-20261015/bars.json" },
  ...Object.fromEntries(["20240102", "20240103", "20240104", "20240105", "20240108", "20240109", "20240110"].map((date) => [`v24-c5-local-daily-${date}-1`, { manifestPath: `fixtures/v2/v2.4/c5-local-daily-${date}/manifest.json`, fixturePath: `fixtures/v2/v2.4/c5-local-daily-${date}/bars.json` }]))
};
async function loadDailyBarFixture(fixtureVersion: string): Promise<{ bytes: Uint8Array; manifestVersion: string; expectedSha256: string }> {
  const source = dailyBarFixtures[fixtureVersion];
  if (!source) throw new Error("DAILY_BAR_FIXTURE_VERSION_MISMATCH");
  const manifest = JSON.parse(await readFile(resolve(root, source.manifestPath), "utf8")) as { fixtureVersion?: string; status?: string; files?: Array<{ path: string; sha256: string }> };
  if (manifest.status !== "FROZEN" || manifest.fixtureVersion !== fixtureVersion || manifest.files?.length !== 1 || manifest.files[0]?.path !== source.fixturePath) throw new Error("DAILY_BAR_FIXTURE_MANIFEST_INVALID");
  return { bytes: await readFile(resolve(root, source.fixturePath)), manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0].sha256 };
}
const dailyBarCompletionWorker = dailyBarCompletionRepository ? new DailyBarCompletionWorker(
  dailyBarCompletionRepository,
  loadDailyBarFixture,
  parseV21DailyBarCompletionFixture,
  { now: () => new Date() },
  process.env.STOCKQUANT_DAILY_BAR_WORKER_ID ?? `dailybar-worker-${process.pid}`,
  Number(process.env.STOCKQUANT_DAILY_BAR_WORKER_LEASE_MS ?? 30_000),
  Number(process.env.STOCKQUANT_DAILY_BAR_WORKER_RETRY_DELAY_MS ?? 5_000),
  async (task, executionAt) => {
    const request = task.sourceRequest;
    if (!request || !externalSourceUseAuthorized("DAILY_BAR", [request.sourceId]) || process.env.STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED !== "true") throw new Error("DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED");
    const close = decideCnAShareDailyBarClose(executionAt.toISOString());
    if (close.status !== "DUE" || close.localDate !== request.sessionDate) throw new Error("DAILY_BAR_SESSION_NOT_CLOSED_OR_CURRENT");
    const bars = await new EastmoneyDailyBarProvider().loadDailyBars(request);
    return validateDailyBarCompletion({ ...request, dataMode: "REAL", scope: task.scope, fixtureVersion: null, expectedSecurityIds: request.securityIds, bars,
      sessionCloseAt: `${request.sessionDate}T15:00:00+08:00`, completionRequestedAt: executionAt.toISOString(), availableAt: new Date().toISOString() }, { sourceAuthorized: true });
  },
) : null;
const dailyBarCloseScheduler = dailyBarCompletionRepository && samplingPolicyRepository ? new DailyBarCloseScheduler(
  dailyBarCompletionRepository,
  dailyBarCompletionRepository,
  async () => (await samplingPolicyRepository!.list()).find((item) => item.policyId === "dailyBarCompletion")?.enabled === true,
  { now: () => new Date() },
  process.env.STOCKQUANT_DAILY_BAR_SCHEDULER_ID ?? `daily-bar-close-${process.pid}`,
  { version: "v2.1-daily-bars-1", sha256: "b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4", sessionDate: "2026-10-16" },
  process.env.STOCKQUANT_DAILY_BAR_SOURCE_MODE === "REAL" ? async (scope, sessionDate) => {
    if (!externalSourceUseAuthorized("DAILY_BAR", ["eastmoney-daily"]) || process.env.STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED !== "true") throw new Error("DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED");
    const watchlist = await watchlistRepository!.get({ ownerId: scope.ownerId, accountId: scope.accountId!, testRunId: scope.testRunId! });
    if (!watchlist || watchlist.namespace !== scope.namespace) throw new Error("SCOPED_WATCHLIST_REQUIRED");
    return dailyBarCompletionRepository!.enqueueReal(scope, { sourceId: "eastmoney-daily", sessionDate, securityIds: watchlist.securities, dataVersion: process.env.STOCKQUANT_MARKET_DAILY_DATA_VERSION! });
  } : undefined,
) : null;
const samplingTaskWorker = samplingTaskLifecycleRepository && snapshotSamplingRepository ? new SamplingTaskWorker(
  samplingTaskLifecycleRepository,
  { execute: async (run) => {
    const task = await snapshotSamplingRepository.find(run.taskId);
    if (!task) throw new Error("SNAPSHOT_TASK_NOT_FOUND");
    if (isV24LocalSnapshotFixture(task.fixtureVersion)) {
      if (!localSnapshotWorker) throw new Error("C5_LOCAL_SNAPSHOT_WORKER_UNAVAILABLE");
      await localSnapshotWorker.execute(task);
      return { state: "COMPLETED" };
    }
    if (task.status === "COMPLETED_FIXTURE") return { state: "COMPLETED" };
    if (task.status === "COMPLETED_REAL") return { state: "COMPLETED" };
    if (task.status === "BLOCKED_SOURCE_AUTHORIZATION") return { state: "BLOCKED_SOURCE_AUTHORIZATION", reason: "OD-008 source authorization is not configured; no provider request was made" };
    if (task.status !== "QUEUED") throw new Error(`SNAPSHOT_TASK_NOT_EXECUTABLE:${task.status}`);
    if (task.dataMode === "REAL") {
      if (!externalSourceUseAuthorized("QUOTE", [task.sourceId])) {
        await snapshotSamplingRepository.blockUnauthorized(task.taskId);
        return { state: "BLOCKED_SOURCE_AUTHORIZATION", reason: "OD-008 source authorization is not configured; no provider request was made" };
      }
      if (!isSnapshotSamplingProviderEnabled(true)) throw new Error("SNAPSHOT_PROVIDER_EXECUTION_DISABLED");
      if (!run.executionAt) throw new Error("SAMPLING_WORKER_CLOCK_REQUIRED");
      if (sourceState.get(task.sourceId)?.status === "OPEN") throw new Error("SOURCE_CIRCUIT_OPEN");
      const provider = snapshotSamplingProviders.get(task.sourceId);
      if (!provider) throw new Error("SNAPSHOT_PROVIDER_NOT_CONFIGURED");
      const result = await provider.sample({ sourceId: task.sourceId as "tencent-quote" | "sina-quote", securityIds: task.securityIds, scheduledAt: task.scheduledAt, executionAt: run.executionAt, maxAgeMinutes: task.intervalMinutes });
      const observations = normalizeSnapshotSamplingProviderResult({ sourceId: task.sourceId as "tencent-quote" | "sina-quote", securityIds: task.securityIds, scheduledAt: task.scheduledAt, executionAt: run.executionAt, maxAgeMinutes: task.intervalMinutes }, result);
      await snapshotSamplingRepository.completeReal(task.taskId, task.sourceId, observations);
      return { state: "COMPLETED" };
    }
    if (!run.executionAt) throw new Error("SAMPLING_WORKER_CLOCK_REQUIRED");
    const fixtureDirectory = task.fixtureVersion === "v2.1-snapshot-stale-1" ? "v2.1-snapshot-stale" : "v2.1-snapshot-sampling";
    const manifest = JSON.parse(await readFile(resolve(root, `fixtures/v2/${fixtureDirectory}/manifest.json`), "utf8")) as { fixtureVersion?: string; files?: Array<{ path: string; sha256: string }> };
    const entry = manifest.files?.find((file) => file.path === `fixtures/v2/${fixtureDirectory}/snapshots.json`);
    if (!entry) throw new Error("SNAPSHOT_FIXTURE_MANIFEST_INVALID");
    // Fixture timestamps model the frozen observation's availability. Worker wall
    // time remains limited to leases and retries, rather than changing business age.
    const fixtureAvailableAt = new Date(Date.parse(task.scheduledAt) + (task.fixtureVersion === "v2.1-snapshot-stale-1" ? 31 : 10) * 60_000).toISOString();
    const result = parseV21SnapshotSamplingFixture({
      bytes: await readFile(resolve(root, entry.path)), manifestVersion: manifest.fixtureVersion,
      manifestSha256: entry.sha256, scheduledAt: task.scheduledAt, calendarVersion: task.calendarVersion,
      securityIds: task.securityIds, ingestedAt: fixtureAvailableAt,
      availableAt: fixtureAvailableAt, maxAgeMinutes: task.intervalMinutes,
    });
    await snapshotSamplingRepository.completeFixture(task.taskId, result.fixtureVersion, result.fixtureSha256, result.observations);
    return { state: "COMPLETED" };
  }, failed: async (taskId) => { const task = await snapshotSamplingRepository.find(taskId); if (task?.status !== "COMPLETED_FIXTURE" && task?.status !== "COMPLETED_REAL") await snapshotSamplingRepository.fail(taskId); } },
  { now: () => new Date() },
  process.env.STOCKQUANT_SAMPLING_TASK_WORKER_ID ?? `sampling-worker-${process.pid}`,
  Number(process.env.STOCKQUANT_SAMPLING_TASK_LEASE_MS ?? 30_000),
  Number(process.env.STOCKQUANT_SAMPLING_TASK_RETRY_DELAY_MS ?? 5_000),
) : null;
const monitorOutboxWorker = samplingTaskLifecycleRepository && process.env.STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR
  ? new MonitorOutboxWorker(samplingTaskLifecycleRepository, process.env.STOCKQUANT_MARKET_MONITOR_URL ?? "http://127.0.0.1:3009", process.env.STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR, process.env.STOCKQUANT_MONITOR_OUTBOX_WORKER_ID ?? `monitor-outbox-${process.pid}`, () => new Date(), fetch, 15_000, 5_000, process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "")
  : null;
const v21NewsFixtureRoot = resolve(root, "fixtures/v2/v2.1-news-revisions");
const v21SnapshotFixtureRoot = resolve(root, "fixtures/v2/v2.1-snapshot-sampling");
const collectionSecurityIds = (process.env.STOCKQUANT_COLLECTION_SECURITY_IDS ?? "600000.SH,000001.SZ,600519.SH").split(",").map((item) => item.trim()).filter(Boolean);
const collectionScheduler = new CollectionScheduler({ session: (date) => {
  const result = cnAShareSession(date);
  return { ...result, status: result.status as "TRADING" | "CLOSED" | "UNKNOWN" };
} }, { now: () => new Date() });
const persistentSchedulerWorker = databasePool && collectionRuns && collectionSchedules && shouldEnableCollectionScheduler(process.env.STOCKQUANT_SCHEDULER_WORKER === "1", configuredMinuteSources())
  ? new PersistentCollectionSchedulerWorker(collectionSchedules, collectionRuns, collectionScheduler, process.env.STOCKQUANT_SCHEDULER_OWNER ?? `market-data-${process.pid}`)
  : null;
const collectionExecutor = collectionRuns && shouldEnableCollectionExecutor(process.env.STOCKQUANT_COLLECTION_EXECUTOR === "1", configuredMinuteSources())
  ? new PersistentCollectionExecutor(collectionRuns, new PythonMinuteCollectionAdapter(), {
    securityIds: collectionSecurityIds,
    projectId: process.env.STOCKQUANT_COLLECTION_PROJECT_ID ?? "stockquant-local",
    dataVersion: process.env.STOCKQUANT_COLLECTION_DATA_VERSION ?? "cn-5m-raw-v1",
    subscriptionId: process.env.STOCKQUANT_COLLECTION_SUBSCRIPTION_ID,
    onRunCompleted: async (run) => {
      if (run.jobKind === "INTRADAY_WINDOW" && alertOutboxRepository) {
        await alertOutboxRepository.resolveIncident(`collection-run:${run.subscriptionId}:INTRADAY_WINDOW`);
      }
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
    onRunFailed: async (run, reason) => {
      if (run.jobKind === "INTRADAY_WINDOW" && alertOutboxRepository) {
        try {
          await alertOutboxRepository.raiseIncident(`collection-run:${run.subscriptionId}:INTRADAY_WINDOW`, "COLLECTION_RUN_FAILED", "CRITICAL", {
            subscriptionId: run.subscriptionId,
            runId: run.runId,
            windowStart: run.windowStart,
            windowEnd: run.windowEnd,
            reason,
          });
        } catch (error) { console.error("collection alert incident persistence failed", error); }
      }
      if (run.jobKind !== "BACKFILL" || !coverageRepository) return;
      const taskId = run.idempotencyKey.split("|", 1)[0];
      await coverageRepository.failBackfill(taskId);
    },
  })
  : null;

async function parse(path: string): Promise<{ bars: V12DailyBar[]; structuralErrors: V12QualityError[] }> {
  return parseV12DailyFixture(await readFile(path, "utf8"));
}
async function parseCsvObjects(path: string): Promise<Array<Record<string, string>>> {
  const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/u);
  const headers = lines.shift()?.split(",") ?? [];
  return lines.map((line) => Object.fromEntries(line.split(",").map((value, index) => [headers[index], value])));
}
async function readV12ResearchFixture() {
  const manifest = JSON.parse(await readFile(resolve(v12ResearchFixtureRoot, "manifest.json"), "utf8")) as { fixtureVersion?: string; files?: Array<{ path: string; sha256: string }> };
  if (manifest.fixtureVersion !== "v1.2-market-data-5" || !Array.isArray(manifest.files)) throw new Error("V1.2 research Fixture manifest is invalid");
  const dailyEntry = manifest.files.find((entry) => entry.path.endsWith("/daily_bars.csv"));
  const sessionsEntry = manifest.files.find((entry) => entry.path.endsWith("/market_sessions.csv"));
  if (!dailyEntry || !sessionsEntry) throw new Error("V1.2 research Fixture daily bars or market sessions are not in its manifest");
  const dailyPath = resolve(root, dailyEntry.path);
  const sessionsPath = resolve(root, sessionsEntry.path);
  const dailyBytes = await readFile(dailyPath);
  const sessionsBytes = await readFile(sessionsPath);
  const dailyBarsSha256 = createHash("sha256").update(dailyBytes).digest("hex");
  const sessionsSha256 = createHash("sha256").update(sessionsBytes).digest("hex");
  if (dailyBarsSha256 !== dailyEntry.sha256) throw new Error("V1.2 research Fixture daily bars do not match the frozen manifest");
  if (sessionsSha256 !== sessionsEntry.sha256) throw new Error("V1.2 research Fixture market sessions do not match the frozen manifest");
  const securities = await parseCsvObjects(resolve(v12ResearchFixtureRoot, "securities.csv"));
  const bars = await parseCsvObjects(dailyPath);
  const marketSessions = await parseCsvObjects(sessionsPath);
  return {
    fixtureVersion: manifest.fixtureVersion,
    dataMode: "FIXTURE" as const,
    dailyBarsSha256,
    securities: securities.map((item) => ({ securityId: item.security_id, ticker: item.ticker, market: item.market, currency: item.currency, timezone: item.timezone, listedAt: item.listed_at, delistedAt: item.delisted_at || null })),
    marketSessions: marketSessions.map((item) => ({ market: item.market, sessionDate: item.session_date })),
    bars: bars.map((item) => ({ securityId: item.security_id, ticker: item.ticker, market: item.market, currency: item.currency, timezone: item.timezone, date: item.date, availableAt: item.available_at, open: item.open, high: item.high, low: item.low, close: item.close, volume: Number(item.volume), adjustment: item.adjustment })),
  };
}
function quality(fixture: { bars: V12DailyBar[]; structuralErrors: V12QualityError[] }, asOf: string) {
  return validateV12DailyBars(fixture.bars, asOf, fixture.structuralErrors);
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
async function finalizeMinuteUpload(ownerId: string, uploadId: string): Promise<{ status: number; body: unknown }> {
  if (!minuteUploadRepository || !minuteImportRepository) throw new Error("MINUTE_UPLOAD_PERSISTENCE_UNAVAILABLE");
  const upload = await minuteUploadRepository.beginFinalization(ownerId, uploadId);
  if (upload.alreadyCompleted) return { status: 200, body: { ...upload.alreadyCompleted as object, idempotent: true, uploadId, uploadStatus: "COMPLETED" } };
  const provenance = upload.metadata.provenance;
  const historicalContext = upload.metadata.historicalContext ?? { securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null };
  const manifest = { mapping: Object.fromEntries(Object.entries(upload.metadata.mapping).sort(([a], [b]) => a.localeCompare(b))), semantics: { fileFormat: upload.metadata.fileFormat ?? "CSV", market: upload.metadata.market, frequency: upload.metadata.frequency, adjustment: upload.metadata.adjustment, timezone: upload.metadata.timezone, timestampSemantics: upload.metadata.timestampSemantics, volumeUnit: upload.metadata.volumeUnit, amountUnit: upload.metadata.amountUnit }, provenance, researchUseAllowed: provenance.licenseVerification === "OPERATOR_CONFIRMED", historicalContext, historicalContextStatus: historicalContextStatus(historicalContext) };
  try {
    const imported = await minuteImportRepository.publishStream({
      expectedSha256: upload.expectedSha256,
      manifest,
      importKeyForSha: (sha256) => minuteCsvImportIdentityFromSha(sha256, upload.metadata.mapping, upload.metadata, provenance, historicalContext).importKeySha256,
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
    return { status: imported.idempotent ? 200 : rejected ? 422 : 201, body: { ...result, uploadId, uploadStatus: progress.status } };
  } catch (error) {
    await minuteUploadRepository.releaseFinalization(ownerId, uploadId);
    if (error instanceof Error && error.message === "assembled upload size or SHA-256 does not match declaration") return { status: 409, body: { code: "UPLOAD_HASH_MISMATCH" } };
    if (error instanceof MinuteCsvFinalizeParseError) return { status: 422, body: { code: upload.metadata.fileFormat === "PARQUET" ? "PARQUET_PARSE_REJECTED" : "CSV_PARSE_REJECTED", message: error.message } };
    throw error;
  }
}
let minuteUploadWorkerBusy = false;
async function tickMinuteUploadFinalizationWorker(): Promise<void> {
  if (!minuteUploadRepository || minuteUploadWorkerBusy || process.env.STOCKQUANT_MINUTE_UPLOAD_WORKER === "0") return;
  minuteUploadWorkerBusy = true;
  let release: (() => Promise<void>) | null = null;
  try {
    release = await acquireMinuteImportSlot();
    if (!release) return;
    const workerId = process.env.STOCKQUANT_MINUTE_UPLOAD_WORKER_ID ?? `minute-upload-${process.pid}`;
    const task = await minuteUploadRepository.claimFinalization(workerId, Number(process.env.STOCKQUANT_MINUTE_UPLOAD_LEASE_MS ?? 300_000));
    if (!task) return;
    const result = await finalizeMinuteUpload(task.ownerId, task.uploadId);
    const body = result.body as { uploadStatus?: string };
    if (body?.uploadStatus === "COMPLETED") await minuteUploadRepository.completeFinalizationJob(task.uploadId, workerId, result);
    else await minuteUploadRepository.failFinalizationJob(task.uploadId, workerId, JSON.stringify(result.body));
  } catch (error) {
    console.error("minute upload finalization worker failed", error);
  } finally {
    if (release) await release().catch((error) => console.error("minute import slot release failed", error));
    minuteUploadWorkerBusy = false;
  }
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
    if (req.url === "/ready") return json(res, { status: "ready", service: "market-data-service", dataMode: "MIXED", liveQuoteMode: externalSourceUseAuthorized("QUOTE", ["tencent-quote"]) ? "LIVE_SOURCE" : "NOT_AUTHORIZED", fixtureRoutesAvailable: true, collectionPersistence: collectionRuns ? "POSTGRES" : "DISABLED", collectionSchedulerWorker: persistentSchedulerWorker ? "ENABLED" : "DISABLED", collectionExecutor: collectionExecutor ? "ENABLED" : "DISABLED", samplingTaskWorker: samplingTaskWorker?.status() ?? { enabled: false, workerId: null, lastTickAt: null, lastResult: null }, monitorOutboxWorker: monitorOutboxWorker?.status() ?? { enabled: false, workerId: null, lastTickAt: null, lastResult: null }, dailyBarCompletionWorker: dailyBarCompletionWorker?.status() ?? { enabled: false, workerId: null, lastTickAt: null, lastResult: null }, dailyBarCloseScheduler: dailyBarCloseScheduler?.status() ?? { enabled: false, workerId: null, lastTickAt: null, lastResult: null }, collectionSourceAuthorization: externalSourceUseAuthorized("MINUTE_COLLECTION", configuredMinuteSources()) ? "AUTHORIZED" : "NOT_AUTHORIZED", ...(externalSourceUseAuthorized("MINUTE_COLLECTION", configuredMinuteSources()) ? { collectionSecurityIds } : {}) });
    if (pathname === "/v2/alerts" && req.method === "GET") {
      if (!alertOutboxRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      return json(res, { incidents: await alertOutboxRepository.activeIncidents() });
    }
    if (pathname === "/v2/alerts/paper-reconciliation" && req.method === "POST") {
      if (!alertOutboxRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      let body: { ownerId?: unknown; testRunId?: unknown; status?: unknown; discrepancies?: unknown };
      try { body = JSON.parse(await readBody(req)) as typeof body; }
      catch { return json(res, { code: "INVALID_JSON" }, 400); }
      if (typeof body.ownerId !== "string" || !body.ownerId.trim() || body.ownerId.length > 200 || typeof body.testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.testRunId) || !["MATCH", "DISCREPANCY"].includes(String(body.status)) || !Array.isArray(body.discrepancies) || body.discrepancies.length > 100) return json(res, { code: "INVALID_RECONCILIATION_RESULT" }, 422);
      const alertKey = `v24-paper-reconciliation:${body.testRunId}`;
      if (body.status === "DISCREPANCY") {
        const result = await alertOutboxRepository.raiseIncident(alertKey, "V24_PAPER_RECONCILIATION_DISCREPANCY", "CRITICAL", { ownerId: body.ownerId, testRunId: body.testRunId, discrepancies: body.discrepancies });
        return json(res, { status: "DISCREPANCY", alertKey, created: result.created, incident: result.incident });
      }
      const incident = await alertOutboxRepository.resolveIncident(alertKey);
      return json(res, { status: "MATCH", alertKey, created: false, incident });
    }
    const acknowledgeAlertMatch = pathname.match(/^\/v2\/alerts\/([0-9a-f-]+)\/acknowledge$/iu);
    if (acknowledgeAlertMatch && req.method === "POST") {
      if (!alertOutboxRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      let body: { actorId?: unknown };
      try { body = JSON.parse(await readBody(req)) as { actorId?: unknown }; }
      catch { return json(res, { code: "INVALID_JSON" }, 400); }
      if (typeof body.actorId !== "string" || !body.actorId.trim()) return json(res, { code: "INVALID_ACTOR" }, 422);
      const incident = await alertOutboxRepository.acknowledgeIncident(acknowledgeAlertMatch[1], body.actorId.trim());
      return incident ? json(res, { incident }) : json(res, { code: "ALERT_NOT_FOUND" }, 404);
    }
    if (req.url === "/v2/collection-scheduler/status" && req.method === "GET") { const persistent = persistentSchedulerWorker?.status() ?? { enabled: false, lastSuccessfulTickAt: null, nextPollAt: null, nextExecutionAt: null, lastSubmitted: 0 }; const executionMode = persistentSchedulerWorker && collectionExecutor ? "PERSISTENT_SOURCE_EXECUTION" : persistentSchedulerWorker ? "PERSISTENT_PLAN_ONLY" : "FIXTURE_PLAN_ONLY"; return json(res, { status: persistent.enabled ? "ENABLED" : "DISABLED", enabled: persistent.enabled, lastSuccessfulTickAt: persistent.lastSuccessfulTickAt, nextPollAt: persistent.nextPollAt, nextExecutionAt: persistent.nextExecutionAt, lastSubmitted: persistent.lastSubmitted, mode: executionMode, sourceOrder: configuredMinuteSources(), note: "nextPollAt是调度器下一次后台轮询时间；nextExecutionAt是计划器估算的下一个采集窗口，两者不可互相替代。" }); }
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
      const query = new URL(req.url ?? "/", "http://localhost").searchParams;
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
    if (req.url === "/v2/sources" && req.method === "GET") {
      const quoteSourceIds = ["tencent-quote", "sina-quote"];
      const samplingHealth = snapshotSamplingRepository ? await snapshotSamplingRepository.sourceHealth(quoteSourceIds) : [];
      const healthBySource = new Map(samplingHealth.map((health) => [health.sourceId, health]));
      return json(res, { sources: [
      { sourceId: "tencent-quote", kind: "QUOTE", url: "https://qt.gtimg.cn", status: externalSourceUseAuthorized("QUOTE", ["tencent-quote"]) ? "CONFIGURED" : "NOT_AUTHORIZED", license: "public web endpoint; verify terms before production" },
      { sourceId: "sina-quote", kind: "QUOTE", url: "https://hq.sinajs.cn", status: externalSourceUseAuthorized("QUOTE", ["sina-quote"]) ? "CONFIGURED" : "NOT_AUTHORIZED", license: "public web endpoint; verify terms before production" },
      { sourceId: "eastmoney-news", kind: "NEWS", url: "https://finance.eastmoney.com", status: externalSourceUseAuthorized("NEWS", ["eastmoney-news"]) ? "CONFIGURED" : "NOT_AUTHORIZED", license: "personal local-learning review; no redistribution" },
      { sourceId: "cls-news", kind: "NEWS", url: "https://www.cls.cn", status: externalSourceUseAuthorized("NEWS", ["cls-news"]) ? "CONFIGURED" : "NOT_AUTHORIZED", license: "personal local-learning review; no redistribution" }
      ].map((source) => ({ ...source, circuit: sourceState.get(source.sourceId)?.status ?? "HEALTHY", samplingHealth: source.kind === "QUOTE" ? healthBySource.get(source.sourceId) ?? { sourceId: source.sourceId, state: snapshotSamplingRepository ? "NEVER_RUN" : "UNAVAILABLE", lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastErrorCode: null } : null })), checkedAt: new Date().toISOString(), note: "Configured capability, manual circuit and persisted sampling health are separate; this endpoint makes no provider request. Production licensing and rate limits remain deployment checks." });
    }
    if (req.url === "/v2/sampling" && req.method === "GET") {
      const setting = samplingSettingsRepository ? await samplingSettingsRepository.get() : { intervalMinutes: 30 as const, version: 0, updatedAt: null };
      const policyPayload = samplingPolicyRepository ? { policies: await samplingPolicyRepository.list() } : {};
      return json(res, { intervalMinutes: setting.intervalMinutes, settingsVersion: setting.version, updatedAt: setting.updatedAt, persistence: samplingSettingsRepository ? "POSTGRESQL" : "UNAVAILABLE", allowed: [20, 30], tradingWindows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], lunchBreak: ["11:30", "13:00"], ...policyPayload, scheduleSeparation: { snapshotSampling: "CONFIGURED", monitorEvaluation: "CONFIGURED", dailyBarCompletion: "CONFIGURED", strategyEvaluation: "NOT_CONFIGURED", orderExecution: "NOT_CONFIGURED" }, placeOrders: false });
    }
    const calendarMatch = req.url?.match(/^\/v2\/calendar\/cn-a-share\/(\d{4}-\d{2}-\d{2})$/);
    if (calendarMatch && req.method === "GET") return isCalendarDate(calendarMatch[1]) ? json(res, cnAShareSession(calendarMatch[1])) : json(res, { code: "INVALID_DATE" }, 400);
    if (req.url === "/v2/sampling" && req.method === "PUT") { if (!samplingSettingsRepository || !samplingPolicyRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503); const body = JSON.parse(await readBody(req)); const value = Number(body.intervalMinutes); if (![20, 30].includes(value)) return json(res, { code: "INVALID_SAMPLING_INTERVAL", allowed: [20, 30] }, 422); const client = await databasePool!.connect(); let setting: Awaited<ReturnType<PostgresSamplingSettingsRepository["set"]>>; try { await client.query("BEGIN"); setting = await samplingSettingsRepository.set(value as 20 | 30, client); await samplingPolicyRepository.updateSnapshotInterval(setting.intervalMinutes, setting.version, client); await client.query("COMMIT"); } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); } const policies = await samplingPolicyRepository.list(); return json(res, { intervalMinutes: setting.intervalMinutes, settingsVersion: setting.version, updatedAt: setting.updatedAt, persistence: "POSTGRESQL", allowed: [20, 30], tradingWindows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], lunchBreak: ["11:30", "13:00"], policies, scheduleSeparation: { snapshotSampling: "CONFIGURED", monitorEvaluation: "CONFIGURED", dailyBarCompletion: "CONFIGURED", strategyEvaluation: "NOT_CONFIGURED", orderExecution: "NOT_CONFIGURED" }, placeOrders: false }); }
    if (req.url === "/v2/sampling/monitor-policy" && req.method === "PUT") {
      if (!samplingPolicyRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { enabled?: unknown };
      if (typeof body.enabled !== "boolean") return json(res, { code: "INVALID_MONITOR_EVALUATION_POLICY" }, 422);
      const policy = await samplingPolicyRepository.setMonitorEvaluationEnabled(body.enabled);
      return json(res, { policy, consumer: "monitorOutboxWorker", pendingEventsRetained: true, placeOrders: false });
    }
    if (req.url === "/v2/daily-bars/schedules" && req.method === "PUT") {
      if (!dailyBarCompletionRepository || !samplingPolicyRepository || !watchlistRepository) return json(res, { code: "DAILY_BAR_SCHEDULER_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { enabled?: unknown; scope?: DailyBarCompletionScope };
      const scope = body.scope;
      if (typeof body.enabled !== "boolean" || !scope || scope.market !== "CN_A" || !scope.ownerId?.trim() || scope.ownerId.length > 128 || !scope.accountId || !isUuid(scope.accountId) || !scope.namespace?.trim() || scope.namespace.length > 128 || !scope.testRunId || !isUuid(scope.testRunId)) return json(res, { code: "INVALID_DAILY_BAR_SCHEDULE" }, 422);
      const scopedWatchlist = await watchlistRepository.get({ ownerId: scope.ownerId, accountId: scope.accountId, testRunId: scope.testRunId });
      if (!scopedWatchlist) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      if (scopedWatchlist.namespace !== scope.namespace) return json(res, { code: "DAILY_BAR_SCOPE_CONFLICT" }, 409);
      if (body.enabled && process.env.STOCKQUANT_DAILY_BAR_SOURCE_MODE === "REAL" && (!externalSourceUseAuthorized("DAILY_BAR", ["eastmoney-daily"]) || process.env.STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED !== "true")) return json(res, { code: "DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED", externalRequests: 0 }, 403);
      if (body.enabled && process.env.STOCKQUANT_DAILY_BAR_SOURCE_MODE !== "REAL" && JSON.stringify([...scopedWatchlist.securities].sort()) !== JSON.stringify(["000001.SZ", "600000.SH"])) return json(res, { code: "DAILY_BAR_FIXTURE_SCOPE_COVERAGE_MISMATCH", expectedSecurityIds: ["600000.SH", "000001.SZ"], actualCount: scopedWatchlist.securities.length }, 409);
      await dailyBarCompletionRepository.setSchedule(scope, body.enabled);
      const enabledCount = await dailyBarCompletionRepository.enabledScheduleCount();
      const policy = await samplingPolicyRepository.setDailyBarCompletionEnabled(enabledCount > 0);
      return json(res, { policy, scope, enabled: body.enabled, enabledScopes: enabledCount, schedule: dailyBarCloseScheduler?.status() ?? null, dataMode: process.env.STOCKQUANT_DAILY_BAR_SOURCE_MODE === "REAL" ? "REAL" : "FIXTURE", fixture: process.env.STOCKQUANT_DAILY_BAR_SOURCE_MODE === "REAL" ? null : { version: "v2.1-daily-bars-1", sessionDate: "2026-10-16", dataMode: "FIXTURE" }, externalRequests: 0, placeOrders: false });
    }
    if (req.url === "/v2/sampling/schedules" && req.method === "PUT") {
      if (!snapshotScheduleRepository || !watchlistRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { enabled?: boolean; sourceId?: "tencent-quote" | "sina-quote"; scope?: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string } };
      const scope = body.scope;
      if (typeof body.enabled !== "boolean" || !scope || scope.market !== "CN_A" || !scope.ownerId?.trim() || !isUuid(scope.accountId ?? "") || !scope.namespace?.trim() || !isUuid(scope.testRunId ?? "") || !["tencent-quote", "sina-quote"].includes(body.sourceId ?? "")) return json(res, { code: "INVALID_SAMPLING_SCOPE" }, 422);
      if (body.enabled && (!externalSourceUseAuthorized("QUOTE", [body.sourceId!]) || !isSnapshotSamplingProviderEnabled(true) || process.env.STOCKQUANT_SNAPSHOT_SCHEDULER_ENABLED !== "true")) return json(res, { code: "SAMPLING_EXECUTOR_NOT_CONFIGURED", externalRequests: 0 }, 409);
      const pool = await watchlistRepository.get({ ownerId: scope.ownerId, accountId: scope.accountId, testRunId: scope.testRunId });
      if (!pool || pool.namespace !== scope.namespace || !pool.securities.length) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      await snapshotScheduleRepository.set({ scope, sourceId: body.sourceId! }, body.enabled);
      return json(res, { scope, sourceId: body.sourceId, enabled: body.enabled, externalRequests: 0, placeOrders: false });
    }
    if (req.url === "/v2/sampling/tasks/tick" && req.method === "POST") {
      if (!samplingSettingsRepository || !snapshotSamplingRepository || !samplingTaskLifecycleRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { scheduledAt?: string; sourceId?: string; scope?: SnapshotSamplingScope };
      if (typeof body.scheduledAt !== "string" || !Number.isFinite(Date.parse(body.scheduledAt))) return json(res, { code: "INVALID_SCHEDULED_AT" }, 422);
      if (body.sourceId !== "tencent-quote" && body.sourceId !== "sina-quote") return json(res, { code: "INVALID_QUOTE_SOURCE_ID", allowed: ["tencent-quote", "sina-quote"] }, 422);
      if (externalSourceUseAuthorized("QUOTE", [body.sourceId]) && !isSnapshotSamplingProviderEnabled(true)) return json(res, { code: "SAMPLING_EXECUTOR_NOT_CONFIGURED", reason: "REAL provider execution requires STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED=true" }, 409);
      if (body.scope && (body.scope.market !== "CN_A" || !body.scope.ownerId?.trim() || body.scope.ownerId.length > 128 || !body.scope.accountId || !isUuid(body.scope.accountId) || !body.scope.namespace?.trim() || body.scope.namespace.length > 128 || !body.scope.testRunId || !isUuid(body.scope.testRunId))) return json(res, { code: "INVALID_SAMPLING_SCOPE" }, 422);
      const scheduledAt = new Date(body.scheduledAt).toISOString();
      const setting = await samplingSettingsRepository.get();
      const decision = decideCnAShareSamplingTick(scheduledAt, setting.intervalMinutes);
      if (decision.status !== "ELIGIBLE") return json(res, { task: null, decision, intervalMinutes: setting.intervalMinutes, settingsVersion: setting.version, dataMode: "REAL", externalRequests: 0 });
      const scopedWatchlist = body.scope && watchlistRepository ? await watchlistRepository.get({ ownerId: body.scope.ownerId, accountId: body.scope.accountId!, testRunId: body.scope.testRunId! }) : null;
      if (body.scope && !scopedWatchlist) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      if (body.scope && scopedWatchlist?.namespace !== body.scope.namespace) return json(res, { code: "SAMPLING_SCOPE_CONFLICT" }, 409);
      const task = await snapshotSamplingRepository.record({ scheduledAt, intervalMinutes: setting.intervalMinutes, settingsVersion: setting.version, calendarVersion: decision.calendarVersion, window: decision.window!, dataMode: "REAL", sourceId: body.sourceId, scope: body.scope, securityIds: scopedWatchlist?.securities ?? [], status: "QUEUED" });
      const execution = await samplingTaskLifecycleRepository.enqueue(task.taskId);
      return json(res, { task, execution, decision, intervalMinutes: setting.intervalMinutes, settingsVersion: setting.version, dataMode: "REAL", externalRequests: 0 });
    }
    if (req.url === "/v2/sampling/tasks/tick-fixture" && req.method === "POST") {
      if (!samplingSettingsRepository || !snapshotSamplingRepository || !samplingTaskLifecycleRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { scheduledAt?: string; scope?: SnapshotSamplingScope; acceptanceIntervalMinutes?: unknown; fixtureVariant?: "fresh" | "stale" };
      if (body.fixtureVariant !== undefined && body.fixtureVariant !== "fresh" && body.fixtureVariant !== "stale") return json(res, { code: "INVALID_FIXTURE_VARIANT" }, 422);
      if (body.fixtureVariant && !body.scope?.testRunId) return json(res, { code: "ACCEPTANCE_FIXTURE_SCOPE_REQUIRED" }, 422);
      if (typeof body.scheduledAt !== "string" || !Number.isFinite(Date.parse(body.scheduledAt))) return json(res, { code: "INVALID_SCHEDULED_AT" }, 422);
      if (body.scope && (body.scope.market !== "CN_A" || !body.scope.ownerId?.trim() || body.scope.ownerId.length > 128 || !body.scope.accountId || !isUuid(body.scope.accountId) || !body.scope.namespace?.trim() || body.scope.namespace.length > 128 || !body.scope.testRunId || !isUuid(body.scope.testRunId))) return json(res, { code: "INVALID_SAMPLING_SCOPE" }, 422);
      if (body.acceptanceIntervalMinutes !== undefined && body.acceptanceIntervalMinutes !== 20 && body.acceptanceIntervalMinutes !== 30) return json(res, { code: "INVALID_ACCEPTANCE_SAMPLING_INTERVAL", allowed: [20, 30] }, 422);
      if (body.acceptanceIntervalMinutes !== undefined && !body.scope?.testRunId) return json(res, { code: "ACCEPTANCE_FIXTURE_SCOPE_REQUIRED" }, 422);
      const scheduledAt = new Date(body.scheduledAt).toISOString();
      const setting = await samplingSettingsRepository.get();
      // A TestRun override is a request-scoped immutable Fixture input. It never
      // writes the production setting, so concurrent acceptance runs cannot clobber it.
      const intervalMinutes = (body.acceptanceIntervalMinutes ?? setting.intervalMinutes) as 20 | 30;
      const decision = decideCnAShareSamplingTick(scheduledAt, intervalMinutes);
      if (decision.status !== "ELIGIBLE") return json(res, { task: null, decision, intervalMinutes, settingsVersion: setting.version, dataMode: "FIXTURE", acceptanceFixture: body.acceptanceIntervalMinutes !== undefined, externalRequests: 0 });
      const scopedWatchlist = body.scope && watchlistRepository ? await watchlistRepository.get({ ownerId: body.scope.ownerId, accountId: body.scope.accountId!, testRunId: body.scope.testRunId! }) : null;
      if (body.scope && !scopedWatchlist) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      if (body.scope && scopedWatchlist?.namespace !== body.scope.namespace) return json(res, { code: "SAMPLING_SCOPE_CONFLICT" }, 409);
      const fixtureVersion = body.fixtureVariant === "stale" ? "v2.1-snapshot-stale-1" : "v2.1-snapshot-sampling-1";
      const task = await snapshotSamplingRepository.record({ scheduledAt, intervalMinutes, settingsVersion: setting.version, calendarVersion: decision.calendarVersion, window: decision.window!, dataMode: "FIXTURE", sourceId: `fixture:${fixtureVersion}`, scope: body.scope, securityIds: scopedWatchlist?.securities ?? [], status: "QUEUED", fixtureVersion });
      const execution = await samplingTaskLifecycleRepository.enqueue(task.taskId);
      return json(res, { task, execution, decision, intervalMinutes, settingsVersion: setting.version, dataMode: "FIXTURE", acceptanceFixture: body.acceptanceIntervalMinutes !== undefined, externalRequests: 0 });
    }
    if (pathname === "/v2/sampling/c5-local/plan" && req.method === "POST") {
      if (!localSnapshotBarrier || !snapshotSamplingRepository || !samplingTaskLifecycleRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { scope?: SnapshotSamplingScope; sessionDate?: string };
      if (!body || typeof body !== "object" || Array.isArray(body)) return json(res, { code: "INVALID_C5_LOCAL_SCOPE" }, 422);
      const scope = body.scope;
      if (Object.keys(body).sort().join(",") !== "scope,sessionDate" || !scope || Object.keys(scope).sort().join(",") !== "accountId,market,namespace,ownerId,testRunId" || scope.market !== "CN_A" || !scope.ownerId?.trim() || scope.ownerId.length > 128 || !scope.accountId || !isUuid(scope.accountId) || !scope.testRunId || !isUuid(scope.testRunId) || scope.namespace !== `v24-paper-v2-${scope.testRunId}` || !["2024-01-04", "2024-01-05"].includes(body.sessionDate ?? "")) return json(res, { code: "INVALID_C5_LOCAL_SCOPE" }, 422);
      const localScope = scope as import("../application/v24-local-snapshot-barrier.js").LocalSnapshotScope;
      try {
        const { plan, created } = await localSnapshotBarrier.createPlan(localScope, body.sessionDate!);
        const expected = plan.tasks[0]!; const fixtureVersion = expected.sourceId.slice("fixture:".length);
        const task = await snapshotSamplingRepository.record({ scheduledAt: expected.scheduledAt, intervalMinutes: 30, settingsVersion: 1, calendarVersion: "c5-local-synthetic-sessions-1", window: "morning", dataMode: "FIXTURE", sourceId: expected.sourceId, scope: localScope, securityIds: ["600000.SH"], status: "QUEUED", fixtureVersion });
        if (task.taskId !== expected.taskId) throw new Error("C5_LOCAL_SNAPSHOT_TASK_ID_MISMATCH");
        await samplingTaskLifecycleRepository.enqueue(task.taskId);
        return json(res, { planId: plan.planId, taskId: task.taskId, created, externalRequests: 0, placeOrders: false });
      } catch (error) {
        if (error instanceof Error && (error.message === "C5_LOCAL_SNAPSHOT_PLAN_SCOPE_CONFLICT" || error.name === "SnapshotTaskConflict")) return json(res, { code: "C5_LOCAL_SNAPSHOT_SCOPE_CONFLICT" }, 409);
        throw error;
      }
    }
    if (pathname === "/v2/sampling/c5-local/selection" && req.method === "GET") {
      if (!localSnapshotBarrier) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const query = new URL(req.url ?? "/", "http://localhost").searchParams;
      const keys = [...query.keys()].sort();
      const ownerId = query.get("ownerId"); const accountId = query.get("accountId"); const testRunId = query.get("testRunId"); const namespace = query.get("namespace"); const sessionDate = query.get("sessionDate"); const evaluatedAt = query.get("evaluatedAt");
      if (keys.join(",") !== "accountId,evaluatedAt,namespace,ownerId,sessionDate,testRunId" || !ownerId?.trim() || ownerId.length > 128 || !accountId || !isUuid(accountId) || !testRunId || !isUuid(testRunId) || namespace !== `v24-paper-v2-${testRunId}` || !sessionDate || !["2024-01-04", "2024-01-05"].includes(sessionDate) || !evaluatedAt || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(evaluatedAt) || !Number.isFinite(Date.parse(evaluatedAt))) return json(res, { code: "INVALID_C5_LOCAL_SCOPE_OR_CLOCK" }, 422);
      return json(res, await localSnapshotBarrier.select({ market: "CN_A", ownerId, accountId, namespace, testRunId }, sessionDate, evaluatedAt));
    }
    if (pathname === "/v2/sampling/tasks/latest" && req.method === "GET") {
      if (!snapshotSamplingRepository) return json(res, { code: "SAMPLING_PERSISTENCE_UNAVAILABLE" }, 503);
      const query = new URL(req.url ?? "/", "http://localhost").searchParams;
      const ownerId = query.get("ownerId"); const accountId = query.get("accountId"); const namespace = query.get("namespace"); const testRunId = query.get("testRunId");
      const supplied = [ownerId, accountId, namespace, testRunId].filter((value) => value !== null).length;
      if (supplied > 0 && (supplied < 4 || !ownerId?.trim() || !accountId || !isUuid(accountId) || !namespace?.trim() || !testRunId || !isUuid(testRunId))) return json(res, { code: "INVALID_SAMPLING_SCOPE" }, 422);
      const scope = supplied ? { market: "CN_A" as const, ownerId: ownerId!, accountId: accountId!, namespace: namespace!, testRunId: testRunId! } : undefined;
      const task = await snapshotSamplingRepository.latest(scope);
      const execution = task && samplingTaskLifecycleRepository ? await samplingTaskLifecycleRepository.read(task.taskId) : null;
      return json(res, { task, execution });
    }
    if (req.url === "/v2/daily-bars/real/complete" && req.method === "POST") {
      if (!dailyBarCompletionRepository || !watchlistRepository) return json(res, { code: "DAILY_BAR_COMPLETION_PERSISTENCE_UNAVAILABLE" }, 503);
      if (!externalSourceUseAuthorized("DAILY_BAR", ["eastmoney-daily"]) || process.env.STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED !== "true") return json(res, { code: "DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED", externalRequests: 0 }, 403);
      const body = JSON.parse(await readBody(req)) as { scope?: DailyBarCompletionScope };
      const scope = body.scope;
      if (!scope || scope.market !== "CN_A" || !scope.ownerId?.trim() || !scope.accountId || !isUuid(scope.accountId) || !scope.namespace?.trim() || !scope.testRunId || !isUuid(scope.testRunId)) return json(res, { code: "INVALID_DAILY_BAR_SCOPE" }, 422);
      const close = decideCnAShareDailyBarClose(new Date().toISOString());
      if (close.status !== "DUE") return json(res, { code: "DAILY_BAR_SESSION_NOT_CLOSED", decision: close, externalRequests: 0 }, 409);
      const watchlist = await watchlistRepository.get({ ownerId: scope.ownerId, accountId: scope.accountId, testRunId: scope.testRunId });
      if (!watchlist || watchlist.namespace !== scope.namespace || !watchlist.securities.length) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      const queued = await dailyBarCompletionRepository.enqueueReal(scope, { sourceId: "eastmoney-daily", sessionDate: close.localDate, securityIds: watchlist.securities, dataVersion: process.env.STOCKQUANT_MARKET_DAILY_DATA_VERSION! });
      return json(res, { ...queued, dataMode: "REAL", externalRequests: 0, placeOrders: false });
    }
    if (req.url === "/v2/daily-bars/fixture/complete" && req.method === "POST") {
      if (!dailyBarCompletionRepository) return json(res, { code: "DAILY_BAR_COMPLETION_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { scope?: DailyBarCompletionScope; fixtureVersion?: unknown };
      const scope = body.scope;
      const fixtureVersion = body.fixtureVersion === undefined ? "v2.1-daily-bars-1" : body.fixtureVersion;
      if (typeof fixtureVersion !== "string" || !dailyBarFixtures[fixtureVersion]) return json(res, { code: "INVALID_DAILY_BAR_FIXTURE_VERSION" }, 422);
      if (!scope || scope.market !== "CN_A" || !scope.ownerId?.trim() || scope.ownerId.length > 128 || !scope.accountId || !isUuid(scope.accountId) || !scope.namespace?.trim() || scope.namespace.length > 128 || !scope.testRunId || !isUuid(scope.testRunId)) return json(res, { code: "INVALID_DAILY_BAR_SCOPE" }, 422);
      const scopedWatchlist = watchlistRepository ? await watchlistRepository.get({ ownerId: scope.ownerId, accountId: scope.accountId, testRunId: scope.testRunId }) : null;
      if (!scopedWatchlist) return json(res, { code: "SCOPED_WATCHLIST_REQUIRED" }, 409);
      if (scopedWatchlist.namespace !== scope.namespace) return json(res, { code: "DAILY_BAR_SCOPE_CONFLICT" }, 409);
      let loaded: { bytes: Uint8Array; manifestVersion: string; expectedSha256: string };
      try { loaded = await loadDailyBarFixture(fixtureVersion); }
      catch { return json(res, { code: "DAILY_BAR_FIXTURE_MANIFEST_INVALID" }, 500); }
      const preview = parseV21DailyBarCompletionFixture({ ...loaded, scope });
      if (preview.status === "REJECTED" || preview.status === "BLOCKED_SOURCE_AUTHORIZATION") return json(res, { code: preview.reason ?? preview.status, completion: preview }, 422);
      if (JSON.stringify([...scopedWatchlist.securities].sort()) !== JSON.stringify(preview.bars.map((bar) => bar.securityId).sort())) return json(res, { code: "DAILY_BAR_FIXTURE_SCOPE_COVERAGE_MISMATCH" }, 409);
      try {
        const queued = await dailyBarCompletionRepository.enqueue({ scope, fixtureVersion: loaded.manifestVersion, fixtureSha256: loaded.expectedSha256 });
        return json(res, { task: queued.task, created: queued.created, dataMode: "FIXTURE", externalRequests: 0, placeOrders: false });
      } catch (error) {
        if (error instanceof Error && error.message === "DAILY_BAR_TASK_IDEMPOTENCY_CONFLICT") return json(res, { code: error.message }, 409);
        throw error;
      }
    }
    if (pathname === "/v2/daily-bars/completions/latest" && req.method === "GET") {
      if (!dailyBarCompletionRepository) return json(res, { code: "DAILY_BAR_COMPLETION_PERSISTENCE_UNAVAILABLE" }, 503);
      const query = new URL(req.url ?? "/", "http://localhost").searchParams;
      const ownerId = query.get("ownerId"); const accountId = query.get("accountId"); const namespace = query.get("namespace"); const testRunId = query.get("testRunId");
      if (!ownerId?.trim() || ownerId.length > 128 || !accountId || !isUuid(accountId) || !namespace?.trim() || namespace.length > 128 || !testRunId || !isUuid(testRunId)) return json(res, { code: "INVALID_DAILY_BAR_SCOPE" }, 422);
      const scope: DailyBarCompletionScope = { market: "CN_A", ownerId, accountId, namespace, testRunId };
      return json(res, await dailyBarCompletionRepository.latest(scope) ?? { task: null, completion: null });
    }
    if (pathname === "/v2/daily-bars/completions/sessions" && req.method === "GET") {
      if (!dailyBarCompletionRepository) return json(res, { code: "DAILY_BAR_COMPLETION_PERSISTENCE_UNAVAILABLE" }, 503);
      const query = new URL(req.url ?? "/", "http://localhost").searchParams;
      const ownerId = query.get("ownerId"); const accountId = query.get("accountId"); const namespace = query.get("namespace"); const testRunId = query.get("testRunId");
      const sessionDates = query.getAll("sessionDate"); const sourceId = query.get("sourceId"); const dataVersion = query.get("dataVersion"); const dataMode = query.get("dataMode"); const asOf = query.get("asOf");
      if (!ownerId?.trim() || ownerId.length > 128 || !accountId || !isUuid(accountId) || !namespace?.trim() || namespace.length > 128 || !testRunId || !isUuid(testRunId) || sessionDates.length !== 2 || !sourceId || !dataVersion || (dataMode !== "FIXTURE" && dataMode !== "REAL") || !asOf) return json(res, { code: "DAILY_BAR_SESSION_QUERY_INVALID" }, 422);
      try {
        const completions = await dailyBarCompletionRepository.findSessions({ scope: { market: "CN_A", ownerId, accountId, namespace, testRunId }, sessionDates: [sessionDates[0], sessionDates[1]], sourceId, dataVersion, dataMode, asOf });
        return json(res, { completions });
      } catch (error) {
        if (error instanceof Error && error.message === "DAILY_BAR_SESSION_QUERY_INVALID") return json(res, { code: error.message }, 422);
        if (error instanceof Error && error.message === "DAILY_BAR_SESSION_AMBIGUOUS") return json(res, { code: error.message }, 409);
        throw error;
      }
    }
    const breakerMatch = req.url?.match(/^\/v2\/sources\/([^/]+)\/(fail|recover)$/);
    if (breakerMatch && req.method === "POST") { const state = sourceState.get(breakerMatch[1]); if (!state) return json(res, { code: "SOURCE_NOT_FOUND" }, 404); if (breakerMatch[2] === "fail") { state.failures += 1; state.status = "OPEN"; } else { state.failures = 0; state.status = "HEALTHY"; } return json(res, { sourceId: breakerMatch[1], circuit: state.status, failures: state.failures }); }
    if (req.url === "/v2/sources/smoke" && req.method === "GET") {
      const denied = (["QUOTE", "NEWS"] as const).flatMap((use) => externalSourceUseAuthorized(use) ? [] : missingSourceAuthorizationConfig(use).map((config) => ({ use, config })));
      if (denied.length > 0) return json(res, { status: "NOT_AUTHORIZED", externalRequests: 0, missingConfiguration: denied }, 403);
      const checks = await Promise.all([
        publicSourceHttp.check("tencent-quote", "https://qt.gtimg.cn/q=sh600000"),
        publicSourceHttp.check("sina-quote", "https://hq.sinajs.cn/list=sh600000"),
        publicSourceHttp.check("eastmoney-news", "https://finance.eastmoney.com/"),
        publicSourceHttp.check("cls-news", "https://www.cls.cn/")
      ]);
      return json(res, { checkedAt: new Date().toISOString(), checks, status: checks.every((item) => item.status === "PASS") ? "PASS" : "PARTIAL" });
    }
    if (req.url === "/v2/watchlist" && req.method === "GET") return json(res, { securities: watchlist, count: watchlist.length, max: 100, priority: "holdings_then_in_flight_then_candidates" });
    if (req.url === "/v2/watchlist" && req.method === "PUT") {
      const body = JSON.parse(await readBody(req)); const result = normalizeWatchlist(body.securities);
      if (!result.accepted) return json(res, { code: "WATCHLIST_LIMIT", message: "watchlist cannot exceed 100 unique securities", max: result.max }, 422);
      watchlist = result.securities; return json(res, { securities: watchlist, count: watchlist.length, max: 100 });
    }
    if (pathname === "/v2/watchlist/scoped" && req.method === "GET") {
      if (!watchlistRepository) return json(res, { code: "WATCHLIST_PERSISTENCE_UNAVAILABLE" }, 503);
      const query = new URL(req.url ?? "/", "http://127.0.0.1").searchParams;
      const ownerId = query.get("ownerId") ?? ""; const accountId = query.get("accountId") ?? ""; const namespace = query.get("namespace") ?? ""; const testRunId = query.get("testRunId") ?? "";
      if (!ownerId || !accountId || !namespace || !isUuid(testRunId)) return json(res, { code: "INVALID_WATCHLIST_SCOPE" }, 422);
      const stored = await watchlistRepository.get({ ownerId, accountId, testRunId });
      if (!stored) return json(res, { ownerId, accountId, namespace, testRunId, securities: [], count: 0, max: 100, requiredCount: 0, omittedCandidates: [], updatedAt: null });
      if (stored.namespace !== namespace) return json(res, { code: "WATCHLIST_SCOPE_CONFLICT" }, 409);
      return json(res, stored);
    }
    if (pathname === "/v2/watchlist/scoped" && req.method === "PUT") {
      if (!watchlistRepository) return json(res, { code: "WATCHLIST_PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as Record<string, unknown>;
      const fields = ["ownerId", "accountId", "namespace", "testRunId", "holdings", "inFlightOrders", "candidates"];
      if (Object.keys(body).length !== fields.length || fields.some((field) => !Object.hasOwn(body, field))) return json(res, { code: "INVALID_WATCHLIST_SCOPE" }, 422);
      if (typeof body.ownerId !== "string" || !body.ownerId.trim() || body.ownerId.length > 128 || typeof body.accountId !== "string" || !isUuid(body.accountId) || typeof body.namespace !== "string" || !body.namespace.trim() || body.namespace.length > 128 || typeof body.testRunId !== "string" || !isUuid(body.testRunId)) return json(res, { code: "INVALID_WATCHLIST_SCOPE" }, 422);
      const securities = [body.holdings, body.inFlightOrders, body.candidates];
      if (securities.some((items) => !Array.isArray(items) || items.length > 5000 || items.some((item) => typeof item !== "string" || !item.trim() || item.length > 64))) return json(res, { code: "INVALID_WATCHLIST_SECURITIES" }, 422);
      const input: WatchlistPriorityInput = { holdings: body.holdings as string[], inFlightOrders: body.inFlightOrders as string[], candidates: body.candidates as string[] };
      const result = prioritizeWatchlist(input);
      if (!result.accepted) return json(res, { code: result.reason, message: "required holdings and in-flight securities exceed the online pool limit", max: result.max, requiredCount: result.requiredCount }, 422);
      try {
        const stored = await watchlistRepository.save({ ownerId: body.ownerId, accountId: body.accountId, namespace: body.namespace, testRunId: body.testRunId }, input, result);
        return json(res, stored);
      } catch (error) {
        if (error instanceof Error && error.message === "WATCHLIST_SCOPE_CONFLICT") return json(res, { code: error.message }, 409);
        throw error;
      }
    }
    if (req.url === "/v2/quote/preview" && req.method === "GET") {
      if (!externalSourceUseAuthorized("QUOTE", ["tencent-quote"])) return json(res, { code: "SOURCE_NOT_AUTHORIZED", message: "live quote request is disabled until Tencent source use authorization and data version are configured", missingConfiguration: missingSourceAuthorizationConfig("QUOTE", ["tencent-quote"]) }, 403);
      const symbols = watchlist.slice(0, 100);
      const quotes = await publicSourceHttp.tencentQuotePreview(symbols);
      const setting = samplingSettingsRepository ? await samplingSettingsRepository.get() : { intervalMinutes: 30 as const, version: 0 };
      const observedAtNow = new Date().toISOString();
      const securities = quotes.securities.map((quote) => ({ ...quote, ...classifyQuoteAge(quote, observedAtNow, setting.intervalMinutes) }));
      return json(res, { ...quotes, securities, freshnessPolicy: { maxAgeMinutes: setting.intervalMinutes, clock: "UTC_INSTANT", status: samplingSettingsRepository && setting.version > 0 ? "CONFIGURED" : "DEFAULT_UNPERSISTED" } });
    }
    if (req.url === "/v2/news/preview" && req.method === "GET") return json(res, { items: [{ newsId: "v2-fixture-news-001", sourceId: "fixture-news-v2.1", sourceIds: ["fixture-news-v2.1"], title: "示例公告（合成验收样本）", publishedAt: null, publicationTimeStatus: "UNKNOWN", revision: 1, revisionStatus: "UNVERIFIED_NO_STABLE_SOURCE_ID", symbols: [], entityMatchStatus: "UNMATCHED" }], deduplicated: false, sourceStatus: "FIXTURE_ONLY", dataMode: "FIXTURE" });
    if (req.url === "/v2/news/fixture/ingest" && req.method === "POST") {
      if (!newsRevisionRepository) return json(res, { code: "NEWS_REVISION_PERSISTENCE_UNAVAILABLE" }, 503);
      const manifest = JSON.parse(await readFile(resolve(v21NewsFixtureRoot, "manifest.json"), "utf8")) as { fixtureVersion?: string; files?: Array<{ path: string; sha256: string }> };
      if (manifest.fixtureVersion !== "v2.1-news-revisions-1" || manifest.files?.length !== 1) return json(res, { code: "NEWS_FIXTURE_MANIFEST_INVALID" }, 500);
      const fixtureBytes = await readFile(resolve(root, manifest.files[0]!.path));
      if (createHash("sha256").update(fixtureBytes).digest("hex") !== manifest.files[0]!.sha256) return json(res, { code: "NEWS_FIXTURE_HASH_MISMATCH" }, 500);
      const fixtureData = JSON.parse(fixtureBytes.toString("utf8")) as { fixtureVersion?: string; records?: NewsRevisionInput[] };
      if (fixtureData.fixtureVersion !== manifest.fixtureVersion || !Array.isArray(fixtureData.records)) return json(res, { code: "NEWS_FIXTURE_VERSION_INVALID" }, 500);
      const ingested = [];
      for (const record of fixtureData.records) ingested.push(await newsRevisionRepository.append(record));
      return json(res, { fixtureVersion: manifest.fixtureVersion, dataMode: "FIXTURE", records: ingested.map(({ revision, created }) => ({ sourceId: revision.sourceId, sourceItemId: revision.sourceItemId, revision: revision.revision, created })) });
    }
    if (req.url === "/v2/news/fixture/history" && req.method === "GET") {
      if (!newsRevisionRepository) return json(res, { code: "NEWS_REVISION_PERSISTENCE_UNAVAILABLE" }, 503);
      const history = await Promise.all(["fixture-news-a", "fixture-news-b"].map((sourceId) => newsRevisionRepository.listBySource(sourceId)));
      return json(res, { fixtureVersion: "v2.1-news-revisions-1", dataMode: "FIXTURE", histories: history.flat().map((item) => ({ ...item, publicationTimeStatus: item.publishedAt ? "KNOWN" : "UNKNOWN", entityMatchStatus: item.symbols.length > 1 ? "AMBIGUOUS" : item.symbols.length === 1 ? "LINKED" : "UNMATCHED", revisionStatus: "VERIFIED_STABLE_SOURCE_ID" })) });
    }
    if (req.url === "/v2/news/live" && req.method === "GET") {
      if (!externalSourceUseAuthorized("NEWS")) return json(res, { code: "SOURCE_NOT_AUTHORIZED", message: "live news request is disabled until news source use authorization and data version are configured", missingConfiguration: missingSourceAuthorizationConfig("NEWS") }, 403);
      if (!newsRevisionRepository) return json(res, { code: "NEWS_REVISION_PERSISTENCE_UNAVAILABLE" }, 503);
      const observedAt = new Date().toISOString();
      const preview = await collectV21News(["eastmoney-news", "cls-news"],
        (sourceId) => sourceState.get(sourceId)?.status === "OPEN" ? Promise.resolve(null) : publicSourceHttp.latestNews(sourceId as "eastmoney-news" | "cls-news", observedAt),
        (article) => newsRevisionRepository.append(article));
      return json(res, { observedAt, dataMode: "LIVE_SOURCE", ...preview, sourceErrors: preview.sourceFailures.map((sourceId) => ({ sourceId, code: sourceState.get(sourceId)?.status === "OPEN" ? "SOURCE_CIRCUIT_OPEN" : publicSourceHttp.newsError(sourceId as "eastmoney-news" | "cls-news") ?? "NEWS_PERSISTENCE_FAILED" })) });
    }
    if (req.url === "/v2/minute/preview" && req.method === "GET") { const bars = await parseMinute(minuteFixture); return json(res, { fixtureVersion: "v2.2-minute-bars-1", rows: bars.length, securities: new Set(bars.map((bar) => bar.securityId)).size, quality: minuteQuality(bars), bars }); }
    if (req.url === "/v2/minute/quality" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { bars?: QualityBar[]; requireAmount?: boolean };
      if (!Array.isArray(body.bars)) return json(res, { code: "INVALID_QUALITY_INPUT" }, 422);
      const issues = validateBars(body.bars, body.requireAmount ?? true);
      return json(res, { status: issues.length ? "REJECTED" : "READY", rows: body.bars.length, issues }, issues.length ? 422 : 200);
    }
    if (req.url === "/v2/minute/coverage" && req.method === "POST") {
      const body = JSON.parse(await readBody(req)) as { securityIds?: string[]; fromDate?: string; toDate?: string; windowMinutes?: 1 | 5; bars?: QualityBar[]; tradingStatusEvidence?: Array<{ securityId: string; barStart: string; barEnd: string; status: "TRADING" | "SUSPENDED"; sourceReference: string }> };
      if (!Array.isArray(body.securityIds) || !body.fromDate || !body.toDate || !Array.isArray(body.bars) || (body.windowMinutes !== undefined && ![1, 5].includes(body.windowMinutes))) return json(res, { code: "INVALID_COVERAGE_INPUT" }, 422);
      const report = buildCoverage(body.securityIds, body.fromDate, body.toDate, body.bars, { session: (date) => { const session = cnAShareSession(date); return { status: session.status as "TRADING" | "CLOSED" | "UNKNOWN", sessions: session.sessions }; } }, { windowMinutes: body.windowMinutes, tradingStatusEvidence: body.tradingStatusEvidence });
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
      const body = JSON.parse(await readBody(req)) as { content?: string; mapping?: MinuteCsvMapping; provenance?: { sourceName?: string; sourceReference?: string | null; licenseStatement?: string; licenseVerification?: string; acquiredAt?: string }; historicalContext?: MinuteCsvHistoricalContext; market?: string; frequency?: string; adjustment?: string; timezone?: string; timestampSemantics?: string; volumeUnit?: string; amountUnit?: string };
      if (typeof body.content !== "string" || Buffer.byteLength(body.content, "utf8") > 700_000 || !body.mapping || !body.provenance) return json(res, { code: "INVALID_CSV_UPLOAD" }, 422);
      const { sourceName, sourceReference, licenseStatement, licenseVerification, acquiredAt } = body.provenance;
      if (typeof sourceName !== "string" || !sourceName.trim() || sourceName.length > 160 || !(sourceReference === null || typeof sourceReference === "string" && sourceReference.length <= 500) || typeof licenseStatement !== "string" || !licenseStatement.trim() || licenseStatement.length > 500 || !["OPERATOR_CONFIRMED", "UNCONFIRMED"].includes(licenseVerification ?? "") || typeof acquiredAt !== "string" || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(acquiredAt) || !Number.isFinite(Date.parse(acquiredAt))) return json(res, { code: "INVALID_CSV_PROVENANCE" }, 422);
      const historicalContext = body.historicalContext ?? { securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null };
      if (!historicalContext || Object.keys(historicalContext).some((key) => !["securityUniverseVersion", "marketRuleSetVersion", "corporateActionVersion"].includes(key)) || Object.values(historicalContext).some((value) => !(value === null || typeof value === "string" && value.trim().length > 0 && value.length <= 120))) return json(res, { code: "INVALID_HISTORICAL_CONTEXT" }, 422);
      if (body.market !== "CN_A" || !["1m", "5m"].includes(body.frequency ?? "") || body.adjustment !== "RAW" || body.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(body.timestampSemantics ?? "") || body.volumeUnit !== "SHARES" || body.amountUnit !== "CNY") return json(res, { code: "UNSUPPORTED_CSV_SEMANTICS" }, 422);
      let preview;
      try { preview = await previewMinuteCsv({ content: body.content, mapping: body.mapping, market: "CN_A", frequency: body.frequency as "1m" | "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: body.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES", amountUnit: "CNY" }); }
      catch (error) { return json(res, { code: "CSV_PARSE_REJECTED", message: error instanceof Error ? error.message : "CSV is invalid" }, 422); }
      if (req.url === "/v2/minute/csv/preview") return json(res, { ...preview, semantics: { market: body.market, frequency: body.frequency, adjustment: body.adjustment, timezone: body.timezone, timestampSemantics: body.timestampSemantics, volumeUnit: body.volumeUnit, amountUnit: body.amountUnit }, provenance: body.provenance, historicalContext, historicalContextStatus: historicalContextStatus(historicalContext) });
      const semantics = { market: "CN_A" as const, frequency: body.frequency as "1m" | "5m", adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: body.timestampSemantics as "BAR_START" | "BAR_END", volumeUnit: "SHARES" as const, amountUnit: "CNY" as const };
      const provenance = { sourceName: sourceName.trim(), sourceReference: sourceReference === null ? null : sourceReference.trim() || null, licenseStatement: licenseStatement.trim(), licenseVerification: licenseVerification as "OPERATOR_CONFIRMED" | "UNCONFIRMED", acquiredAt: new Date(acquiredAt).toISOString() };
      const { sourceSha256, importKeySha256 } = minuteCsvImportIdentity(body.content, body.mapping, semantics, provenance, historicalContext);
      const rejected = preview.errors.length > 0 || preview.acceptedRows === 0;
      const imported = await minuteImportRepository.publish({ sourceSha256, importKeySha256, manifest: { mapping: Object.fromEntries(Object.entries(body.mapping).sort(([a], [b]) => a.localeCompare(b))), semantics, provenance, researchUseAllowed: provenance.licenseVerification === "OPERATOR_CONFIRMED", historicalContext, historicalContextStatus: historicalContextStatus(historicalContext) }, status: rejected ? "REJECTED" : "PUBLISHED", accepted: rejected ? 0 : preview.acceptedRows, errors: preview.errors, bars: rejected ? [] : preview.bars });
      return json(res, { ...imported.record, idempotent: imported.idempotent }, imported.idempotent ? 200 : rejected ? 422 : 201);
    }
    const minuteUploadCreateMatch = req.url?.match(/^\/v2\/minute\/(csv|parquet)\/uploads$/iu);
    if (minuteUploadCreateMatch && req.method === "POST") {
      if (!minuteUploadRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { uploadId?: string; expectedSha256?: string; expectedBytes?: number; metadata?: MinuteUploadMetadata };
      const ownerId = req.headers["x-stockquant-owner-id"];
      const metadata = body.metadata ? { ...body.metadata, fileFormat: body.metadata.fileFormat ?? "CSV", historicalContext: body.metadata.historicalContext ?? { securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null } } : undefined;
      if (typeof ownerId !== "string" || typeof body.uploadId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId) || !metadata || typeof body.expectedBytes !== "number" || typeof body.expectedSha256 !== "string") return json(res, { code: "INVALID_UPLOAD_REQUEST" }, 422);
      if (metadata.fileFormat !== "CSV" && metadata.fileFormat !== "PARQUET") return json(res, { code: "UNSUPPORTED_FILE_FORMAT" }, 422);
      if (metadata.fileFormat !== minuteUploadCreateMatch[1].toUpperCase()) return json(res, { code: "UPLOAD_ROUTE_FORMAT_MISMATCH" }, 422);
      if (metadata.market !== "CN_A" || !["1m", "5m"].includes(metadata.frequency ?? "") || metadata.adjustment !== "RAW" || metadata.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(metadata.timestampSemantics ?? "") || metadata.volumeUnit !== "SHARES" || metadata.amountUnit !== "CNY") return json(res, { code: "UNSUPPORTED_MINUTE_FILE_SEMANTICS" }, 422);
      const provenance = metadata.provenance;
      if (!provenance || typeof provenance.sourceName !== "string" || !provenance.sourceName.trim() || provenance.sourceName.length > 160 || !(provenance.sourceReference === null || typeof provenance.sourceReference === "string" && provenance.sourceReference.length <= 500) || typeof provenance.licenseStatement !== "string" || !provenance.licenseStatement.trim() || provenance.licenseStatement.length > 500 || !["OPERATOR_CONFIRMED", "UNCONFIRMED"].includes(provenance.licenseVerification) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(provenance.acquiredAt) || !Number.isFinite(Date.parse(provenance.acquiredAt))) return json(res, { code: "INVALID_CSV_PROVENANCE" }, 422);
      const history = metadata.historicalContext;
      if (!history || Object.keys(history).some((key) => !["securityUniverseVersion", "marketRuleSetVersion", "corporateActionVersion"].includes(key)) || Object.values(history).some((value) => !(value === null || typeof value === "string" && value.trim().length > 0 && value.length <= 120))) return json(res, { code: "INVALID_HISTORICAL_CONTEXT" }, 422);
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
    const minuteUploadMatch = req.url?.match(/^\/v2\/minute\/(csv|parquet)\/uploads\/([0-9a-f-]+)(?:\/(preview|finalize|cancel|finalize-queued|finalization))?$/iu);
    if (minuteUploadMatch) {
      if (!minuteUploadRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(minuteUploadMatch[2])) return json(res, { code: "INVALID_UPLOAD_ID" }, 422);
      const ownerId = req.headers["x-stockquant-owner-id"];
      if (typeof ownerId !== "string") return json(res, { code: "INVALID_UPLOAD_OWNER" }, 422);
      const uploadId = minuteUploadMatch[2]; const action = minuteUploadMatch[3];
      if (!action && req.method === "GET") return json(res, await minuteUploadRepository.progress(ownerId, uploadId));
      if (action === "cancel" && req.method === "POST") return json(res, await minuteUploadRepository.cancel(ownerId, uploadId));
      if (action === "finalize-queued" && req.method === "POST") return json(res, await minuteUploadRepository.enqueueFinalization(ownerId, uploadId), 202);
      if (action === "finalization" && req.method === "GET") { const job = await minuteUploadRepository.finalizationJob(ownerId, uploadId); return job ? json(res, job) : json(res, { code: "NOT_FOUND" }, 404); }
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
        const result = await finalizeMinuteUpload(ownerId, uploadId);
        return json(res, result.body, result.status);
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
    if (req.url === "/v2/historical-context/versions" && req.method === "POST") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const body = JSON.parse(await readBody(req)) as { kind?: string; version?: string; content?: Record<string, unknown>; sha256?: string; validFrom?: string; validTo?: string; sourceReference?: string; attestedBy?: string };
      if (!body || !["SECURITY_UNIVERSE", "MARKET_RULE_SET", "CORPORATE_ACTIONS"].includes(body.kind ?? "") || typeof body.version !== "string" || !body.content || Array.isArray(body.content) || typeof body.sha256 !== "string" || typeof body.validFrom !== "string" || typeof body.validTo !== "string" || typeof body.sourceReference !== "string" || typeof body.attestedBy !== "string") return json(res, { code: "INVALID_HISTORICAL_CONTEXT_VERSION" }, 422);
      try { return json(res, await minuteImportRepository.registerHistoricalContextVersion(body as import("../domain/historical-context.js").HistoricalContextVersion), 201); }
      catch (error) { return json(res, { code: "HISTORICAL_CONTEXT_VERSION_REJECTED", message: error instanceof Error ? error.message : "invalid version" }, 422); }
    }
    const replayReadinessMatch = req.url?.match(/^\/v2\/minute\/imports\/([^/?]+)\/replay-readiness(?:\?.*)?$/u);
    if (replayReadinessMatch && req.method === "GET") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const version = decodeURIComponent(replayReadinessMatch[1]);
      const [result, imported] = await Promise.all([minuteImportRepository.checkReplayReadiness(version), minuteImportRepository.find(version)]);
      if (!result || !imported) return json(res, { code: "NOT_FOUND" }, 404);
      const sourceId = imported.manifest.provenance?.sourceName.trim().toLowerCase();
      const reasons = [...result.reasons];
      if (!isHistoricalResearchSourceAuthorized(sourceId)) reasons.push("HISTORICAL_RESEARCH_SOURCE_NOT_AUTHORIZED");
      const readiness = { ...result, status: reasons.length ? "BLOCKED" as const : "READY" as const, reasons: [...new Set(reasons)] };
      return json(res, readiness, readiness.status === "READY" ? 200 : 409);
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
    const minuteDailyAggregateMatch = req.url?.match(/^\/v2\/minute\/imports\/([^/?]+)\/daily-aggregate-check$/u);
    if (minuteDailyAggregateMatch && req.method === "POST") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const version = decodeURIComponent(minuteDailyAggregateMatch[1]);
      const imported = await minuteImportRepository.find(version);
      if (!imported) return json(res, { code: "NOT_FOUND" }, 404);
      let body: Record<string, unknown>;
      try { body = JSON.parse(await readBody(req)) as Record<string, unknown>; }
      catch { return json(res, { code: "INVALID_JSON" }, 422); }
      if (typeof body.securityId !== "string" || typeof body.tradingDate !== "string" || !["1m", "5m"].includes(String(body.frequency)) || !body.reference || typeof body.reference !== "object" || typeof body.referenceSource !== "string" || typeof body.sourceReference !== "string") return json(res, { code: "INVALID_DAILY_AGGREGATE_REQUEST" }, 422);
      const requestedDate = Date.parse(`${body.tradingDate}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/u.test(body.tradingDate) || !Number.isFinite(requestedDate) || new Date(requestedDate).toISOString().slice(0, 10) !== body.tradingDate) return json(res, { code: "INVALID_DAILY_AGGREGATE_REQUEST" }, 422);
      const frequency = body.frequency as "1m" | "5m";
      if (imported.manifest.semantics?.frequency !== frequency || imported.manifest.semantics?.adjustment !== "RAW") return json(res, { code: "INCOMPATIBLE_IMPORT_SEMANTICS" }, 422);
      const fromBarStart = `${body.tradingDate}T00:00:00+08:00`;
      const nextDate = new Date(Date.parse(`${body.tradingDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
      const toBarStart = `${nextDate}T00:00:00+08:00`;
      const bars = [];
      let cursor = 0;
      do {
        const page = await minuteImportRepository.page(version, cursor, 500, body.securityId, fromBarStart, toBarStart);
        bars.push(...page.items);
        if (bars.length > 500) return json(res, { code: "DAILY_AGGREGATE_BAR_LIMIT", limit: 500 }, 422);
        cursor = page.nextCursor === null ? -1 : Number(page.nextCursor);
      } while (cursor >= 0);
      const report = compareMinuteDailyAggregate({ bars, securityId: body.securityId, tradingDate: body.tradingDate, frequency, reference: body.reference as import("../application/minute-daily-aggregate.js").DailyReference, referenceSource: body.referenceSource, sourceReference: body.sourceReference });
      return json(res, { dataVersion: version, importSha256: imported.sha256, ...report });
    }
    const minuteGet = req.url?.match(/^\/v2\/minute\/imports\/([^/?]+)$/);
    if (minuteGet && req.method === "GET") {
      if (!minuteImportRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const result = await minuteImportRepository.find(decodeURIComponent(minuteGet[1]));
      return result ? json(res, result) : json(res, { code: "NOT_FOUND" }, 404);
    }
    if (req.url === "/v1/fixtures/normal/preview") { const parsed = await parse(fixture); const bars = parsed.bars; return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", barCount: bars.length, securityCount: new Set(bars.map((b)=>b.securityId)).size, quality: quality(parsed, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/bad-future/preview") { const parsed = await parse(badFixture); const bars = parsed.bars; return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: quality(parsed, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/research-preview" && req.method === "GET") {
      try { return json(res, await readV12ResearchFixture()); }
      catch (error) { return json(res, { status: "NOT_RUN", reason: error instanceof Error ? error.message : "V1.2 research Fixture unavailable" }, 503); }
    }
    if (req.url === "/v1/artifacts/normal/publish" && req.method === "POST") { const content = await readFile(fixture); const parsed = parseV12DailyFixture(content.toString("utf8")); const report = quality(parsed, "2024-12-31"); if (!canPublishV12DailyFixture(report)) return json(res, { code: "FIXTURE_QUALITY_REJECTED", quality: report }, 422); return json(res, { artifactId: "artifact-v1.2-cn-daily-1", status: "PUBLISHED", immutable: true, sha256: createHash("sha256").update(content).digest("hex"), fixtureVersion: "v1.2-market-data-1" }); }
    if (req.url === "/v1/artifacts/tasks" && req.method === "POST") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const task = await artifactDeliveryRepository.createTask(randomUUID(), "v1.2-market-data-1");
      return json(res, task, 202);
    }
    const taskArtifactMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)\/artifact$/);
    if (taskArtifactMatch && req.method === "GET") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const artifact = await artifactDeliveryRepository.readTaskArtifact(taskArtifactMatch[1]);
      return artifact ? json(res, { taskId: artifact.taskId, artifactId: artifact.artifactId, fixtureVersion: artifact.fixtureVersion, sha256: artifact.sha256, contentBase64: Buffer.from(artifact.bytes).toString("base64"), createdAt: artifact.createdAt }) : json(res, { code: "NOT_FOUND" }, 404);
    }
    const cancelMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const task = await artifactDeliveryRepository.cancelTask(cancelMatch[1]);
      return task ? json(res, task) : json(res, { code: "NOT_FOUND" }, 404);
    }
    const taskMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === "GET") {
      if (!artifactDeliveryRepository) return json(res, { code: "PERSISTENCE_UNAVAILABLE" }, 503);
      const task = await artifactDeliveryRepository.findTask(taskMatch[1]);
      return task ? json(res, task) : json(res, { code: "NOT_FOUND" }, 404);
    }
    return json(res, { code: "NOT_FOUND", message: "route not found" }, 404);
  } catch (error) { const bodyTooLarge = error instanceof HttpBodyTooLargeError; const unauthenticated = error instanceof ProjectAuthenticationError; const accessDenied = error instanceof ProjectAccessDenied; const minuteQuota = error instanceof MinuteUploadQuotaExceeded || error instanceof MinuteImportStorageQuotaExceeded; const projectQuota = error instanceof ProjectQuotaRepositoryError; const conflict = error instanceof CollectionRunConflict || error instanceof CollectionScheduleConflict || error instanceof DataVersionConflict || error instanceof MinuteUploadConflict || (error instanceof Error && error.name === "SnapshotTaskConflict"); return json(res, { code: bodyTooLarge ? "REQUEST_BODY_TOO_LARGE" : unauthenticated ? "UNAUTHENTICATED" : accessDenied ? "PROJECT_ACCESS_DENIED" : minuteQuota ? "MINUTE_STORAGE_QUOTA_EXCEEDED" : projectQuota ? "PROJECT_QUOTA_EXCEEDED" : conflict ? "IDEMPOTENCY_CONFLICT" : "INTERNAL", message: error instanceof Error ? error.message : "unknown" }, bodyTooLarge ? 413 : unauthenticated ? 401 : accessDenied ? 403 : minuteQuota || projectQuota ? 429 : conflict ? 409 : 500); }
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
type MinuteBar = MinuteImportBar;
async function parseMinute(path: string): Promise<MinuteBar[]> { const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/).slice(1); return lines.map((line) => { const [securityId, market, frequency, barStart, barEnd, availableAt, open, high, low, close, volume, amount, adjustment] = line.split(","); return withMinuteBarContextDefaults({ securityId: securityId!, market: market!, frequency: frequency as MinuteBar["frequency"], barStart: barStart!, barEnd: barEnd!, availableAt: availableAt!, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume), amount: Number(amount), adjustment: adjustment as MinuteBar["adjustment"] }); }); }
function minuteQuality(bars: MinuteBar[]) { const errors: Array<Record<string, unknown>> = []; const seen = new Set<string>(); for (const [index, bar] of bars.entries()) { const key = `${bar.securityId}|${bar.barStart}`; if (seen.has(key)) errors.push({ code: "DUPLICATE_CONFLICT", row: index + 2, key }); seen.add(key); if (!(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close)) errors.push({ code: "OHLC_INVALID", row: index + 2 }); const time = bar.barStart.slice(11, 16); if ((time >= "11:30" && time < "13:00") || time < "09:30" || time >= "15:00") errors.push({ code: "NON_TRADING_SESSION", row: index + 2, time }); if (bar.volume < 0 || bar.amount < 0) errors.push({ code: "UNIT_INVALID", row: index + 2 }); } return errors; }
async function start(): Promise<void> {
  if (databasePool) { await migrateMarketDataSchema(databasePool); await minuteUploadRepository!.migrate(); await migrateDailyBarCompletionSchema(databasePool); await migrateMonitorConsumerOutboxSchema(databasePool); await migrateDailyBarCloseSchedulerSchema(databasePool); await localSnapshotBarrier!.migrate(); }
  if (artifactTaskExecutor && process.env.STOCKQUANT_ARTIFACT_TASK_EXECUTOR !== "0") artifactTaskExecutor.start(Number(process.env.STOCKQUANT_ARTIFACT_TASK_INTERVAL_MS ?? 250));
  if (projectAccessRepository) {
    for (const project of parseProjectTokenConfig(process.env.STOCKQUANT_PROJECT_TOKENS)) await projectAccessRepository.register(project.projectId, project.token, project.scopes, project.maxConcurrentRuns, project.maxSecurities);
  }
  server.listen(Number(process.env.STOCKQUANT_PORT ?? 3002), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
  if (minuteUploadRepository && process.env.STOCKQUANT_MINUTE_UPLOAD_WORKER !== "0") {
    const interval = setInterval(() => { void tickMinuteUploadFinalizationWorker(); }, Number(process.env.STOCKQUANT_MINUTE_UPLOAD_WORKER_INTERVAL_MS ?? 500));
    interval.unref?.();
    void tickMinuteUploadFinalizationWorker();
  }
  if (persistentSchedulerWorker) persistentSchedulerWorker.start(Number(process.env.STOCKQUANT_SCHEDULER_INTERVAL_MS ?? 60_000));
  if (samplingTaskWorker && process.env.STOCKQUANT_SAMPLING_TASK_WORKER !== "0") samplingTaskWorker.start(Number(process.env.STOCKQUANT_SAMPLING_TASK_WORKER_INTERVAL_MS ?? 1_000));
  if (snapshotScheduler && process.env.STOCKQUANT_SNAPSHOT_SCHEDULER_ENABLED === "true") snapshotScheduler.start();
  if (monitorOutboxWorker && process.env.STOCKQUANT_MONITOR_OUTBOX_WORKER !== "0") monitorOutboxWorker.start(Number(process.env.STOCKQUANT_MONITOR_OUTBOX_INTERVAL_MS ?? 1_000));
  if (dailyBarCompletionWorker && process.env.STOCKQUANT_DAILY_BAR_WORKER !== "0") dailyBarCompletionWorker.start(Number(process.env.STOCKQUANT_DAILY_BAR_WORKER_INTERVAL_MS ?? 1_000));
  if (dailyBarCloseScheduler && process.env.STOCKQUANT_DAILY_BAR_SCHEDULER !== "0") dailyBarCloseScheduler.start(Number(process.env.STOCKQUANT_DAILY_BAR_SCHEDULER_INTERVAL_MS ?? 30_000));
  if (collectionExecutor) collectionExecutor.start(Number(process.env.STOCKQUANT_COLLECTION_EXECUTOR_INTERVAL_MS ?? 60_000));
}
void start().catch((error: unknown) => { console.error("market-data-service startup failed", error); process.exitCode = 1; });
