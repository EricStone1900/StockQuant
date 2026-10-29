import { describe, expect, it, vi } from "vitest";
import { GeneratedMarketDataMinuteClient, MarketDataMinuteHttpError } from "../../src/contracts/generated-market-data-minute-client.js";

describe("OpenAPI-generated Market Data minute-import client", () => {
  it("reads the frozen V2.2 preview and preserves expected Fixture import rejection bodies", async () => {
    const preview = { fixtureVersion: "v2.2-minute-bars-1", rows: 2, securities: 1, quality: [], bars: [] };
    const rejected = { importId: "import-bad", version: "minute-bad-v1", status: "REJECTED", accepted: 0, errors: [{ code: "OHLC_INVALID" }], sha256: "b".repeat(64), manifest: {}, idempotent: false };
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify(preview), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(rejected), { status: 422 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + "s".repeat(40) };
    const client = new GeneratedMarketDataMinuteClient("http://market-data:3002", () => headers, request);
    await expect(client.previewMarketDataMinuteFixture()).resolves.toEqual(preview);
    await expect(client.importMarketDataMinuteFixture({ fixture: "bad" })).resolves.toEqual(rejected);
    expect(request.mock.calls[0][0]).toBe("http://market-data:3002/v2/minute/preview");
    expect(request.mock.calls[0][1]?.headers).toEqual(headers);
    expect(request.mock.calls[1][1]).toMatchObject({ method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ fixture: "bad" }) });
  });

  it("sends the typed request with the Platform service identity and returns the published record", async () => {
    const record = { importId: "import-1", version: "minute-v1", status: "PUBLISHED", accepted: 1, errors: [], sha256: "a".repeat(64), manifest: {}, idempotent: false };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(record), { status: 201 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer " + "s".repeat(40) };
    const client = new GeneratedMarketDataMinuteClient("http://market-data:3002/", () => headers, request);
    const body = {
      content: "600000.SH,2026-09-01 09:30:00,1,1,1,1,100,100",
      mapping: { securityId: "security_id", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" },
      provenance: { sourceName: "fixture", sourceReference: null, licenseStatement: "deterministic test fixture", licenseVerification: "UNCONFIRMED" as const, acquiredAt: "2026-09-01T00:00:00Z" },
      market: "CN_A" as const, frequency: "1m" as const, adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const,
      timestampSemantics: "BAR_START" as const, volumeUnit: "SHARES" as const, amountUnit: "CNY" as const,
    };

    await expect(client.importMarketDataMinuteCsv(body)).resolves.toMatchObject({ importId: "import-1", version: "minute-v1", status: "PUBLISHED" });
    expect(request).toHaveBeenCalledWith("http://market-data:3002/v2/minute/csv/import", expect.objectContaining({
      method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body),
    }));
  });

  it("preserves Market Data error status and response body for the Platform route", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: "CSV_PARSE_REJECTED" }), { status: 422 }));
    const client = new GeneratedMarketDataMinuteClient("http://market-data:3002", () => ({}), request);
    await expect(client.importMarketDataMinuteCsv({} as never)).rejects.toMatchObject<Partial<MarketDataMinuteHttpError>>({ status: 422, body: { code: "CSV_PARSE_REJECTED" } });
  });

  it("sends upload lifecycle calls with the owner scope and generated route contract", async () => {
    const response = { uploadId: "upload-1", status: "OPEN" };
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(response), { status: 200 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer token" };
    const client = new GeneratedMarketDataMinuteClient("http://market-data:3002", () => headers, request);
    const createBody = {
      uploadId: "11111111-1111-4111-8111-111111111111", expectedSha256: "a".repeat(64), expectedBytes: 4,
      metadata: { mapping: { securityId: "code", timestamp: "time", open: "o", high: "h", low: "l", close: "c", volume: "v", amount: "a" }, provenance: { sourceName: "fixture", sourceReference: null, licenseStatement: "test fixture", licenseVerification: "UNCONFIRMED" as const, acquiredAt: "2026-09-01T00:00:00Z" }, market: "CN_A" as const, frequency: "1m" as const, adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: "BAR_START" as const, volumeUnit: "SHARES" as const, amountUnit: "CNY" as const },
    };
    await client.createMarketDataMinuteUpload("csv", createBody, "owner-1");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/csv/uploads", expect.objectContaining({ method: "POST", headers: { ...headers, "x-stockquant-owner-id": "owner-1", "content-type": "application/json" } }));
    await client.getMarketDataMinuteUpload("parquet", "upload-1", "owner-2");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/parquet/uploads/upload-1", expect.objectContaining({ method: "GET", headers: { ...headers, "x-stockquant-owner-id": "owner-2" } }));
    await client.actOnMarketDataMinuteUpload("csv", "upload-1", "finalize", "owner-1");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/csv/uploads/upload-1/finalize", expect.objectContaining({ method: "POST", body: "{}" }));
    await client.actOnMarketDataMinuteUpload("csv", "upload-1", "finalize-queued", "owner-1");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/csv/uploads/upload-1/finalize-queued", expect.objectContaining({ method: "POST", body: "{}", headers: { ...headers, "x-stockquant-owner-id": "owner-1", "content-type": "application/json" } }));
    await client.getMarketDataMinuteUploadFinalization("parquet", "upload-1", "owner-2");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/parquet/uploads/upload-1/finalization", expect.objectContaining({ method: "GET", headers: { ...headers, "x-stockquant-owner-id": "owner-2" } }));
  });

  it("uses generated preview and immutable import read routes with the service identity", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ rows: [] }), { status: 200 }));
    const headers = { "x-stockquant-service-id": "platform-api-service", authorization: "Bearer token" };
    const client = new GeneratedMarketDataMinuteClient("http://market-data:3002", () => headers, request);
    const body = { content: "", mapping: {}, provenance: {}, market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" } as never;
    await client.previewMarketDataMinuteCsv(body);
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/csv/preview", expect.objectContaining({ method: "POST", headers: { ...headers, "content-type": "application/json" } }));
    await client.getMarketDataMinuteImport("minute-v1/a");
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/imports/minute-v1%2Fa", expect.objectContaining({ method: "GET", headers }));
    await client.pageMarketDataMinuteImportBars("minute-v1", { cursor: "0", pageSize: "100", securityId: "600000.SH" });
    expect(request).toHaveBeenLastCalledWith("http://market-data:3002/v2/minute/imports/minute-v1/bars?cursor=0&pageSize=100&securityId=600000.SH", expect.objectContaining({ method: "GET", headers }));
  });
});
