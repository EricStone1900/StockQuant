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
});
