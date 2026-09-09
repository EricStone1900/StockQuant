import { describe, expect, it } from "vitest";
import { isV11Scenario, V11_SCENARIOS } from "../../src/application/v11-scenarios.js";

describe("V1.1 scenario catalog", () => {
  it("exposes normal, rejection and recovery exactly once", () => {
    expect(V11_SCENARIOS.map((scenario) => scenario.scenarioId)).toEqual(["normal", "rejection", "recovery"]);
  });

  it("rejects an unversioned arbitrary scenario", () => {
    expect(isV11Scenario("delete-all-data")).toBe(false);
  });
});
