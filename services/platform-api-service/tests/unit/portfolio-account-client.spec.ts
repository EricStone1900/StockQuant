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
});
