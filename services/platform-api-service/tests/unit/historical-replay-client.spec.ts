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

  it("maps single-bar replay start to the generated route with the typed command", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ testRunId: "run-a" }), { status: 202 }));
    const client = new GeneratedHistoricalReplayClient("http://worker:3006", token, request);
    const command = { testRunId: "run-a", namespace: "owner/run-a", ownerId: "owner-a", scenarioId: "normal" as const, seed: 20260907, bars: [] };

    await client.startHistoricalReplay(command);

    expect(request).toHaveBeenCalledWith("http://worker:3006/internal/v1/replays", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }),
      body: JSON.stringify(command),
      signal: expect.any(AbortSignal),
    }));
  });

  it("encodes replay IDs and sends bodyless control and UNKNOWN recovery commands", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "RUNNING" }), { status: 200 }));
    const client = new GeneratedHistoricalReplayClient("http://worker:3006", token, request);

    await client.readHistoricalReplayRun("run/a");
    await client.controlHistoricalReplayRun("run/a", "pause");
    await client.controlHistoricalReplayRun("run/a", "resume");
    await client.controlHistoricalReplayRun("run/a", "cancel");
    await client.recoverHistoricalReplayUnknownOrder("run/a");

    const paths = [
      "http://worker:3006/internal/v1/replays/run%2Fa",
      "http://worker:3006/internal/v1/replays/run%2Fa/pause",
      "http://worker:3006/internal/v1/replays/run%2Fa/resume",
      "http://worker:3006/internal/v1/replays/run%2Fa/cancel",
      "http://worker:3006/internal/v1/replays/run%2Fa/recover-unknown",
    ];
    expect(request.mock.calls.map(([url]) => url)).toEqual(paths);
    for (const [url, init] of request.mock.calls) {
      expect(init).toMatchObject({ method: url.endsWith("/run%2Fa") ? "GET" : "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }), signal: expect.any(AbortSignal) });
      expect(init).not.toHaveProperty("body");
    }
  });
});
