import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

function runVersion(version) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/verify-version.mjs", "--version", version], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("version verification parses every V2 acceptance row", async () => {
  const result = await runVersion("V2");
  const payload = JSON.parse(result.stdout);
  assert.equal(result.code, 2);
  assert.ok(payload.unresolvedAcceptance.some(({ stageId }) => stageId === "V2.3"), "the corrected Qlib research status must remain a visible unresolved stage");
  assert.deepEqual(payload.missingAcceptance, []);
  assert.deepEqual(payload.unexpectedAcceptance, []);
  assert.equal(payload.versionSummaryIncomplete, true);
  assert.equal(payload.uncheckedVersionGate, true);
});
