import { describe, expect, it } from "vitest";
import { toPortfolioFillCommand } from "../../src/domain/portfolio-fill.js";

describe("FakeBroker Outbox to Portfolio fill command", () => {
  const base = { accountId:"account", namespace:"run-ns", security:"600000.SH", externalFillId:"fill-id", quantity:40, price:"10.0000", fee:"0.4000", effectiveAt:"2026-09-25T01:00:00.000Z" };

  it("forwards the exact reserved SELL identity and currency", () => {
    const reservation = { reservationId:"reservation-id", ownerId:"owner", testRunId:"test-run", clientOrderId:"order-1" };
    expect(toPortfolioFillCommand({ ...base, side:"SELL", currency:"CNY", reservation })).toEqual({ namespace:"run-ns", security:"600000.SH", quantity:40, price:"10.0000", fee:"0.4000", currency:"CNY", effectiveAt:base.effectiveAt, externalFillId:"fill-id", side:"SELL", reservation });
  });

  it("keeps legacy outbox events compatible with Portfolio defaults", () => {
    expect(toPortfolioFillCommand(base)).toMatchObject({ currency:"CNY", side:"BUY" });
    expect(toPortfolioFillCommand(base)).not.toHaveProperty("reservation");
  });
});
