import { describe, expect, it } from "vitest";
import { evaluateAutoMandate, type AutoMandate, type AutoMandateDecision } from "../../src/domain/auto-mandate.js";

const mandate: AutoMandate = { mandateId: "mandate-fixture-1", mandateVersion: 1, contentHash: "a".repeat(64), ownerId: "owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-strategy-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1000.00", maxTotalAmount: "2000.00", maxOrderCount: 2, validFrom: "2026-10-07T09:00:00+08:00", expiresAt: "2026-10-07T15:00:00+08:00", status: "ACTIVE" };
const proposal: AutoMandateDecision = { proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "b".repeat(64), ownerId: mandate.ownerId, testRunId: mandate.testRunId, accountId: mandate.accountId, strategyVersion: mandate.strategyVersion, operation: "REBALANCE", market: "CN_A", currency: "CNY", legs: [{ securityId: "600000.SH", side: "BUY", quantity: 50, limitPrice: "10.00" }] };
const evaluate = (overrides: Partial<Parameters<typeof evaluateAutoMandate>[0]> = {}) => evaluateAutoMandate({ mandate, proposal, now: "2026-10-07T10:00:00+08:00", acceptedOrReservedAmount: "0.00", acceptedOrderCount: 0, ...overrides });

describe("versioned V1.3 AUTO_POLICY Mandate evaluation", () => {
  it("authorizes a scoped legal proposal within per-order, cumulative budget and count", () => {
    expect(evaluate()).toEqual({ status: "AUTHORIZED", mandateId: mandate.mandateId, mandateVersion: 1, proposalId: proposal.proposalId, proposalVersion: 1, contentHash: proposal.contentHash, reservedAmount: "500.00", orderCount: 1 });
    expect(evaluate({ acceptedOrReservedAmount: "500.00", acceptedOrderCount: 1 })).toMatchObject({ status: "AUTHORIZED", reservedAmount: "500.00", orderCount: 2 });
  });
  it("rejects a third order and cumulative budget overflow", () => {
    expect(evaluate({ acceptedOrReservedAmount: "1000.00", acceptedOrderCount: 2 })).toMatchObject({ status: "REJECTED", reasonCode: "ORDER_LIMIT_EXCEEDED" });
    expect(evaluate({ acceptedOrReservedAmount: "1600.01", acceptedOrderCount: 1 })).toMatchObject({ status: "REJECTED", reasonCode: "BUDGET_EXCEEDED" });
  });
  it("counts frozen Fixture fees in both the per-order budget and cumulative reservation", () => {
    const feeProposal = { ...proposal, legs: [{ ...proposal.legs[0], estimatedFee: "5.00" }] };
    expect(evaluate({ proposal: feeProposal })).toMatchObject({ status: "AUTHORIZED", reservedAmount: "505.00" });
    expect(evaluate({ mandate: { ...mandate, maxOrderAmount: "504.99" }, proposal: feeProposal })).toMatchObject({ status: "REJECTED", reasonCode: "BUDGET_EXCEEDED" });
  });
  it("does not create or consume orders for HOLD", () => {
    expect(evaluate({ proposal: { ...proposal, operation: "HOLD", legs: [] } })).toMatchObject({ status: "HOLD", reservedAmount: "0.00", orderCount: 0 });
    expect(evaluate({ proposal: { ...proposal, operation: "HOLD", legs: [proposal.legs[0]] } })).toMatchObject({ status: "REJECTED", reasonCode: "INVALID_ORDER" });
  });
  it("fails closed for mandate state, validity window, scope, market currency and security", () => {
    expect(evaluate({ mandate: { ...mandate, status: "PAUSED" } })).toMatchObject({ status: "REJECTED", reasonCode: "MANDATE_INACTIVE" });
    expect(evaluate({ now: "2026-10-07T15:00:00+08:00" })).toMatchObject({ status: "REJECTED", reasonCode: "MANDATE_EXPIRED" });
    expect(evaluate({ proposal: { ...proposal, ownerId: "other-owner" } })).toMatchObject({ status: "REJECTED", reasonCode: "SCOPE_MISMATCH" });
    expect(evaluate({ proposal: { ...proposal, currency: "USD" } })).toMatchObject({ status: "REJECTED", reasonCode: "CURRENCY_MISMATCH" });
    expect(evaluate({ proposal: { ...proposal, legs: [{ ...proposal.legs[0], securityId: "AAPL" }] } })).toMatchObject({ status: "REJECTED", reasonCode: "SECURITY_OUT_OF_SCOPE" });
  });
});
