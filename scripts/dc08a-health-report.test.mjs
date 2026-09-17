import test from "node:test";
import assert from "node:assert/strict";
import { buildHealthReport } from "./dc08a-health-report.mjs";

test("health report includes recent success and next trigger", () => {
  const report = buildHealthReport({ capturedAt: "2026-09-17T12:00:00.000Z", activeSubscription: "sub", ready: { status: "ready", collectionPersistence: "POSTGRES", collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" }, scheduler: { status: "ENABLED", lastSuccessfulTickAt: "2026-09-17T11:59:00.000Z", nextExecutionAt: "2026-09-18T01:30:00.000Z", lastSubmitted: 48 } });
  assert.equal(report.status, "HEALTHY");
  assert.equal(report.checks.recentSuccessRecorded, true);
  assert.equal(report.scheduler.lastSubmitted, 48);
});
