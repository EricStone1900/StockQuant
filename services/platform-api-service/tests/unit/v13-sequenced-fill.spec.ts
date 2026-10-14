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

  it("maps the US AAPL ordered-fill fixture to fixed USD price and fee reports", async () => {
    const { ports, calls } = fixture({
      readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "US_EQUITY", legs: [{ securityId: "AAPL", side: "BUY", quantity: 200 }] } }),
    });
    await recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 2 }, ports);
    expect(calls.fill).toHaveBeenCalledWith("order-1", expect.objectContaining({ sequence: 2, cumulativeQuantity: 150, price: "25.0000", fee: "0.0250" }));
  });

  it("rejects unsupported US securities and quantities before writing a Fill", async () => {
    for (const leg of [{ securityId: "MSFT", side: "BUY", quantity: 200 }, { securityId: "AAPL", side: "BUY", quantity: 10 }]) {
      const { ports, calls } = fixture({
        readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market: "US_EQUITY", legs: [leg] } }),
      });
      await expect(recordV13SequencedProposalFill({ ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "client-1", sequence: 1 }, ports)).rejects.toMatchObject({ status: 403 });
      expect(calls.fill).not.toHaveBeenCalled();
    }
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

function cancelFixture(proposalQuantity: 100 | 200, clientOrderId: string, market: "CN_A" | "US_EQUITY" = "CN_A") {
  const calls = { request: vi.fn(async () => ({ status: 202, body: { status: "CANCEL_REQUESTED" } })), resolve: vi.fn(async () => ({ status: 202, body: { status: "CANCELLED" } })) };
  let orderRead = 0;
  const ports: V13CancelPorts = {
    findRun: async () => ({ stageId: "V1.3", namespace: "namespace-1", evidence: { runClockNow: "2026-09-28T09:31:00+08:00" } }),
    readProposal: async () => ({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1", accountId: "account-1", status: "APPROVED_MANUAL", approvalMode: "MANUAL_APPROVAL", market, legs: [{ securityId: market === "CN_A" ? "600000.SH" : "AAPL", side: "BUY", quantity: proposalQuantity }] } }),
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

  it("restores a rejected L07 cancellation to working state and keeps its reservation held", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1", sequence: 3, outcome: "REJECTED" as const };
    const { ports, calls } = cancelFixture(200, input.clientOrderId);
    ports.readOrder = async () => ({ status: 200, body: { order: { order_id: "order-1", status: "CANCEL_REQUESTED" }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" }, fills: [{ quantity: 100, brokerSequence: 1 }, { quantity: 50, brokerSequence: 2 }] } });
    ports.resolveCancel = vi.fn(async () => ({ status: 200, body: { status: "PARTIALLY_FILLED" } }));
    ports.readOrderProjection = async () => ({ order: { status: "PARTIALLY_FILLED" }, reconciliation: { portfolio: { reservations: [{ clientOrderId: input.clientOrderId, status: "HELD" }] } } });
    const result = await resolveV13L07SequencedCancel(input, ports);
    expect(ports.resolveCancel).toHaveBeenCalledWith("order-1", expect.objectContaining({ outcome: "REJECTED", sequence: 3 }));
    expect(result.order).toMatchObject({ order: { status: "PARTIALLY_FILLED" }, reconciliation: { portfolio: { reservations: [{ status: "HELD" }] } } });
  });

  it("forwards an exact rejected-result replay but preserves changed-sequence conflict rejection", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1", sequence: 3, outcome: "REJECTED" as const };
    const { ports } = cancelFixture(200, input.clientOrderId);
    let orderStatus: "CANCEL_REQUESTED" | "PARTIALLY_FILLED" = "CANCEL_REQUESTED";
    ports.readOrder = async () => ({ status: 200, body: { order: { order_id: "order-1", status: orderStatus }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" }, fills: [{ quantity: 100, brokerSequence: 1 }, { quantity: 50, brokerSequence: 2 }] } });
    ports.resolveCancel = vi.fn(async (_orderId, command) => {
      if (command.outcome !== "REJECTED") return { status: 409, body: { error: "FAKEBROKER_EVENT_SEQUENCE_CONFLICT" } };
      orderStatus = "PARTIALLY_FILLED";
      return { status: 200, body: { status: "PARTIALLY_FILLED", replayed: true } };
    });
    ports.readOrderProjection = async () => ({ order: { status: "PARTIALLY_FILLED" }, reconciliation: { portfolio: { reservations: [{ clientOrderId: input.clientOrderId, status: "HELD" }] } } });

    const result = await resolveV13L07SequencedCancel(input, ports);
    expect(result.resolution).toMatchObject({ replayed: true, status: "PARTIALLY_FILLED" });
    await expect(resolveV13L07SequencedCancel({ ...input, outcome: "ACCEPTED" }, ports)).rejects.toMatchObject({ status: 409, body: { error: "FAKEBROKER_EVENT_SEQUENCE_CONFLICT" } });
    expect(ports.resolveCancel).toHaveBeenCalledTimes(2);
    expect(result.order).toMatchObject({ order: { status: "PARTIALLY_FILLED" }, reconciliation: { portfolio: { reservations: [{ status: "HELD" }] } } });
  });

  it("allows only the fixed US AAPL L07 cancellation Fixture", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1" };
    const { ports, calls } = cancelFixture(200, input.clientOrderId, "US_EQUITY");
    const request = await requestV13L07SequencedCancel(input, ports);
    expect(request).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
    expect(calls.request).toHaveBeenCalledWith("order-1");
  });

  it("allows an L07 cancellation request after the first authoritative partial Fill", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1" };
    const { ports, calls } = cancelFixture(200, input.clientOrderId);
    const readOrder = ports.readOrder;
    ports.readOrder = async (namespace, clientOrderId) => {
      const response = await readOrder(namespace, clientOrderId);
      if (response.body && typeof response.body === "object") (response.body as { fills: unknown[] }).fills = [{ quantity: 100, brokerSequence: 1 }];
      return response;
    };
    const request = await requestV13L07SequencedCancel(input, ports);
    expect(request).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
    expect(calls.request).toHaveBeenCalledTimes(1);
  });

  it("keeps the order pending when the seq=3 cancellation result arrives before seq=2 Fill", async () => {
    const input = { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", clientOrderId: "v13-proposal-1", sequence: 3 };
    const { ports } = cancelFixture(200, input.clientOrderId);
    ports.readOrder = async () => ({ status: 200, body: { order: { order_id: "order-1", status: "CANCEL_REQUESTED" }, authorization: { ownerId: "owner-1", testRunId: "run-1", proposalId: "proposal-1", accountId: "account-1" }, fills: [{ quantity: 100, brokerSequence: 1 }] } });
    ports.resolveCancel = vi.fn(async () => ({ status: 200, body: { status: "CANCEL_REQUESTED", buffered: true, lastAppliedSequence: 1 } }));
    ports.readOrderProjection = async () => ({ order: { status: "CANCEL_REQUESTED" }, reconciliation: { portfolio: { reservations: [{ clientOrderId: input.clientOrderId, status: "HELD" }] } } });
    const result = await resolveV13L07SequencedCancel(input, ports);
    expect(result.resolution).toMatchObject({ status: "CANCEL_REQUESTED", buffered: true, lastAppliedSequence: 1 });
    expect(result.order).toMatchObject({ order: { status: "CANCEL_REQUESTED" }, reconciliation: { portfolio: { reservations: [{ status: "HELD" }] } } });
    expect(ports.resolveCancel).toHaveBeenCalledWith("order-1", expect.objectContaining({ outcome: "ACCEPTED", sequence: 3 }));
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
