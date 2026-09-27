import { describe, expect, it, vi } from "vitest";
import { GeneratedHistoricalReplayClient, HistoricalReplayHttpError } from "../../src/contracts/generated-historical-replay-client.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";

describe("OpenAPI-generated Historical Replay client", () => {
  it("sends platform identity and encodes synchronous and asynchronous replay requests", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "COMPLETED" }), { status: 200 }));
    const client = new GeneratedHistoricalReplayClient("http://worker:3006/", token, request);
    const body = { testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df", namespace: "scope/a", ownerId: "owner", scenarioId: "normal" as const, seed: 20260907, bars: [{ timestamp: "2026-09-27T10:00:00Z", open: "1.0000", volume: 10 }] };

    await client.startHistoricalMultiBarReplay(body);
    await client.startHistoricalMultiBarReplay(body, true);

    expect(request).toHaveBeenNthCalledWith(1, "http://worker:3006/internal/v1/replays/multi", expect.objectContaining({ method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), body: JSON.stringify(body) }));
    expect(request).toHaveBeenNthCalledWith(2, "http://worker:3006/internal/v1/replays/multi?async=true", expect.any(Object));
  });

  it("uses generated lifecycle routes and preserves HTTP status on errors", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ testRunId: "8bd87f3a-8741-4b0b-9610-46ae2fbcc4df" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "missing" }), { status: 404 }));
    const client = new GeneratedHistoricalReplayClient("http://worker:3006", token, request);

    await client.controlHistoricalReplayRun("8bd87f3a-8741-4b0b-9610-46ae2fbcc4df", "pause");
    expect(request.mock.calls[0]?.[0]).toBe("http://worker:3006/internal/v1/replays/8bd87f3a-8741-4b0b-9610-46ae2fbcc4df/pause");
    await expect(client.readHistoricalReplayRun("8bd87f3a-8741-4b0b-9610-46ae2fbcc4df")).rejects.toMatchObject<Partial<HistoricalReplayHttpError>>({ status: 404 });
  });
});
