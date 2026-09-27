import { describe, expect, it } from "vitest";
import { canonicalJson } from "../../src/canonical-json.js";
import { evidenceSha256, parseValidationSubmission, reportMatchesRequest, validationSubmissionFingerprint } from "../../src/validation-submission.js";

const requestIdentity = { promotionRequestId: "9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2", testRunId: "ff979c31-6f72-492d-8091-89cde9f05494", candidateSource: "FIXTURE" };
const ids = ["PIT", "OUT_OF_SAMPLE", "COST", "RULES", "CAPACITY"] as const;
function validSubmission() {
  const evidence = Object.fromEntries(ids.map((checkId) => {
    const details = { assertion: `${checkId}-checked`, count: 1 };
    return [checkId, { evidenceSha256: evidenceSha256(checkId, "PASS", details), details }];
  }));
  return {
    schemaVersion: "v3.2-independent-validation-submission-v1",
    report: {
      schemaVersion: "v3.2-independent-validation-report-v1",
      promotionRequestId: requestIdentity.promotionRequestId,
      testRunId: requestIdentity.testRunId,
      sourceMode: "FIXTURE",
      disposition: "ELIGIBLE_FOR_REVIEW", reason: "ALL_REQUIRED_CHECKS_PASSED",
      checks: ids.map((checkId) => ({ checkId, status: "PASS", evidenceSha256: evidence[checkId].evidenceSha256 })),
      registryMutation: "NOT_PERFORMED",
    },
    evidence,
  };
}

describe("V3.2 immutable independent validation submission", () => {
  it("uses locale-independent key order for nested canonical JSON", () => {
    expect(canonicalJson({ "😀": 4, a: 2, "é": 3, A: 1 })).toBe('{"A":1,"a":2,"é":3,"😀":4}');
    expect(canonicalJson({ "😀": 4, a: 2, "é": 3, A: 1 })).toBe(canonicalJson({ A: 1, "é": 3, a: 2, "😀": 4 }));
  });

  it("accepts a complete report only when all five evidence hashes verify", () => {
    const parsed = parseValidationSubmission(validSubmission());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(reportMatchesRequest(parsed.submission.report, requestIdentity)).toBe(true);
    expect(validationSubmissionFingerprint(parsed.submission)).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("rejects evidence mutation and a report disposition that disagrees with check results", () => {
    const changedEvidence = structuredClone(validSubmission());
    changedEvidence.evidence.PIT.details.assertion = "tampered";
    expect(parseValidationSubmission(changedEvidence)).toMatchObject({ ok: false, reason: "PIT evidence content hash is invalid" });

    const changedDisposition = structuredClone(validSubmission());
    changedDisposition.report.checks[0].status = "FAIL";
    expect(parseValidationSubmission(changedDisposition)).toMatchObject({ ok: false, reason: "report disposition does not agree with its check statuses" });
  });

  it("rejects duplicate checks, Registry mutation, and identity drift", () => {
    const duplicate = structuredClone(validSubmission());
    duplicate.report.checks[1].checkId = "PIT";
    expect(parseValidationSubmission(duplicate)).toMatchObject({ ok: false, reason: "validation check fields are invalid or duplicated" });

    const registry = structuredClone(validSubmission());
    registry.report.registryMutation = "ACTIVATED";
    expect(parseValidationSubmission(registry).ok).toBe(false);

    const parsed = parseValidationSubmission(validSubmission());
    expect(parsed.ok && reportMatchesRequest({ ...parsed.submission.report, testRunId: "552529b0-f0f6-4448-a177-2e9c2aa9dee7" }, requestIdentity)).toBe(false);
  });
});
