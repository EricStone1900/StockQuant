import test from "node:test";
import assert from "node:assert/strict";
import { summarizeObservations } from "./dc08a-observation-summary.mjs";

test("keeps a completed end-of-day decision across later healthy monitor snapshots", () => {
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
  assert.equal(result.remainingDays, 19);
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

test("a later gap invalidates an earlier complete snapshot regardless of input order", () => {
  const complete = { capturedAt: "2026-09-23T08:00:00Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48, byStatus: [{ status: "COMPLETED", count: 48 }] }, openGaps: 0, pendingOutbox: 0 };
  const regressed = { capturedAt: "2026-09-23T09:00:00Z", subscription: { subscriptionId: "sub" }, observationCounted: false, status: "ACTIVE", runs: { total: 49, completed: 48, byStatus: [{ status: "COMPLETED", count: 48 }, { status: "RUNNING", count: 1 }] }, openGaps: 1, pendingOutbox: 0 };
  for (const observations of [[complete, regressed], [regressed, complete]]) {
    const result = summarizeObservations(observations, { subscriptionId: "sub", targetDays: 1 });
    assert.equal(result.observedDays, 0);
    assert.equal(result.status, "WAITING");
    assert.equal(result.latest.openGaps, 1);
  }
});

test("an explicit non-final healthy snapshot never replaces a final snapshot", () => {
  const final = { capturedAt: "2026-09-23T08:00:00Z", finalized: true, subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48 }, openGaps: 0, pendingOutbox: 0 };
  const monitor = { ...final, capturedAt: "2026-09-23T09:00:00Z", finalized: false, observationCounted: false };
  const result = summarizeObservations([final, monitor], { subscriptionId: "sub", targetDays: 1 });
  assert.equal(result.observedDays, 1);
  assert.equal(result.latest.capturedAt, final.capturedAt);
});

test("keeps failure history but does not count a recovered day after a later regression", () => {
  const recovered = { capturedAt: "2026-09-23T08:00:00Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 48, completed: 48, byStatus: [{ status: "COMPLETED", count: 48 }] }, openGaps: 0, pendingOutbox: 0 };
  const regressed = { ...recovered, capturedAt: "2026-09-23T09:00:00Z", observationCounted: false, openGaps: 2, runs: { total: 48, completed: 47, byStatus: [{ status: "FAILED", count: 1 }, { status: "COMPLETED", count: 47 }] } };
  const result = summarizeObservations([recovered, regressed], { subscriptionId: "sub", targetDays: 1 });
  assert.equal(result.observedDays, 0);
  assert.equal(result.dates[0].hadFailure, true);
  assert.equal(result.dates[0].complete, false);
});

test("reports invalid timestamps and rejects invalid target-day thresholds", () => {
  const complete = { capturedAt: "2026-09-23T09:00:00Z", subscription: { subscriptionId: "sub" }, observationCounted: true, status: "ACTIVE", runs: { total: 1, completed: 1 }, openGaps: 0, pendingOutbox: 0 };
  const result = summarizeObservations([complete, { capturedAt: "bad-date", subscription: { subscriptionId: "sub" } }], { subscriptionId: "sub", targetDays: 1 });
  assert.deepEqual(result.invalidEvidence.invalidTimestampFiles, ["<unknown>"]);
  assert.equal(result.observedDays, 1);
  assert.equal(result.status, "WAITING");
  const malformed = summarizeObservations([complete], { subscriptionId: "sub", targetDays: 1, malformedFiles: ["observation-broken.json"] });
  assert.equal(malformed.status, "WAITING");
  assert.throws(() => summarizeObservations([], { targetDays: 0 }), /positive integer/);
});
