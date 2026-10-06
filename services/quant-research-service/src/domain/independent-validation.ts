import type { V32IndependentValidationReport } from "../contracts/generated-types.js";
import type { V32PromotionRequest } from "../contracts/generated-types.js";

export type ValidationCheck = V32IndependentValidationReport["checks"][number];

const requiredChecks = ["PIT", "OUT_OF_SAMPLE", "COST", "RULES", "CAPACITY"] as const;
const SHA256 = /^[a-f0-9]{64}$/;

export function buildIndependentValidationReport(
  request: V32PromotionRequest,
  checks: ValidationCheck[],
): V32IndependentValidationReport {
  if (checks.length !== requiredChecks.length) throw new Error("exactly five independent validation checks are required");
  const byId = new Map(checks.map((check) => [check.checkId, check]));
  if (byId.size !== requiredChecks.length || requiredChecks.some((checkId) => !byId.has(checkId))) {
    throw new Error("validation checks must contain each required gate exactly once");
  }
  for (const check of checks) {
    if (!["PASS", "FAIL", "NOT_RUN"].includes(check.status)) throw new Error(`${check.checkId} status is invalid`);
    if (typeof check.evidenceSha256 !== "string" || !SHA256.test(check.evidenceSha256)) {
      throw new Error(`${check.checkId} requires a valid evidence SHA-256 for every status`);
    }
  }
  const orderedChecks = requiredChecks.map((checkId) => byId.get(checkId)!);
  const hasFailure = orderedChecks.some((check) => check.status === "FAIL");
  const hasNotRun = orderedChecks.some((check) => check.status === "NOT_RUN");
  const disposition = hasFailure ? "REJECTED" : hasNotRun ? "INCOMPLETE" : "ELIGIBLE_FOR_REVIEW";
  const reason = hasFailure ? "REQUIRED_CHECK_FAILED" : hasNotRun ? "REQUIRED_CHECK_NOT_RUN" : "ALL_REQUIRED_CHECKS_PASSED";
  return {
    schemaVersion: "v3.2-independent-validation-report-v1",
    promotionRequestId: request.promotionRequestId,
    testRunId: request.testRunId,
    sourceMode: request.candidateSource === "FIXTURE" ? "FIXTURE" : "REAL_CANDIDATE",
    disposition,
    reason,
    checks: orderedChecks,
    registryMutation: "NOT_PERFORMED",
  };
}
