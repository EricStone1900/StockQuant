import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { auditStageDocuments } from "./version-stage-documents.mjs";

async function fixture(stageDocument = "# Stage\n\n## 2. Work\n\n## 7. Delivery\n\n## 8. Runbook\n") {
  const root = await mkdtemp(join(tmpdir(), "stockquant-version-docs-"));
  const versionRoot = join(root, "docs/prd/v1-local-simulation");
  await mkdir(versionRoot, { recursive: true });
  for (const name of ["00-version-plan.md", "90-test-plan.md", "99-acceptance.md"]) await writeFile(join(versionRoot, name), "# Required\n");
  await writeFile(join(root, "docs/prd/01-feature-traceability.md"), "# Traceability\n");
  await writeFile(join(versionRoot, "01-stage.md"), stageDocument);
  return root;
}

test("version audit requires every stage document and sections 2, 7, and 8", async () => {
  const root = await fixture();
  try {
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./01-stage.md) | Delivery |", [{ stageId: "V1.1" }]);
    assert.deepEqual(result, { status: "PASS", stagesChecked: 1, failures: [] });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PASS stage requires checked delivery items and an executable section 8 runbook", async () => {
  const root = await fixture("# Stage\n\n## 2. Work\n\n## 7. Delivery\n\n- [x] Automated and user delivery accepted.\n\n## 8. Runbook\n\nStatus: VERIFIED_EXECUTABLE\n");
  try {
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./01-stage.md) | Delivery |", [{ stageId: "V1.1", status: "PASS (automatic and user acceptance)" }]);
    assert.deepEqual(result, { status: "PASS", stagesChecked: 1, failures: [] });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PASS stage is rejected if delivery remains unchecked or runbook is draft", async () => {
  const root = await fixture("# Stage\n\n## 2. Work\n\n## 7. Delivery\n\n- [ ] User delivery accepted.\n\n## 8. Runbook\n\nStatus: DRAFT_NOT_EXECUTABLE\n");
  try {
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./01-stage.md) | Delivery |", [{ stageId: "V1.1", status: "PASS" }]);
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.failures, [
      "V1.1: PASS status requires all section 7 delivery items to be checked",
      "V1.1: PASS status requires a complete VERIFIED_EXECUTABLE section 8 runbook",
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("PASS stage is rejected when a verified runbook still contains execution placeholders", async () => {
  const root = await fixture("# Stage\n\n## 2. Work\n\n## 7. Delivery\n\n- [x] Delivery completed.\n\n## 8. Runbook\n\nStatus: VERIFIED_EXECUTABLE\n\nFixture path: 待实现后填写\n");
  try {
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./01-stage.md) | Delivery |", [{ stageId: "V1.1", status: "PASS" }]);
    assert.deepEqual(result.failures, ["V1.1: PASS status requires a complete VERIFIED_EXECUTABLE section 8 runbook"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("version audit fails when a stage-required section is missing", async () => {
  const root = await fixture("# Stage\n\n## 2. Work\n\n## 7. Delivery\n");
  try {
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./01-stage.md) | Delivery |", [{ stageId: "V1.1" }]);
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.failures, ["V1.1: docs/prd/v1-local-simulation/01-stage.md is missing required section 8"]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("version audit rejects a stage document symlink that escapes the repository", async () => {
  const root = await fixture();
  const outsideRoot = join(dirname(root), `${basename(root)}-outside`);
  const outside = join(outsideRoot, "outside.md");
  const linked = join(root, "docs/prd/v1-local-simulation/linked-stage.md");
  try {
    await mkdir(outsideRoot, { recursive: true });
    await writeFile(outside, "# Stage\n\n## 2. Work\n\n## 7. Delivery\n\n## 8. Runbook\n");
    await symlink(outside, linked);
    const result = await auditStageDocuments(root, "V1", "| [V1.1](./linked-stage.md) | Delivery |", [{ stageId: "V1.1" }]);
    assert.equal(result.status, "FAIL");
    assert.deepEqual(result.failures, ["V1.1: missing or unsafe stage document ./linked-stage.md"]);
  } finally { await Promise.all([rm(root, { recursive: true, force: true }), rm(outsideRoot, { recursive: true, force: true })]); }
});
