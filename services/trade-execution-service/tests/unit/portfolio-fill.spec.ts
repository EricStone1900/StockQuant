import { describe, expect, it } from "vitest";
import { toPortfolioFillCommand } from "../../src/domain/portfolio-fill.js";
import { resolvePaperSettlement } from "../../src/domain/paper-settlement-calendar.js";

describe("FakeBroker Outbox to Portfolio fill command", () => {
  const base = { accountId:"account", namespace:"run-ns", security:"600000.SH", externalFillId:"fill-id", quantity:40, price:"10.0000", fee:"0.4000", effectiveAt:"2026-09-25T01:00:00.000Z" };

  it("forwards the exact reserved SELL identity and currency", () => {
    const reservation = { reservationId:"reservation-id", ownerId:"owner", testRunId:"test-run", clientOrderId:"order-1" };
    const settlement = resolvePaperSettlement("CNY", "2026-09-25T01:00:00.000Z");
    expect(settlement).toEqual({ tradeDate:"2026-09-25", settlementDate:"2026-09-28", calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:null });
    expect(toPortfolioFillCommand({ ...base, side:"SELL", currency:"CNY", settlement, reservation })).toEqual({ namespace:"run-ns", security:"600000.SH", quantity:40, price:"10.0000", fee:"0.4000", currency:"CNY", effectiveAt:base.effectiveAt, externalFillId:"fill-id", side:"SELL", settlement, reservation });
  });

  it("derives US trade dates in the market timezone and fails closed in calendar gaps", () => {
    expect(resolvePaperSettlement("USD", "2026-09-25T01:00:00.000Z")).toEqual({ tradeDate:"2026-09-24", settlementDate:"2026-09-25", calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:null });
    expect(resolvePaperSettlement("CNY", "2026-09-26T01:00:00.000Z")).toEqual({ tradeDate:"2026-09-26", settlementDate:null, calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:"SETTLEMENT_CALENDAR_UNAVAILABLE" });
  });

  it("uses each market's local date across UTC midnight boundaries", () => {
    expect(resolvePaperSettlement("CNY", "2026-09-24T16:30:00.000Z")).toEqual({ tradeDate:"2026-09-25", settlementDate:"2026-09-28", calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:null });
    expect(resolvePaperSettlement("USD", "2026-09-25T03:30:00.000Z")).toEqual({ tradeDate:"2026-09-24", settlementDate:"2026-09-25", calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:null });
    expect(resolvePaperSettlement("USD", "2026-09-25T04:30:00.000Z")).toEqual({ tradeDate:"2026-09-25", settlementDate:"2026-09-28", calendarVersion:"v1.4-synthetic-settlement-3", settlementErrorCode:null });
  });

  it("keeps legacy outbox events compatible with Portfolio defaults", () => {
    expect(toPortfolioFillCommand(base)).toMatchObject({ currency:"CNY", side:"BUY" });
    expect(toPortfolioFillCommand(base)).not.toHaveProperty("reservation");
  });
});
