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
