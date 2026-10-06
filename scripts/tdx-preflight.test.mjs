import test from "node:test";
import assert from "node:assert/strict";
import { tdxPreflight } from "./tdx-preflight.mjs";

test("TDX preflight only requires the public A-share calendar", async () => {
  const result = await tdxPreflight({ now: new Date("2026-09-29T01:00:00.000Z"), fetchImpl: async () => new Response(JSON.stringify({ status: "TRADING", calendarVersion: "test" }), { status: 200 }) });
  assert.equal(result.status, "READY");
  assert.equal(result.exitCode, 0);
});

test("TDX preflight records a permission failure as waiting, not a source failure", async () => {
  const error = new TypeError("fetch failed", { cause: Object.assign(new Error("operation not permitted"), { code: "EPERM" }) });
  const result = await tdxPreflight({ fetchImpl: async () => { throw error; } });
  assert.deepEqual(result.error, { message: "fetch failed", causeCode: "EPERM" });
  assert.equal(result.exitCode, 2);
});
