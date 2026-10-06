import { describe, expect, it } from "vitest";
import { fixtureBudgetSettlementEnabled } from "../../src/application/v31-fixture-budget-settlement.js";

describe("Fixture-only direct budget settlement", () => {
  it("requires both test runtime and the explicit deterministic gateway Fixture", () => {
    expect(fixtureBudgetSettlementEnabled({ NODE_ENV: "test", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true" })).toBe(true);
    expect(fixtureBudgetSettlementEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(fixtureBudgetSettlementEnabled({ NODE_ENV: "production", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true" })).toBe(false);
    expect(fixtureBudgetSettlementEnabled({ NODE_ENV: "development", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true" })).toBe(false);
  });
});
