import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { PostgresDailyBarCompletionRepository } from "../dist/adapters/postgres-daily-bar-completion-repository.js";
import { PostgresSamplingPolicyRepository } from "../dist/adapters/postgres-sampling-policy-repository.js";
import { DailyBarCloseScheduler } from "../dist/application/daily-bar-close-scheduler.js";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

assert.ok(process.env.MARKET_DATA_DATABASE_URL, "isolated PostgreSQL URL is required");
let child; let output = ""; let base;
const monitorEvents = [];
const monitor = createHttpServer(async (req, res) => { let raw = ""; for await (const chunk of req) raw += chunk; monitorEvents.push({ method: req.method, url: req.url, serviceId: req.headers["x-stockquant-service-id"], authorization: req.headers.authorization, payload: JSON.parse(raw || "{}") }); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ status: "UNAVAILABLE", taskId: monitorEvents.at(-1).payload.taskId, evaluationId: "quotequality:smoke" })); });
let monitorPort;
function capture(proc) { for (const stream of [proc.stdout, proc.stderr]) stream.on("data", (chunk) => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); }); }
async function start(port) {
  child = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: process.env.MARKET_DATA_DATABASE_URL, STOCKQUANT_MARKET_MONITOR_URL: `http://127.0.0.1:${monitorPort}`, STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR: "d".repeat(40), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", STOCKQUANT_SAMPLING_TASK_WORKER_INTERVAL_MS: "100", STOCKQUANT_SAMPLING_TASK_RETRY_DELAY_MS: "0", STOCKQUANT_DAILY_BAR_WORKER_INTERVAL_MS: "100", STOCKQUANT_DAILY_BAR_WORKER_RETRY_DELAY_MS: "0", ...marketDataSmokeAuthEnv }, stdio: ["ignore", "pipe", "pipe"] });
  capture(child);
  for (let i = 0; i < 100; i += 1) { if (child.exitCode !== null) throw new Error(`Market Data exited: ${output}`); try { if ((await fetch(`${base}/ready`)).ok) return; } catch {} await delay(100); }
  throw new Error(`Market Data did not become ready: ${output}`);
}
async function stop() { if (!child || child.exitCode !== null) return; child.kill("SIGTERM"); await Promise.race([new Promise((done) => child.once("close", done)), delay(3000)]); if (child.exitCode === null) child.kill("SIGKILL"); child = undefined; }
async function request(method, intervalMinutes) { return fetch(`${base}/v2/sampling`, { method, headers: { ...marketDataSmokeAuthHeaders, ...(method === "PUT" ? { "content-type": "application/json" } : {}) }, ...(method === "PUT" ? { body: JSON.stringify({ intervalMinutes }) } : {}), signal: AbortSignal.timeout(5000) }); }
async function read(path) { return fetch(`${base}${path}`, { headers: marketDataSmokeAuthHeaders, signal: AbortSignal.timeout(5000) }); }
async function post(path, body) { return fetch(`${base}${path}`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) }); }
async function put(path, body) { return fetch(`${base}${path}`, { method: "PUT", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) }); }
async function waitUntil(readValue, expectedState) { for (let i = 0; i < 50; i += 1) { const value = await readValue(); if (value?.state === expectedState) return value; await delay(100); } throw new Error(`sampling lifecycle did not reach ${expectedState}`); }

