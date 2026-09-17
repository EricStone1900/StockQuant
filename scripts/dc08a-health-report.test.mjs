import test from "node:test";
import assert from "node:assert/strict";
import { buildHealthReport } from "./dc08a-health-report.mjs";

test("health report includes recent success and next trigger", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", activeSubscription: "sub", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: "2026-09-18T01:30:00.000Z", lastSubmitted: 48 }, sources: [{ status: "PASS", circuit: "HEALTHY" }], quality: { openGaps: 0, pendingOutbox: 0 } });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.checks.recentSuccessRecorded, true);
  assert.equal(report.scheduler.lastSubmitted, 48);
});

test("stale scheduler tick makes the report unhealthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T10:00:00.000Z", nextExecutionAt: null }, now: new Date("2026-09-17T12:00:00.000Z"), maxTickAgeSeconds: 1800 });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.checks.recentSuccessRecorded, false);
});

test("open source circuits make the report unhealthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: null }, sources: [{ status: "CONFIGURED", circuit: "OPEN" }] });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.checks.sourceReady, false);
});

test("missing quality data is never treated as healthy", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: null }, sources: [{ status: "PASS", circuit: "HEALTHY" }] });
  assert.equal(report.status, "UNHEALTHY");
  assert.equal(report.quality.openGaps, null);
});
