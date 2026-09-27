import test from "node:test";
import assert from "node:assert/strict";
import { buildExpectedKeys, buildGapPayload, coverageExitCode, persistGaps, summarizeCoverage } from "./data-coverage.mjs";

const days = [{ date: "2026-09-14", status: "TRADING", sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] }];

test("coverage builds exact five-minute keys for every security", () => {
  assert.equal(buildExpectedKeys(["600000.SH", "000001.SZ"], days).length, 8);
});

test("coverage excludes future windows during the trading day", () => {
  const asOf = new Date("2026-09-14T01:32:00.000Z");
  assert.equal(buildExpectedKeys(["600000.SH"], days, asOf).length, 0);
  assert.equal(buildExpectedKeys(["600000.SH"], days, new Date("2026-09-14T07:20:00.000Z")).length, 4);
});

test("coverage grace excludes the just-closed publish-delay window", () => {
  const asOf = new Date("2026-09-14T01:36:00.000Z");
  const effective = new Date(asOf.getTime() - 120_000);
  assert.equal(buildExpectedKeys(["600000.SH"], days, effective).length, 0);
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

test("coverage compares equivalent offset and UTC bar timestamps as the same instant", () => {
  const expectedKeys = buildExpectedKeys(["600000.SH"], days);
  const result = summarizeCoverage({ expectedKeys, rows: [{ securityId: "600000.SH", barStart: "2026-09-14T09:30:00+08:00" }], statuses: [{ status: "COMPLETED", count: 1 }], openGaps: 0, pendingOutbox: 0, calendarDays: days });
  assert.equal(result.actualUniqueBars, 1);
  assert.equal(result.unexpectedBars, 0);
  assert.equal(result.missingBars, expectedKeys.length - 1);
});

test("unknown calendar remains waiting dependency", () => {
  const result = summarizeCoverage({ expectedKeys: [], rows: [], statuses: [], openGaps: 0, pendingOutbox: 0, calendarDays: [{ date: "2026-09-14", status: "UNKNOWN" }] });
  assert.equal(result.status, "WAITING_DEPENDENCY");
});

test("coverage produces durable gap records without fabricating bars", () => {
  const report = { subscriptionId: "sub", missingKeys: ["600000.SH|2026-09-14T01:30:00.000Z"], duplicateKeys: [] };
  assert.deepEqual(buildGapPayload(report), [{ gapId: "gap:600000.SH|2026-09-14T01:30:00.000Z", securityId: "600000.SH", barStart: "2026-09-14T01:30:00.000Z", barEnd: "2026-09-14T01:35:00.000Z", reason: "MISSING", priority: "P1" }]);
});

test("gap reconciliation writes use the dedicated collection-control token", async () => {
  const priorToken = process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN;
  const priorFetch = globalThis.fetch;
  process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN = "test-collection-control-token";
  let captured;
  globalThis.fetch = async (url, options) => { captured = { url, options }; return new Response(JSON.stringify({ opened: 1, closed: 0 }), { status: 200 }); };
  try {
    await persistGaps("http://localhost:3002", { subscriptionId: "test", fromDate: "2026-09-14", toDate: "2026-09-14", securityIds: ["600000.SH"], missingKeys: ["600000.SH|2026-09-14T01:30:00.000Z"], duplicateKeys: [] });
    assert.equal(captured.url, "http://localhost:3002/v2/minute/gaps");
    assert.equal(captured.options.headers["x-stockquant-control-token"], "test-collection-control-token");
  } finally {
    globalThis.fetch = priorFetch;
    if (priorToken === undefined) delete process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN;
    else process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN = priorToken;
  }
});

test("closed non-trading day does not page", () => {
  assert.equal(coverageExitCode({ status: "NOT_RUN", calendarDays: [{ status: "CLOSED" }] }), 0);
  assert.equal(coverageExitCode({ status: "NOT_RUN", calendarDays: [{ status: "TRADING" }] }), 2);
});
