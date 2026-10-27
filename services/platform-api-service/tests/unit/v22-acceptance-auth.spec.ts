import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { V22AcceptanceController } from "../../src/bootstrap/app.module.js";

const identityHeaders = { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` };
function controller() {
  return new V22AcceptanceController({ marketDataUrl: "http://market-data", marketDataHeaders: (extra = {}) => ({ ...extra, ...identityHeaders }) } as never);
}

describe("V2.2 Acceptance page identity", () => {
  it("requires a local user session for scenario discovery and fixture preview", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(() => controller().scenarios(undefined, undefined)).toThrow(UnauthorizedException);
    expect(() => controller().preview(undefined, undefined)).toThrow(UnauthorizedException);
    expect(() => controller().scenarios("sq_session=other-user", undefined)).toThrow(ForbiddenException);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("forwards only the Platform service credential to the fixture preview route", async () => {
    vi.stubEnv("STOCKQUANT_MARKET_DATA_URL", "http://market-data");
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ fixtureVersion: "v2.2-minute-bars-1", rows: 6 }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await controller().preview("sq_session=acceptance-owner-1", undefined);
    expect(fetch).toHaveBeenCalledWith("http://market-data/v2/minute/preview", expect.objectContaining({ method: "GET", headers: identityHeaders, signal: expect.any(AbortSignal) }));
    expect(result).toEqual({ fixtureVersion: "v2.2-minute-bars-1", rows: 6 });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loads a bounded import range and calculates coverage through the service client", async () => {
    vi.stubEnv("STOCKQUANT_MARKET_DATA_URL", "http://market-data");
    const bars = { version: "minute-v1", items: [{ securityId: "600000.SH", barStart: "2026-10-20T01:30:00.000Z", barEnd: "2026-10-20T01:35:00.000Z", open: 10, high: 10, low: 10, close: 10, volume: 100, amount: 1000 }], nextCursor: null };
    const coverage = { status: "INCOMPLETE", expectedBars: 48, validBars: 1, missingBars: 0, unknownBars: 47, suspendedBars: 0, barStatuses: [] };
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ version: "minute-v1", status: "PUBLISHED", manifest: { semantics: { frequency: "5m" } } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(bars), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(coverage), { status: 422 }));
    vi.stubGlobal("fetch", fetch);
    const result = await controller().importCoverage("sq_session=acceptance-owner-1", undefined, "minute-v1", { securityId: "600000.SH", fromDate: "2026-10-20", toDate: "2026-10-20", windowMinutes: 5 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[0]).toContain("securityId=600000.SH");
    expect(fetch.mock.calls[1]?.[0]).toContain("fromBarStart=2026-10-20T00%3A00%3A00%2B08%3A00");
    expect(fetch.mock.calls[2]?.[0]).toBe("http://market-data/v2/minute/coverage");
    expect(JSON.parse(fetch.mock.calls[2]?.[1]?.body as string)).toMatchObject({ securityIds: ["600000.SH"], fromDate: "2026-10-20", toDate: "2026-10-20", windowMinutes: 5, bars: bars.items });
    expect(result).toEqual(coverage);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects coverage ranges outside its bounded window before calling Market Data", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(controller().importCoverage("sq_session=acceptance-owner-1", undefined, "minute-v1", { securityId: "600000.SH", fromDate: "2026-01-01", toDate: "2026-02-02", windowMinutes: 5 })).rejects.toThrow("no longer than 31 calendar days");
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("rejects a coverage frequency that differs from the immutable import semantics", async () => {
    vi.stubEnv("STOCKQUANT_MARKET_DATA_URL", "http://market-data");
    const fetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ version: "minute-v1", manifest: { semantics: { frequency: "1m" } } }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await expect(controller().importCoverage("sq_session=acceptance-owner-1", undefined, "minute-v1", { securityId: "600000.SH", fromDate: "2026-10-20", toDate: "2026-10-20", windowMinutes: 5 })).rejects.toThrow("must match the imported DataVersion frequency");
    expect(fetch).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});
