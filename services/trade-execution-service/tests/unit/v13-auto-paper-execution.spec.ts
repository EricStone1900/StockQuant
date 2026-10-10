import { describe, expect, it, vi } from "vitest";
import { V13AutoPaperExecutionService, V13ManualPaperExecutionError } from "../../src/application/v13-manual-paper-execution.js";
import { PortfolioAccountClientError } from "../../src/contracts/generated-portfolio-account-client.js";
import type { V13ProposalResult } from "../../src/contracts/generated-types.js";

const proposal: V13ProposalResult = { proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "a".repeat(64), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: "2026-10-07T10:00:00+08:00", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }], ownerId: "acceptance-owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-auto-policy-test-v1" };
const command = { proposalId: proposal.proposalId, mandateId: "d8c1d600-22f6-44ab-9c2f-5581462d90a4", mandateVersion: 1, ownerId: proposal.ownerId, testRunId: proposal.testRunId, accountId: proposal.accountId, namespace: "run-v13-auto", clientOrderId: "auto-order-1", now: "2026-10-07T09:31:00+08:00" };

function harness() {
  const steps: string[] = [];
  const broker = {
    executeV13ManualPaper: vi.fn(async () => { steps.push("FakeBroker.place"); return { replayed: false, result: { orderId: "order-auto-1", status: "FILLED", brokerMode: "FAKE" as const, fill: { externalFillId: "fill-auto-1", quantity: 100, price: "10.0000", fee: "5.0000", effectiveAt: command.now } } }; }),
    find: vi.fn(async () => ({ order_id: "order-auto-1", status: "FILLED" })), findByNamespaceClientOrderId: vi.fn(async () => null), pendingFill: vi.fn(async () => ({ event_id: "outbox-auto-1" })), outboxStatus: vi.fn(async () => ({ status: "DELIVERED" })), independentAssetSnapshot: vi.fn(async () => ({ current_cash: "8995.0000" })), reconciliationSummary: vi.fn(async () => ({ status: "MATCH" })),
  };
  const portfolio = { reserveAccountResources: vi.fn(async () => { steps.push("Portfolio.reserve"); return { replayed: false, reservation: { reservationId: "portfolio-reservation-1" } }; }) };
  const governance = { readProposal: vi.fn(async () => { steps.push("Governance.read"); return { status: 200, body: proposal }; }) };
  const mandates = { authorizeOrder: vi.fn(async (_id: string, body: unknown) => { steps.push("Mandate.reserve"); return { status: 200, body: { decision: { status: "AUTHORIZED" }, reservationId: "mandate-reservation-1", replayed: false, acceptedCommand: body } }; }), settleReservation: vi.fn(async (_id: string, body: { outcome: string }) => { steps.push(`Mandate.${body.outcome}`); return { status: 200, body: { status: body.outcome } }; }) };
  const outbox = { deliver: vi.fn(async () => { steps.push("Portfolio.postFill"); return true; }) };
  return { steps, broker, portfolio, governance, mandates, outbox, service: new V13AutoPaperExecutionService(broker as never, portfolio as never, governance as never, mandates as never, outbox as never) };
}

