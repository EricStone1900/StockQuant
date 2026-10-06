import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { auditVersionEvidence } from "./verify-version-evidence.mjs";

async function fixture() {
  const root = await mkdtemp(resolve(tmpdir(), "stockquant-version-evidence-"));
  const versionDir = resolve(root, "docs/prd/v2-data-and-replay");
  const evidenceDir = resolve(root, "evidence/audits");
  await mkdir(versionDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(resolve(evidenceDir, "report.json"), "{\"status\":\"PASS\"}\n");
  const hash = createHash("sha256").update(await readFile(resolve(evidenceDir, "report.json"))).digest("hex");
  await writeFile(resolve(evidenceDir, "report.sha256"), `${hash}  evidence/audits/report.json\n`);
  await writeFile(resolve(versionDir, "99-acceptance.md"), "[report](../../../evidence/audits/report.json) [manifest](../../../evidence/audits/report.sha256)\n");
  return { root, versionDir, evidenceDir };
}

test("version evidence audit verifies linked files and SHA-256 manifests", async () => {
  const { root } = await fixture();
  try {
    const result = await auditVersionEvidence(root, "V2");
    assert.equal(result.status, "PASS");
    assert.equal(result.evidenceReferences, 2);
    assert.equal(result.manifestsChecked, 1);
    assert.equal(result.manifestEntriesChecked, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("version evidence audit fails on a missing evidence file or changed manifest target", async () => {
  const { root, versionDir, evidenceDir } = await fixture();
  try {
    await writeFile(resolve(evidenceDir, "report.json"), "changed\n");
    await writeFile(resolve(versionDir, "99-acceptance.md"), "[missing](../../../evidence/audits/missing.json) [manifest](../../../evidence/audits/report.sha256)\n");
    const result = await auditVersionEvidence(root, "V2");
    assert.equal(result.status, "FAIL");
    assert.equal(result.missingEvidence.length, 1);
    assert.ok(result.failures.some((failure) => failure.includes("SHA-256 mismatch")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("version evidence audit resolves local export manifests relative to their bundle directory", async () => {
  const { root, versionDir } = await fixture();
  const exportDir = resolve(root, "evidence/local/V2.3/run-123");
  await mkdir(exportDir, { recursive: true });
  await writeFile(resolve(exportDir, "evidence.json"), "{\"testRunId\":\"run-123\"}\n");
  const hash = createHash("sha256").update(await readFile(resolve(exportDir, "evidence.json"))).digest("hex");
  await writeFile(resolve(exportDir, "manifest.sha256"), `${hash}  evidence.json\n`);
  await writeFile(resolve(versionDir, "99-acceptance.md"), "[export](../../../evidence/local/V2.3/run-123/evidence.json) [manifest](../../../evidence/local/V2.3/run-123/manifest.sha256)\n");
  try {
    const result = await auditVersionEvidence(root, "V2");
    assert.equal(result.status, "PASS");
    assert.equal(result.manifestsChecked, 1);
    assert.equal(result.manifestEntriesChecked, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("historical execution manifests remain linked but are not compared to the current worktree", async () => {
  const { root, versionDir, evidenceDir } = await fixture();
  try {
    await writeFile(resolve(evidenceDir, "report.json"), "later-version\n");
    await writeFile(resolve(versionDir, "99-acceptance.md"), "[report](../../../evidence/audits/report.json) [历史执行快照 SHA 清单](../../../evidence/audits/report.sha256)\n");
    const result = await auditVersionEvidence(root, "V2");
    assert.equal(result.status, "PASS");
    assert.equal(result.evidenceReferences, 2);
    assert.equal(result.manifestsChecked, 0);
    assert.equal(result.historicalManifestsSkipped, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
