import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Dc08AcceptanceController } from "../../src/bootstrap/app.module.js";

const headers = { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"p".repeat(40)}` };
function controller() { return new Dc08AcceptanceController({ marketDataUrl: "http://market-data", marketDataHeaders: (extra = {}) => ({ ...extra, ...headers }) } as never); }

describe("DC-08A acceptance reads", () => {
  it("requires the local session before proxying collection records", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(controller().preview(undefined, undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().preview("sq_session=other-user", undefined)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetch).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("forwards the independent Platform Bearer to protected Market Data GETs", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "ready" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ subscriptionId: "sub" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ open: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const result = await controller().preview("sq_session=acceptance-owner-1", undefined);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][1]?.headers).toEqual(headers);
    expect(fetch.mock.calls[2][1]?.headers).toEqual(headers);
    expect(result.webMode).toBe("READ_ONLY");
    vi.unstubAllGlobals();
  });
});
