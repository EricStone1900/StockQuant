import { describe, expect, it } from "vitest";
import { cancelV33ReadinessRun, V33_READINESS_CANCEL_COMMAND } from "../../src/application/v33-readiness-cancellation.js";

const readinessRun = {
  stageId: "V3.3",
  status: "WAITING",
  assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }],
  evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 },
} as const;

describe("V3.3 readiness-only cancellation", () => {
  it("persists cancellation without changing assertions or inventing cancelled jobs", () => {
    const result = cancelV33ReadinessRun(readinessRun, V33_READINESS_CANCEL_COMMAND, "2026-10-06T01:00:00.000Z");
    expect(result).toMatchObject({ status: "CANCELLED", idempotent: false, assertions: readinessRun.assertions,
      evidence: { readiness: "CANCELLED", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0,
        externalModelCalls: 0, cancellation: { scope: "READINESS_ONLY", runnerJobsCancelled: 0 } } });
  });

  it("is idempotent for a previously cancelled readiness run", () => {
    const previous = cancelV33ReadinessRun(readinessRun, V33_READINESS_CANCEL_COMMAND, "2026-10-06T01:00:00.000Z");
    if ("error" in previous) throw new Error(previous.error);
    const result = cancelV33ReadinessRun({ ...readinessRun, status: previous.status, assertions: previous.assertions, evidence: previous.evidence }, V33_READINESS_CANCEL_COMMAND, "2026-10-06T02:00:00.000Z");
    expect(result).toMatchObject({ status: "CANCELLED", idempotent: true, evidence: { cancellation: { cancelledAt: "2026-10-06T01:00:00.000Z" } } });
  });

  it.each([
    ["requires explicit command confirmation", { ...readinessRun }, "CANCEL", "INVALID_CONFIRMATION"],
    ["refuses a non-V3.3 run", { ...readinessRun, stageId: "V3.2" }, V33_READINESS_CANCEL_COMMAND, "NOT_V33_RUN"],
    ["refuses a run after dispatch begins", { ...readinessRun, evidence: { ...readinessRun.evidence, runnerDispatch: "SUBMITTED", runnerJobsCreated: 1 } }, V33_READINESS_CANCEL_COMMAND, "EXECUTION_ALREADY_STARTED"],
    ["refuses cancellation after an Experiment reservation", { ...readinessRun, evidence: { ...readinessRun.evidence, workflowStep: "EXPERIMENT_RESERVED", experimentId: "experiment-1" } }, V33_READINESS_CANCEL_COMMAND, "EXECUTION_ALREADY_STARTED"],
    ["refuses non-WAITING state", { ...readinessRun, status: "RUNNING" }, V33_READINESS_CANCEL_COMMAND, "NOT_CANCELLABLE"],
  ] as const)("%s", (_label, run, confirmation, expected) => {
    expect(cancelV33ReadinessRun(run, confirmation, "2026-10-06T01:00:00.000Z")).toEqual({ error: expected });
  });
});
