import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildHealthReport, createHealthReport, sourceFreshnessWindow } from "./dc08a-health-report.mjs";

test("health report reads enabled schedules independently from configured subscription", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dc08a-health-report-"));
  const output = join(directory, "report.json");
  const calls = [];
  const bodies = new Map([
    ["/ready", { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }],
    ["/v2/collection-scheduler/status", { status: "ENABLED", lastSuccessfulTickAt: "2026-09-20T03:59:00.000Z", nextExecutionAt: "2026-09-21T01:37:00.000Z" }],
    ["/v2/minute/sources", { sources: [{ status: "PASS", circuit: "HEALTHY" }] }],
    ["/v2/collection/health?subscriptionId=configured-id", { openGaps: 0, pendingOutbox: 0 }],
    ["/v2/calendar/cn-a-share/2026-09-20", { status: "CLOSED" }],
    ["/v2/collection-schedules", { schedules: [] }],
  ]);
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const path = new URL(url).pathname + new URL(url).search;
    const body = bodies.get(path);
    return { ok: body !== undefined, json: async () => body };
  };

  try {
    const { report } = await createHealthReport({ baseUrl: "http://market-data.test", configuredSubscriptionId: "configured-id", output, fetchImpl, headers: { authorization: "Bearer test" }, now: new Date("2026-09-20T04:00:00.000Z") });
    assert.equal(report.status, "UNHEALTHY");
    assert.equal(report.configuredSubscriptionId, "configured-id");
    assert.equal(report.subscriptions.enabledCount, 0);
    assert.equal(calls.some(({ url }) => url.endsWith("/v2/collection-schedules")), true);
    assert.equal(calls.find(({ url }) => url.endsWith("/v2/collection-schedules")).options.headers.authorization, "Bearer test");
    assert.deepEqual(JSON.parse(await readFile(output, "utf8")), report);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("health report includes recent success and next trigger", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", configuredSubscriptionId: "sub", enabledSubscriptionCount: 1, ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: "2026-09-18T01:30:00.000Z", lastSubmitted: 48 }, sources: [{ status: "PASS", circuit: "HEALTHY" }], quality: { openGaps: 0, pendingOutbox: 0 } });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.checks.recentSuccessRecorded, true);
  assert.equal(report.scheduler.lastSubmitted, 48);
  assert.equal(report.configuredSubscriptionId, "sub");
  assert.equal(report.subscriptions.enabledCount, 1);
  assert.equal(Object.hasOwn(report, "activeSubscription"), false);
});

test("stale scheduler tick makes the report unhealthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T10:00:00.000Z", nextExecutionAt: null }, now: new Date("2026-09-17T12:00:00.000Z"), maxTickAgeSeconds: 1800 });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.checks.recentSuccessRecorded, false);
});

test("open source circuits make the report unhealthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: null }, sources: [{ status: "CONFIGURED", circuit: "OPEN" }] });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.checks.sourceReady, false);
});

test("missing quality data is never treated as healthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: null }, sources: [{ status: "PASS", circuit: "HEALTHY" }] });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.quality.openGaps, null);
});

test("minute source CLOSED circuit is healthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", enabledSubscriptionCount: 1, ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: "2026-09-18T01:30:00.000Z" }, sources: [{ sourceId: "sina", circuit: "CLOSED", lastSuccessAt: "2026-09-17T11:59:30.000Z" }], quality: { openGaps: 0, pendingOutbox: 0 } });
  assert.equal(report.status, "HEALTHY");
});

test("missing next trigger is not reported as recorded", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: null }, sources: [{ status: "PASS", circuit: "HEALTHY" }], quality: { openGaps: 0, pendingOutbox: 0 } });
  assert.equal(report.checks.nextTriggerRecorded, false);
});

const baseline = {
  enabledSubscriptionCount: 1,
  ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" },
  sources: [{ sourceId: "baostock", circuit: "OPEN" }, { sourceId: "sina", circuit: "CLOSED", lastSuccessAt: "2026-09-22T07:03:34.360Z" }],
  quality: { openGaps: 0, pendingOutbox: 0 },
  calendar: { status: "TRADING", calendarVersion: "sse-cn-a-share-2026-1", sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }] }
};

test("health requires exactly one enabled subscription and separates it from configuration", () => {
  const common = {
    capturedAt: "2026-09-17T12:00:00.000Z",
    configuredSubscriptionId: "configured-but-disabled",
    ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED", collectionSourceAuthorization: "AUTHORIZED" },
    scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: "2026-09-18T01:30:00.000Z" },
    sources: [{ status: "PASS", circuit: "HEALTHY" }],
    quality: { openGaps: 0, pendingOutbox: 0 },
  };
  const none = buildHealthReport({ ...common, enabledSubscriptionCount: 0 });
  assert.equal(none.status, "UNHEALTHY");
  assert.equal(none.configuredSubscriptionId, "configured-but-disabled");
  assert.equal(none.subscriptions.enabledCount, 0);
  assert.equal(none.checks.enabledSubscriptionCountValid, false);
  const one = buildHealthReport({ ...common, enabledSubscriptionCount: 1 });
  assert.equal(one.status, "HEALTHY");
  const duplicate = buildHealthReport({ ...common, enabledSubscriptionCount: 2 });
  assert.equal(duplicate.status, "UNHEALTHY");
  assert.equal(duplicate.checks.enabledSubscriptionCountValid, false);
  const unavailable = buildHealthReport(common);
  assert.equal(unavailable.subscriptions.enabledCount, null);
  assert.equal(unavailable.status, "UNHEALTHY");
});

