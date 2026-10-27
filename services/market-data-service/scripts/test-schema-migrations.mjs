import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrateDailyBarCompletionSchema, migrateDailyBarCloseSchedulerSchema, migrateMonitorConsumerOutboxSchema, migrateMarketDataSchema } from "../dist/adapters/postgres-schema-migrations.js";
import { PostgresDailyBarCompletionRepository } from "../dist/adapters/postgres-daily-bar-completion-repository.js";
import { parseV21DailyBarCompletionFixture } from "../dist/application/v21-daily-bar-fixture.js";
import { readFile } from "node:fs/promises";
import { AlertOutboxRepository } from "../dist/adapters/postgres-alert-outbox-repository.js";
import { ArtifactDeliveryRepository } from "../dist/adapters/postgres-artifact-delivery-repository.js";
import { CollectionRunRepository } from "../dist/adapters/postgres-collection-run-repository.js";
import { CollectionScheduleRepository } from "../dist/adapters/postgres-collection-schedule-repository.js";
import { CoverageRepository } from "../dist/adapters/postgres-coverage-repository.js";
import { MinuteImportRepository } from "../dist/adapters/postgres-minute-import-repository.js";
import { MinuteUploadRepository } from "../dist/adapters/postgres-minute-upload-repository.js";
import { ProjectAccessRepository } from "../dist/adapters/postgres-project-access-repository.js";
import { PostgresWatchlistRepository } from "../dist/adapters/postgres-watchlist-repository.js";
import { PostgresSamplingSettingsRepository } from "../dist/adapters/postgres-sampling-settings-repository.js";
import { PostgresSamplingPolicyRepository } from "../dist/adapters/postgres-sampling-policy-repository.js";
import { PostgresNewsRevisionRepository } from "../dist/adapters/postgres-news-revision-repository.js";
import { PostgresSnapshotSamplingRepository } from "../dist/adapters/postgres-snapshot-sampling-repository.js";
import { PostgresSamplingTaskLifecycleRepository } from "../dist/adapters/postgres-sampling-task-lifecycle-repository.js";
import { prioritizeWatchlist } from "../dist/application/watchlist.js";