describe("V1.3 AUTO_POLICY execution coordinator", () => {
  it("reserves Mandate and Portfolio resources before FakeBroker, then consumes budget and posts the Fill", async () => {
    const h = harness();
    const result = await h.service.execute(command);
    expect(h.steps).toEqual(["Governance.read", "Mandate.reserve", "Portfolio.reserve", "FakeBroker.place", "Mandate.CONSUMED", "Portfolio.postFill"]);
    expect(result).toMatchObject({ mandate: { status: "CONSUMED" }, fill: { quantity: 100 }, independentAssets: { current_cash: "8995.0000" } });
    expect(h.mandates.authorizeOrder).toHaveBeenCalledWith(command.mandateId, expect.objectContaining({ commandHash: expect.stringMatching(/^[a-f0-9]{64}$/u), proposal: expect.objectContaining({ market: "CN_A", currency: "CNY", legs: [{ securityId: "600000.SH", side: "BUY", quantity: 100, limitPrice: "10.00", estimatedFee: "5.00" }] }) }));
  });
  it("releases Mandate budget after deterministic Portfolio rejection and never places", async () => {
    const h = harness();
    h.portfolio.reserveAccountResources.mockImplementationOnce(async () => { h.steps.push("Portfolio.reserve"); throw new PortfolioAccountClientError(409, { error: "INSUFFICIENT_CASH" }); });
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 409 });
    expect(h.steps).toEqual(["Governance.read", "Mandate.reserve", "Portfolio.reserve", "Mandate.RELEASED"]);
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("preserves reservations when FakeBroker outcome is ambiguous", async () => {
    const h = harness();
    h.broker.executeV13ManualPaper.mockImplementationOnce(async () => { h.steps.push("FakeBroker.place"); throw new Error("connection lost after submit"); });
    await expect(h.service.execute(command)).rejects.toThrow("connection lost after submit");
    expect(h.steps).toEqual(["Governance.read", "Mandate.reserve", "Portfolio.reserve", "FakeBroker.place"]);
    expect(h.outbox.deliver).not.toHaveBeenCalled();
  });
  it("settles a previously reserved Mandate and delivers the original pending Fill after recovery read", async () => {
    const h = harness();
    h.mandates.authorizeOrder.mockResolvedValueOnce({ status: 200, body: { decision: { status: "AUTHORIZED" }, reservationId: "mandate-reservation-1", replayed: true } } as never);
    h.broker.findByNamespaceClientOrderId.mockResolvedValueOnce({ order_id: "order-auto-1", status: "LEDGER_PENDING", client_order_id: command.clientOrderId, external_fill_id: "fill-auto-1", fill_quantity: 100, fill_price: "10.0000", fill_fee: "5.0000", effective_at: new Date(command.now) } as never);
    h.broker.find.mockResolvedValueOnce({ order_id: "order-auto-1", status: "FILLED" });
    const result = await h.service.execute(command);
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
    expect(h.mandates.settleReservation).toHaveBeenCalledWith("mandate-reservation-1", { outcome: "CONSUMED", now: command.now });
    expect(h.outbox.deliver).toHaveBeenCalledWith("outbox-auto-1");
    expect(result).toMatchObject({ replayed: true, mandate: { status: "CONSUMED" }, order: { status: "FILLED" }, outbox: { status: "DELIVERED" }, reconciliation: { status: "MATCH" } });
  });
  it("does not submit on an AUTO_POLICY hold", async () => {
    const h = harness();
    h.governance.readProposal.mockResolvedValueOnce({ status: 200, body: { ...proposal, operation: "HOLD", legs: [] } } as never);
    h.mandates.authorizeOrder.mockResolvedValueOnce({ status: 200, body: { decision: { status: "HOLD" }, replayed: false } } as never);
    const result = await h.service.execute(command);
    expect(result).toMatchObject({ decision: { status: "HOLD" }, order: null });
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("checks persisted AUTO status before any budget or resource reservation", async () => {
    const h = harness();
    h.governance.readProposal.mockResolvedValueOnce({ status: 200, body: { ...proposal, status: "MANUAL_APPROVAL_PENDING" } } as never);
    await expect(h.service.execute(command)).rejects.toBeInstanceOf(V13ManualPaperExecutionError);
    expect(h.mandates.authorizeOrder).not.toHaveBeenCalled();
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
  });
  it("authorizes one aggregate AUTO budget, reserves each fixed BUY leg, and submits each child order", async () => {
    const h = harness();
    h.governance.readProposal.mockResolvedValueOnce({ status: 200, body: { ...proposal, legs: [proposal.legs[0], { legId: "leg-2", securityId: "000001.SZ", side: "BUY", quantity: 100 }] } } as never);
    const result = await h.service.execute(command);
    expect(h.governance.readProposal).toHaveBeenCalledTimes(1);
    expect(h.steps).toEqual(["Mandate.reserve", "Portfolio.reserve", "Portfolio.reserve", "FakeBroker.place", "Portfolio.postFill", "FakeBroker.place", "Portfolio.postFill", "Mandate.CONSUMED"]);
    expect(h.mandates.authorizeOrder).toHaveBeenCalledTimes(1);
    expect(h.mandates.authorizeOrder).toHaveBeenCalledWith(command.mandateId, expect.objectContaining({ proposal: expect.objectContaining({ legs: [expect.objectContaining({ securityId: "600000.SH", side: "BUY" }), expect.objectContaining({ securityId: "000001.SZ", side: "BUY" })] }) }));
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledTimes(2);
    expect(h.broker.executeV13ManualPaper).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ mandate: { status: "CONSUMED" }, orders: [{ clientOrderId: `${command.clientOrderId}:leg:01` }, { clientOrderId: `${command.clientOrderId}:leg:02` }], fills: [{ externalFillId: "fill-auto-1" }, { externalFillId: "fill-auto-1" }] });
  });
  it("rejects AUTO SELL legs before Mandate or Portfolio side effects while settlement semantics are unresolved", async () => {
    const h = harness();
    h.governance.readProposal.mockResolvedValueOnce({ status: 200, body: { ...proposal, legs: [proposal.legs[0], { legId: "leg-2", securityId: "000001.SZ", side: "SELL", quantity: 100 }] } } as never);
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 422, message: "multi-leg AUTO_POLICY SELL cash-path semantics remain unresolved" });
    expect(h.mandates.authorizeOrder).not.toHaveBeenCalled();
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("preserves a safe Governance rejection code in the execution error detail", async () => {
    const h = harness();
    h.mandates.authorizeOrder.mockResolvedValueOnce({ status: 403, body: { decision: { status: "REJECTED", reasonCode: "MANDATE_INACTIVE" } } } as never);
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 403, message: "AUTO_POLICY Mandate rejected this Proposal", detail: { reasonCode: "MANDATE_INACTIVE" } });
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
  });
});