test("completed trading day does not flag a stale source after close", () => {
  const capturedAt = "2026-09-22T09:45:41.454Z";
  const report = buildHealthReport({ ...baseline, capturedAt, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T09:45:25.491Z", nextExecutionAt: "2026-09-23T01:37:00.000Z" } });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.calendar.sourceFreshnessExpected, false);
  assert.equal(report.checks.sourceReady, true);
});

test("a stale source remains unhealthy during a trading session", () => {
  const capturedAt = "2026-09-22T06:30:00.000Z";
  const report = buildHealthReport({ ...baseline, capturedAt, sources: [{ sourceId: "sina", circuit: "CLOSED", lastSuccessAt: "2026-09-22T05:00:00.000Z" }], scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T06:29:00.000Z", nextExecutionAt: "2026-09-22T06:37:00.000Z" } });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.calendar.sourceFreshnessExpected, true);
  assert.equal(report.checks.sourceReady, false);
});

test("lunch break uses circuit readiness while missing or open sources still fail", () => {
  const capturedAt = "2026-09-22T04:30:00.000Z";
  const scheduler = { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T04:29:00.000Z", nextExecutionAt: "2026-09-22T05:07:00.000Z" };
  const healthy = buildHealthReport({ ...baseline, capturedAt, scheduler });
  assert.equal(healthy.status, "HEALTHY");
  assert.equal(healthy.calendar.sourceFreshnessExpected, false);
  const unavailable = buildHealthReport({ ...baseline, capturedAt, scheduler, sources: [{ sourceId: "baostock", circuit: "OPEN" }] });
  assert.equal(unavailable.status, "UNHEALTHY");
});

test("opening and afternoon initial windows wait for a collection completion deadline", () => {
  const calendar = baseline.calendar;
  assert.deepEqual(sourceFreshnessWindow(calendar, new Date("2026-09-22T01:31:00.000Z")), { expected: false, state: "WAITING_INITIAL_WINDOW", localTime: "09:31" });
  assert.deepEqual(sourceFreshnessWindow(calendar, new Date("2026-09-22T05:01:00.000Z")), { expected: false, state: "WAITING_INITIAL_WINDOW", localTime: "13:01" });
});

test("source and scheduler freshness use independent limits", () => {
  const capturedAt = "2026-09-22T06:30:00.000Z";
  const report = buildHealthReport({ ...baseline, capturedAt, sources: [{ sourceId: "sina", circuit: "CLOSED", lastSuccessAt: "2026-09-22T06:01:00.000Z" }], scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T06:29:00.000Z", nextExecutionAt: "2026-09-22T06:37:00.000Z" }, maxTickAgeSeconds: 120, maxSourceAgeSeconds: 1800 });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.calendar.sourceFreshnessState, "REQUIRED");
});

test("unknown calendar keeps the strict freshness check", () => {
  const capturedAt = "2026-09-22T09:45:41.454Z";
  const report = buildHealthReport({ ...baseline, capturedAt, calendar: { status: "UNKNOWN" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T09:45:25.491Z", nextExecutionAt: "2026-09-23T01:37:00.000Z" } });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.calendar.sourceFreshnessExpected, true);
});

test("missing or unauthorized source authorization always fails closed", () => {
  const authorized = buildHealthReport({ ...baseline, capturedAt: "2026-09-22T09:45:41.454Z", scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T09:45:25.491Z", nextExecutionAt: "2026-09-23T01:37:00.000Z" } });
  const unauthorized = buildHealthReport({ ...baseline, capturedAt: "2026-09-22T09:45:41.454Z", ready: { ...baseline.ready, collectionSourceAuthorization: "NOT_AUTHORIZED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T09:45:25.491Z", nextExecutionAt: "2026-09-23T01:37:00.000Z" } });
  const unknown = buildHealthReport({ ...baseline, capturedAt: "2026-09-22T09:45:41.454Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-22T09:45:25.491Z", nextExecutionAt: "2026-09-23T01:37:00.000Z" } });
  assert.equal(authorized.status, "HEALTHY");
  assert.equal(unauthorized.status, "UNHEALTHY");
  assert.equal(unauthorized.ready.sourceAuthorization, "NOT_AUTHORIZED");
  assert.equal(unauthorized.checks.sourceAuthorizationAuthorized, false);
  assert.equal(unknown.status, "UNHEALTHY");
  assert.equal(unknown.ready.sourceAuthorization, "UNKNOWN");
});

test("closed calendar skips freshness but still requires a proven usable source and clean quality", () => {
  const capturedAt = "2026-09-20T04:00:00.000Z";
  const scheduler = { status: "ENABLED", lastSuccessfulTickAt: "2026-09-20T03:59:00.000Z", nextExecutionAt: "2026-09-21T01:37:00.000Z" };
  const calendar = { status: "CLOSED", calendarVersion: "sse-cn-a-share-2026-1" };
  const ready = buildHealthReport({ ...baseline, capturedAt, scheduler, calendar });
  assert.equal(ready.status, "HEALTHY");
  assert.equal(ready.calendar.sourceFreshnessExpected, false);
  const noSuccess = buildHealthReport({ ...baseline, capturedAt, scheduler, calendar, sources: [{ sourceId: "sina", circuit: "CLOSED" }] });
  assert.equal(noSuccess.status, "UNHEALTHY");
  const gaps = buildHealthReport({ ...baseline, capturedAt, scheduler, calendar, quality: { openGaps: 20, pendingOutbox: 0 } });
  assert.equal(gaps.status, "UNHEALTHY");
});
