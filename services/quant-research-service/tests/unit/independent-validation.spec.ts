import { describe, expect, it } from "vitest";
import { buildIndependentValidationReport, type ValidationCheck } from "../../src/independent-validation.js";
import type { V32PromotionRequest } from "../../src/contracts/generated-types.js";

const request = {
  schemaVersion: "v3.2-promotion-request-v1",
  promotionRequestId: "9dfb2dd9-f668-4fb2-873d-f7ec32aedbc2",
  testRunId: "ff979c31-6f72-492d-8091-89cde9f05494",
  experimentId: "275a9fe1-651f-444a-a6c2-c7f008509127",
  candidateSource: "FIXTURE",
  candidateArtifact: { artifactId: "candidate-sma-fixed-v1", namespace: "research/ff979c31-6f72-492d-8091-89cde9f05494/275a9fe1-651f-444a-a6c2-c7f008509127/outputs", sha256: "a".repeat(64) },
  codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64),
  budget: { allocationId: "fixture", currency: "USD", reservedMinor: 500, consumedMinor: 120 }, idempotencyKey: "fixture-key-123",
} satisfies V32PromotionRequest;
const checkIds = ["PIT", "OUT_OF_SAMPLE", "COST", "RULES", "CAPACITY"] as const;
const passing = (): ValidationCheck[] => checkIds.map((checkId) => ({ checkId, status: "PASS", evidenceSha256: "f".repeat(64) }));

describe("independent validation report gate", () => {
  it("allows review only when all five checks carry evidence and never mutates Registry", () => {
    const report = buildIndependentValidationReport(request, passing());
    expect(report.disposition).toBe("ELIGIBLE_FOR_REVIEW");
    expect(report.sourceMode).toBe("FIXTURE");
    expect(report.registryMutation).toBe("NOT_PERFORMED");
    expect(report.checks.map(({ checkId }) => checkId)).toEqual(checkIds);
  });

  it("rejects any failed gate even when other checks are incomplete", () => {
    const checks = passing();
    checks[0] = { checkId: "PIT", status: "FAIL", evidenceSha256: "1".repeat(64) };
    checks[1] = { checkId: "OUT_OF_SAMPLE", status: "NOT_RUN", evidenceSha256: "1".repeat(64) };
    const report = buildIndependentValidationReport(request, checks);
    expect(report.disposition).toBe("REJECTED");
    expect(report.reason).toBe("REQUIRED_CHECK_FAILED");
  });

  it("keeps missing checks incomplete and rejects duplicate or unsupported gate sets", () => {
    const checks = passing();
    checks[2] = { checkId: "COST", status: "NOT_RUN", evidenceSha256: "2".repeat(64) };
    expect(buildIndependentValidationReport(request, checks).disposition).toBe("INCOMPLETE");
    expect(() => buildIndependentValidationReport(request, checks.slice(1))).toThrow("exactly five");
    const duplicate = [...checks, { ...checks[0] }];
    expect(() => buildIndependentValidationReport(request, duplicate)).toThrow("exactly five");
  });

  it("requires evidence for a PASS result", () => {
    const checks = passing();
    checks[4] = { checkId: "CAPACITY", status: "PASS", evidenceSha256: null };
    expect(() => buildIndependentValidationReport(request, checks)).toThrow("requires a valid evidence SHA-256 for every status");
  });

  it("rejects malformed PASS hashes and invalid runtime statuses", () => {
    const malformed = passing();
    malformed[0] = { checkId: "PIT", status: "PASS", evidenceSha256: "not-a-hash" };
    expect(() => buildIndependentValidationReport(request, malformed)).toThrow("requires a valid evidence SHA-256 for every status");

    const invalidStatus = passing();
    invalidStatus[0] = { checkId: "PIT", status: "SKIPPED" as ValidationCheck["status"], evidenceSha256: "f".repeat(64) };
    expect(() => buildIndependentValidationReport(request, invalidStatus)).toThrow("status is invalid");
  });
});
