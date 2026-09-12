import test from "node:test";
import assert from "node:assert/strict";
import { classifyDailyStatus, expectedBars } from "./dc08a-daily-report.mjs";

test("expected bars uses securities, sessions and five-minute bars", () => assert.equal(expectedBars(3), 144));
test("daily status never passes without a real trading run", () => {
  assert.equal(classifyDailyStatus({ tradingDay: false, expected: 0, actual: 0, statuses: [], openGaps: 0 }), "NOT_RUN");
  assert.equal(classifyDailyStatus({ tradingDay: true, expected: 144, actual: 0, statuses: [], openGaps: 0 }), "NOT_RUN");
});
test("daily status distinguishes incomplete from pass", () => {
  assert.equal(classifyDailyStatus({ tradingDay: true, expected: 144, actual: 120, statuses: [{ status: "COMPLETED" }], openGaps: 0 }), "INCOMPLETE");
  assert.equal(classifyDailyStatus({ tradingDay: true, expected: 144, actual: 144, statuses: [{ status: "COMPLETED" }], openGaps: 0 }), "PASS");
  assert.equal(classifyDailyStatus({ tradingDay: true, expected: 144, actual: 144, statuses: [{ status: "WAITING_RETRY" }], openGaps: 0 }), "INCOMPLETE");
});
