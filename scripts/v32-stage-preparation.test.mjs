import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const scenarios = ["normal", "rejection", "recovery"];
for (const scenario of scenarios) {
  test(`V3.2 ${scenario} stays WAITING while required business prerequisites remain unverified`, () => {
    const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.2", "--scenario", scenario], { encoding: "utf8" });
    assert.equal(result.status, 2, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.stageId, "V3.2");
    assert.equal(output.scenarioId, scenario);
    assert.equal(output.status, "WAITING");
    assert.equal(output.testRunId, null);
    assert.equal(output.businessValidation, "NOT_RUN");
    assert.ok(output.blockers.includes("eligible persisted non-Fixture candidate execution and recomputation from bound artifacts"));
    assert.ok(output.blockers.includes("governance and Paper consumers must enforce the approved version fingerprint"));
    assert.ok(output.blockers.includes("V3.2 TestRun scenario workflow and evidence export"));
  });
}

test("check-only refuses to invent or query a V3.2 TestRun", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V3.2", "--run", "sample-run", "--check-only"], { encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /V3\.2 TestRun business API is not implemented/u);
});