await new Promise((resolve, reject) => { monitor.once("error", reject); monitor.listen(0, "127.0.0.1", () => { monitorPort = monitor.address().port; resolve(); }); });
const listener = createServer();
const port = await new Promise((resolvePort, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const selected = listener.address().port; listener.close((error) => error ? reject(error) : resolvePort(selected)); }); });
base = `http://127.0.0.1:${port}`;
try {
  await start(port);
  const ready = await read("/ready"); const readyBody = await ready.json();

  assert.equal(readyBody.samplingTaskWorker.enabled, true, "sampling lifecycle worker should poll after database migration");
  assert.equal(readyBody.dailyBarCompletionWorker.enabled, true, "daily-bar completion worker should poll after queue migration");
  assert.equal(readyBody.dailyBarCloseScheduler.enabled, true, "close scheduler should poll after schema v18 migration");
  assert.equal(readyBody.monitorOutboxWorker.enabled, true, "Monitor outbox consumer should poll after v17 migration");
  const initialSampling = await request("GET"); const initialSamplingBody = await initialSampling.json();
  assert.equal(initialSampling.status, 200); assert.equal(initialSamplingBody.policies.length, 5);
  assert.equal(initialSamplingBody.policies.every((policy) => policy.enabled === false), true, "every independent schedule remains disabled until its activation gate is met");
  assert.deepEqual(initialSamplingBody.policies.map((policy) => policy.policyId), ["snapshotSampling", "monitorEvaluation", "dailyBarCompletion", "strategyEvaluation", "orderExecution"]);
  const newsFixtureResponse = await read("/v2/news/preview"); const newsFixture = await newsFixtureResponse.json();
  assert.equal(newsFixtureResponse.status, 200); assert.equal(newsFixture.dataMode, "FIXTURE"); assert.equal(newsFixture.items[0].publishedAt, null); assert.equal(newsFixture.items[0].revisionStatus, "UNVERIFIED_NO_STABLE_SOURCE_ID");
  assert.equal((await read("/v2/news/live")).status, 403, "real news remains blocked when source authorization is absent");
  assert.equal((await read("/v2/quote/preview")).status, 403, "real quotes remain blocked when source authorization is absent");
  const changed = await request("PUT", 20); const changedBody = await changed.json(); assert.equal(changed.status, 200); assert.equal(changedBody.intervalMinutes, 20);
  assert.equal(changedBody.policies.find((policy) => policy.policyId === "snapshotSampling").intervalMinutes, 20);
  assert.equal(changedBody.policies.find((policy) => policy.policyId === "snapshotSampling").version, changedBody.settingsVersion);
  assert.equal(changedBody.policies.find((policy) => policy.policyId === "monitorEvaluation").version, 1, "changing snapshot interval must not mutate monitor policy version");
  const scope = { market: "CN_A", ownerId: "sampling-owner", accountId: "11111111-1111-4111-8111-111111111112", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111113" };
  const watchlist = await put("/v2/watchlist/scoped", { ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId, holdings: [], inFlightOrders: [], candidates: ["600000.SH", "000001.SZ"] });
  assert.equal(watchlist.status, 200); assert.deepEqual((await watchlist.json()).securities, ["600000.SH", "000001.SZ"]);
  const dailyScheduleOn = await put("/v2/daily-bars/schedules", { enabled: true, scope }); assert.equal(dailyScheduleOn.status, 200); const dailyScheduleOnBody = await dailyScheduleOn.json(); assert.equal(dailyScheduleOnBody.enabled, true); assert.equal(dailyScheduleOnBody.enabledScopes, 1); assert.equal(dailyScheduleOnBody.externalRequests, 0); assert.equal(dailyScheduleOnBody.placeOrders, false);
  const dailyScheduleOff = await put("/v2/daily-bars/schedules", { enabled: false, scope }); assert.equal(dailyScheduleOff.status, 200); assert.equal((await dailyScheduleOff.json()).enabledScopes, 0);
  const tick = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "tencent-quote" }); const tickBody = await tick.json();
  assert.equal(tick.status, 200); assert.equal(tickBody.decision.status, "ELIGIBLE"); assert.equal(tickBody.task.status, "QUEUED"); assert.equal(tickBody.externalRequests, 0);
  assert.equal(tickBody.task.dataMode, "REAL"); assert.equal(tickBody.task.sourceId, "tencent-quote"); assert.match(tickBody.task.taskId, /:REAL:tencent-quote:/u);
  const retriedTick = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "tencent-quote" }); assert.equal((await retriedTick.json()).task.created, false, "same-source tick retry must return existing task");
  const otherSourceTick = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "sina-quote" }); const otherSourceTickBody = await otherSourceTick.json();
  assert.equal(otherSourceTick.status, 200); assert.equal(otherSourceTickBody.task.sourceId, "sina-quote"); assert.notEqual(otherSourceTickBody.task.taskId, tickBody.task.taskId, "different sources at the same instant must have different task identities");
  const invalidSourceTick = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "unregistered-quote" });
  assert.equal(invalidSourceTick.status, 422); assert.equal((await invalidSourceTick.json()).code, "INVALID_QUOTE_SOURCE_ID");
  const scopedTick = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "tencent-quote", scope }); const scopedTickBody = await scopedTick.json();
  assert.equal(scopedTick.status, 200); assert.notEqual(scopedTickBody.task.taskId, tickBody.task.taskId); assert.deepEqual(scopedTickBody.task.securityIds, ["600000.SH", "000001.SZ"]); assert.equal(scopedTickBody.task.scope.ownerId, scope.ownerId);
  const mismatchedNamespace = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:50:00.000Z", sourceId: "tencent-quote", scope: { ...scope, namespace: "paper:OTHER" } });
  assert.equal(mismatchedNamespace.status, 409); assert.equal((await mismatchedNamespace.json()).code, "SAMPLING_SCOPE_CONFLICT");
  const mismatchedFixtureInstant = await post("/v2/sampling/tasks/tick-fixture", { scheduledAt: "2026-10-16T02:10:00.000Z" });
  assert.equal(mismatchedFixtureInstant.status, 200, "HTTP should queue fixture work without parsing it synchronously");
  const fixtureTick = await post("/v2/sampling/tasks/tick-fixture", { scheduledAt: "2026-10-16T01:50:00.000Z", scope }); const fixtureTickBody = await fixtureTick.json();
  assert.equal(fixtureTick.status, 200); assert.equal(fixtureTickBody.task.status, "QUEUED"); assert.equal(fixtureTickBody.dataMode, "FIXTURE"); assert.equal(fixtureTickBody.task.dataMode, "FIXTURE"); assert.equal(fixtureTickBody.externalRequests, 0);
  const retriedFixtureTick = await post("/v2/sampling/tasks/tick-fixture", { scheduledAt: "2026-10-16T01:50:00.000Z", scope }); assert.equal((await retriedFixtureTick.json()).task.created, false, "Fixture tick retry must return the durable result");
  const dailyBarCompletionResponse = await post("/v2/daily-bars/fixture/complete", { scope }); const dailyBarCompletionBody = await dailyBarCompletionResponse.json();
  assert.equal(dailyBarCompletionResponse.status, 200); assert.equal(dailyBarCompletionBody.task.state, "QUEUED"); assert.equal(dailyBarCompletionBody.dataMode, "FIXTURE"); assert.equal(dailyBarCompletionBody.externalRequests, 0); assert.equal(dailyBarCompletionBody.placeOrders, false); assert.equal(dailyBarCompletionBody.created, true);
  const repeatedDailyBar = await post("/v2/daily-bars/fixture/complete", { scope }); const repeatedDailyBody = await repeatedDailyBar.json(); assert.equal(repeatedDailyBody.created, false, "fixture completion retry must be idempotent"); assert.equal(repeatedDailyBody.task.taskId, dailyBarCompletionBody.task.taskId);
  const invalidDailyScope = await post("/v2/daily-bars/fixture/complete", { scope: { ...scope, testRunId: "invalid" } }); assert.equal(invalidDailyScope.status, 422);
  const mismatchedDailyScope = { ...scope, accountId: "11111111-1111-4111-8111-111111111120", testRunId: "11111111-1111-4111-8111-111111111121" };
  await put("/v2/watchlist/scoped", { ownerId: mismatchedDailyScope.ownerId, accountId: mismatchedDailyScope.accountId, namespace: mismatchedDailyScope.namespace, testRunId: mismatchedDailyScope.testRunId, holdings: [], inFlightOrders: [], candidates: ["600000.SH"] });
  const coverageMismatch = await post("/v2/daily-bars/fixture/complete", { scope: mismatchedDailyScope }); assert.equal(coverageMismatch.status, 409); assert.equal((await coverageMismatch.json()).code, "DAILY_BAR_FIXTURE_SCOPE_COVERAGE_MISMATCH");
  const dailyLatestPath = `/v2/daily-bars/completions/latest?${new URLSearchParams({ ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId })}`;
  async function waitDailyBarCompletion() { for (let attempt = 0; attempt < 50; attempt += 1) { const response = await read(dailyLatestPath); const value = await response.json(); if (value.task?.taskId === dailyBarCompletionBody.task.taskId && ["COMPLETED", "FAILED"].includes(value.task.state)) return value; await delay(100); } throw new Error("daily-bar completion Worker did not reach a terminal state"); }
  const dailyCompletedBeforeRestart = await waitDailyBarCompletion();
  assert.equal(dailyCompletedBeforeRestart.task.state, "COMPLETED"); assert.equal(dailyCompletedBeforeRestart.completion.status, "COMPLETED_FIXTURE"); assert.equal(dailyCompletedBeforeRestart.completion.dataMode, "FIXTURE"); assert.equal(dailyCompletedBeforeRestart.completion.bars.length, 2);
  const scheduledScope = { market: "CN_A", ownerId: "daily-scheduler-owner", accountId: "11111111-1111-4111-8111-111111111130", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111131" };
  await put("/v2/watchlist/scoped", { ownerId: scheduledScope.ownerId, accountId: scheduledScope.accountId, namespace: scheduledScope.namespace, testRunId: scheduledScope.testRunId, holdings: [], inFlightOrders: [], candidates: ["600000.SH", "000001.SZ"] });
  const enableSchedule = await put("/v2/daily-bars/schedules", { enabled: true, scope: scheduledScope }); assert.equal(enableSchedule.status, 200);
  const schedulePool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  let closeTick; let closeRetry;
  try {
    const dailyRepository = new PostgresDailyBarCompletionRepository(schedulePool);
    const policyRepository = new PostgresSamplingPolicyRepository(schedulePool);
    const scheduler = new DailyBarCloseScheduler(dailyRepository, dailyRepository, async () => (await policyRepository.list()).find((item) => item.policyId === "dailyBarCompletion")?.enabled === true, { now: () => new Date("2026-10-16T07:01:00.000Z") }, "daily-close-smoke", { version: "v2.1-daily-bars-1", sha256: "b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4", sessionDate: "2026-10-16" });
    closeTick = await scheduler.tick(); closeRetry = await scheduler.tick();
  } finally { await schedulePool.end(); }
  assert.deepEqual(closeTick, { state: "SCHEDULED", sessionDate: "2026-10-16", enqueued: 1 });
  assert.deepEqual(closeRetry, { state: "ALREADY_SCHEDULED", sessionDate: "2026-10-16", enqueued: 0 }, "repeat close poll must not schedule a second task");
  const scheduledLatestPath = `/v2/daily-bars/completions/latest?${new URLSearchParams({ ownerId: scheduledScope.ownerId, accountId: scheduledScope.accountId, namespace: scheduledScope.namespace, testRunId: scheduledScope.testRunId })}`;
  let scheduledLatest; for (let i = 0; i < 50; i += 1) { scheduledLatest = await (await read(scheduledLatestPath)).json(); if (scheduledLatest?.task?.state === "COMPLETED") break; await delay(100); }
  assert.equal(scheduledLatest.task.state, "COMPLETED"); assert.equal(scheduledLatest.completion.dataMode, "FIXTURE"); assert.equal(scheduledLatest.completion.sessionDate, "2026-10-16");
  const policiesAfterDailyBar = (await (await read("/v2/sampling")).json()).policies;
  const strategyAfterDailyBar = policiesAfterDailyBar.find((policy) => policy.policyId === "strategyEvaluation");
  const orderAfterDailyBar = policiesAfterDailyBar.find((policy) => policy.policyId === "orderExecution");
  assert.equal(strategyAfterDailyBar.enabled, false, "DAILY_BAR completion must not implicitly enable strategy evaluation");
  assert.equal(strategyAfterDailyBar.trigger, "ON_DAILY_BAR_READY");
  assert.equal(strategyAfterDailyBar.activationGate, "OD007_APPROVAL");
  assert.equal(strategyAfterDailyBar.executor, "NOT_IMPLEMENTED", "OD-007 remains an explicit strategy consumer gate");
  assert.equal(orderAfterDailyBar.enabled, false, "DAILY_BAR completion must not implicitly enable order execution");
  assert.equal(orderAfterDailyBar.trigger, "C5_EXECUTION_WINDOW");
  assert.equal(orderAfterDailyBar.activationGate, "C5_APPROVAL");
  assert.equal(orderAfterDailyBar.executor, "NOT_IMPLEMENTED", "C5 remains an explicit order consumer gate");
  assert.equal((await (await read("/v2/sampling")).json()).placeOrders, false, "daily-bar completion must not create orders");
  const disableSchedule = await put("/v2/daily-bars/schedules", { enabled: false, scope: scheduledScope }); assert.equal(disableSchedule.status, 200); assert.equal((await disableSchedule.json()).enabledScopes, 0);
  const newsIngest = await post("/v2/news/fixture/ingest", {}); const newsIngestBody = await newsIngest.json();
  assert.equal(newsIngest.status, 200); assert.equal(newsIngestBody.fixtureVersion, "v2.1-news-revisions-1");
  const newsHistory = await read("/v2/news/fixture/history"); const newsHistoryBody = await newsHistory.json();
  assert.equal(newsHistory.status, 200); assert.equal(newsHistoryBody.histories.filter((item) => item.sourceItemId === "notice-001").length, 2);
  assert.equal(newsHistoryBody.histories[0].revisionStatus, "VERIFIED_STABLE_SOURCE_ID");
  assert.equal((await request("PUT", 25)).status, 422, "unsupported intervals must be rejected");
  await stop(); output = ""; await start(port);
  const restored = await request("GET"); const body = await restored.json();
  assert.equal(restored.status, 200); assert.equal(body.intervalMinutes, 20); assert.equal(body.persistence, "POSTGRESQL"); assert.equal(body.placeOrders, false);
  assert.equal(body.policies.length, 5); assert.equal(body.policies.find((policy) => policy.policyId === "snapshotSampling").intervalMinutes, 20);
  assert.equal(body.policies.find((policy) => policy.policyId === "orderExecution").enabled, false);
  const restoredDaily = await read(dailyLatestPath); const restoredDailyBody = await restoredDaily.json();
  assert.equal(restoredDaily.status, 200); assert.equal(restoredDailyBody.task.taskId, dailyBarCompletionBody.task.taskId); assert.equal(restoredDailyBody.task.state, "COMPLETED"); assert.equal(restoredDailyBody.completion.completionId, dailyCompletedBeforeRestart.completion.completionId); assert.equal(restoredDailyBody.completion.bars.length, 2, "daily-bar completion result must survive service restart");
  const sessionsQuery = new URLSearchParams({ ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId, sourceId: restoredDailyBody.completion.sourceId, dataVersion: restoredDailyBody.completion.dataVersion, dataMode: "FIXTURE", asOf: "2026-10-17T00:00:00Z" });
  sessionsQuery.append("sessionDate", "2026-10-15"); sessionsQuery.append("sessionDate", "2026-10-16");
  const sessionsPath = `/v2/daily-bars/completions/sessions?${sessionsQuery}`;
  assert.equal((await fetch(`${base}${sessionsPath}`)).status, 401, "session read requires service identity");
  const sessionsResponse = await read(sessionsPath); assert.equal(sessionsResponse.status, 200); assert.deepEqual(await sessionsResponse.json(), { completions: null }, "one session cannot satisfy a two-session query");
  sessionsQuery.delete("sessionDate"); sessionsQuery.append("sessionDate", "2026-10-16"); sessionsQuery.append("sessionDate", "2026-10-15");
  assert.equal((await read(`/v2/daily-bars/completions/sessions?${sessionsQuery}`)).status, 422, "reversed sessions fail closed");
  const pairScope = { market: "CN_A", ownerId: scope.ownerId, accountId: "11111111-1111-4111-8111-111111111114", namespace: "c5-pair-fixture", testRunId: "11111111-1111-4111-8111-111111111115" };
  const pairWatchlist = await put("/v2/watchlist/scoped", { ownerId: pairScope.ownerId, accountId: pairScope.accountId, namespace: pairScope.namespace, testRunId: pairScope.testRunId, holdings: [], inFlightOrders: [], candidates: ["600000.SH"] }); assert.equal(pairWatchlist.status, 200);
  for (const fixtureVersion of ["v24-c5-prior-20261014-1", "v24-c5-prior-20261015-1"]) {
    const queued = await post("/v2/daily-bars/fixture/complete", { scope: pairScope, fixtureVersion }); assert.equal(queued.status, 200);
  }
  const pairQuery = new URLSearchParams({ ownerId: pairScope.ownerId, accountId: pairScope.accountId, namespace: pairScope.namespace, testRunId: pairScope.testRunId, sourceId: "fixture:v24-c5-prior-daily-1", dataVersion: "v24-c5-prior-daily-1", dataMode: "FIXTURE", asOf: "2026-10-15T15:10:00+08:00" });
  pairQuery.append("sessionDate", "2026-10-14"); pairQuery.append("sessionDate", "2026-10-15");
  let pair; for (let i = 0; i < 50; i += 1) { pair = await (await read(`/v2/daily-bars/completions/sessions?${pairQuery}`)).json(); if (pair.completions) break; await delay(100); }
  assert.deepEqual(pair.completions?.map((completion) => [completion.sessionDate, completion.bars[0].close]), [["2026-10-14", "10.0000"], ["2026-10-15", "10.2500"]]);
  pairQuery.set("asOf", "2026-10-15T15:04:30+08:00");
  assert.equal((await (await read(`/v2/daily-bars/completions/sessions?${pairQuery}`)).json()).completions, null, "future completion must not be returned");
  const localScope = { market: "CN_A", ownerId: scope.ownerId, accountId: "11111111-1111-4111-8111-111111111116", namespace: "c5-local-multiday-fixture", testRunId: "11111111-1111-4111-8111-111111111117" };
  assert.equal((await put("/v2/watchlist/scoped", { ownerId: localScope.ownerId, accountId: localScope.accountId, namespace: localScope.namespace, testRunId: localScope.testRunId, holdings: [], inFlightOrders: [], candidates: ["600000.SH"] })).status, 200);
  const localDates = ["20240102", "20240103", "20240104", "20240105", "20240108", "20240109", "20240110"];
  for (const date of localDates) {
    const fixtureVersion = `v24-c5-local-daily-${date}-1`;
    const queued = await post("/v2/daily-bars/fixture/complete", { scope: localScope, fixtureVersion });
    assert.equal(queued.status, 200, `local daily task ${date}: ${await queued.text()}`);
  }
  const localDb = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  let localRows;
  try {
    for (let i = 0; i < 150; i += 1) {
      localRows = await localDb.query("SELECT session_date::text AS date,result_json->'bars'->0->>'close' AS close,completion_id FROM market_data_daily_bar_completion_tasks WHERE scope_json->>'testRunId'=$1 AND source_id='fixture:v24-c5-local-daily-1' ORDER BY session_date", [localScope.testRunId]);
      if (localRows.rowCount === 7) break;
      await delay(100);
    }
  } finally { await localDb.end(); }
  assert.deepEqual(localRows.rows.map(({ date, close }) => [date, close]), [["2024-01-02", "10.0000"], ["2024-01-03", "10.2500"], ["2024-01-04", "10.0000"], ["2024-01-05", "10.0000"], ["2024-01-08", "10.0000"], ["2024-01-09", "10.0000"], ["2024-01-10", "10.0000"]]);
  assert.equal(new Set(localRows.rows.map((row) => row.completion_id)).size, 7);
  const localQuery = new URLSearchParams({ ownerId: localScope.ownerId, accountId: localScope.accountId, namespace: localScope.namespace, testRunId: localScope.testRunId, sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", dataMode: "FIXTURE", asOf: "2024-01-05T15:10:00+08:00" });
  localQuery.append("sessionDate", "2024-01-04"); localQuery.append("sessionDate", "2024-01-05");
  const localPair = await (await read(`/v2/daily-bars/completions/sessions?${localQuery}`)).json();
  assert.deepEqual(localPair.completions?.map((item) => item.completionId), localRows.rows.slice(2, 4).map((row) => row.completion_id));
  localQuery.set("asOf", "2024-01-05T15:04:59+08:00");
  assert.equal((await (await read(`/v2/daily-bars/completions/sessions?${localQuery}`)).json()).completions, null);
  const otherDailyScope = new URLSearchParams({ ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: "11111111-1111-4111-8111-111111111199" });
  assert.equal((await (await read(`/v2/daily-bars/completions/latest?${otherDailyScope}`)).json()).completion, null, "daily-bar result must remain isolated to the current TestRun");
  const latestQuery = new URLSearchParams({ ownerId: scope.ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId });
  const restoredTaskPath = `/v2/sampling/tasks/latest?${latestQuery}`;
  const failedFixtureExecution = await waitUntil(async () => (await (await read("/v2/sampling/tasks/latest")).json()).execution, "FAILED");
  assert.equal(failedFixtureExecution.state, "FAILED", "worker should reject a fixture whose observation instant differs from the frozen schedule");
  const completedFixtureExecutionBeforeRestart = await waitUntil(async () => (await (await read(restoredTaskPath)).json()).execution, "COMPLETED");
  const completedTaskBeforeRestart = await read(restoredTaskPath); const completedTaskBeforeRestartBody = await completedTaskBeforeRestart.json();
  assert.equal(completedTaskBeforeRestartBody.task.status, "COMPLETED_FIXTURE"); assert.equal(completedTaskBeforeRestartBody.task.observations.length, 2); assert.match(completedTaskBeforeRestartBody.task.fixtureSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(completedTaskBeforeRestartBody.task.observations.map((item) => item.sourceId), ["fixture:v2.1-snapshot-sampling-1", "fixture:v2.1-snapshot-sampling-1"]);
  assert.ok(completedTaskBeforeRestartBody.task.observations.every((item) => item.dataMode === "FIXTURE" && item.observedAt === "2026-10-16T01:50:00.000Z" && item.ingestedAt === "2026-10-16T02:00:00.000Z" && item.availableAt === "2026-10-16T02:00:00.000Z" && item.freshness === "FRESH" && item.status === "READY" && item.ageSeconds === 600), "frozen Fixture observations must use their deterministic business availability and remain READY");
  assert.equal(completedTaskBeforeRestartBody.execution.state, completedFixtureExecutionBeforeRestart.state);
  const completedFixtureExecution = await waitUntil(async () => (await (await read(restoredTaskPath)).json()).execution, "COMPLETED");
  const restoredTask = await read(restoredTaskPath); const restoredTaskBody = await restoredTask.json();
  assert.equal(restoredTaskBody.task.taskId, fixtureTickBody.task.taskId); assert.equal(restoredTaskBody.task.status, "COMPLETED_FIXTURE"); assert.equal(restoredTaskBody.task.dataMode, "FIXTURE"); assert.equal(restoredTaskBody.task.observations.length, 2); assert.equal(restoredTaskBody.task.fixtureVersion, "v2.1-snapshot-sampling-1");
  assert.equal(restoredTaskBody.execution.state, completedFixtureExecution.state, "background worker must recover and commit the fixture task lifecycle after restart");
  const policiesAfterSnapshot = (await (await read("/v2/sampling")).json()).policies;
  const monitorPolicyBeforeEnable = policiesAfterSnapshot.find((item) => item.policyId === "monitorEvaluation");
  assert.equal(monitorPolicyBeforeEnable.enabled, false, "Monitor must remain disabled until explicitly enabled");
  assert.equal(monitorPolicyBeforeEnable.executor, "CONFIGURED", "the independent Monitor consumer is wired");
  const dailyPolicy = policiesAfterSnapshot.find((item) => item.policyId === "dailyBarCompletion");
  assert.equal(dailyPolicy.enabled, false, "DAILY_BAR must remain opt-in after snapshot completion");
  assert.equal(dailyPolicy.executor, "CONFIGURED", "independent close scheduler is wired");
  for (const policyId of ["strategyEvaluation", "orderExecution"]) {
    const policy = policiesAfterSnapshot.find((item) => item.policyId === policyId);
    assert.equal(policy.enabled, false, `${policyId} must remain independently disabled after snapshot completion`);
    assert.equal(policy.executor, "NOT_IMPLEMENTED", `${policyId} must not claim a configured consumer`);
  }
  const queuedEvents = await put("/v2/sampling/monitor-policy", { enabled: true });
  assert.equal(queuedEvents.status, 200);
  const enabledPolicy = (await queuedEvents.json()).policy;
  assert.equal(enabledPolicy.enabled, true);
  assert.equal(enabledPolicy.version, monitorPolicyBeforeEnable.version + 1);
  for (let attempt = 0; attempt < 50 && monitorEvents.length === 0; attempt += 1) await delay(100);
  assert.equal(monitorEvents.length, 1, "enabled ON_QUOTE_AVAILABLE consumer should deliver the pending completed task once");
  assert.equal(monitorEvents[0].method, "POST");
  assert.equal(monitorEvents[0].url, "/v1/quote-quality/evaluations");
  assert.equal(monitorEvents[0].serviceId, "market-data-service");
  assert.equal(monitorEvents[0].authorization, `Bearer ${"d".repeat(40)}`);
  assert.equal(monitorEvents[0].payload.taskId, fixtureTickBody.task.taskId);
  assert.deepEqual(monitorEvents[0].payload.scope, { ...scope, accountId: scope.accountId, testRunId: scope.testRunId });
  assert.equal(monitorEvents[0].payload.observations.length, 2);
  assert.equal(monitorEvents[0].payload.observations[0].freshness, "FRESH");
  assert.ok(Object.hasOwn(monitorEvents[0].payload.observations[0], "ingestedAt"), "Outbox must preserve source ingestion time");
  assert.equal(Object.hasOwn(monitorEvents[0].payload.observations[0], "price"), false, "Monitor handoff must omit quote prices");
  const disabledPolicy = await put("/v2/sampling/monitor-policy", { enabled: false });
  assert.equal(disabledPolicy.status, 200);
  assert.equal(restoredTaskBody.task.status, "COMPLETED_FIXTURE", "snapshot completion must remain a quote result and must not become a daily bar or strategy/order trigger");
  const blockedExecution = await waitUntil(async () => { const response = await post("/v2/sampling/tasks/tick", { scheduledAt: "2026-10-16T01:30:00.000Z", sourceId: "tencent-quote" }); return (await response.json()).execution; }, "BLOCKED_SOURCE_AUTHORIZATION");
  const restoredBlockedTickBody = { execution: blockedExecution };
  assert.equal(restoredBlockedTickBody.execution.state, "BLOCKED_SOURCE_AUTHORIZATION", "background worker must persist the source gate without contacting a provider");
  const sourceInventoryResponse = await read("/v2/sources"); const sourceInventory = await sourceInventoryResponse.json();
  const tencentSource = sourceInventory.sources.find((source) => source.sourceId === "tencent-quote");
  assert.equal(sourceInventoryResponse.status, 200); assert.equal(tencentSource.samplingHealth.state, "BLOCKED_SOURCE_AUTHORIZATION");
  assert.equal(tencentSource.samplingHealth.lastErrorCode, "SOURCE_AUTHORIZATION_REQUIRED");
  assert.equal(tencentSource.circuit, "HEALTHY", "manual breaker state must remain separate from durable provider authorization health");
  assert.equal(sourceInventory.sources.find((source) => source.sourceId === "eastmoney-news").samplingHealth, null, "news inventory must not report quote sampling health");
  const repeatedIngest = await post("/v2/news/fixture/ingest", {}); const repeatedIngestBody = await repeatedIngest.json();
  assert.equal(repeatedIngestBody.records.filter((item) => item.created).length, 0, "restarting and replaying a Fixture must not duplicate revisions");
  const c5RunId = "11111111-1111-4111-8111-111111111141";
  const c5Scope = { market: "CN_A", ownerId: "c5-snapshot-http-owner", accountId: "11111111-1111-4111-8111-111111111142", namespace: `v24-paper-v2-${c5RunId}`, testRunId: c5RunId };
  const c5Query = new URLSearchParams({ ownerId: c5Scope.ownerId, accountId: c5Scope.accountId, namespace: c5Scope.namespace, testRunId: c5Scope.testRunId, sessionDate: "2024-01-04", evaluatedAt: "2024-01-04T09:31:50+08:00" });
  const c5Path = `/v2/sampling/c5-local/selection?${c5Query}`;
  const c5Unauthorized = await fetch(`${base}${c5Path}`); assert.equal(c5Unauthorized.status, 401);
  const c5WriteUnauthorized = await fetch(`${base}/v2/sampling/c5-local/plan`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scope: c5Scope, sessionDate: "2024-01-04" }) }); assert.equal(c5WriteUnauthorized.status, 401);
  const c5Initial = await read(c5Path); assert.equal((await c5Initial.json()).status, "WAITING");
  const c5Created = await post("/v2/sampling/c5-local/plan", { scope: c5Scope, sessionDate: "2024-01-04" }); const c5CreatedBody = await c5Created.json();
  assert.equal(c5Created.status, 200); assert.equal(c5CreatedBody.externalRequests, 0); assert.equal(c5CreatedBody.placeOrders, false);
  const c5Replay = await post("/v2/sampling/c5-local/plan", { scope: c5Scope, sessionDate: "2024-01-04" }); assert.equal((await c5Replay.json()).created, false);
  let c5Selected;
  for (let i = 0; i < 50; i += 1) { const response = await read(c5Path); c5Selected = await response.json(); if (c5Selected.status === "SELECTED") break; await delay(100); }
  assert.equal(c5Selected?.status, "SELECTED", `C5 local Worker did not complete: ${JSON.stringify(c5Selected)} ${output}`);
  assert.equal(c5Selected.observation.price, "10.2500"); assert.equal(c5Selected.taskId, c5CreatedBody.taskId);
  const c5SellQuery = new URLSearchParams(c5Query); c5SellQuery.set("sessionDate", "2024-01-05"); c5SellQuery.set("evaluatedAt", "2024-01-05T09:31:50+08:00");
  const c5SellPath = `/v2/sampling/c5-local/selection?${c5SellQuery}`;
  const c5Sell = await post("/v2/sampling/c5-local/plan", { scope: c5Scope, sessionDate: "2024-01-05" }); const c5SellBody = await c5Sell.json(); assert.equal(c5Sell.status, 200);
  let c5SellSelected;
  for (let i = 0; i < 50; i += 1) { c5SellSelected = await (await read(c5SellPath)).json(); if (c5SellSelected.status === "SELECTED") break; await delay(100); }
  assert.equal(c5SellSelected?.status, "SELECTED"); assert.equal(c5SellSelected.observation.price, "10.0000"); assert.equal(c5SellSelected.taskId, c5SellBody.taskId);
  const foreignC5 = new URLSearchParams(c5Query); foreignC5.set("ownerId", "foreign");
  assert.equal((await (await read(`/v2/sampling/c5-local/selection?${foreignC5}`)).json()).status, "WAITING");

  await stop(); output = ""; await start(port);
  const c5AfterRestart = await (await read(c5Path)).json(); assert.equal(c5AfterRestart.status, "SELECTED"); assert.equal(c5AfterRestart.taskId, c5CreatedBody.taskId); assert.equal(c5AfterRestart.observation.price, "10.2500");
  const c5SellAfterRestart = await (await read(c5SellPath)).json(); assert.equal(c5SellAfterRestart.status, "SELECTED"); assert.equal(c5SellAfterRestart.taskId, c5SellBody.taskId); assert.equal(c5SellAfterRestart.observation.price, "10.0000");
  console.log(JSON.stringify({ status: "PASS", defaultIntervalMinutes: 30, updatedIntervalMinutes: 20, invalidInterval: 422, processRestartRecovery: true, taskIdempotency: true, samplingTaskWorker: readyBody.samplingTaskWorker, sourceHealth: tencentSource.samplingHealth, manualCircuit: tencentSource.circuit, blockedTask: restoredBlockedTickBody.execution, fixtureTask: { task: restoredTaskBody.task, execution: restoredTaskBody.execution }, persistence: body.persistence, independentPolicies: body.policies, independentPoliciesDeclared: body.scheduleSeparation, monitorConsumer: { enabledByDefault: false, policyEnableDisable: [true, false], deliveredEvents: monitorEvents.length, serviceId: monitorEvents[0].serviceId, taskId: monitorEvents[0].payload.taskId, scoped: true, observations: monitorEvents[0].payload.observations.length, restartRecovery: true }, dailyBars: { closeScheduler: { closeTick, repeat: closeRetry, autoCompleted: scheduledLatest.task.state }, taskId: restoredDailyBody.task.taskId, completionId: restoredDailyBody.completion.completionId, state: restoredDailyBody.task.state, bars: restoredDailyBody.completion.bars.length, idempotency: true, worker: readyBody.dailyBarCompletionWorker, restartRecovery: true, scopeIsolation: true }, newsFixture: { version: newsIngestBody.fixtureVersion, revisions: newsHistoryBody.histories.length, repeatedIngestIdempotent: true }, liveNewsAndQuote: "BLOCKED_403", externalRequests: 0 }));
} finally { await stop(); await new Promise((resolve) => monitor.close(resolve)); }
