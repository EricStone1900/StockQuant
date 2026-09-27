import { describe, expect, it } from "vitest";
import { validateExperimentDispatchBinding } from "../../src/application/v33-experiment-dispatch-binding.js";
import { createExperiment, validateRequest } from "../../src/domain/experiment.js";

const testRunId = "8e5b0ab2-1835-4ed7-9e11-08754cdd4bf1";
const experiment = createExperiment(validateRequest({
  testRunId, fixtureId: "fixture", modelProfile: "model", rounds: 1,
  budgetCurrency: "USD", budgetCents: 25, environmentMode: "RESEARCH",
  brokerMode: "FAKE", idempotencyKey: "binding-test-1",
}));

describe("V3.3 experiment dispatch binding", () => {
  it("permits only the exact bound TestRun while budget is reserved", () => {
    expect(validateExperimentDispatchBinding(testRunId, experiment, "RESERVED")).toEqual({ status: "BOUND" });
  });
  it("rejects a different TestRun", () => {
    expect(validateExperimentDispatchBinding("1f37d165-2721-45c1-8df3-f8493f6a5e1d", experiment, "RESERVED")).toEqual({ status: "TEST_RUN_MISMATCH" });
  });
  it("rejects legacy experiments without a durable TestRun binding", () => {
    const legacy = { ...experiment, testRunId: undefined };
    expect(validateExperimentDispatchBinding(testRunId, legacy, "RESERVED")).toEqual({ status: "TEST_RUN_MISMATCH" });
  });
  it("rejects missing experiment and non-reserved budget states", () => {
    expect(validateExperimentDispatchBinding(testRunId, null, "RESERVED")).toEqual({ status: "EXPERIMENT_NOT_FOUND" });
    expect(validateExperimentDispatchBinding(testRunId, experiment, "UNKNOWN")).toEqual({ status: "BUDGET_NOT_RESERVED" });
    expect(validateExperimentDispatchBinding(testRunId, experiment, null)).toEqual({ status: "BUDGET_NOT_RESERVED" });
  });
});
