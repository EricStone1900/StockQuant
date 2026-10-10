import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratedV21MarketDataClient, MarketDataV21HttpError } from "../../src/contracts/generated-v21-market-data-client.js";

describe("generated Market Data V1.2 Fixture reads", () => {
  afterEach(() => vi.restoreAllMocks());

  it("uses the fixed normal and future Fixture endpoints with the service identity", async () => {
    const request = vi.fn(async (input: string | URL | Request) => new Response(JSON.stringify({ fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: { status: "READY", errors: [] }, bars: [] }), { status: 200 }));
    const client = new GeneratedV21MarketDataClient("http://market/", () => ({ authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }), request as typeof fetch);
    await client.getV12NormalFixturePreview();
    await client.getV12FutureFixturePreview();
    await client.getCollectionScheduleForPlatform("sub/a");
    await client.getMinuteGapsForPlatform("sub/a");
    expect(request.mock.calls.map(([input, init]) => [String(input), init?.headers])).toEqual([
      ["http://market/v1/fixtures/normal/preview", { authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://market/v1/fixtures/bad-future/preview", { authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://market/v2/collection-schedules/sub%2Fa", { authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }],
      ["http://market/v2/minute/gaps/sub%2Fa", { authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }]
    ]);
  });

  it("preserves Market Data HTTP errors", async () => {
    const client = new GeneratedV21MarketDataClient("http://market", () => ({}), vi.fn(async () => new Response("{}", { status: 401 })) as typeof fetch);
    await expect(client.getV12NormalFixturePreview()).rejects.toMatchObject({ status: 401, name: "MarketDataV21HttpError" } satisfies Partial<MarketDataV21HttpError>);
  });

  it("reads the versioned dual-market research Fixture with Platform identity and a bounded timeout", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(new AbortController().signal);
    const request = vi.fn(async () => new Response(JSON.stringify({ fixtureVersion: "v1.2-market-data-5", dataMode: "FIXTURE", marketSessions: [], securities: [], bars: [] }), { status: 200 }));
    const client = new GeneratedV21MarketDataClient("http://market/", () => ({ authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }), request as typeof fetch);

    await client.getV12ResearchFixturePreview();

    expect(request.mock.calls.map(([input, init]) => [String(input), init?.method, init?.headers, init?.body, init?.signal])).toEqual([
      ["http://market/v1/fixtures/research-preview", "GET", { authorization: "Bearer market-token", "x-stockquant-service-id": "platform-api-service" }, undefined, expect.any(AbortSignal)]
    ]);
    expect(timeout.mock.calls).toEqual([[5000]]);
  });
});
