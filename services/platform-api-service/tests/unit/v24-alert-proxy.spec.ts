import { afterEach, describe, expect, it, vi } from "vitest";
import { V24AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V2.4 alert Platform proxy", () => {
  afterEach(() => vi.unstubAllGlobals());

  function controller() {
    const value = Object.create(V24AcceptanceController.prototype) as V24AcceptanceController & { container: { marketDataUrl: string; marketDataHeaders: () => Record<string, string> } };
    value.container = {
      marketDataUrl: "http://market.test",
      marketDataHeaders: () => ({ authorization: `Bearer ${"p".repeat(40)}`, "x-stockquant-service-id": "platform-api-service" }),
    };
    return value;
  }

  it("requires a local user session and proxies active alert reads with service identity", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ incidents: [] }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    expect(() => controller().alerts(undefined, undefined)).toThrow("local session is required");
    expect(request).not.toHaveBeenCalled();

    await expect(controller().alerts("sq_session=acceptance-owner-1", undefined)).resolves.toEqual({ incidents: [] });
    expect(request).toHaveBeenCalledWith("http://market.test/v2/alerts", expect.objectContaining({
      method: "GET",
      headers: { authorization: `Bearer ${"p".repeat(40)}`, "x-stockquant-service-id": "platform-api-service" },
    }));
  });

  it("binds acknowledgements to the logged-in owner and rejects malformed incident IDs", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ incidentId: "39cf8ff6-5dcb-48f9-84a0-0250281528cb", state: "ACKNOWLEDGED" }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    expect(() => controller().acknowledgeAlert("sq_session=acceptance-owner-1", undefined, "bad-id")).toThrow("alert incident was not found");
    expect(request).not.toHaveBeenCalled();

    await expect(controller().acknowledgeAlert("sq_session=acceptance-owner-1", undefined, "39cf8ff6-5dcb-48f9-84a0-0250281528cb"))
      .resolves.toMatchObject({ state: "ACKNOWLEDGED" });
    expect(request).toHaveBeenCalledWith("http://market.test/v2/alerts/39cf8ff6-5dcb-48f9-84a0-0250281528cb/acknowledge", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ actorId: "acceptance-owner-1" }),
    }));
  });
});
