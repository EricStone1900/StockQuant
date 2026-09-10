import { describe, expect, it } from "vitest";
import { isReplayAuthorizationAllowed } from "../../src/domain/authorization-policy.js";
describe("replay authorization policy", () => {
  it("allows only the simulated backtest route", () => {
    expect(isReplayAuthorizationAllowed("BACKTEST", "FAKE")).toBe(true);
    expect(isReplayAuthorizationAllowed("PAPER", "FAKE")).toBe(false);
    expect(isReplayAuthorizationAllowed("BACKTEST", "REAL")).toBe(false);
  });
});
