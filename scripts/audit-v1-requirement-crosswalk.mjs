import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultIndex = "evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json";

function isInside(root, target) {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export async function auditV1RequirementCrosswalk(repositoryRoot, indexPath = defaultIndex) {
  const root = resolve(repositoryRoot);
  const absoluteIndex = resolve(root, indexPath);
  const indexDirectory = dirname(absoluteIndex);
  const indexBytes = await readFile(absoluteIndex);
  const crosswalk = JSON.parse(indexBytes.toString("utf8"));
  const targets = new Set();
  const missingPaths = [];
  const testNameMismatches = [];
  const staleSourceAnchors = [];
  let pathFieldReferencesChecked = 0;
  let exactTestNameReferencesChecked = 0;
  let currentSourceAnchorTextsChecked = 0;

  async function checkPath(value, base) {
    if (typeof value !== "string" || value.length === 0) return;
    pathFieldReferencesChecked += 1;
    const target = resolve(base, value);
    targets.add(target);
    if (!isInside(root, target)) {
      missingPaths.push(`${value} (escapes repository)`);
      return;
    }
    try {
      await stat(target);
    } catch {
      missingPaths.push(value);
    }
  }

  for (const requirement of crosswalk.requirements ?? []) {
    for (const key of ["sourcePath", "stageTestPlan", "stageAcceptance", "stageRequirementFile", "evidenceIndex"]) {
      await checkPath(requirement[key], indexDirectory);
    }
    for (const evidencePath of requirement.testMapping?.evidencePaths ?? []) {
      await checkPath(evidencePath, indexDirectory);
    }

    for (const testReference of requirement.testMapping?.exactTestNames ?? []) {
      exactTestNameReferencesChecked += 1;
      const sourcePath = resolve(root, testReference.path ?? "");
      targets.add(sourcePath);
      try {
        if (!isInside(root, sourcePath) || !(await readFile(sourcePath, "utf8")).includes(testReference.name)) {
          testNameMismatches.push({ path: testReference.path, name: testReference.name });
        }
      } catch {
        testNameMismatches.push({ path: testReference.path, name: testReference.name });
      }
    }

    const candidate = requirement.currentSourceAnchorCandidate;
    if (candidate?.text) {
      currentSourceAnchorTextsChecked += 1;
      const sourcePath = resolve(indexDirectory, requirement.stageRequirementFile ?? "");
      try {
        if (!(await readFile(sourcePath, "utf8")).includes(candidate.text)) staleSourceAnchors.push(requirement.requirementId);
      } catch {
        staleSourceAnchors.push(requirement.requirementId);
      }
    } else if (candidate) {
      staleSourceAnchors.push(requirement.requirementId);
    }
  }

  const requirementIds = (crosswalk.requirements ?? []).map(({ requirementId }) => requirementId);
  const duplicateRequirementIds = requirementIds.filter((id, index) => requirementIds.indexOf(id) !== index);
  const missingCount = crosswalk.count !== requirementIds.length;
  const failures = missingPaths.length + testNameMismatches.length + staleSourceAnchors.length + duplicateRequirementIds.length + Number(missingCount);

  return {
    schemaVersion: 1,
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()),
    auditId: "V1-CROSSWALK-CURRENT",
    status: failures === 0 ? "PASS" : "FAIL",
    sourceCrosswalk: relative(root, absoluteIndex),
    sourceCrosswalkSha256: createHash("sha256").update(indexBytes).digest("hex"),
    requirementCount: requirementIds.length,
    declaredRequirementCount: crosswalk.count ?? null,
    uniqueRequirementIds: new Set(requirementIds).size,
    duplicateRequirementIds: [...new Set(duplicateRequirementIds)],
    pathFieldReferencesChecked,
    uniqueResolvedTargets: targets.size,
    missingPaths,
    exactTestNameReferencesChecked,
    testNameMismatches,
    currentSourceAnchorTextsChecked,
    staleSourceAnchors,
    scope: "Checks current source/evidence path existence, exact test declaration text, and currentSourceAnchorCandidate text. It does not establish behavior, semantic sufficiency, execution, or acceptance.",
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const report = await auditV1RequirementCrosswalk(root);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.status === "PASS" ? 0 : 1);
}
