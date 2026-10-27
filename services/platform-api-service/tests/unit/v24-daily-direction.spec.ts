import { describe, expect, it } from "vitest";
import { evaluateV24DailyDirection, type DailyDirectionInput } from "../../src/application/v24-daily-direction.js";
const input = (): DailyDirectionInput => ({
  clock: { now: () => new Date("2026-10-16T09:31:00+08:00") }, sessionDate: "2026-10-16", expectedPriorSessions: ["2026-10-14", "2026-10-15"],
  bars: [{ securityId: "600000.SH", sessionDate: "2026-10-14", availableAt: "2026-10-14T15:05:00+08:00", close: "10.0000" }, { securityId: "600000.SH", sessionDate: "2026-10-15", availableAt: "2026-10-15T15:05:00+08:00", close: "10.1000" }],
  account: { heldQuantity: 0, sellableQuantity: 0, settledCash: "10000.0000" },
  mandate: { validFrom: "2026-10-16T09:00:00+08:00", expiresAt: "2026-10-17T00:00:00+08:00", paused: false }, referencePrice: "10.2500",
});
describe("proposed C5 daily direction Paper candidate", () => {
  it("buys 100 after a rise and requires the exact settled cash including the fixed fee", () => {
    const x = input(); x.account.settledCash = "1030.0000";
    expect(evaluateV24DailyDirection(x)).toEqual({ action: "BUY", quantity: 100, reason: "DAILY_CLOSE_ROSE" });
    x.account.settledCash = "1029.9999";
    expect(evaluateV24DailyDirection(x).reason).toBe("SETTLED_CASH_INSUFFICIENT");
  });
  it("holds an existing target without adding another lot", () => {
    const x = input(); x.account.heldQuantity = 100;
    expect(evaluateV24DailyDirection(x).action).toBe("HOLD");
  });
  it("sells after a fall only when the 100 shares are sellable", () => {
    const x = input(); x.bars[1].close = "9.9000"; x.account.heldQuantity = 100;
    expect(evaluateV24DailyDirection(x).reason).toBe("SELLABLE_QUANTITY_INSUFFICIENT");
    x.account.sellableQuantity = 100;
    expect(evaluateV24DailyDirection(x)).toEqual({ action: "SELL", quantity: 100, reason: "DAILY_CLOSE_FELL" });
  });
  it.each([0, 100])("holds %i shares when closes are equal", (heldQuantity) => {
    const x = input(); x.bars[1].close = "10.0000"; x.account.heldQuantity = heldQuantity;
    expect(evaluateV24DailyDirection(x).action).toBe("HOLD");
  });
  it.each(["missing", "future", "wrong-security", "duplicate-session", "before-close"])("pauses for %s daily input", (fault) => {
    const x = input();
    if (fault === "missing") x.bars.pop();
    if (fault === "future") x.bars[1].availableAt = "2026-10-16T10:00:00+08:00";
    if (fault === "wrong-security") x.bars[1].securityId = "000001.SZ";
    if (fault === "duplicate-session") x.bars[1].sessionDate = x.bars[0].sessionDate;
    if (fault === "before-close") x.bars[1].availableAt = "2026-10-15T14:59:00+08:00";
    expect(evaluateV24DailyDirection(x).reason).toBe("DAILY_INPUT_UNAVAILABLE");
  });
  it.each(["expired", "paused", "not-started"])("rejects a %s mandate", (fault) => {
    const x = input();
    if (fault === "expired") x.mandate.expiresAt = x.clock.now().toISOString();
    if (fault === "paused") x.mandate.paused = true;
    if (fault === "not-started") x.mandate.validFrom = "2026-10-16T10:00:00+08:00";
    expect(evaluateV24DailyDirection(x).reason).toBe("MANDATE_INACTIVE");
  });
  it("does not use same-session bars or replay a prior session", () => {
    const x = input(); x.expectedPriorSessions[1] = x.sessionDate;
    expect(evaluateV24DailyDirection(x).reason).toBe("SESSION_CONTEXT_INVALID");
    const y = input(); y.sessionDate = "2026-10-15";
    expect(evaluateV24DailyDirection(y).reason).toBe("SESSION_CONTEXT_INVALID");
  });
  it("pauses on excessive notional, malformed cash, or unexpected positions", () => {
    const x = input(); x.referencePrice = "20.0001";
    expect(evaluateV24DailyDirection(x).reason).toBe("ORDER_NOTIONAL_LIMIT");
    const y = input(); y.account.settledCash = "NaN";
    expect(evaluateV24DailyDirection(y).reason).toBe("PRICE_OR_CASH_INVALID");
    const z = input(); z.account.heldQuantity = 200;
    expect(evaluateV24DailyDirection(z).reason).toBe("POSITION_OUTSIDE_SCOPE");
  });
});
