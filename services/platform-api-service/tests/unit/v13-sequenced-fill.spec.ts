import { describe, expect, it, vi } from "vitest";
import { cancelV13L08PartialFill, recordV13SequencedProposalFill, requestV13L07SequencedCancel, resolveV13L07SequencedCancel, type V13CancelPorts, type V13SequencedFillPorts } from "../../src/application/v13-sequenced-fill.js";

function fixture(overrides: Partial<V13SequencedFillPorts> = {}) {
  const calls = { fill: vi.fn(async (_orderId: string, report: unknown) => ({ status: 202, body: report })), projection: vi.fn(async () => ({ reconciliation: { status: "MATCH" } })) };
  const ports: V13SequencedFillPorts = {
    findRun: async () => ({ stageId: "V1.3", namespace: "namespace-1", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } }),
    readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "CN_A", legs: [{ securityId: "600000.SH", side: "BUY", quantity: 200 }] } }),
    readOrder: async () => ({ status: 200, body: { order: { order_id: "order-1", status: "PARTIALLY_FILLED" }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" } } }),
    recordFill: calls.fill,
    readOrderProjection: calls.projection,
    ...overrides,
  };
  return { ports, calls };
}

describe("recordV13SequencedProposalFill", () => {
  it("records deterministic cumulative reports through ports and returns the owner-scoped projection", async () => {
    const { ports, calls } = fixture();
    const first = await recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 1 }, ports);
    const second = await recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 2 }, ports);

    expect(calls.fill).toHaveBeenNthCalledWith(1, "order-1", expect.objectContaining({ sequence: 1, cumulativeQuantity: 100, fee: "2.5000", effectiveAt: "2026-09-28T01:31:01.000Z" }));
    expect(calls.fill).toHaveBeenNthCalledWith(2, "order-1", expect.objectContaining({ sequence: 2, cumulativeQuantity: 150, fee: "2.5000", effectiveAt: "2026-09-28T01:31:02.000Z" }));
    expect(first.order).toEqual({ reconciliation: { status: "MATCH" } });
    expect(second.report).toMatchObject({ sequence: 2, cumulativeQuantity: 150 });
    expect(calls.projection).toHaveBeenCalledTimes(2);
  });

  it("uses the fixed 40-share partial-fill fixture for the L08 order", async () => {
    const { ports, calls } = fixture({
      readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "CN_A", legs: [{ securityId: "600000.SH", side: "BUY", quantity: 100 }] } }),
    });
    await recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 1 }, ports);
    expect(calls.fill).toHaveBeenCalledWith("order-1", expect.objectContaining({ cumulativeQuantity: 40, fee: "1.0000" }));
  });

  it("rejects scope mismatches before writing a Fill", async () => {
    const { ports, calls } = fixture({
      readProposal: async () => ({ status: 200, body: { ownerId: "other-owner", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "CN_A", legs: [{ securityId: "600000.SH", side: "BUY", quantity: 200 }] } }),
    });
    await expect(recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 1 }, ports)).rejects.toMatchObject({ status: 403 });
    expect(calls.fill).not.toHaveBeenCalled();
  });

  it("rejects an unsupported sequence and maps a domain conflict", async () => {
    const recordFill = vi.fn(async () => ({ status: 409, body: { error: "sequence conflict" } }));
    const { ports } = fixture({ recordFill });
    await expect(recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 3 }, ports)).rejects.toMatchObject({ status: 404 });
    await expect(recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 1 }, ports)).rejects.toMatchObject({ status: 409, body: { error: "sequence conflict" } });
    expect(recordFill).toHaveBeenCalledTimes(1);
  });
});

function cancelFixture(proposalQuantity: 100 | 200, clientOrderId: string) {
  const calls = { request: vi.fn(async () => ({ status: 202, body: { status: "CANCEL_REQUESTED" } })), resolve: vi.fn(async () => ({ status: 202, body: { status: "CANCELLED" } })) };
  let orderRead = 0;
  const ports: V13CancelPorts = {
    findRun: async () => ({ stageId: "V1.3", namespace: "namespace-1", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } }),
    readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "CN_A", legs: [{ securityId: "600000.SH", side: "BUY", quantity: proposalQuantity }] } }),
    readOrder: async () => {
      orderRead += 1;
      return { status: 200, body: { order: { order_id: "order-1", status: orderRead === 1 ? "PARTIALLY_FILLED" : "CANCEL_REQUESTED" }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" }, fill: { quantity: 40 }, fills: proposalQuantity === 200 ? [{ quantity: 100, brokerSequence: 1 }, { quantity: 50, brokerSequence: 2 }] : [] } };
    },
    readAccount: async () => ({ reservations: [{ clientOrderId, status: "HELD" }] }),
    requestCancel: calls.request,
    resolveCancel: calls.resolve,
    readOrderProjection: async () => ({ order: { status: "CANCELLED" }, reconciliation: { portfolio: { reservations: [{ clientOrderId, status: "RELEASED" }] } } }),
  };
  return { ports, calls };
}

describe("V1.3 sequenced cancellation application workflows", () => {
  it("keeps L07 reservation held until the authoritative seq=3 cancel result", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1" };
    const { ports, calls } = cancelFixture(200, input.clientOrderId);
    const request = await requestV13L07SequencedCancel(input, ports);
    expect(request).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
    expect(calls.request).toHaveBeenCalledWith("order-1");
    const result = await resolveV13L07SequencedCancel({ ...input, sequence: 3 }, ports);
    expect(calls.resolve).toHaveBeenCalledWith("order-1", expect.objectContaining({ outcome: "ACCEPTED", sequence: 3 }));
    expect(result.order).toMatchObject({ order: { status: "CANCELLED" } });
  });

  it("performs the L08 partial-fill cancellation only for its fixed fill sequence", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", cancelSequence: 2 };
    const { ports, calls } = cancelFixture(100, input.clientOrderId);
    const result = await cancelV13L08PartialFill(input, ports);
    expect(calls.request).toHaveBeenCalledTimes(1);
    expect(calls.resolve).toHaveBeenCalledWith("order-1", expect.objectContaining({ outcome: "ACCEPTED", sequence: 2 }));
    expect(result.reservationBeforeResolution).toMatchObject({ status: "HELD" });
    expect(result.order).toMatchObject({ reconciliation: { portfolio: { reservations: [{ status: "RELEASED" }] } } });
  });

  it("rejects a wrong L07 Fill sequence before requesting cancellation", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1" };
    const { ports, calls } = cancelFixture(200, input.clientOrderId);
    ports.readOrder = async () => ({ status: 200, body: { order: { order_id: "order-1", status: "PARTIALLY_FILLED" }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" }, fills: [{ quantity: 150, brokerSequence: 2 }] } });
    await expect(requestV13L07SequencedCancel(input, ports)).rejects.toMatchObject({ status: 409 });
    expect(calls.request).not.toHaveBeenCalled();
  });
});
