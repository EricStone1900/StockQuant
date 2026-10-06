import { describe, expect, it, vi } from "vitest";
import { GeneratedV24MarketObservationClient } from "../../src/contracts/generated-v24-market-observation-client.js";

describe("GeneratedV24MarketObservationClient", () => {
  it("reads the public versioned calendar with an encoded date and bounded timeout", async () => {
    const session = { date: "2026-10-01", status: "TRADING", calendarVersion: "calendar-v1" };
    const request = vi.fn().mockResolvedValue(Response.json(session));
    const client = new GeneratedV24MarketObservationClient("http://market.test/", "p".repeat(40), request);
    await expect(client.getCnAShareCalendarSession("2026-10-01")).resolves.toEqual(session);
    expect(request.mock.calls[0][0]).toBe("http://market.test/v2/calendar/cn-a-share/2026-10-01");
    expect(request.mock.calls[0][1]?.headers).toBeUndefined();
    expect(request.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("uses Platform bearer identity for quote reads and propagates source failures", async () => {
    const result = { sourceId: "tencent-quote", requestedSymbols: [], securities: [], count: 0, ingestedAt: "2026-10-01T01:00:00Z" };
    const request = vi.fn().mockResolvedValueOnce(Response.json(result)).mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const client = new GeneratedV24MarketObservationClient("http://market.test", "p".repeat(40), request);
    await expect(client.getV24AuthorizedQuotePreview()).resolves.toEqual(result);
    expect(request.mock.calls[0][0]).toBe("http://market.test/v2/quote/preview");
    expect(request.mock.calls[0][1]).toMatchObject({ headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` } });
    await expect(client.getV24AuthorizedQuotePreview()).rejects.toThrow("HTTP 503");
  });

  it("rejects invalid base URLs, missing service credentials, and malformed dates", async () => {
    expect(() => new GeneratedV24MarketObservationClient("file:///tmp", "p".repeat(40))).toThrow("HTTP(S)");
    expect(() => new GeneratedV24MarketObservationClient("http://market.test", "short")).toThrow("bearer token");
    const client = new GeneratedV24MarketObservationClient("http://market.test", "p".repeat(40), vi.fn());
    await expect(client.getCnAShareCalendarSession("20261001")).rejects.toThrow("YYYY-MM-DD");
  });
});
