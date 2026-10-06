import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { acceptanceRowsWithUnresolvedStatus, auditPassClaims, duplicateStageIds, parseAcceptanceStageRows } from "./version-gate-acceptance.mjs";

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
  assert.deepEqual(payload.invalidPassClaims, []);
});

test("WAITING and NOT_RUN acceptance states keep a version unresolved", () => {
  const rows = parseAcceptanceStageRows(`
| [V3.1](./01.md) | PASS | WAITING (真实执行未运行) | [证据](./evidence.json) | Provider未授权 | 用户确认待后续处理 |
`);
  assert.equal(rows.length, 1);
  assert.deepEqual(acceptanceRowsWithUnresolvedStatus(rows).map(({ stageId }) => stageId), ["V3.1"]);
});

test("a PASS stage requires Web PASS, evidence, and a dated user sign-off", () => {
  const stages = [{ stageId: "V1.1", status: "PASS" }];
  const accepted = parseAcceptanceStageRows(`
| [V1.1](./01.md) | PASS (自动验证) | PASS (用户确认) | [证据](./evidence.json) | 无 | 用户确认 / 2026-10-01 |
`);
  assert.deepEqual(auditPassClaims(stages, accepted), []);

  const unsigned = parseAcceptanceStageRows(`
| [V1.1](./01.md) | PASS (自动验证) | PASS (用户确认) | [证据](./evidence.json) | 无 | 人工验收待填写 |
`);
  assert.deepEqual(auditPassClaims(stages, unsigned), [{ stageId: "V1.1", failures: ["dated user acceptance sign-off is missing"] }]);

  const unlinkedEvidence = parseAcceptanceStageRows(`
| [V1.1](./01.md) | PASS (自动验证) | PASS (用户确认) | evidence exists | 无 | 用户确认 / 2026-10-01 |
`);
  assert.deepEqual(auditPassClaims(stages, unlinkedEvidence), [{ stageId: "V1.1", failures: ["acceptance evidence has no local evidence link or TestRun UUID"] }]);

  const testRunEvidence = parseAcceptanceStageRows(`
| [V1.1](./01.md) | PASS (自动验证) | PASS (用户确认) | TestRun 123e4567-e89b-42d3-a456-426614174000 | 无 | 用户确认 / 2026-10-01 |
`);
  assert.deepEqual(auditPassClaims(stages, testRunEvidence), []);
});

test("duplicate stage or acceptance rows are reported instead of being hidden by ID sets", () => {
  const rows = [{ stageId: "V2.3" }, { stageId: "V2.4" }, { stageId: "V2.3" }];
  assert.deepEqual(duplicateStageIds(rows), ["V2.3"]);
  assert.deepEqual(duplicateStageIds([{ stageId: "V2.3" }, { stageId: "V2.4" }]), []);
});
