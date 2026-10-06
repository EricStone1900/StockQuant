import { describe, expect, it } from "vitest";
import { assertV33CompletionEvidence, isV33WorkflowTerminal, isV33WorkflowTransitionAllowed } from "../../src/application/v33-run-state.js";

describe("V3.3 TestRun state transitions", () => {
  it("allows execution, restart requeue, and terminal outcomes", () => {
    expect(isV33WorkflowTransitionAllowed("QUEUED", "RUNNING")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("RUNNING", "QUEUED")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("RUNNING", "WAITING")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("RUNNING", "RUNNING")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("WAITING", "RUNNING")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("QUEUED", "FAILED")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("RUNNING", "CANCELLED")).toBe(true);
    expect(isV33WorkflowTransitionAllowed("QUEUED", "COMPLETED")).toBe(false);
  });

  it("keeps terminal states immutable", () => {
    for (const terminal of ["COMPLETED", "FAILED", "CANCELLED"] as const) {
      expect(isV33WorkflowTerminal(terminal)).toBe(true);
      for (const next of ["QUEUED", "RUNNING", "WAITING", "COMPLETED", "FAILED", "CANCELLED"] as const) {
        expect(isV33WorkflowTransitionAllowed(terminal, next)).toBe(false);
      }
    }
    expect(isV33WorkflowTerminal("RUNNING")).toBe(false);
  });

  it("requires complete business, budget, Runner, and Paper evidence before COMPLETED", () => {
    const assertions = ["V3.1_ACCEPTANCE", "V3.2_EXACT_VERSION", "PAPER_CONTINUITY", "V3.3_EXECUTOR"]
      .map((id) => ({ id, status: "PASS" }));
    const evidence = {
      businessWorkflow: "COMPLETED", paperContinuity: "VERIFIED",
      stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED",
      experimentIds: ["experiment-1"], runnerJobIds: ["job-1"], expectedRounds: 2, completedRounds: 2,
    };
    expect(() => assertV33CompletionEvidence(assertions, evidence)).not.toThrow();
    expect(() => assertV33CompletionEvidence(assertions.slice(0, 3), evidence)).toThrow(/PASS evidence/);
    expect(() => assertV33CompletionEvidence(assertions, { ...evidence, completedRounds: 1 })).toThrow(/completed Experiment rounds/);
    expect(() => assertV33CompletionEvidence(assertions, { ...evidence, paperContinuity: "NOT_CHECKED" })).toThrow(/Paper continuity/);
  });
});
