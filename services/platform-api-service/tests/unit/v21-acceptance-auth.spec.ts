import { afterEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { V21AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V2.1 acceptance identity boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects anonymous and out-of-scope users before calling Market Data", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new V21AcceptanceController({ marketDataHeaders: () => ({ authorization: "Bearer platform-secret" }) } as never);

    expect(() => controller.watchlist(undefined, undefined)).toThrow(UnauthorizedException);
    expect(() => controller.update(undefined, undefined, { securities: ["600000.SH"] })).toThrow(UnauthorizedException);
    expect(() => controller.watchlist("sq_session=other-user", undefined)).toThrow(ForbiddenException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards platform bearer identity after validating the local session", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new V21AcceptanceController({ marketDataHeaders: (headers = {}) => ({ ...headers, authorization: "Bearer platform-secret" }) } as never);

    await expect(controller.watchlist("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.sources("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.news("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.sampling("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.sourceSmoke("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.quotes("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    await expect(controller.liveNews("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:3002/v2/watchlist", expect.objectContaining({ headers: { authorization: "Bearer platform-secret" } }));
    for (const [url, options] of fetchMock.mock.calls as unknown as Array<[string, RequestInit]>) {
      expect(options.headers).toEqual({ authorization: "Bearer platform-secret" });
      expect(url).toMatch(/\/v2\/(?:sources(?:\/smoke)?|news\/(?:preview|live)|sampling|watchlist|quote\/preview)$/u);
    }
  });
});
