import { describe, expect, it } from "vitest";
import { isV11ScenarioId, V11_SCENARIO_IDS } from "./scenario-catalog";

describe("web V1.1 scenario catalog", () => {
  it("only renders supported scenario controls", () => {
    expect(V11_SCENARIO_IDS).toEqual(["normal", "rejection", "recovery"]);
    expect(isV11ScenarioId("live-order")).toBe(false);
  });
});
