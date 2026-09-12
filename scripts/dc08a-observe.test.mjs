import test from "node:test";
import assert from "node:assert/strict";
import { buildObservation, parseRows } from "./dc08a-observe.mjs";

test("parseRows maps tabular psql output", () => {
  assert.deepEqual(parseRows("a\tb\n", ["left", "right"]), [{ left: "a", right: "b" }]);
  assert.deepEqual(parseRows("a|b\n", ["left", "right"], "|"), [{ left: "a", right: "b" }]);
  assert.deepEqual(parseRows("", ["left"]), []);
});

test("observation summarizes run and operational state", () => {
  const report = buildObservation({
    capturedAt: "2026-09-14T01:00:00.000Z",
    ready: { collectionSchedulerWorker: "ENABLED", collectionExecutor: "ENABLED" },
    schedule: { enabled: true },
    statusCounts: [{ status: "COMPLETED", count: "2" }, { status: "WAITING_RETRY", count: "1" }],
    artifactSummary: { artifactCount: 2, rowCount: 96, latestCreatedAt: "2026-09-14T01:00:00.000Z" },
    pendingOutbox: "1",
    openGaps: "3",
  });
  assert.equal(report.runs.total, 3);
  assert.equal(report.runs.completed, 2);
  assert.equal(report.status, "ACTIVE");
  assert.equal(report.openGaps, 3);
});

test("disabled service is not reported active", () => {
  const report = buildObservation({ capturedAt: "2026-09-12T00:00:00.000Z", ready: { collectionExecutor: "DISABLED" }, schedule: { enabled: true }, statusCounts: [], artifactSummary: { artifactCount: 0, rowCount: 0, latestCreatedAt: null }, pendingOutbox: 0, openGaps: 0 });
  assert.equal(report.status, "NOT_ACTIVE");
});

test("scheduler disabled is not reported active", () => {
  const report = buildObservation({ capturedAt: "2026-09-12T00:00:00.000Z", ready: { collectionSchedulerWorker: "DISABLED", collectionExecutor: "ENABLED" }, schedule: { enabled: true }, statusCounts: [], artifactSummary: { artifactCount: 0, rowCount: 0, latestCreatedAt: null }, pendingOutbox: 0, openGaps: 0 });
  assert.equal(report.status, "NOT_ACTIVE");
});
