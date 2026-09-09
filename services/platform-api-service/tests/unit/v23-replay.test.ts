import { describe, expect, it } from "vitest";
import { V23ReplayEngine } from "../../src/application/v23-replay.js";

describe("V2.3 deterministic replay", () => {
  it("executes signals on the next bar with participation-limited fill", () => {
    const result = new V23ReplayEngine().run("normal", 20260907);
    expect(result.status).toBe("COMPLETED");
    expect(result.assertions.every((item) => item.status === "PASS")).toBe(true);
    expect(result.evidence.signals[0].executedAt).toBe("2024-01-03T09:31:00+08:00");
    expect(result.evidence.fills[0].quantity).toBeLessThan(result.evidence.orders[0].requestedQuantity);
  });

  it("rejects future and unavailable execution inputs without fills", () => {
    const result = new V23ReplayEngine().run("rejection", 20260907);
    expect(result.evidence.fills).toHaveLength(0);
    expect(result.evidence.rejections.map((item: { code: string }) => item.code)).toEqual(["FUTURE_DATA", "ZERO_VOLUME", "MISSING_BAR"]);
  });

  it("keeps checkpoint recovery idempotent", () => {
    const result = new V23ReplayEngine().run("recovery", 20260907);
    expect(result.evidence.recovery.duplicateFillIds).toEqual([]);
    expect(result.evidence.recovery.referenceNav).toBe(result.evidence.recovery.resumedNav);
  });
});
