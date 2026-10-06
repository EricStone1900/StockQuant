import { createHash } from "node:crypto";
import type { V32IndependentValidationReport, V32IndependentValidationSubmission } from "../contracts/generated-types.js";
import { canonicalJson } from "./canonical-json.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[a-f0-9]{64}$/;
const CHECKS = ["PIT", "OUT_OF_SAMPLE", "COST", "RULES", "CAPACITY"] as const;
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));

export function evidenceSha256(checkId: string, status: string, details: Record<string, unknown>): string {
  return createHash("sha256").update(canonicalJson({ checkId, status, details })).digest("hex");
}

export function parseValidationSubmission(value: unknown): { ok: true; submission: V32IndependentValidationSubmission } | { ok: false; reason: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, reason: "submission must be an object" };
  const body = value as Record<string, unknown>;
  if (!exactKeys(body, ["schemaVersion", "report", "evidence"]) || body.schemaVersion !== "v3.2-independent-validation-submission-v1") return { ok: false, reason: "submission schema or properties are invalid" };
  if (!body.report || typeof body.report !== "object" || Array.isArray(body.report)) return { ok: false, reason: "report is invalid" };
  const report = body.report as Record<string, unknown>;
  if (!exactKeys(report, ["schemaVersion", "promotionRequestId", "testRunId", "sourceMode", "disposition", "reason", "checks", "registryMutation"]) || report.schemaVersion !== "v3.2-independent-validation-report-v1" || typeof report.promotionRequestId !== "string" || !UUID.test(report.promotionRequestId) || typeof report.testRunId !== "string" || !UUID.test(report.testRunId) || !["FIXTURE", "REAL_CANDIDATE"].includes(String(report.sourceMode)) || !["ELIGIBLE_FOR_REVIEW", "REJECTED", "INCOMPLETE"].includes(String(report.disposition)) || !["ALL_REQUIRED_CHECKS_PASSED", "REQUIRED_CHECK_FAILED", "REQUIRED_CHECK_NOT_RUN"].includes(String(report.reason)) || report.registryMutation !== "NOT_PERFORMED") return { ok: false, reason: "report identity, enum, or immutable Registry boundary is invalid" };
  if (!Array.isArray(report.checks) || report.checks.length !== CHECKS.length) return { ok: false, reason: "report must contain exactly five validation checks" };
  const checkById = new Map<string, Record<string, unknown>>();
  for (const rawCheck of report.checks) {
    if (!rawCheck || typeof rawCheck !== "object" || Array.isArray(rawCheck)) return { ok: false, reason: "validation check is invalid" };
    const check = rawCheck as Record<string, unknown>;
    if (!exactKeys(check, ["checkId", "status", "evidenceSha256"]) || typeof check.checkId !== "string" || !CHECKS.includes(check.checkId as typeof CHECKS[number]) || !["PASS", "FAIL", "NOT_RUN"].includes(String(check.status)) || typeof check.evidenceSha256 !== "string" || !SHA256.test(check.evidenceSha256) || checkById.has(check.checkId)) return { ok: false, reason: "validation check fields are invalid or duplicated" };
    checkById.set(check.checkId, check);
  }
  if (CHECKS.some((checkId) => !checkById.has(checkId))) return { ok: false, reason: "report is missing a required validation check" };
  const failure = [...checkById.values()].some((check) => check.status === "FAIL");
  const incomplete = [...checkById.values()].some((check) => check.status === "NOT_RUN");
  const expectedDisposition = failure ? "REJECTED" : incomplete ? "INCOMPLETE" : "ELIGIBLE_FOR_REVIEW";
  const expectedReason = failure ? "REQUIRED_CHECK_FAILED" : incomplete ? "REQUIRED_CHECK_NOT_RUN" : "ALL_REQUIRED_CHECKS_PASSED";
  if (report.disposition !== expectedDisposition || report.reason !== expectedReason) return { ok: false, reason: "report disposition does not agree with its check statuses" };

  if (!body.evidence || typeof body.evidence !== "object" || Array.isArray(body.evidence)) return { ok: false, reason: "evidence is invalid" };
  const evidence = body.evidence as Record<string, unknown>;
  if (!exactKeys(evidence, [...CHECKS])) return { ok: false, reason: "evidence must contain exactly the five required check entries" };
  for (const checkId of CHECKS) {
    const item = evidence[checkId];
    if (!item || typeof item !== "object" || Array.isArray(item)) return { ok: false, reason: `${checkId} evidence is invalid` };
    const evidenceItem = item as Record<string, unknown>;
    const check = checkById.get(checkId)!;
    if (!exactKeys(evidenceItem, ["evidenceSha256", "details"]) || typeof evidenceItem.evidenceSha256 !== "string" || evidenceItem.evidenceSha256 !== check.evidenceSha256 || !SHA256.test(evidenceItem.evidenceSha256) || !evidenceItem.details || typeof evidenceItem.details !== "object" || Array.isArray(evidenceItem.details)) return { ok: false, reason: `${checkId} evidence hash or details do not match the report` };
    if (Object.keys(evidenceItem.details as Record<string, unknown>).length === 0 || evidenceSha256(checkId, String(check.status), evidenceItem.details as Record<string, unknown>) !== check.evidenceSha256) return { ok: false, reason: `${checkId} evidence content hash is invalid` };
  }
  return { ok: true, submission: body as unknown as V32IndependentValidationSubmission };
}

export function validationSubmissionFingerprint(submission: V32IndependentValidationSubmission): string {
  return createHash("sha256").update(canonicalJson(submission)).digest("hex");
}

export function reportMatchesRequest(report: V32IndependentValidationReport, request: { promotionRequestId: string; testRunId: string; candidateSource: string }): boolean {
  return report.promotionRequestId === request.promotionRequestId && report.testRunId === request.testRunId && report.sourceMode === (request.candidateSource === "FIXTURE" ? "FIXTURE" : "REAL_CANDIDATE");
}
