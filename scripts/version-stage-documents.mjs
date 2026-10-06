import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

const VERSION_DIRECTORIES = {
  V1: "v1-local-simulation",
  V2: "v2-data-and-replay",
  V3: "v3-research-and-ubuntu",
};

function inside(root, candidate) {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function sectionBody(document, sectionNumber) {
  const heading = new RegExp(`^##\\s+${sectionNumber}\\.`, "m").exec(document);
  if (!heading) return "";
  const start = heading.index + heading[0].length;
  const next = /^##\s+/m.exec(document.slice(start));
  return document.slice(start, next ? start + next.index : document.length);
}

export async function auditStageDocuments(repositoryRoot, version, planText, stageRows) {
  const directory = VERSION_DIRECTORIES[version];
  if (!directory) throw new Error("version must be V1, V2, or V3");
  const root = await realpath(repositoryRoot);
  const docsRoot = resolve(root, "docs/prd", directory);
  const failures = [];
  for (const required of ["00-version-plan.md", "90-test-plan.md", "99-acceptance.md"]) {
    const path = resolve(docsRoot, required);
    try {
      const resolved = await realpath(path);
      if (!inside(root, resolved) || !(await stat(resolved)).isFile()) throw new Error("not a repository file");
    } catch {
      failures.push(`missing required version document docs/prd/${directory}/${required}`);
    }
  }
  try {
    const traceability = await realpath(resolve(root, "docs/prd/01-feature-traceability.md"));
    if (!inside(root, traceability) || !(await stat(traceability)).isFile()) throw new Error("not a repository file");
  } catch {
    failures.push("missing required document docs/prd/01-feature-traceability.md");
  }

  const linkedStages = new Map([...planText.matchAll(/^\|\s*\[(V\d+\.\d+)\]\(([^)]+\.md)\)[^|]*\|/gm)].map((match) => [match[1], match[2]]));
  for (const { stageId, status } of stageRows) {
    const relativePath = linkedStages.get(stageId);
    if (!relativePath) {
      failures.push(`${stageId}: missing stage-document link in docs/prd/${directory}/00-version-plan.md`);
      continue;
    }
    if (/^(?:[a-z]+:|\/|\\)/i.test(relativePath)) {
      failures.push(`${stageId}: stage-document link must be repository-local`);
      continue;
    }
    const path = resolve(docsRoot, relativePath);
    try {
      const resolved = await realpath(path);
      if (!inside(root, resolved) || !(await stat(resolved)).isFile()) throw new Error("not a repository file");
      const document = await readFile(resolved, "utf8");
      for (const section of [2, 7, 8]) {
        if (!new RegExp(`^##\\s+${section}\\.`, "m").test(document)) failures.push(`${stageId}: ${relative(root, resolved)} is missing required section ${section}`);
      }
      if (/^PASS(?:\s|\(|（|$)/u.test(status ?? "")) {
        const delivery = sectionBody(document, 7);
        const runbook = sectionBody(document, 8);
        if (!delivery.trim() || /^- \[ \] /m.test(delivery)) failures.push(`${stageId}: PASS status requires all section 7 delivery items to be checked`);
        if (!/VERIFIED_EXECUTABLE/u.test(runbook) || /DRAFT_NOT_EXECUTABLE|待实现后填写|目标命令，待实现/u.test(runbook)) failures.push(`${stageId}: PASS status requires a complete VERIFIED_EXECUTABLE section 8 runbook`);
      }
    } catch {
      failures.push(`${stageId}: missing or unsafe stage document ${relativePath}`);
    }
  }
  return { status: failures.length ? "FAIL" : "PASS", stagesChecked: stageRows.length, failures };
}
