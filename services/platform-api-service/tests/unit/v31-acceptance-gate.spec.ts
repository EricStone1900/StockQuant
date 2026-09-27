import { describe, expect, it } from "vitest";
import { evaluateV31PromotionGate, type V31GateRun } from "../../src/application/v31-acceptance-gate.js";

const validRun = (): V31GateRun => ({
  testRunId: "11111111-1111-4111-8111-111111111111",
  stageId: "V3.1",
  scenarioId: "normal",
  status: "COMPLETED",
  assertions: [
    { assertionId: "V3.1-REAL-MODEL-001", status: "PASS" },
    { assertionId: "V3.1-RUNNER-001", status: "PASS" },
  ],
  evidence: {
    environmentMode: "RESEARCH",
    brokerMode: "FAKE",
    modelCall: { providerMode: "LIVE", modelRunId: "model-run-1", responseSha256: "a".repeat(64), actualCostCents: 23 },
    orchestration: { runnerJob: { status: "COMPLETED", artifacts: [{ status: "PUBLISHED", sha256: "b".repeat(64) }] } },
  },
});

describe("evaluateV31PromotionGate", () => {
  it("requires a completed real-model run, completed isolated runner outputs, and required passing assertions", () => {
    expect(evaluateV31PromotionGate(validRun()).stageStatus).toBe("PASS");
    const fixtureRun = validRun();
    (fixtureRun.evidence.modelCall as Record<string, unknown>).providerMode = "FIXTURE";
    expect(evaluateV31PromotionGate(fixtureRun).stageStatus).toBe("NOT_RUN");
    const missingArtifact = validRun();
    ((missingArtifact.evidence.orchestration as Record<string, any>).runnerJob as Record<string, unknown>).artifacts = [];
    expect(evaluateV31PromotionGate(missingArtifact).stageStatus).toBe("NOT_RUN");
    const failedAssertion = validRun();
    (failedAssertion.assertions[0] as Record<string, unknown>).status = "FAIL";
    expect(evaluateV31PromotionGate(failedAssertion).stageStatus).toBe("NOT_RUN");
  });

  it("hashes the exact run evidence canonically and changes when the evidence changes", () => {
    const first = validRun();
    const second = validRun();
    second.evidence = Object.fromEntries(Object.entries(second.evidence).reverse());
    expect(evaluateV31PromotionGate(first).evidenceSha256).toBe(evaluateV31PromotionGate(second).evidenceSha256);
    (second.evidence.modelCall as Record<string, unknown>).actualCostCents = 24;
    expect(evaluateV31PromotionGate(first).evidenceSha256).not.toBe(evaluateV31PromotionGate(second).evidenceSha256);
  });
});
