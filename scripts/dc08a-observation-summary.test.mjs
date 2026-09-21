import test from "node:test";
import assert from "node:assert/strict";
import { summarizeObservations } from "./dc08a-observation-summary.mjs";

test("summarizes one completed observation day and keeps waiting status", () => {
  const result = summarizeObservations([
    { capturedAt: "2026-09-17T01:00:00.000Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48 }, openGaps: 0, pendingOutbox: 0 },
    { capturedAt: "2026-09-17T02:00:00.000Z", subscription: { subscriptionId: "sub" }, status: "ACTIVE", runs: { total: 48, completed: 48 }, openGaps: 0, pendingOutbox: 0 }
  ], { subscriptionId: "sub", targetDays: 20 });
  assert.equal(result.completedDays, 1);
  assert.equal(result.remainingDays, 19);
  assert.equal(result.status, "WAITING");
});

test("does not count a complete but unapproved post-close snapshot", () => {
  const result = summarizeObservations([{ capturedAt: "2026-09-17T01:00:00.000Z", subscription: { subscriptionId: "sub" }, status: "ACTIVE", runs: { total: 48, completed: 48 }, openGaps: 0, pendingOutbox: 0 }], { subscriptionId: "sub", targetDays: 20 });
  assert.equal(result.completedDays, 0);
  assert.equal(result.status, "WAITING");
});

test("separates a recovered day from a continuously stable day", () => {
  const result = summarizeObservations([
    { capturedAt: "2026-09-21T02:00:00.000Z", subscription: { subscriptionId: "sub" }, observationCounted: false, status: "ACTIVE", runs: { total: 48, completed: 36, byStatus: [{ status: "FAILED", count: "12" }] }, openGaps: 240, pendingOutbox: 0 },
    { capturedAt: "2026-09-21T11:00:00.000Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48, byStatus: [{ status: "COMPLETED", count: "48" }] }, openGaps: 0, pendingOutbox: 0 }
  ], { subscriptionId: "sub", targetDays: 20 });
  assert.equal(result.completedDays, 0);
  assert.equal(result.recoveredDays, 1);
  assert.equal(result.observedDays, 1);
  assert.equal(result.dates[0].hadFailure, true);
});

test("does not downgrade a day whose temporary queue and gap both close", () => {
  const result = summarizeObservations([
    { capturedAt: "2026-09-18T06:47:46.000Z", subscription: { subscriptionId: "sub" }, observationCounted: false, status: "ACTIVE", runs: { total: 45, completed: 44, byStatus: [{ status: "COMPLETED", count: "44" }, { status: "QUEUED", count: "1" }] }, openGaps: 20, pendingOutbox: 0 },
    { capturedAt: "2026-09-18T07:30:48.000Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48, byStatus: [{ status: "COMPLETED", count: "48" }] }, openGaps: 0, pendingOutbox: 0 }
  ], { subscriptionId: "sub", targetDays: 20 });
  assert.equal(result.completedDays, 1);
  assert.equal(result.recoveredDays, 0);
  assert.equal(result.dates[0].hadFailure, false);
});
