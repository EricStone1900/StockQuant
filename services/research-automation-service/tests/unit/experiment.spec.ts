import { describe, expect, it } from "vitest";
import { cancelExperiment, createExperiment, validateRequest } from "../../src/domain/experiment.js";

const request = { fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 300, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "v3-1-test-1" };

describe("V3.1 experiment boundary", () => {
  it("accepts only research plus fake execution inputs", () => {
    expect(validateRequest(request)).toMatchObject({ rounds: 1, environmentMode: "RESEARCH", brokerMode: "FAKE" });
    expect(() => validateRequest({ ...request, brokerMode: "LIVE" })).toThrow("brokerMode must be FAKE");
  });
  it("creates a blocked prerequisite state and preserves cancellation", () => {
    const experiment = createExperiment(validateRequest(request), new Date("2026-09-20T00:00:00Z"), "exp-1");
    expect(experiment).toMatchObject({ experimentId: "exp-1", status: "PENDING_PREREQUISITES" });
    expect(cancelExperiment(experiment, new Date("2026-09-20T00:01:00Z"))).toMatchObject({ status: "CANCELLED", cancelledAt: "2026-09-20T00:01:00.000Z" });
  });
  it("rejects budgets above the per experiment hard cap", () => {
    expect(() => validateRequest({ ...request, budgetCents: 1001 })).toThrow("must not exceed 1000 USD cents");
  });
});
