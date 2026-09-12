import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePromotion, promotionConfig } from "./dc08a-promote-20.mjs";

const config = promotionConfig({ DC08A_SHORT_SUBSCRIPTION_ID: "short", DC08A_20_SUBSCRIPTION_ID: "target", DC08A_PROMOTION_DATES: "2026-09-14,2026-09-15" });
const short = { subscriptionId: "short", enabled: true, fromDate: "2026-09-14", toDate: "2026-09-16", calendarVersion: "sse-cn-a-share-2026-1" };

test("promotion requires both short observation reports to pass", () => {
  const result = evaluatePromotion({ config, schedules: [short], reports: [{ status: "PASS" }, { status: "INCOMPLETE" }] });
  assert.equal(result.ok, false);
  assert.match(result.reasons.join(" "), /daily reports/);
});

test("promotion is ready only with the unique short subscription and 20 securities", () => {
  const result = evaluatePromotion({ config, schedules: [short], reports: [{ status: "PASS" }, { status: "PASS" }] });
  assert.equal(result.ok, true);
  assert.equal(result.alreadyPromoted, false);
});

test("already promoted target is idempotent", () => {
  const result = evaluatePromotion({ config, schedules: [{ subscriptionId: "target", enabled: true, fromDate: config.fromDate, toDate: config.toDate, calendarVersion: config.calendarVersion }], reports: [{ status: "PASS" }, { status: "PASS" }] });
  assert.equal(result.ok, true);
  assert.equal(result.alreadyPromoted, true);
});
