import test from "node:test";
import assert from "node:assert/strict";
import { classifySourceRecovery, endOfDayEligibility } from "./dc08a-operations.mjs";

test("source recovery marks adapter failures as an explicit degradation", () => {
  assert.deepEqual(classifySourceRecovery({ status: "COMPLETED", attempts: [{ sourceId: "baostock", status: "FAIL", code: "TIMEOUT" }] }), {
    status: "DEGRADED", alert: true, attempts: [{ sourceId: "baostock", status: "FAIL", code: "TIMEOUT" }]
  });
});

test("inconclusive or skipped recovery probes do not page", () => {
  assert.deepEqual(classifySourceRecovery({ status: "COMPLETED", attempts: [{ sourceId: "baostock", status: "INCONCLUSIVE", code: "EMPTY_RESULT" }] }), {
    status: "CHECKED", alert: false, attempts: [{ sourceId: "baostock", status: "INCONCLUSIVE", code: "EMPTY_RESULT" }]
  });
});

test("end-of-day work waits for collection completion instead of recording intraday gaps", () => {
  const result = endOfDayEligibility({ now: new Date("2026-09-29T01:47:40.000Z"), calendarStatus: "TRADING" });
  assert.deepEqual(result, { eligible: false, status: "WAITING_END_OF_DAY", reason: "COMPLETION_DEADLINE_NOT_REACHED", localTime: "09:47", notBefore: "15:15" });
});

test("end-of-day work is eligible after the final collection completion deadline", () => {
  const result = endOfDayEligibility({ now: new Date("2026-09-29T07:20:00.000Z"), calendarStatus: "TRADING" });
  assert.equal(result.eligible, true);
  assert.equal(result.localTime, "15:20");
});

test("end-of-day work stays quiet on a closed market day", () => {
  const result = endOfDayEligibility({ now: new Date("2026-09-27T07:20:00.000Z"), calendarStatus: "CLOSED" });
  assert.equal(result.status, "NOT_RUN");
  assert.equal(result.reason, "NON_TRADING_DAY");
});
