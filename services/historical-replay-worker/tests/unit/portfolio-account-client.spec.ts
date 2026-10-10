import { describe, expect, it, vi } from "vitest";
import { GeneratedPortfolioAccountClient } from "../../src/contracts/generated-portfolio-account-client.js";

describe("historical replay Portfolio Account client", () => {
  it("binds account initialization to the replay worker identity and forwards typed account data", async () => {
    const snapshot = { accountId: "a7a6a6d4-8e67-4a01-9cc5-daf8e3e2f1a9", ownerId: "owner-a", market: "CN_A", environmentMode: "BACKTEST", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [], ledgerVersion: 1, ledgerEntryCount: 1 };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ snapshot, replayed: false }), { status: 201 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio.local/", "historical-replay-worker", "r".repeat(40), request);

    await expect(client.initializeAccount({ fixtureAccountRef: "replay-fixture", ownerId: "owner-a", market: "CN_A", environmentMode: "BACKTEST", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace: "replay-run", testRunId: "test-run", idempotencyKey: "init-replay" })).resolves.toEqual({ snapshot, replayed: false });
    expect(request.mock.calls[0]?.[0]).toBe("http://portfolio.local/internal/v1/accounts/initialize");
    expect(request.mock.calls[0]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ fixtureAccountRef: "replay-fixture", ownerId: "owner-a", market: "CN_A", environmentMode: "BACKTEST", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace: "replay-run", testRunId: "test-run", idempotencyKey: "init-replay" }) });
    expect(request.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "historical-replay-worker", authorization: `Bearer ${"r".repeat(40)}` });
  });

  it("reads the owner-bound account snapshot using the replay-worker identity and encoded account ID", async () => {
    const snapshot = { accountId: "account/1", ownerId: "owner-a", market: "CN_A", environmentMode: "BACKTEST", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [], ledgerVersion: 1, ledgerEntryCount: 1 };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(snapshot), { status: 200 }));
    const client = new GeneratedPortfolioAccountClient("http://portfolio.local/", "historical-replay-worker", "r".repeat(40), request);

    await expect(client.getAccountSnapshot("account/1", "owner-a")).resolves.toEqual(snapshot);

    expect(request).toHaveBeenCalledWith("http://portfolio.local/internal/v1/accounts/account%2F1/snapshot", expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        "x-stockquant-service-id": "historical-replay-worker",
        authorization: `Bearer ${"r".repeat(40)}`,
        "x-stockquant-owner-id": "owner-a",
      }),
      signal: expect.any(AbortSignal),
    }));
  });
});
