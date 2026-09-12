import test from "node:test";
import assert from "node:assert/strict";
import { buildExpectedKeys, summarizeCoverage } from "./data-coverage.mjs";

const days = [{ date: "2026-09-14", status: "TRADING", sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] }];

test("coverage builds exact five-minute keys for every security", () => {
  assert.equal(buildExpectedKeys(["600000.SH", "000001.SZ"], days).length, 8);
});

test("coverage rejects missing, duplicate and unexpected bars", () => {
  const expectedKeys = buildExpectedKeys(["600000.SH"], days);
  const rows = expectedKeys.slice(0, 3).map((key) => { const [securityId, barStart] = key.split("|"); return { securityId, barStart }; });
  rows.push(rows[0], { securityId: "600519.SH", barStart: rows[0].barStart });
  const result = summarizeCoverage({ expectedKeys, rows, statuses: [{ status: "COMPLETED", count: 1 }], openGaps: 0, pendingOutbox: 0, calendarDays: days });
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.missingBars, 1);
  assert.equal(result.duplicateBars, 1);
  assert.equal(result.unexpectedBars, 1);
});

test("unknown calendar remains waiting dependency", () => {
  const result = summarizeCoverage({ expectedKeys: [], rows: [], statuses: [], openGaps: 0, pendingOutbox: 0, calendarDays: [{ date: "2026-09-14", status: "UNKNOWN" }] });
  assert.equal(result.status, "WAITING_DEPENDENCY");
});
