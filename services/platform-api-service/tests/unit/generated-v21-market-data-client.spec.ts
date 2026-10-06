import { describe, expect, it, vi } from "vitest";
import { GeneratedV21MarketDataClient, MarketDataV21HttpError } from "../../src/contracts/generated-v21-market-data-client.js";

describe("GeneratedV21MarketDataClient", () => {
  it("sends each contract read with Platform service identity and returns its response", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ intervalMinutes: 30 }), { status: 200 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + "p".repeat(40) };
    const client = new GeneratedV21MarketDataClient("http://market.test/", () => headers, request as typeof fetch);
    await client.getV21SourceInventory();
    await client.getV21SamplingConfig();
    await client.getV21Watchlist();
    await client.getV21NewsPreview();
    await client.getV21LiveNews();
    await client.getV21SourceSmoke();
    await client.getV21QuotePreview();
    await client.updateV21SamplingConfig({ intervalMinutes: 20 });
    await client.updateV21Watchlist({ securities: ["600000.SH"] });
    await client.openV21SourceCircuit("tencent-quote");
    await client.recoverV21SourceCircuit("tencent-quote");
    await client.getMarketDataAlertIncidents();
    await client.acknowledgeMarketDataAlertIncident("39cf8ff6-5dcb-48f9-84a0-0250281528cb", { actorId: "operator-1" });
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "http://market.test/v2/sources", "http://market.test/v2/sampling", "http://market.test/v2/watchlist", "http://market.test/v2/news/preview",
      "http://market.test/v2/news/live", "http://market.test/v2/sources/smoke", "http://market.test/v2/quote/preview",
      "http://market.test/v2/sampling", "http://market.test/v2/watchlist", "http://market.test/v2/sources/tencent-quote/fail", "http://market.test/v2/sources/tencent-quote/recover",
      "http://market.test/v2/alerts", "http://market.test/v2/alerts/39cf8ff6-5dcb-48f9-84a0-0250281528cb/acknowledge"
    ]);
    for (const [, init] of request.mock.calls.slice(0, 7)) expect(init?.headers).toEqual(headers);
    expect(request.mock.calls[7][1]?.method).toBe("PUT");
    expect(request.mock.calls[7][1]?.body).toBe(JSON.stringify({ intervalMinutes: 20 }));
    expect(request.mock.calls[8][1]?.body).toBe(JSON.stringify({ securities: ["600000.SH"] }));
    expect(request.mock.calls[9][1]?.method).toBe("POST");
    expect(request.mock.calls[9][1]?.headers).toEqual(headers);
    expect(request.mock.calls[12][1]?.method).toBe("POST");
    expect(request.mock.calls[12][1]?.body).toBe(JSON.stringify({ actorId: "operator-1" }));
    expect(request.mock.calls[12][1]?.headers).toMatchObject({ ...headers, "content-type": "application/json" });
  });

  it("surfaces upstream errors and rejects a non-HTTP service URL", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ code: "WATCHLIST_LIMIT" }), { status: 422 }));
    const client = new GeneratedV21MarketDataClient("https://market.test", () => ({}), request as typeof fetch);
    await expect(client.updateV21Watchlist({ securities: Array.from({ length: 101 }, (_, index) => `600${String(index).padStart(3, "0")}.SH`) })).rejects.toMatchObject({ status: 422, body: { code: "WATCHLIST_LIMIT" } });
    await client.openV21SourceCircuit("source/segment").catch(() => undefined);
    expect(request.mock.calls[1][0]).toBe("https://market.test/v2/sources/source%2Fsegment/fail");
    expect(() => new GeneratedV21MarketDataClient("file:///tmp", () => ({}))).toThrow("HTTP(S)");
  });
});
