import { describe, expect, it, vi } from "vitest";
import { GeneratedPortfolioAccountClient, PortfolioAccountClientError } from "../../src/contracts/generated-portfolio-account-client.js";

const token = "trade-execution-service-token-abcdefghijklmnopqrstuvwxyz";

describe("generated Portfolio Account client for Trade Execution", () => {
  it("uses the Trade Execution identity and encodes reservation paths", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ reservation: { reservationId: "reservation-1" }, replayed: false }), { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001/", "trade-execution-service", token, request);

    await client.reserveAccountResources("account/1", {
      namespace: "run-scope",
      testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df",
      ownerId: "owner-1",
      idempotencyKey: "order-1-resource",
      clientOrderId: "order-1",
      side: "BUY",
      currency: "CNY",
      cashAmount: "1005.0000",
      security: null,
      quantity: null,
    });

    expect(request).toHaveBeenCalledWith("http://portfolio:3001/internal/v1/accounts/account%2F1/reservations", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "x-stockquant-service-id": "trade-execution-service",
        authorization: `Bearer ${token}`,
      }),
    }));
  });

  it("posts a canonical Fill body through the generated route", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ snapshot: {} }), { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001", "trade-execution-service", token, request);
    const body = { namespace: "run-scope", externalFillId: "fill-1", security: "600000.SH", quantity: 100, price: "10.0000", fee: "5.0000", currency: "CNY", effectiveAt: "2026-09-30T02:00:00Z", side: "BUY" as const };

    await client.recordAccountFill("account-1", body);

    expect(request).toHaveBeenCalledWith("http://portfolio:3001/internal/v1/accounts/account-1/fills", expect.objectContaining({ method: "POST", body: JSON.stringify(body), headers: expect.objectContaining({ "x-stockquant-service-id": "trade-execution-service", authorization: `Bearer ${token}` }) }));
  });

  it("settles account receivables with the Trade identity and preserves Portfolio denials", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const denial = { error: "SETTLEMENT_REQUIRES_PAPER_FAKE" };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(denial), { status: 409 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001/", "trade-execution-service", token, request);
    const body = { asOf: "2026-10-12T13:30:00.000Z" };

    await expect(client.settleAccountReceivables("account/1", body)).rejects.toMatchObject<Partial<PortfolioAccountClientError>>({ status: 409, body: denial });

    expect(request).toHaveBeenCalledWith("http://portfolio:3001/internal/v1/accounts/account%2F1/settlements", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        "content-type": "application/json",
        "x-stockquant-service-id": "trade-execution-service",
        authorization: `Bearer ${token}`,
      }),
      body: JSON.stringify(body),
      signal: expect.any(AbortSignal),
    }));
    expect(timeout).toHaveBeenCalledWith(5000);
    timeout.mockRestore();
  });

  it("keeps conflict status and body for exact reservation replay handling", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "reservation_conflict" }), { status: 409 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001", "trade-execution-service", token, request);

    await expect(client.resolveAccountReservation("account-1", "reservation-1", {
      namespace: "run-scope",
      testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df",
      ownerId: "owner-1",
      outcome: "FILLED",
      evidenceRef: "fakebroker-outbox:event-1",
    })).rejects.toMatchObject<Partial<PortfolioAccountClientError>>({ status: 409, body: { error: "reservation_conflict" } });
  });

  it("posts fee corrections to the encoded Fill route with the Trade Execution identity", async () => {
    const body = {
      revision: 2,
      previousFee: "5.0000",
      correctedFee: "5.1000",
      effectiveAt: "2026-09-30T02:05:00Z",
      evidenceRef: "fakebroker-outbox:event-2",
    };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ snapshot: {}, replayed: false }), { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001/", "trade-execution-service", token, request);

    await client.correctAccountFillFee("account/1", "fill/2", body);

    expect(request).toHaveBeenCalledWith("http://portfolio:3001/internal/v1/accounts/account%2F1/fills/fill%2F2/fee-corrections", expect.objectContaining({
      method: "POST",
      body: JSON.stringify(body),
      headers: expect.objectContaining({
        "content-type": "application/json",
        "x-stockquant-service-id": "trade-execution-service",
        authorization: `Bearer ${token}`,
      }),
    }));
  });

  it("uses the declared bounded timeout for every V1 Trade→Portfolio operation", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001", "trade-execution-service", token, request);
    const testRunId = "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df";

    try {
      await client.reserveAccountResources("account-1", {
        namespace: "run-scope", testRunId, ownerId: "owner-1", idempotencyKey: "reserve-1",
        clientOrderId: "order-1", side: "BUY", currency: "CNY", cashAmount: "1005.0000",
      });
      await client.recordAccountFill("account-1", {
        namespace: "run-scope", testRunId, ownerId: "owner-1", reservationId: "reservation-1",
        externalFillId: "fill-1", clientOrderId: "order-1", side: "BUY", security: "600000.SH",
        quantity: 100, price: "10.0000", fee: "5.0000", currency: "CNY",
        effectiveAt: "2026-09-30T02:00:00.000Z", evidenceRef: "fixture:fill-1",
      });
      await client.correctAccountFillFee("account-1", "fill-1", {
        namespace: "run-scope", testRunId, ownerId: "owner-1", reservationId: "reservation-1",
        revision: 2, previousFee: "5.0000", correctedFee: "5.1000", currency: "CNY",
        effectiveAt: "2026-09-30T02:05:00.000Z", evidenceRef: "fixture:fee-correction-1",
      });
      await client.settleAccountReceivables("account-1", { asOf: "2026-10-12T13:30:00.000Z" });
      await client.resolveAccountReservation("account-1", "reservation-1", {
        namespace: "run-scope", testRunId, ownerId: "owner-1", outcome: "FILLED", evidenceRef: "fixture:fill-1",
      });

      expect(request).toHaveBeenCalledTimes(5);
      expect(timeout).toHaveBeenCalledTimes(5);
      expect(timeout.mock.calls.map(([milliseconds]) => milliseconds)).toEqual(Array(5).fill(5000));
    } finally {
      timeout.mockRestore();
    }
  });
});
