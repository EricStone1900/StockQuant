import { describe, expect, it, vi } from "vitest";
import { GeneratedQlibWorkerClient, QlibWorkerHttpError } from "../../src/contracts/generated-qlib-worker-client.js";

const token = "q".repeat(40);

describe("GeneratedQlibWorkerClient", () => {
  it("uses the dedicated service identity on the probe route", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "READY", version: "0.9.6" })));
    const client = new GeneratedQlibWorkerClient("http://worker:3004/", token, request);
    await expect(client.probe()).resolves.toMatchObject({ status: "READY", version: "0.9.6" });
    expect(request).toHaveBeenCalledWith("http://worker:3004/probe", expect.objectContaining({ headers: { authorization: `Bearer ${token}`, "x-stockquant-service-id": "quant-research-service" } }));
  });

  it("posts the fixture payload with a bounded timeout and surfaces the worker status/body", async () => {
    const body = { schemaVersion: "qlib-fit-fixture-v1", rows: [] } as never;
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "REJECTED", reason: "fixture invalid" }), { status: 422 }));
    const client = new GeneratedQlibWorkerClient("http://worker:3004", token, request);
    await expect(client.fitFixture(body, 12_000)).rejects.toMatchObject({ status: 422, body: { status: "REJECTED", reason: "fixture invalid" } } satisfies Partial<QlibWorkerHttpError>);
    expect(request).toHaveBeenCalledWith("http://worker:3004/qlib/fit-fixture", expect.objectContaining({ method: "POST", headers: { authorization: `Bearer ${token}`, "x-stockquant-service-id": "quant-research-service", "content-type": "application/json" }, body: JSON.stringify(body), signal: expect.any(AbortSignal) }));
  });

  it("routes summary train and hash recomputation through the same dedicated identity", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "FIXTURE_ONLY", artifact: { artifactHash: "a".repeat(64) } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "HASH_MATCH", independentModelValidation: "NOT_RUN" })));
    const client = new GeneratedQlibWorkerClient("http://worker:3004", token, request);
    const bars = [{ timestamp: "2026-09-30T09:30:00+08:00", open: "12.3400", volume: 10 }];
    await expect(client.trainSummary({ bars })).resolves.toMatchObject({ status: "FIXTURE_ONLY" });
    await expect(client.validateSummary({ bars, artifactHash: "a".repeat(64) })).resolves.toMatchObject({ status: "HASH_MATCH", independentModelValidation: "NOT_RUN" });
    expect(request.mock.calls.map(([url]) => url)).toEqual(["http://worker:3004/train", "http://worker:3004/validate"]);
    for (const [, init] of request.mock.calls) expect(init?.headers).toMatchObject({ authorization: `Bearer ${token}`, "x-stockquant-service-id": "quant-research-service" });
  });

  it("rejects missing service bearer credentials at construction", () => {
    expect(() => new GeneratedQlibWorkerClient("http://worker:3004", "unset")).toThrow(/bearer token/u);
  });
});
