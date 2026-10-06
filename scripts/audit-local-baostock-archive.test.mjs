import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { auditBaostockArchive } from "./audit-local-baostock-archive.mjs";

const roots = [];
function fixture({ license = "", authorizationRef = "", authorizedUse = "", inputPath = "daily/sh_600000.csv", content } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "sq-baostock-archive-audit-"));
  roots.push(root);
  mkdirSync(path.join(root, "daily"), { recursive: true });
  const csv = content ?? "date,code,open,high,low,close,volume,amount\n2024-01-02,sh.600000,10,11,9,10.5,100,1000\n";
  if (!inputPath.includes("..")) writeFileSync(path.join(root, inputPath), csv);
  const manifest = {
    source: "baostock", sourceMode: "READ_ONLY", frequency: "d", startDate: "2024-01-01", endDate: "2024-12-31",
    sampleSize: 1, status: "COMPLETED", selectedCodes: ["sh.600000"], completed: ["sh.600000"], rows: 1,
    artifacts: { "sh.600000": { path: inputPath, rows: 1, sha256: createHash("sha256").update(csv).digest("hex") } },
    license, authorizationRef, authorizedUse,
  };
  const manifestPath = path.join(root, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest));
  return manifestPath;
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("local BaoStock archive audit", () => {
  it("verifies content and reports missing authorization metadata separately", () => {
    const result = auditBaostockArchive(fixture());
    assert.equal(result.archiveIntegrity, "PASS");
    assert.equal(result.usageAuthorizationMetadata, "BLOCKED_MISSING_METADATA");
    assert.equal(result.checkedRows, 1);
  });

  it("does not treat present authorization metadata as verified legal permission", () => {
    const result = auditBaostockArchive(fixture({ license: "terms reference", authorizationRef: "docs/auth.md", authorizedUse: "private research" }));
    assert.equal(result.archiveIntegrity, "PASS");
    assert.equal(result.usageAuthorizationMetadata, "PRESENT_UNVERIFIED");
  });

  it("fails a content hash mismatch", () => {
    const manifestPath = fixture();
    writeFileSync(path.join(path.dirname(manifestPath), "daily/sh_600000.csv"), "date,code,open,high,low,close,volume,amount\n2024-01-03,sh.600000,10,11,9,10.5,100,1000\n");
    assert.equal(auditBaostockArchive(manifestPath).archiveIntegrity, "FAIL");
  });

  it("rejects an artifact path that escapes the archive root", () => {
    const manifestPath = fixture({ inputPath: "../outside.csv" });
    assert.equal(auditBaostockArchive(manifestPath).archiveIntegrity, "FAIL");
  });
});
