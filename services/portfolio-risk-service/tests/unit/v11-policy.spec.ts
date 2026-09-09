import { describe, expect, it } from "vitest";
import { canonicalInitialCash, isV11TradingModeAllowed } from "../../src/domain/v11-policy.js";

describe("V1.1 trading policy", () => {
  it("allows only PAPER + FAKE with LIVE explicitly disabled", () => {
    expect(isV11TradingModeAllowed("PAPER", "FAKE", "false")).toBe(true);
    expect(isV11TradingModeAllowed("LIVE", "FAKE", "false")).toBe(false);
    expect(isV11TradingModeAllowed("PAPER", "REAL", "false")).toBe(false);
    expect(isV11TradingModeAllowed("PAPER", "FAKE", "true")).toBe(false);
  });

  it("normalizes fixture money without using floating point", () => {
    expect(canonicalInitialCash("10000.00")).toBe("10000.0000");
    expect(() => canonicalInitialCash("10000.00001")).toThrow("decimal string");
  });
});
