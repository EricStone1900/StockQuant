import test from "node:test";
import assert from "node:assert/strict";
import { finalReportExitCode } from "./dc08a-eod-report.mjs";

test("non-trading day does not page", () => {
  assert.equal(finalReportExitCode({ tradingDay: false, status: "NOT_RUN" }), 0);
});

test("complete trading day passes", () => {
  assert.equal(finalReportExitCode({ tradingDay: true, status: "PASS" }), 0);
});

test("incomplete trading day returns the required-observation exit code", () => {
  assert.equal(finalReportExitCode({ tradingDay: true, status: "INCOMPLETE" }), 2);
  assert.equal(finalReportExitCode({ tradingDay: true, status: "NOT_RUN" }), 2);
});
