const SIGNED_STATUS = /\bPASS\b/iu;
const USER_CONFIRMATION = /(?:用户|人工).{0,12}(?:确认|验收)/u;
const ISO_DATE = /\b\d{4}-\d{2}-\d{2}\b/u;
const TEST_RUN_UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/iu;

function hasTraceableEvidence(value) {
  if (TEST_RUN_UUID.test(value)) return true;
  for (const match of value.matchAll(/\[[^\]]+\]\(([^)]+)\)/gu)) {
    const target = match[1].trim().split(/\s+/, 1)[0];
    if (/^(?:[a-z]+:|#|\/\/)/iu.test(target)) continue;
    if (/(?:^|\/)(?:evidence(?:-[^/]*)?|evidence\/)(?:\/|\.|$)/iu.test(decodeURIComponent(target.split("#", 1)[0]))) return true;
  }
  return false;
}

export function parseAcceptanceStageRows(acceptance) {
  return [...acceptance.matchAll(/^\|\s*\[(V\d+\.\d+)[^\]]*\]\([^)]+\)(.*)$/gm)]
    .map((match) => {
      const [backend = "", web = "", evidence = "", limitations = "", signoff = ""] = match[2].split("|").map((cell) => cell.trim()).slice(1);
      return { stageId: match[1], backend, web, evidence, limitations, signoff };
    });
}

export function auditPassClaims(stageRows, acceptanceRows) {
  const rowsById = new Map(acceptanceRows.map((row) => [row.stageId, row]));
  return stageRows.filter(({ stageId, status }) => /^PASS(?:\s|\(|（|$)/u.test(status)).flatMap(({ stageId }) => {
    const row = rowsById.get(stageId);
    const failures = [];
    if (!row) return [{ stageId, failures: ["acceptance row is missing"] }];
    if (!SIGNED_STATUS.test(row.backend)) failures.push("backend/automatic acceptance is not PASS");
    if (!SIGNED_STATUS.test(row.web)) failures.push("Web acceptance is not PASS");
    if (!USER_CONFIRMATION.test(row.signoff) || !ISO_DATE.test(row.signoff)) failures.push("dated user acceptance sign-off is missing");
    if (!row.evidence || /待填写|NOT_RUN|NOT_AVAILABLE/u.test(row.evidence)) failures.push("acceptance evidence is missing or not run");
    else if (!hasTraceableEvidence(row.evidence)) failures.push("acceptance evidence has no local evidence link or TestRun UUID");
    return failures.length ? [{ stageId, failures }] : [];
  });
}

export function duplicateStageIds(rows) {
  const seen = new Set();
  const duplicates = new Set();
  for (const { stageId } of rows) {
    if (seen.has(stageId)) duplicates.add(stageId);
    seen.add(stageId);
  }
  return [...duplicates].sort();
}

export function acceptanceRowsWithUnresolvedStatus(rows) {
  const blocker = /\b(?:NOT_RUN|WAITING|FAIL|PARTIALLY_IMPLEMENTED|NOT_AUTHORIZED)\b|待填写|待用户确认/u;
  return rows.filter(({ backend, web, evidence, signoff }) => blocker.test(`${backend} ${web} ${evidence} ${signoff}`));
}
