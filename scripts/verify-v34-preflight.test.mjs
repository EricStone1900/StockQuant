import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
// Version completion is repository state, not a permanent test assumption.
// Compare the composed preflight with each independent read-only version gate.
const versionStates = new Map(["V1", "V2", "V3"].map((version) => {
  const checked = spawnSync(process.execPath, ["scripts/verify-version.mjs", "--version", version], { cwd: root, encoding: "utf8", timeout: 5000 });
  const report = JSON.parse(checked.stdout);
  return [version, checked.status === 0 && report.status === "PASS" ? "VERIFIED" : "NOT_VERIFIED"];
}));

for (const scenario of ["normal", "rejection", "recovery"]) {
  test(`V3.4 ${scenario} reports prerequisite blockers without creating a run or making network calls`, () => {
    const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.4", "--scenario", scenario], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: "http://127.0.0.1:1" },
      timeout: 5000,
    });
    assert.equal(result.status, 2, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.equal(report.stageId, "V3.4");
    assert.equal(report.scenarioId, scenario);
    assert.equal(report.status, "WAITING");
    assert.equal(report.testRunId, null);
    assert.equal(report.sideEffects, "NONE");
    for (const version of ["V1", "V2", "V3"]) assert.ok(report.blockers.some(({ id, status }) => id === `VERSION_${version}` && status === versionStates.get(version)));
    assert.ok(report.blockers.some(({ id, status }) => id === "UBUNTU_TARGET" && status === "NOT_VERIFIED"));
    assert.ok(report.blockers.some(({ id, status }) => id === "V34_WORKFLOW" && status === "NOT_IMPLEMENTED"));
    assert.equal(report.humanAcceptance, "NOT_RUN");
  });
}

test("V3.4 rejects unsupported scenario names with incomplete exit code", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.4", "--scenario", "live"], { cwd: root, encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /normal\|rejection\|recovery/);
});
