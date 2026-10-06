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
});
