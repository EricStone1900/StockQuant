import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { auditV1RequirementCrosswalk } from "./audit-v1-requirement-crosswalk.mjs";

test("crosswalk audit validates paths, exact test names, and current source text", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-crosswalk-audit-"));
  try {
    await mkdir(join(root, "evidence/audits"), { recursive: true });
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "docs/stage.md"), "- requirement text\n");
    await writeFile(join(root, "tests/example.test.ts"), "it('exact behavior name', () => {});\n");
    const index = {
      count: 1,
      requirements: [{
        requirementId: "V1-TEST-1",
        sourcePath: "../../docs/stage.md",
        stageTestPlan: "../../docs/stage.md",
        stageAcceptance: "../../docs/stage.md",
        stageRequirementFile: "../../docs/stage.md",
        evidenceIndex: "../../docs/stage.md",
        testMapping: {
          evidencePaths: ["../../docs/stage.md"],
          exactTestNames: [{ path: "tests/example.test.ts", name: "exact behavior name" }],
        },
        currentSourceAnchorCandidate: { text: "- requirement text" },
      }],
    };
    await writeFile(join(root, "evidence/audits/crosswalk.json"), `${JSON.stringify(index)}\n`);

    const report = await auditV1RequirementCrosswalk(root, "evidence/audits/crosswalk.json");
    assert.equal(report.status, "PASS");
    assert.equal(report.pathFieldReferencesChecked, 6);
    assert.equal(report.exactTestNameReferencesChecked, 1);
    assert.equal(report.currentSourceAnchorTextsChecked, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("crosswalk audit fails stale source text and missing test declarations", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-crosswalk-audit-"));
  try {
    await mkdir(join(root, "evidence/audits"), { recursive: true });
    await mkdir(join(root, "docs"), { recursive: true });
    await mkdir(join(root, "tests"), { recursive: true });
    await writeFile(join(root, "docs/stage.md"), "current requirement\n");
    await writeFile(join(root, "tests/example.test.ts"), "it('different name', () => {});\n");
    const index = {
      count: 1,
      requirements: [{
        requirementId: "V1-TEST-1",
        sourcePath: "../../docs/stage.md",
        stageTestPlan: "../../docs/stage.md",
        stageAcceptance: "../../docs/stage.md",
        stageRequirementFile: "../../docs/stage.md",
        evidenceIndex: "../../docs/stage.md",
        testMapping: { evidencePaths: ["../../docs/stage.md"], exactTestNames: [{ path: "tests/example.test.ts", name: "missing test name" }] },
        currentSourceAnchorCandidate: { text: "old requirement" },
      }],
    };
    await writeFile(join(root, "evidence/audits/crosswalk.json"), `${JSON.stringify(index)}\n`);

    const report = await auditV1RequirementCrosswalk(root, "evidence/audits/crosswalk.json");
    assert.equal(report.status, "FAIL");
    assert.equal(report.testNameMismatches.length, 1);
    assert.deepEqual(report.staleSourceAnchors, ["V1-TEST-1"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
