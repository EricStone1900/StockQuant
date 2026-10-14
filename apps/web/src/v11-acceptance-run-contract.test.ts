import { describe, expect, it } from "vitest";
import { parseV11AcceptanceRun } from "./v11-acceptance-run-contract.js";

const validRun = {
  testRunId: "11111111-1111-4111-8111-111111111111",
  stageId: "V1.1",
  scenarioId: "normal",
  scenarioVersion: "1.0.0",
  namespace: "v11-test-namespace",
  ownerId: "owner-1",
  status: "COMPLETED",
  seed: 20260907,
  accountId: "22222222-2222-4222-8222-222222222222",
  createdAt: "2026-10-11T10:00:00.000Z",
  completedAt: "2026-10-11T10:00:01.000Z",
  error: null,
  assertions: [{ assertionId: "ACCOUNT-INIT", status: "PASS", expected: {}, actual: {}, evidence: {} }]
};

describe("V1.1 acceptance run response contract", () => {
  it("accepts a response matching the canonical JSON Schema", () => {
    expect(parseV11AcceptanceRun(validRun)).toEqual(validRun);
  });

  it("rejects schema drift before the response reaches Web state", () => {
    expect(() => parseV11AcceptanceRun({ ...validRun, stageId: "V1.2" })).toThrow(/Invalid V1.1 acceptance run response/);
    expect(() => parseV11AcceptanceRun({ ...validRun, unexpected: true })).toThrow(/Invalid V1.1 acceptance run response/);
    expect(() => parseV11AcceptanceRun({ ...validRun, testRunId: "not-a-uuid" })).toThrow(/Invalid V1.1 acceptance run response/);
  });
});
