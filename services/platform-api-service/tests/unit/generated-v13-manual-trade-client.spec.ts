import { describe, expect, it, vi } from "vitest";
import { GeneratedPlatformV13ManualTradeClient } from "../../src/contracts/generated-v13-manual-trade-client.js";
import type * as Contracts from "../../src/contracts/generated-types.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";
const api = (request: typeof fetch) => new GeneratedPlatformV13ManualTradeClient("http://trade.local/", token, request);
const response = () => new Response(JSON.stringify({ orderId: "order-a", status: "ACCEPTED" }), { status: 201 });

const manualCommand: Contracts.V13ManualPaperExecutionCommand = {
  proposalId: "proposal-a", ownerId: "owner-a", testRunId: "run-a", accountId: "account-a", namespace: "owner-a/run-a",
  clientOrderId: "order-a", now: "2026-10-10T09:00:00Z",
};
const autoCommand: Contracts.V13AutoPaperExecutionCommand = {
  proposalId: "proposal-a", mandateId: "mandate-a", mandateVersion: 2, ownerId: "owner-a", testRunId: "run-a", accountId: "account-a",
  namespace: "owner-a/run-a", clientOrderId: "order-a", now: "2026-10-10T09:00:00Z", executionMode: "SEQUENCED",
};

describe("Generated V1.3 Platform→Trade client", () => {
  it("submits a manual proposal with the Platform identity and exact command", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).executeApprovedManualProposal(manualCommand);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/v13/paper-orders/execute-manual-proposal", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }),
      body: JSON.stringify(manualCommand), signal: expect.any(AbortSignal),
    }));
  });

  it("submits a sequenced manual proposal through its dedicated route", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).executeSequencedManualProposal(manualCommand);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }),
      body: JSON.stringify(manualCommand), signal: expect.any(AbortSignal),
    }));
  });

  it("submits an AUTO proposal with its mandate-bound command", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).executeAutoPolicyProposal(autoCommand);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/v13/paper-orders/execute-auto-proposal", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }),
      body: JSON.stringify(autoCommand), signal: expect.any(AbortSignal),
    }));
  });

  it("records a sequenced fill report with an encoded order ID", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());
    const body = { externalFillId: "fill-1", sequence: 2, cumulativeQuantity: 20, price: "12.3400", fee: "0.2500", effectiveAt: "2026-10-10T09:01:00Z", evidenceRef: "fixture/fill-1" };

    await api(request).recordSequencedFillReport("order/a", body);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/orders/order%2Fa/simulated-fill-reports", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), body: JSON.stringify(body), signal: expect.any(AbortSignal),
    }));
  });

  it("requests a FakeBroker cancel without adding a body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).requestFakeBrokerCancel("order/a");

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/orders/order%2Fa/cancel", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), signal: expect.any(AbortSignal),
    }));
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("resolves a FakeBroker cancel with the exact sequenced result", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());
    const body = { outcome: "ACCEPTED" as const, reason: "fixed cancel result", sequence: 3 };

    await api(request).resolveFakeBrokerCancel("order/a", body);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/orders/order%2Fa/cancel-result", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), body: JSON.stringify(body), signal: expect.any(AbortSignal),
    }));
  });

  it("reads an order by client ID with encoded namespace and query", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).readOrderByClientId("namespace/a?", "order a");

    const query = new URLSearchParams({ namespace: "namespace/a?", clientOrderId: "order a" });
    expect(request).toHaveBeenCalledWith(`http://trade.local/internal/v1/orders/by-client-id?${query}`, expect.objectContaining({
      method: "GET", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), signal: expect.any(AbortSignal),
    }));
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("reads independent FakeBroker assets within the supplied namespace and account", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());

    await api(request).readIndependentAssets("namespace/a", "account a");

    const query = new URLSearchParams({ namespace: "namespace/a", accountId: "account a" });
    expect(request).toHaveBeenCalledWith(`http://trade.local/internal/v1/v13/accounts/assets?${query}`, expect.objectContaining({
      method: "GET", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), signal: expect.any(AbortSignal),
    }));
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("corrects a Fill fee using both encoded path IDs and the exact command", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(response());
    const body: Contracts.FillFeeCorrectionCommand = { revision: 2, previousFee: "0.2500", correctedFee: "0.3000", effectiveAt: "2026-10-10T09:02:00Z", evidenceRef: "fixture/fee-correction" };

    await api(request).correctFillFee("order/a", "fill/1", body);

    expect(request).toHaveBeenCalledWith("http://trade.local/internal/v1/orders/order%2Fa/fills/fill%2F1/fee-corrections", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), body: JSON.stringify(body), signal: expect.any(AbortSignal),
    }));
  });
});
