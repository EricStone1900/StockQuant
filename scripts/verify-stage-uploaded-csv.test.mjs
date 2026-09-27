import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "scripts/verify-stage.mjs");

test("uploaded-csv CLI refuses a missing upload ID before making an API request", () => {
  const result = spawnSync(process.execPath, [cli, "--stage", "V2.2", "--scenario", "uploaded-csv"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /uploaded-csv requires --upload-id UUID/u);
  assert.doesNotMatch(result.stderr, /fetch failed/u);
});

test("uploaded-csv CLI refuses a malformed upload ID before making an API request", () => {
  const result = spawnSync(process.execPath, [cli, "--stage", "V2.2", "--scenario", "uploaded-csv", "--upload-id", "not-a-uuid"], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /uploaded-csv requires --upload-id UUID/u);
  assert.doesNotMatch(result.stderr, /fetch failed/u);
});
