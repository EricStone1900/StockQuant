import { describe, expect, it, vi } from "vitest";
import { V13ManualPaperExecutionService } from "../../src/application/v13-manual-paper-execution.js";
import { PortfolioAccountClientError } from "../../src/contracts/generated-portfolio-account-client.js";
import type { V13ProposalResult } from "../../src/contracts/generated-types.js";

const proposal: V13ProposalResult = { proposalId: "d8c1d600-22f6-44ab-9c2f-5581462d90a3", proposalVersion: 1, contentHash: "a".repeat(64), status: "APPROVED_MANUAL", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: "2026-10-07T10:00:00+08:00", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }], ownerId: "acceptance-owner-1", testRunId: "d8c1d600-22f6-44ab-9c2f-5581462d90a1", accountId: "d8c1d600-22f6-44ab-9c2f-5581462d90a2", strategyVersion: "fixture-manual-test-v1" };

function harness(status: V13ProposalResult["status"] = "APPROVED_MANUAL", value: V13ProposalResult = proposal) {
  const steps: string[] = [];
  const orders = new Map<string, any>();
  const reservations = new Map<string, string>();
  let reservationCount = 0;
  const broker = {
    settlePaperReceivables: vi.fn(async () => { steps.push("FakeBroker.settle"); return { settledFillIds: [] }; }),
    executeV13ManualPaper: vi.fn(async (input: any) => {
      steps.push("FakeBroker.place");
      const orderId = `broker:${input.clientOrderId}`;
      const price = input.price.includes(".") ? `${input.price}00`.slice(0, input.price.indexOf(".") + 5) : `${input.price}.0000`;
      const fee = input.fee.includes(".") ? `${input.fee}00`.slice(0, input.fee.indexOf(".") + 5) : `${input.fee}.0000`;
      const row = { order_id: orderId, status: "FILLED", client_order_id: input.clientOrderId, external_fill_id: `fill:${input.clientOrderId}`, fill_quantity: input.quantity, fill_price: price, fill_fee: fee, effective_at: new Date(input.effectiveAt) };
      orders.set(orderId, row);
      return { replayed: false, result: { orderId, status: "FILLED", brokerMode: "FAKE" as const, fill: { externalFillId: row.external_fill_id, quantity: input.quantity, price, fee, effectiveAt: input.effectiveAt } } };
    }),
    find: vi.fn(async (id: string) => orders.get(id) ?? null), findByNamespaceClientOrderId: vi.fn(async (_namespace: string, id: string) => [...orders.values()].find((row) => row.client_order_id === id) ?? null), pendingFill: vi.fn(async (id: string) => ({ event_id: `event:${id}` })), outboxStatus: vi.fn(async () => ({ status: "DELIVERED" })), independentAssetSnapshot: vi.fn(async () => ({ current_cash: "8995.0000" })), reconciliationSummary: vi.fn(async () => ({ namespace: "run-1" })),
  };
  const portfolio = {
    settleAccountReceivables: vi.fn(async () => { steps.push("Portfolio.settle"); return { settledFillIds: [] }; }),
    reserveAccountResources: vi.fn(async (_accountId: string, input: any) => { steps.push("Portfolio.reserve"); let reservationId = reservations.get(input.clientOrderId); const replayed = Boolean(reservationId); if (!reservationId) { reservationCount += 1; reservationId = `reservation-${reservationCount}`; reservations.set(input.clientOrderId, reservationId); } return { replayed, reservation: { reservationId } }; }),
    resolveAccountReservation: vi.fn(async (_accountId: string, _reservationId: string, _body: unknown) => { steps.push("Portfolio.release"); return { reservationId: _reservationId, status: "RELEASED" }; }),
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
    expect(h.steps).toEqual(["Governance.read", "FakeBroker.settle", "Portfolio.settle", "Portfolio.reserve", "Governance.authorize", "Governance.consume", "FakeBroker.place", "Portfolio.postFill"]);
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
  it("reserves every fixed BUY leg before one batch authorization and submits one child order per leg", async () => {
    const multiLeg = { ...proposal, legs: [...proposal.legs, { legId: "leg-2", securityId: "000001.SZ", side: "BUY" as const, quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", multiLeg);
    const result = await h.service.execute(command);
    expect(h.steps).toEqual(["Governance.read", "FakeBroker.settle", "Portfolio.settle", "Portfolio.reserve", "Portfolio.reserve", "Governance.authorize", "Governance.consume", "FakeBroker.place", "Portfolio.postFill", "FakeBroker.place", "Portfolio.postFill"]);
    expect(result.orders).toHaveLength(2);
    expect(result.fills).toHaveLength(2);
    expect(h.portfolio.reserveAccountResources).toHaveBeenNthCalledWith(2, command.accountId, expect.objectContaining({ clientOrderId: `${command.clientOrderId}:leg:02`, cashAmount: "1205.00" }));
    expect(h.broker.executeV13ManualPaper).toHaveBeenNthCalledWith(1, expect.objectContaining({ security: "600000.SH", reservation: expect.objectContaining({ reservationId: "reservation-1" }) }));
    expect(h.broker.executeV13ManualPaper).toHaveBeenNthCalledWith(2, expect.objectContaining({ security: "000001.SZ", reservation: expect.objectContaining({ reservationId: "reservation-2" }) }));
  });
  it("reserves SELL shares and BUY settled cash separately before any mixed batch order is submitted", async () => {
    const mixed = { ...proposal, legs: [...proposal.legs, { legId: "leg-2", securityId: "600000.SH", side: "SELL" as const, quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", mixed);
    await h.service.execute(command);
    expect(h.portfolio.reserveAccountResources).toHaveBeenNthCalledWith(1, command.accountId, expect.objectContaining({ side: "BUY", cashAmount: "1005.00", security: null, quantity: null }));
    expect(h.portfolio.reserveAccountResources).toHaveBeenNthCalledWith(2, command.accountId, expect.objectContaining({ side: "SELL", cashAmount: null, security: "600000.SH", quantity: 100, asOf: command.now }));
    expect(h.steps.indexOf("Governance.authorize")).toBeGreaterThan(h.steps.lastIndexOf("Portfolio.reserve"));
    expect(h.steps.indexOf("FakeBroker.place")).toBeGreaterThan(h.steps.lastIndexOf("Portfolio.reserve"));
  });
  it("releases earlier SELL resources and submits no orders when settled cash cannot fund a later BUY leg", async () => {
    const mixed = { ...proposal, legs: [{ legId: "leg-1", securityId: "600000.SH", side: "SELL" as const, quantity: 100 }, { legId: "leg-2", securityId: "600000.SH", side: "BUY" as const, quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", mixed);
    h.portfolio.reserveAccountResources.mockReset();
    h.portfolio.reserveAccountResources.mockImplementationOnce(async () => ({ replayed: false, reservation: { reservationId: "sell-reservation" } }) as never)
      .mockRejectedValueOnce(new PortfolioAccountClientError(409, { error: "INSUFFICIENT_AVAILABLE_CASH" }));
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 409 });
    expect(h.portfolio.reserveAccountResources).toHaveBeenNthCalledWith(2, command.accountId, expect.objectContaining({ side: "BUY", cashAmount: "1005.00", security: null, quantity: null }));
    expect(h.portfolio.resolveAccountReservation).toHaveBeenCalledWith(command.accountId, "sell-reservation", expect.objectContaining({ outcome: "REJECTED" }));
    expect(h.governance.authorizeExecution).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("releases prior resource reservations and creates no authorization or orders when aggregate cash is insufficient", async () => {
    const multiLeg = { ...proposal, legs: [...proposal.legs, { legId: "leg-2", securityId: "000001.SZ", side: "BUY" as const, quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", multiLeg);
    h.portfolio.reserveAccountResources.mockReset();
    let reserves = 0;
    h.portfolio.reserveAccountResources.mockImplementation(async () => {
      reserves += 1;
      if (reserves === 2) throw new PortfolioAccountClientError(409, { error: "INSUFFICIENT_AVAILABLE_CASH" });
      return { replayed: false, reservation: { reservationId: "reservation-1" } } as never;
    });
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 409 });
    expect(h.portfolio.resolveAccountReservation).toHaveBeenCalledWith(command.accountId, "reservation-1", expect.objectContaining({ outcome: "REJECTED" }));
    expect(h.governance.authorizeExecution).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
  it("recovers a committed first leg by its original child ID and submits only the missing leg after response loss", async () => {
    const multiLeg = { ...proposal, legs: [...proposal.legs, { legId: "leg-2", securityId: "000001.SZ", side: "BUY" as const, quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", multiLeg);
    h.governance.validateExecution.mockResolvedValueOnce({ status: 200, body: { valid: true, replayed: false } } as never).mockResolvedValueOnce({ status: 200, body: { valid: true, replayed: true } } as never);
    const place = h.broker.executeV13ManualPaper.getMockImplementation()!;
    h.broker.executeV13ManualPaper.mockImplementationOnce(async (input: any) => {
      await place(input);
      throw new Error("response lost after FakeBroker committed first child order");
    });
    await expect(h.service.execute(command)).rejects.toThrow("response lost");
    const recovered = await h.service.execute(command);
    expect(recovered.replayed).toBe(true);
    expect(recovered.orders).toHaveLength(2);
    expect(h.broker.executeV13ManualPaper).toHaveBeenCalledTimes(2);
    expect(h.broker.executeV13ManualPaper.mock.calls[1][0].clientOrderId).toBe(`${command.clientOrderId}:leg:02`);
  });
  it("executes a T+1-eligible fixed CN sell only after Portfolio reserves shares and consumes exact-version Governance authorization", async () => {
    const sellProposal: V13ProposalResult = { ...proposal, legs: [{ legId: "leg-1", securityId: "600000.SH", side: "SELL", quantity: 100 }] };
    const h = harness("APPROVED_MANUAL", sellProposal);
    const result = await h.service.execute({ ...command, now: "2026-09-29T09:31:00+08:00", clientOrderId: "order-v13-sell-1" });
    expect(h.steps).toEqual(["Governance.read", "FakeBroker.settle", "Portfolio.settle", "Portfolio.reserve", "Governance.authorize", "Governance.consume", "FakeBroker.place", "Portfolio.postFill"]);
    expect(result.fill).toMatchObject({ quantity: 100, price: "10.0000", fee: "5.0000" });
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledWith(command.accountId, expect.objectContaining({ side: "SELL", security: "600000.SH", quantity: 100, asOf: "2026-09-29T09:31:00+08:00" }));
    expect(h.broker.executeV13ManualPaper).toHaveBeenCalledWith(expect.objectContaining({ side: "SELL", reservation: { reservationId: "reservation-1", ownerId: command.ownerId, testRunId: command.testRunId, clientOrderId: "order-v13-sell-1" } }));
  });
  it("re-evaluates current Portfolio resources after approval and blocks authorization/place when funds are no longer available", async () => {
    const h = harness();
    h.portfolio.reserveAccountResources.mockRejectedValueOnce(new PortfolioAccountClientError(409, { error: "INSUFFICIENT_CASH" }));
    await expect(h.service.execute(command)).rejects.toMatchObject({ statusCode: 409, message: "V1.3 Portfolio risk/resource reservation failed" });
    expect(h.steps).toEqual(["Governance.read", "FakeBroker.settle", "Portfolio.settle"]);
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledOnce();
    expect(h.governance.authorizeExecution).not.toHaveBeenCalled();
    expect(h.broker.executeV13ManualPaper).not.toHaveBeenCalled();
  });
});
