import { describe, expect, it, vi } from "vitest";
import { GeneratedPortfolioAccountClient, PortfolioAccountClientError } from "../../src/contracts/generated-portfolio-account-client.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";

describe("OpenAPI-generated Portfolio Account client", () => {
  it("sends the caller identity and encodes account path parameters", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ accountId: "acct/1" }), { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001/", "platform-api-service", token, request);

    await client.getAccountSnapshot("acct/1", "owner-1");

    expect(request).toHaveBeenCalledWith("http://portfolio:3001/internal/v1/accounts/acct%2F1/snapshot", expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        "x-stockquant-service-id": "platform-api-service",
        authorization: `Bearer ${token}`,
        "x-stockquant-owner-id": "owner-1",
      }),
    }));
  });

  it("preserves rejection status and body for scenario assertions", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ error: "cash_conflict" }), { status: 409 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001", "platform-api-service", token, request);

    await expect(client.initializeAccount({
      fixtureAccountRef: "cn-paper-empty-10000-cny",
      ownerId: "owner-1",
      market: "CN_A",
      environmentMode: "PAPER",
      brokerMode: "FAKE",
      initialCash: { amount: "20000.00", currency: "CNY" },
      namespace: "scope-1",
      testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df",
      idempotencyKey: "v1.1-account-initialization",
    })).rejects.toMatchObject<Partial<PortfolioAccountClientError>>({ status: 409, body: { error: "cash_conflict" } });
  });

  it("maps every V1 account operation to its declared route, caller identity and exact request body", async () => {
    const command = {
      fixtureAccountRef: "cn-paper-empty-10000-cny",
      ownerId: "owner-1",
      market: "CN_A" as const,
      environmentMode: "PAPER" as const,
      brokerMode: "FAKE" as const,
      initialCash: { amount: "10000.00", currency: "CNY" },
      namespace: "scope-1",
      testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df",
      idempotencyKey: "v1.1-account-initialization",
    };
    const reservation = {
      namespace: "scope-1",
      testRunId: command.testRunId,
      ownerId: command.ownerId,
      idempotencyKey: "reserve-1",
      clientOrderId: "client-order-1",
      side: "BUY" as const,
      currency: "CNY",
      cashAmount: "1005.0000",
    };
    const fill = {
      namespace: "scope-1",
      testRunId: command.testRunId,
      ownerId: command.ownerId,
      reservationId: "reservation/1",
      externalFillId: "fill-1",
      clientOrderId: "client-order-1",
      side: "BUY" as const,
      security: "600000.SH",
      quantity: 100,
      price: "10.0000",
      fee: "5.0000",
      currency: "CNY",
      effectiveAt: "2026-09-28T01:30:00.000Z",
      evidenceRef: "fixture:fill-1",
    };
    const feeCorrection = {
      namespace: "scope-1",
      testRunId: command.testRunId,
      ownerId: command.ownerId,
      reservationId: "reservation/1",
      revision: 1,
      previousFee: "5.0000",
      correctedFee: "5.1000",
      currency: "CNY",
      effectiveAt: "2026-09-28T01:31:00.000Z",
      evidenceRef: "fixture:fee-correction-1",
    };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio:3001", "platform-api-service", token, request);
    const calls: Array<{ url: string; init: RequestInit; body?: unknown }> = [];
    const invoke = async (url: string, run: () => Promise<unknown>, body?: unknown) => {
      request.mockClear();
      await run();
      expect(request).toHaveBeenCalledTimes(1);
      const [actualUrl, init] = request.mock.calls[0]!;
      expect(actualUrl).toBe(url);
      expect(init).toMatchObject({
        method: url.includes("/snapshot") ? "GET" : "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-stockquant-service-id": "platform-api-service",
          authorization: `Bearer ${token}`,
        }),
      });
      if (body !== undefined) expect(init?.body).toBe(JSON.stringify(body));
      calls.push({ url: String(actualUrl), init: init!, ...(body === undefined ? {} : { body }) });
    };

    await invoke("http://portfolio:3001/internal/v1/accounts/initialize", () => client.initializeAccount(command), command);
    await invoke("http://portfolio:3001/internal/v1/accounts/acct%2F1/snapshot", () => client.getAccountSnapshot("acct/1", "owner-1"));
    await invoke("http://portfolio:3001/internal/v1/accounts/acct%2F1/reservations", () => client.reserveAccountResources("acct/1", reservation), reservation);
    await invoke("http://portfolio:3001/internal/v1/accounts/acct%2F1/fills", () => client.recordAccountFill("acct/1", fill), fill);
    await invoke("http://portfolio:3001/internal/v1/accounts/acct%2F1/fills/fill%2F1/fee-corrections", () => client.correctAccountFillFee("acct/1", "fill/1", feeCorrection), feeCorrection);
    const resolution = { namespace: "scope-1", testRunId: command.testRunId, ownerId: command.ownerId, outcome: "FILLED" as const, evidenceRef: "fixture:fill-1" };
    await invoke("http://portfolio:3001/internal/v1/accounts/acct%2F1/reservations/reservation%2F1/resolve", () => client.resolveAccountReservation("acct/1", "reservation/1", resolution), resolution);

    expect(calls).toHaveLength(6);
    expect(calls[1]!.init.headers).toMatchObject({ "x-stockquant-owner-id": "owner-1" });
    expect(calls.slice(0, 1).concat(calls.slice(2)).every(({ init }) => init.method === "POST")).toBe(true);
  });
});
