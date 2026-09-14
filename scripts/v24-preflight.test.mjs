import test from "node:test";
import assert from "node:assert/strict";
import { liveQuoteFreshness } from "./v24-preflight.mjs";

const now = new Date("2026-09-14T07:00:00.000Z");
test("fresh live quotes pass the preflight freshness gate", () => {
  assert.equal(liveQuoteFreshness({ sourceId: "tencent-quote", securities: [{ status: "LIVE_SOURCE", observedAt: "2026-09-14T14:59:30+08:00" }] }, now).ok, true);
});
test("stale or malformed quotes fail the preflight freshness gate", () => {
  assert.equal(liveQuoteFreshness({ sourceId: "tencent-quote", securities: [{ status: "LIVE_SOURCE", observedAt: "2026-09-14T14:00:00+08:00" }] }, now).ok, false);
  assert.equal(liveQuoteFreshness({ sourceId: "tencent-quote", securities: [{ status: "MALFORMED", observedAt: null }] }, now).ok, false);
});
test("stale quotes are allowed outside an active trading session", () => {
  assert.equal(liveQuoteFreshness({ sourceId: "tencent-quote", securities: [{ status: "LIVE_SOURCE", observedAt: "2026-09-14T14:00:00+08:00" }] }, now, 30 * 60, { allowStale: true }).ok, true);
});
