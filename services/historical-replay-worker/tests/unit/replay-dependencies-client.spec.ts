import { describe, expect, it, vi } from "vitest";
import { GeneratedReplayDependenciesClient, ReplayDependencyHttpError } from "../../src/contracts/generated-replay-dependencies-client.js";

describe("GeneratedReplayDependenciesClient", () => {
  it("sends the exact caller identity and BACKTEST/FAKE grant body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ authorizationId: "grant-1" }), { status: 200 }));
    const client = new GeneratedReplayDependenciesClient("http://governance", "http://quant", "a".repeat(40), request);
    const result = await client.authorizeHistoricalReplayExecution({ namespace: "run-1", accountId: "00000000-0000-4000-8000-000000000001", environmentMode: "BACKTEST", brokerMode: "FAKE", command: { namespace: "run-1", accountId: "00000000-0000-4000-8000-000000000001", clientOrderId: "order-1", security: "600000.SH", requestedQuantity: 100, bar: { timestamp: "2026-09-30T00:00:00.000Z", open: "10.0000", volume: 1000 } } });
    expect(result.authorizationId).toBe("grant-1");
    expect(request).toHaveBeenCalledWith("http://governance/internal/v1/authorizations", expect.objectContaining({ headers: expect.objectContaining({ "x-stockquant-service-id": "historical-replay-worker", authorization: "Bearer " + "a".repeat(40) }), body: expect.stringContaining('"brokerMode":"FAKE"') }));
  });

  it("posts Fixture bars to Quant and preserves dependency errors", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ status: "COMPLETED", adapter: "fixture-summary", dataMode: "FIXTURE", barCount: 1, artifactHash: "a".repeat(64), assertions: [] }), { status: 200 })).mockResolvedValueOnce(new Response("denied", { status: 403 }));
    const client = new GeneratedReplayDependenciesClient("http://governance", "http://quant", "b".repeat(40), request);
    const body = { runId: "00000000-0000-4000-8000-000000000001", bars: [{ timestamp: "2026-09-30T00:00:00.000Z", open: "10.0000", volume: 1000 }], executions: [] };
    await expect(client.summarizeHistoricalReplayBars(body)).resolves.toMatchObject({ dataMode: "FIXTURE", barCount: 1 });
    expect(request.mock.calls[0][0]).toBe("http://quant/v1/research/multi-bar");
    await expect(client.summarizeHistoricalReplayBars(body)).rejects.toBeInstanceOf(ReplayDependencyHttpError);
  });
});
