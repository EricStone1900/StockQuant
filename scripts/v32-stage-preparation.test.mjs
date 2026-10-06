import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("V3.2 check-only requires a UUID before making any API request", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.2", "--run", "sample-run", "--check-only"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /--run must be a TestRun UUID/u);
});

test("V3.2 rejects an unsupported scenario before making any API request", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.2", "--scenario", "unknown"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /supports --suite code or owner-scoped persisted readiness TestRuns/u);
});
