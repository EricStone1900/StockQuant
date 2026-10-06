import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditVersionEvidence } from "./verify-version-evidence.mjs";
import { auditTestRunEvidence } from "./version-gate-test-run-evidence.mjs";
import { applyEvidenceAudit } from "./version-gate-evidence-status.mjs";
import { auditStageDocuments } from "./version-stage-documents.mjs";
import { acceptanceRowsWithUnresolvedStatus, auditPassClaims, duplicateStageIds, parseAcceptanceStageRows } from "./version-gate-acceptance.mjs";

const args = process.argv.slice(2);
const version = args[args.indexOf("--version") + 1];
const versions = {
  V1: "v1-local-simulation",
  V2: "v2-data-and-replay",
  V3: "v3-research-and-ubuntu",
};

if (!versions[version]) {
  console.error("usage: pnpm verify:version -- --version V1|V2|V3");
  process.exit(2);
}

const root = resolve(process.cwd(), "docs/prd", versions[version]);
const plan = await readFile(resolve(root, "00-version-plan.md"), "utf8");
const acceptance = await readFile(resolve(root, "99-acceptance.md"), "utf8");
const stageRows = [...plan.matchAll(/^\| \[(V\d+\.\d+)\][^|]*\|[^|]*\|[^|]*\| ([^|]+) \|$/gm)]
  .map((match) => ({ stageId: match[1], status: match[2].trim() }));

if (stageRows.length === 0) {
  console.error(`no stage rows found for ${version}`);
  process.exit(1);
}

const unresolved = stageRows.filter(({ status }) => !/^PASS(?:\s|\(|（|$)/.test(status));
const acceptanceStageRows = parseAcceptanceStageRows(acceptance);
const stageIds = new Set(stageRows.map(({ stageId }) => stageId));
const acceptanceIds = new Set(acceptanceStageRows.map(({ stageId }) => stageId));
const duplicateStageRows = duplicateStageIds(stageRows);
const duplicateAcceptanceRows = duplicateStageIds(acceptanceStageRows);
const missingAcceptance = stageRows.filter(({ stageId }) => !acceptanceIds.has(stageId));
const unexpectedAcceptance = acceptanceStageRows.filter(({ stageId }) => !stageIds.has(stageId));
const unresolvedAcceptance = acceptanceRowsWithUnresolvedStatus(acceptanceStageRows);
const invalidPassClaims = auditPassClaims(stageRows, acceptanceStageRows);
const testRunEvidenceAudit = await auditTestRunEvidence(process.cwd(), acceptanceStageRows, stageRows);
const versionGateSection = acceptance.match(/## 2\. 版本门禁([\s\S]*?)(?=\n## |$)/)?.[1] ?? "";
const versionSummaryIncomplete = /当前结论：\s*(?:NOT_RUN|PARTIALLY_IMPLEMENTED|INCOMPLETE|WAITING)/.test(acceptance);
const uncheckedVersionGate = /^- \[ \] /m.test(versionGateSection);
const stageDocumentationAudit = await auditStageDocuments(process.cwd(), version, plan, stageRows);
const hasFailure = [...stageRows.map(({ status }) => status), ...acceptanceStageRows.flatMap(({ backend, web }) => [backend, web])]
  .some((status) => /\bFAIL\b/.test(status)) || invalidPassClaims.length > 0 || testRunEvidenceAudit.status === "FAIL" || duplicateStageRows.length > 0 || duplicateAcceptanceRows.length > 0;
const incomplete = unresolved.length > 0 || unresolvedAcceptance.length > 0 || invalidPassClaims.length > 0 || testRunEvidenceAudit.status !== "PASS" || duplicateStageRows.length > 0 || duplicateAcceptanceRows.length > 0 || missingAcceptance.length > 0 || unexpectedAcceptance.length > 0 || versionSummaryIncomplete || uncheckedVersionGate || stageDocumentationAudit.status !== "PASS";
const evidenceAudit = await auditVersionEvidence(process.cwd(), version);
const statusWithEvidence = applyEvidenceAudit(incomplete ? (hasFailure ? "FAIL" : "INCOMPLETE") : hasFailure ? "FAIL" : "PASS", evidenceAudit.status);
const result = {
  version,
  status: statusWithEvidence,
  stages: stageRows,
  unresolvedStages: unresolved,
  unresolvedAcceptance,
  invalidPassClaims,
  testRunEvidenceAudit,
  duplicateStageRows,
  duplicateAcceptanceRows,
  missingAcceptance,
  unexpectedAcceptance,
  versionSummaryIncomplete,
  uncheckedVersionGate,
  stageDocumentationAudit,
  evidenceAudit: {
    status: evidenceAudit.status,
    evidenceReferences: evidenceAudit.evidenceReferences,
    manifestsChecked: evidenceAudit.manifestsChecked,
    manifestEntriesChecked: evidenceAudit.manifestEntriesChecked,
    failures: evidenceAudit.failures,
    scope: evidenceAudit.scope,
  },
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.status === "PASS" ? 0 : result.status === "INCOMPLETE" ? 2 : 1);