const pool = new Pool({ connectionString: process.env.MARKET_DATA_TEST_DATABASE_URL ?? "postgresql://market_data@127.0.0.1:5433/market_data_test" });
try {
  const legacyRepositories = [
    new CollectionRunRepository(pool), new CollectionScheduleRepository(pool), new CoverageRepository(pool),
    new ArtifactDeliveryRepository(pool), new MinuteImportRepository(pool), new MinuteUploadRepository(pool),
    new AlertOutboxRepository(pool), new ProjectAccessRepository(pool)
  ];
  for (const repository of legacyRepositories) await repository.migrate();
  await pool.query(`INSERT INTO market_data_collection_runs
    (run_id, subscription_id, subscription_version, window_start, window_end, job_kind, idempotency_key, request_hash, status)
    VALUES ('11111111-1111-4111-8111-111111111111','legacy-v1',1,'2026-09-01T01:00:00Z','2026-09-01T02:00:00Z','INTRADAY_WINDOW','legacy-v1-key',$1,'COMPLETED')`, ["a".repeat(64)]);
  await Promise.all([migrateMarketDataSchema(pool), migrateMarketDataSchema(pool)]);
  const versions = await pool.query("SELECT version, description FROM market_data_schema_migrations ORDER BY version");
  assert.deepEqual(versions.rows, [
    { version: 1, description: "V1.2 Market Data collection, fixture, artifact and project baseline" },
    { version: 2, description: "Owner/account/TestRun scoped online watchlists" },
    { version: 3, description: "Persistent V2.1 sampling interval configuration" },
    { version: 4, description: "Stable-source news revision ledger" },
    { version: 5, description: "Durable V2.1 snapshot sampling tasks" },
    { version: 6, description: "V2.1 immutable Fixture sampling results" },
    { version: 7, description: "Mode-scoped immutable V2.1 sampling task identities" },
    { version: 8, description: "Owner/account/TestRun scoped V2.1 sampling tasks" },
    { version: 9, description: "Independent V2.1 sampling schedule policy records" },
    { version: 10, description: "Durable V2.1 sampling task leases, bounded retries and outcomes" },
    { version: 11, description: "Queued V2.1 sampling task execution states" },
    { version: 12, description: "V2.1 snapshot source and freshness provenance" },
    { version: 13, description: "Source-scoped V2.1 sampling task identities" },
    { version: 14, description: "V2.1 authorized REAL snapshot result persistence" }
  ]);
  const schemas = await pool.query("SELECT to_regclass('market_data_collection_runs') AS runs, to_regclass('market_data_minute_imports') AS imports, to_regclass('market_data_projects') AS projects, to_regclass('market_data_sampling_task_runs') AS sampling_runs");
  assert.deepEqual(schemas.rows[0], { runs: "market_data_collection_runs", imports: "market_data_minute_imports", projects: "market_data_projects", sampling_runs: "market_data_sampling_task_runs" });
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM market_data_collection_runs WHERE subscription_id='legacy-v1'")).rows[0].count, 1, "existing pre-ledger Market Data rows must survive the baseline adoption");

  const scope = { ownerId: "owner-c1", accountId: "11111111-1111-4111-8111-111111111112", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111113" };
  const inputs = { holdings: ["600000.SH", "000001.SZ"], inFlightOrders: ["000001.SZ", "600519.SH"], candidates: ["600519.SH", ...Array.from({ length: 100 }, (_, index) => `C${index}.SH`)] };
  const planned = prioritizeWatchlist(inputs);
  assert.equal(planned.accepted, true);
  if (!planned.accepted) throw new Error("fixed watchlist fixture unexpectedly exceeded capacity");
  assert.equal(planned.securities.length, 100);
  assert.deepEqual(planned.securities.slice(0, 3), ["600000.SH", "000001.SZ", "600519.SH"]);
  assert.equal(planned.omittedCandidates.length, 3);
  const watchlists = new PostgresWatchlistRepository(pool);
  for (const size of [50, 80]) {
    const capacityScope = { ...scope, testRunId: size === 50 ? "11111111-1111-4111-8111-111111111116" : "11111111-1111-4111-8111-111111111117" };
    const securities = Array.from({ length: size }, (_, index) => `S${index}.SH`);
    const capacityPlan = prioritizeWatchlist({ holdings: securities, inFlightOrders: [], candidates: [] });
    assert.equal(capacityPlan.accepted, true);
    if (!capacityPlan.accepted) throw new Error(`${size}-security fixed pool unexpectedly exceeded capacity`);
    const capacityStored = await watchlists.save(capacityScope, { holdings: securities, inFlightOrders: [], candidates: [] }, capacityPlan);
    assert.equal(capacityStored.count, size);
  }
  await watchlists.save(scope, inputs, planned);
  const restartedRepository = new PostgresWatchlistRepository(pool);
  const restored = await restartedRepository.get(scope);
  assert.deepEqual(restored?.securities, planned.securities, "a fresh repository instance must recover the persisted pool");
  assert.deepEqual(restored?.omittedCandidates, planned.omittedCandidates);
  assert.equal(await restartedRepository.get({ ...scope, ownerId: "different-owner" }), null, "owner scope must isolate watchlists");
  assert.equal(await restartedRepository.get({ ...scope, accountId: "11111111-1111-4111-8111-111111111114" }), null, "account scope must isolate watchlists");
  assert.equal(await restartedRepository.get({ ...scope, testRunId: "11111111-1111-4111-8111-111111111115" }), null, "TestRun scope must isolate watchlists");
  await assert.rejects(watchlists.save({ ...scope, namespace: "paper:OTHER" }, inputs, planned), /WATCHLIST_SCOPE_CONFLICT/);
  const afterConflict = await restartedRepository.get(scope);
  assert.deepEqual(afterConflict?.securities, planned.securities, "scope rejection must preserve the prior configuration");
  const requiredOverflow = prioritizeWatchlist({ holdings: Array.from({ length: 101 }, (_, index) => `H${index}.SH`), inFlightOrders: [], candidates: [] });
  assert.equal(requiredOverflow.accepted, false, "101 required securities must be blocked without truncation");

  const sampling = new PostgresSamplingSettingsRepository(pool);
  assert.equal((await sampling.get()).intervalMinutes, 30, "sampling defaults to 30 minutes");
  assert.equal((await sampling.set(20)).intervalMinutes, 20);
  const restartedSampling = new PostgresSamplingSettingsRepository(pool);
  assert.equal((await restartedSampling.get()).intervalMinutes, 20, "sampling configuration must survive a fresh repository after restart");
  assert.equal((await restartedSampling.set(30)).version, 2);
  const policies = new PostgresSamplingPolicyRepository(pool);
  const policyBefore = await policies.list();
  assert.deepEqual(policyBefore.map((item) => item.policyId), ["snapshotSampling", "monitorEvaluation", "dailyBarCompletion", "strategyEvaluation", "orderExecution"]);
  assert.equal(policyBefore.every((item) => item.enabled === false), true, "all schedule policies must stay disabled until their gates and executors are ready");
  assert.equal(policyBefore.find((item) => item.policyId === "monitorEvaluation")?.trigger, "ON_QUOTE_AVAILABLE", "monitor policy must be independent of the snapshot interval");
  assert.equal(policyBefore.find((item) => item.policyId === "dailyBarCompletion")?.trigger, "AFTER_SESSION_CLOSE");
  assert.equal(policyBefore.find((item) => item.policyId === "strategyEvaluation")?.activationGate, "OD007_APPROVAL");
  assert.equal(policyBefore.find((item) => item.policyId === "orderExecution")?.activationGate, "C5_APPROVAL");
  assert.equal((await policies.updateSnapshotInterval(20, 2)).version, 2);
  assert.equal((await new PostgresSamplingPolicyRepository(pool).list()).find((item) => item.policyId === "snapshotSampling")?.intervalMinutes, 20, "snapshot policy version and interval must survive a fresh repository instance");
  const samplingTasks = new PostgresSnapshotSamplingRepository(pool);
  const snapshotInput = { scheduledAt: "2026-10-16T01:30:00.000Z", intervalMinutes: 30, settingsVersion: 2, calendarVersion: "sse-cn-a-share-2026-1", window: "morning", status: "BLOCKED_SOURCE_AUTHORIZATION" };
  const blockedTask = await samplingTasks.record(snapshotInput);
  assert.equal(blockedTask.created, true);
  assert.equal((await samplingTasks.record(snapshotInput)).created, false, "retrying a sampling tick must not create a duplicate task");
  assert.equal((await new PostgresSnapshotSamplingRepository(pool).latest())?.status, "BLOCKED_SOURCE_AUTHORIZATION", "sampling task must survive a fresh repository after restart");
  const lifecycle = new PostgresSamplingTaskLifecycleRepository(pool);
  const run = await lifecycle.enqueue(blockedTask.taskId);
  assert.equal(run.state, "QUEUED");
  const claimedBlocked = await lifecycle.claim("worker-blocked", new Date("2026-10-16T01:31:00.000Z"), 30_000);
  assert.equal(claimedBlocked?.taskId, blockedTask.taskId, "due task should be claimed with a durable lease");
  assert.equal((await lifecycle.finish(blockedTask.taskId, "worker-blocked", new Date("2026-10-16T01:31:01.000Z"), "BLOCKED_SOURCE_AUTHORIZATION", "OD-008 is not authorized")).state, "BLOCKED_SOURCE_AUTHORIZATION");
  assert.equal((await new PostgresSamplingTaskLifecycleRepository(pool).read(blockedTask.taskId))?.state, "BLOCKED_SOURCE_AUTHORIZATION", "terminal authorization block must survive a fresh repository instance");
  const sameInstantFixture = { ...snapshotInput, status: "COMPLETED_FIXTURE", fixtureVersion: "same-instant-fixture", fixtureSha256: "d".repeat(64), observations: [{ snapshotId: "fixture-same-instant", securityId: "600000.SH", observedAt: snapshotInput.scheduledAt, price: "10.2500", status: "READY" }] };
  const sameInstantFixtureTask = await samplingTasks.record(sameInstantFixture);
  assert.notEqual(blockedTask.taskId, sameInstantFixtureTask.taskId, "REAL and FIXTURE task identities must be distinct at the same instant and policy version");
  assert.equal(sameInstantFixtureTask.dataMode, "FIXTURE");
  const recoverableRun = await lifecycle.enqueue(sameInstantFixtureTask.taskId);
  const leaseAt = new Date("2026-10-16T01:31:00.000Z");
  assert.equal((await lifecycle.claim("worker-crashed", leaseAt, 1_000))?.taskId, recoverableRun.taskId);
  const recovered = await new PostgresSamplingTaskLifecycleRepository(pool).claim("worker-restarted", new Date(leaseAt.getTime() + 1_001), 5_000);
  assert.equal(recovered?.taskId, recoverableRun.taskId, "expired worker lease must be reclaimed after restart");
  assert.equal(recovered?.attempt, 2);
  assert.equal((await lifecycle.finish(recoverableRun.taskId, "worker-restarted", new Date(leaseAt.getTime() + 1_002), "COMPLETED"))?.state, "COMPLETED");
  const samplingScope = { market: "CN_A", ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId };
  const scopedSamplingTask = await samplingTasks.record({ ...snapshotInput, scope: samplingScope, securityIds: planned.securities });
  assert.notEqual(scopedSamplingTask.taskId, blockedTask.taskId, "different owner/account/TestRun scope must have a distinct task identity");
  assert.equal((await samplingTasks.record({ ...snapshotInput, scope: samplingScope, securityIds: planned.securities })).created, false, "scoped task replay must be idempotent");
  const concurrentSamplingTask = await samplingTasks.record({ ...snapshotInput, scheduledAt: "2026-10-16T01:35:00.000Z" });
  await lifecycle.enqueue(scopedSamplingTask.taskId, 3);
  await lifecycle.enqueue(concurrentSamplingTask.taskId, 3);
  const retryStart = new Date("2026-10-16T01:40:00.000Z");
  const concurrentClaims = await Promise.all([lifecycle.claim("retry-worker", retryStart, 30_000), lifecycle.claim("parallel-worker", retryStart, 30_000)]);
  assert.equal(new Set(concurrentClaims.map((item) => item?.taskId)).size, 2, "parallel workers must claim distinct queued jobs");
  const retryClaim = concurrentClaims.find((item) => item?.taskId === scopedSamplingTask.taskId);
  assert.equal(retryClaim?.attempt, 1);
  assert.equal((await lifecycle.retry(scopedSamplingTask.taskId, "retry-worker", new Date(retryStart.getTime() + 1), 0, "bounded transient error")).state, "RETRY_WAIT");
  assert.equal((await lifecycle.claim("retry-worker", new Date(retryStart.getTime() + 2), 30_000))?.attempt, 2);
  assert.equal((await lifecycle.retry(scopedSamplingTask.taskId, "retry-worker", new Date(retryStart.getTime() + 3), 0, "second bounded transient error")).state, "RETRY_WAIT");
  assert.equal((await lifecycle.claim("retry-worker", new Date(retryStart.getTime() + 4), 30_000))?.attempt, 3);
  assert.equal((await lifecycle.retry(scopedSamplingTask.taskId, "retry-worker", new Date(retryStart.getTime() + 5), 0, "attempt limit reached")).state, "FAILED", "retry count must stop at its configured bound");
  assert.equal((await lifecycle.finish(concurrentSamplingTask.taskId, "parallel-worker", new Date(retryStart.getTime() + 6), "BLOCKED_SOURCE_AUTHORIZATION")).state, "BLOCKED_SOURCE_AUTHORIZATION");
  const scopedLatest = await new PostgresSnapshotSamplingRepository(pool).latest(samplingScope);
  assert.equal(scopedLatest?.taskId, scopedSamplingTask.taskId);
  assert.deepEqual(scopedLatest?.securityIds, planned.securities);
  assert.equal(await new PostgresSnapshotSamplingRepository(pool).latest({ ...samplingScope, ownerId: "different-owner" }), null, "task history must not cross owner scope");
  const fixtureSnapshotInput = { ...snapshotInput, scheduledAt: "2026-10-16T01:50:00.000Z", status: "COMPLETED_FIXTURE", fixtureVersion: "v2.1-snapshot-sampling-1", fixtureSha256: "b".repeat(64), observations: [{ snapshotId: "fixture-v21-600000-20261016T0950", securityId: "600000.SH", observedAt: "2026-10-16T01:50:00.000Z", price: "10.2500", status: "READY" }] };
  assert.equal((await samplingTasks.record(fixtureSnapshotInput)).created, true);
  assert.equal((await samplingTasks.record(fixtureSnapshotInput)).created, false, "Fixture tick replay must not duplicate task or observations");
  assert.notEqual(blockedTask.taskId, (await samplingTasks.record(fixtureSnapshotInput)).taskId, "REAL and FIXTURE tasks at the same policy version and instant must not collide");
  await assert.rejects(samplingTasks.record({ ...fixtureSnapshotInput, fixtureSha256: "c".repeat(64) }), /SNAPSHOT_TASK_IDEMPOTENCY_CONFLICT/, "same task key with changed immutable input must conflict");
  const restoredFixtureTask = await new PostgresSnapshotSamplingRepository(pool).latest();
  assert.equal(restoredFixtureTask?.status, "COMPLETED_FIXTURE");
  assert.equal(restoredFixtureTask?.observations.length, 1, "Fixture observations must survive a fresh repository after restart");
  const realSamplingTask = await samplingTasks.record({ ...snapshotInput, scheduledAt: "2026-10-16T02:30:00.000Z", dataMode: "REAL", sourceId: "tencent-quote", status: "QUEUED" });
  const realObservation = { snapshotId: "tencent-quote:600000.SH:2026-10-16T02:30:00.000Z", securityId: "600000.SH", sourceId: "tencent-quote", dataMode: "REAL", observedAt: "2026-10-16T02:30:00.000Z", ingestedAt: "2026-10-16T02:30:01.000Z", availableAt: "2026-10-16T02:30:01.000Z", ageSeconds: 0, freshness: "FRESH", price: "10.2500", status: "READY" };
  const completedRealTask = await samplingTasks.completeReal(realSamplingTask.taskId, "tencent-quote", [realObservation]);
  assert.equal(completedRealTask.status, "COMPLETED_REAL"); assert.equal(completedRealTask.observations[0].sourceId, "tencent-quote");
  assert.equal((await samplingTasks.completeReal(realSamplingTask.taskId, "tencent-quote", [realObservation])).status, "COMPLETED_REAL", "same REAL result commit must be idempotent");
  await assert.rejects(samplingTasks.completeReal(realSamplingTask.taskId, "sina-quote", [realObservation]), /SNAPSHOT_REAL_RESULT_CONFLICT/, "provider result cannot be committed under a different source");
  await lifecycle.enqueue(realSamplingTask.taskId);
  assert.equal((await lifecycle.claim("health-success-worker", new Date("2026-10-16T02:30:02.000Z"), 30_000))?.taskId, realSamplingTask.taskId);
  await lifecycle.finish(realSamplingTask.taskId, "health-success-worker", new Date("2026-10-16T02:30:03.000Z"), "COMPLETED");
  const failedSinaTask = await samplingTasks.record({ ...snapshotInput, scheduledAt: "2026-10-16T02:31:00.000Z", dataMode: "REAL", sourceId: "sina-quote", status: "QUEUED" });
  await lifecycle.enqueue(failedSinaTask.taskId, 1);
  assert.equal((await lifecycle.claim("health-failure-worker", new Date("2026-10-16T02:31:01.000Z"), 30_000))?.taskId, failedSinaTask.taskId);
  assert.equal((await lifecycle.retry(failedSinaTask.taskId, "health-failure-worker", new Date("2026-10-16T02:31:02.000Z"), 0, "SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE")).state, "FAILED");
  await samplingTasks.fail(failedSinaTask.taskId);
  const healthAfterFailure = await samplingTasks.sourceHealth(["sina-quote"]);
  assert.deepEqual([healthAfterFailure[0].state, healthAfterFailure[0].lastErrorCode], ["FAILED", "SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE"]);
  const recoveredSinaTask = await samplingTasks.record({ ...snapshotInput, scheduledAt: "2026-10-16T02:32:00.000Z", dataMode: "REAL", sourceId: "sina-quote", status: "QUEUED" });
  await samplingTasks.completeReal(recoveredSinaTask.taskId, "sina-quote", []);
  await lifecycle.enqueue(recoveredSinaTask.taskId);
  assert.equal((await lifecycle.claim("health-recovery-worker", new Date("2026-10-16T02:32:01.000Z"), 30_000))?.taskId, recoveredSinaTask.taskId);
  await lifecycle.finish(recoveredSinaTask.taskId, "health-recovery-worker", new Date("2026-10-16T02:32:02.000Z"), "COMPLETED");
  const health = await new PostgresSnapshotSamplingRepository(pool).sourceHealth(["tencent-quote", "sina-quote", "unknown-quote"]);
  assert.deepEqual(health.map((item) => [item.sourceId, item.state, item.lastErrorCode]), [["sina-quote", "HEALTHY", "SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE"], ["tencent-quote", "HEALTHY", null], ["unknown-quote", "NEVER_RUN", null]], "source health must persist latest state plus the last failure fact and never-run state by source");

  const news = new PostgresNewsRevisionRepository(pool);
  const newsInput = { sourceId: "fixture-news", sourceItemId: "article-001", sourceUrl: "fixture://news/article-001", title: "公告初稿", publishedAt: null, symbols: ["600000.SH"], observedAt: "2026-10-17T01:00:00Z", ingestedAt: "2026-10-17T01:00:01Z", availableAt: "2026-10-17T01:00:01Z" };
  const firstRevision = await news.append(newsInput);
  assert.equal(firstRevision.created, true); assert.equal(firstRevision.revision.revision, 1); assert.equal(firstRevision.revision.supersedesRevision, null);
  assert.equal((await news.append(newsInput)).created, false, "same article content must be idempotent");
  const secondRevision = await news.append({ ...newsInput, title: "公告修订稿", observedAt: "2026-10-17T02:00:00Z", ingestedAt: "2026-10-17T02:00:01Z", availableAt: "2026-10-17T02:00:01Z" });
  assert.equal(secondRevision.revision.revision, 2); assert.equal(secondRevision.revision.supersedesRevision, 1);
  assert.deepEqual((await new PostgresNewsRevisionRepository(pool).list("fixture-news", "article-001")).map((item) => item.revision), [1, 2], "revision history must survive a new repository instance");
  await assert.rejects(news.append({ ...newsInput, sourceItemId: "", title: "Invalid" }), /NEWS_STABLE_ID_REQUIRED/);

  // Recreate the v6 shape to verify that existing task identities and modes upgrade in place.
  await pool.query("DELETE FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [realSamplingTask.taskId]);
  await pool.query("DELETE FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [failedSinaTask.taskId]);
  await pool.query("DELETE FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [recoveredSinaTask.taskId]);
  await pool.query("DELETE FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [sameInstantFixtureTask.taskId]);
  await pool.query("DELETE FROM market_data_snapshot_sampling_tasks WHERE task_id=$1", [scopedSamplingTask.taskId]);
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_mode_status_check");
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP CONSTRAINT IF EXISTS market_data_snapshot_sampling_tasks_data_mode_check");
  await pool.query("UPDATE market_data_snapshot_sampling_tasks SET task_id=settings_version::text || ':' || to_char(scheduled_at AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')");
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP COLUMN data_mode");
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP COLUMN scope_key");
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP COLUMN scope_json");
  await pool.query("ALTER TABLE market_data_snapshot_sampling_tasks DROP COLUMN security_ids");
  await pool.query("DROP TABLE market_data_sampling_policies");
  await pool.query("DELETE FROM market_data_schema_migrations WHERE version>=7");
  await migrateMarketDataSchema(pool);
  const upgradedTasks = await pool.query("SELECT data_mode,status,task_id,source_id FROM market_data_snapshot_sampling_tasks WHERE scope_json->>'ownerId'='system' ORDER BY scheduled_at, status");
  assert.ok(upgradedTasks.rows.some((row) => row.data_mode === "REAL" && row.status === "BLOCKED_SOURCE_AUTHORIZATION" && row.task_id.startsWith("CN_A:snapshot:REAL:") && row.source_id === "legacy:unspecified"), "v6 REAL task must be rekeyed and explicitly marked as having no traceable source identity");
  assert.ok(upgradedTasks.rows.some((row) => row.data_mode === "FIXTURE" && row.status === "COMPLETED_FIXTURE" && row.task_id.startsWith("CN_A:snapshot:FIXTURE:") && row.source_id === "fixture:v2.1-snapshot-sampling-1"), "v6 Fixture task must be rekeyed with its manifest source identity");
  const migratedObservation = await pool.query("SELECT observation FROM market_data_snapshot_sampling_tasks task CROSS JOIN LATERAL jsonb_array_elements(task.observations) observation WHERE task.data_mode='FIXTURE' AND task.fixture_version='v2.1-snapshot-sampling-1' LIMIT 1");
  assert.ok(migratedObservation.rows.length > 0);
  assert.equal(migratedObservation.rows[0].observation.sourceId, "fixture:v2.1-snapshot-sampling-1");
  assert.equal(migratedObservation.rows[0].observation.freshness, "UNKNOWN");
  assert.equal(migratedObservation.rows[0].observation.status, "UNKNOWN", "legacy observations without execution-time provenance must not remain READY");
  assert.equal(migratedObservation.rows[0].observation.ingestedAt, null);
  await migrateMarketDataSchema(pool);
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM market_data_schema_migrations")).rows[0].count, 14, "repeat startup must preserve all known base migrations");
  await Promise.all([migrateDailyBarCompletionSchema(pool), migrateDailyBarCompletionSchema(pool)]);
  assert.equal((await pool.query("SELECT max(version)::int AS version FROM market_data_schema_migrations")).rows[0].version, 16, "additive DAILY_BAR result and queue migrations must be recorded once");
  await migrateMonitorConsumerOutboxSchema(pool);
  await Promise.all([migrateDailyBarCloseSchedulerSchema(pool), migrateDailyBarCloseSchedulerSchema(pool)]);
  assert.equal((await pool.query("SELECT max(version)::int AS version FROM market_data_schema_migrations")).rows[0].version, 19);
  const dailyRepo = new PostgresDailyBarCompletionRepository(pool);
  const manifest = JSON.parse(await readFile("../../fixtures/v2/v2.1-daily-bar-completion/manifest.json", "utf8"));
  const fixtureBytes = await readFile("../../fixtures/v2/v2.1-daily-bar-completion/bars.json");
  const completionScope = { market: "CN_A", ownerId: "dailybar-owner", accountId: "11111111-1111-4111-8111-111111111118", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111119" };
  const completion = parseV21DailyBarCompletionFixture({ bytes: fixtureBytes, manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0].sha256, scope: completionScope });
  const queuedDaily = await dailyRepo.enqueue({ scope: completionScope, fixtureVersion: manifest.fixtureVersion, fixtureSha256: manifest.files[0].sha256 });
  assert.equal(queuedDaily.created, true); assert.equal(queuedDaily.task.state, "QUEUED");
  const repeatedDaily = await dailyRepo.enqueue({ scope: completionScope, fixtureVersion: manifest.fixtureVersion, fixtureSha256: manifest.files[0].sha256 });
  assert.equal(repeatedDaily.created, false); assert.equal(repeatedDaily.task.taskId, queuedDaily.task.taskId, "same scoped Fixture task must be idempotent");
  const taskClock = Date.parse("2026-10-19T03:00:00.000Z");
  const firstLease = await dailyRepo.claim("dailybar-worker-1", new Date(taskClock), 1_000);
  assert.equal(firstLease?.taskId, queuedDaily.task.taskId); assert.equal(firstLease?.attempt, 1);
  const recoveredLease = await dailyRepo.claim("dailybar-worker-2", new Date(taskClock + 1_000), 1_000);
  assert.equal(recoveredLease?.taskId, queuedDaily.task.taskId); assert.equal(recoveredLease?.attempt, 2, "expired lease must be reclaimable after worker restart");
  assert.equal(await dailyRepo.retry(queuedDaily.task.taskId, "dailybar-worker-2", new Date(taskClock + 1_001), 100, "FIXED_TEST_RETRY"), "RETRY_WAIT");
  assert.equal(await dailyRepo.claim("dailybar-worker-3", new Date(taskClock + 1_050), 1_000), null, "retry delay must be respected");
  const retryLease = await dailyRepo.claim("dailybar-worker-3", new Date(taskClock + 1_101), 1_000);
  assert.equal(retryLease?.attempt, 3);
  await dailyRepo.complete(queuedDaily.task.taskId, "dailybar-worker-3", new Date(taskClock + 1_102), completion);
  const restartedDailyRepo = new PostgresDailyBarCompletionRepository(pool);
  const restoredDaily = await restartedDailyRepo.latest(completionScope);
  assert.deepEqual(restoredDaily?.completion, completion, "completion result must survive repository/process restart");
  assert.equal(restoredDaily?.task.state, "COMPLETED");
  assert.equal(await restartedDailyRepo.latest({ ...completionScope, ownerId: "different-owner" }), null, "completion query must isolate owner scope");
  const failedScope = { ...completionScope, testRunId: "11111111-1111-4111-8111-111111111122" };
  const boundedTask = await dailyRepo.enqueue({ scope: failedScope, fixtureVersion: manifest.fixtureVersion, fixtureSha256: manifest.files[0].sha256, maxAttempts: 1 });
  const boundedLease = await dailyRepo.claim("dailybar-failing-worker", new Date(taskClock + 2_000), 1_000);
  assert.equal(boundedLease?.taskId, boundedTask.task.taskId);
  assert.equal(await dailyRepo.retry(boundedTask.task.taskId, "dailybar-failing-worker", new Date(taskClock + 2_001), 0, "FIXED_FINAL_FAILURE"), "FAILED", "retry count must be bounded");
  const crashedScope = { ...completionScope, testRunId: "11111111-1111-4111-8111-111111111123" };
  const crashedFinalTask = await dailyRepo.enqueue({ scope: crashedScope, fixtureVersion: manifest.fixtureVersion, fixtureSha256: manifest.files[0].sha256, maxAttempts: 1 });
  const crashedFinalLease = await dailyRepo.claim("dailybar-crashed-final-worker", new Date(taskClock + 3_000), 1_000);
  assert.equal(crashedFinalLease?.taskId, crashedFinalTask.task.taskId);
  assert.equal(await dailyRepo.claim("dailybar-recovery-worker", new Date(taskClock + 4_000), 1_000), null, "expired final lease must fail closed rather than remain claimable");
  const crashedFinalState = await dailyRepo.latest(crashedScope);
  assert.equal(crashedFinalState?.task.state, "FAILED", "a crash on the final attempt must converge to FAILED after lease expiry");
  assert.equal(crashedFinalState?.task.lastError, "LEASE_EXPIRED_AFTER_MAX_ATTEMPTS");
  await pool.query("INSERT INTO market_data_schema_migrations(version, description) VALUES (20, 'future schema')");
  await assert.rejects(migrateMarketDataSchema(pool), /Unsupported Market Data schema version 20/);
  console.log(JSON.stringify({ status: "PASS", migrationLedger: "market_data_schema_migrations", concurrentStarts: 2, repeatStartup: "idempotent", unknownVersion: "rejected", componentSchemas: "present", legacyRow: "preserved", watchlist: { capacityCounts: [50, 80, restored.count], persisted: true, restartedRepositoryRead: true, max: restored.max, mandatoryOverflowBlocked: true, scopeIsolation: true, conflictPreservedPrevious: true }, sampling: { default: 30, persistedChoices: [20, 30], independentPolicies: policyBefore.map((item) => item.policyId), enabledPolicies: policyBefore.filter((item) => item.enabled).length, restartRecovery: true, taskIdempotency: true, taskRestartRecovery: true, leaseRecovery: true, boundedRetries: true, authorizationBlockPersisted: true, sourceHealth: health.map(({ sourceId, state, lastErrorCode }) => ({ sourceId, state, lastErrorCode })) }, dailyBars: { migrationVersion: 16, idempotency: true, leaseRecovery: true, retryDelay: true, boundedRetries: true, restartRecovery: true, ownerScopeIsolation: true, bars: completion.bars.length }, newsRevisions: { firstRevision: 1, secondRevision: 2, supersedesRevision: 1, duplicateIdempotent: true, restartRecovery: true, stableIdRequired: true } }));
} finally {
  await pool.end();
}
