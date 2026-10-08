import { describe, expect, it, vi } from "vitest";
import { V13ManualPaperExecutionService } from "../../src/application/v13-manual-paper-execution.js";
import { PortfolioAccountClientError } from "../../src/contracts/generated-portfolio-account-client.js";
import type { V13ProposalResult } from "../../src/contracts/generated-types.js";

const proposal: V13ProposalResult = { proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "a".repeat(64), status: "APPROVED_MANUAL", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: "2026-10-07T10:00:00+08:00", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }], ownerId: "acceptance-owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-manual-test-v1" };

function harness(status: V13ProposalResult["status"] = "APPROVED_MANUAL", value: V13ProposalResult = proposal) {
  const steps: string[] = [];
  const broker = {
    executeV13ManualPaper: vi.fn(async () => { steps.push("FakeBroker.place"); return { replayed: false, result: { orderId: "order-1", status: "FILLED", brokerMode: "FAKE" as const, fill: { externalFillId: "fill-1", quantity: 100, price: "10.0000", fee: "5.0000", effectiveAt: "2026-10-07T09:31:00+08:00" } } }; }),
    find: vi.fn(async () => ({ order_id: "order-1", status: "FILLED" })), findByNamespaceClientOrderId: vi.fn(async () => null), pendingFill: vi.fn(async () => ({ event_id: "event-1" })), outboxStatus: vi.fn(async () => ({ status: "DELIVERED" })), independentAssetSnapshot: vi.fn(async () => ({ current_cash: "8995.0000" })), reconciliationSummary: vi.fn(async () => ({ namespace: "run-1" })),
  };
  const portfolio = {
    reserveAccountResources: vi.fn(async () => { steps.push("Portfolio.reserve"); return { replayed: false, reservation: { reservationId: "reservation-1" } }; }),
  };
  const governance = {
    readProposal: vi.fn(async () => { steps.push("Governance.read"); return { status: 200, body: { ...value, status } }; }),
    authorizeExecution: vi.fn(async () => { steps.push("Governance.authorize"); return { status: 200, body: { authorizationId: "authorization-1" } }; }),
    validateExecution: vi.fn(async () => { steps.push("Governance.consume"); return { status: 200, body: { valid: true, replayed: false } }; }),
  };
  const outbox = { deliver: vi.fn(async () => { steps.push("Portfolio.postFill"); return true; }) };
  return { steps, broker, portfolio, governance, outbox, service: new V13ManualPaperExecutionService(broker as never, portfolio as never, governance as never, outbox as never) };
}
const command = { proposalId: proposal.proposalId, ownerId: proposal.ownerId, testRunId: proposal.testRunId, accountId: proposal.accountId, namespace: "run-1", clientOrderId: "order-v13-1", now: "2026-10-07T09:31:00+08:00" };

describe("V1.3 manual execution application coordinator", () => {
  it("sequences scope read, portfolio reserve, short grant, single-use consume, FakeBroker and Portfolio posting", async () => {
    const h = harness();
    const result = await h.service.execute(command);
    expect(h.steps).toEqual(["Governance.read", "Portfolio.reserve", "Governance.authorize", "Governance.consume", "FakeBroker.place", "Portfolio.postFill"]);
    expect(result.fill).toMatchObject({ quantity: 100, price: "10.0000", fee: "5.0000" });
    expect(h.broker.executeV13ManualPaper).toHaveBeenCalledWith(expect.objectContaining({ reservedCash: "1005.00", reservation: { reservationId: "reservation-1", ownerId: command.ownerId, testRunId: command.testRunId, clientOrderId: command.clientOrderId } }));
  });
  it("does not reserve or place for a non-approved Proposal", async () => {
    const h = harness("REJECTED_MANUAL");
    await expect(h.service.execute(command)).rejects.toThrow("V13_PROPOSAL_NOT_EXECUTABLE");
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
    expect(h.governance.authorizeExecution).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("executes a T+1-eligible fixed CN sell only after Portfolio reserves shares and consumes exact-version Governance authorization", async () => {
    const sellProposal: V13ProposalResult = { ...proposal, legs: [{ legId: "leg-1", securityId: "600000.SH", side: "SELL", quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", sellProposal);
    const result = await h.service.execute({ ...command, now: "2026-09-29T09:31:00+08:00", clientOrderId: "order-v13-sell-1" });
    expect(h.steps).toEqual(["Governance.read", "Portfolio.reserve", "Governance.authorize", "Governance.consume", "FakeBroker.place", "Portfolio.postFill"]);
    expect(result.fill).toMatchObject({ quantity: 100, price: "10.0000", fee: "5.0000" });
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledWith(command.accountId, expect.objectContaining({ side: "SELL", security: "600000.SH", quantity: 100, asOf: "2026-09-29T09:31:00+08:00" }));
    expect(h.broker.executeV13ManualPaper).toHaveBeenCalledWith(expect.objectContaining({ side: "SELL", reservation: { reservationId: "reservation-1", ownerId: command.ownerId, testRunId: command.testRunId, clientOrderId: "order-v13-sell-1" } }));
  });
  it("re-evaluates current Portfolio resources after approval and blocks authorization/place when funds are no longer available", async () => {
    const h = harness();
    h.portfolio.reserveAccountResources.mockRejectedValueOnce(new PortfolioAccountClientError(409, { error: "INSUFFICIENT_CASH" }));
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 409, message: "V1.3 Portfolio risk/resource reservation failed" });
    expect(h.steps).toEqual(["Governance.read"]);
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledOnce();
    expect(h.governance.authorizeExecution).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
});
