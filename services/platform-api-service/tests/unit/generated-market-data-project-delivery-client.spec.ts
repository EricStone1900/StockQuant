import { describe, expect, it, vi } from "vitest";
import { GeneratedMarketDataProjectDeliveryClient, MarketDataProjectDeliveryHttpError } from "../../src/contracts/generated-market-data-project-delivery-client.js";

const pageRequest = { projectId: "dc06-web", dataVersion: "dc06-web-v1", items: [{ symbol: "600000.SH" }], pageSize: 1 };

describe("GeneratedMarketDataProjectDeliveryClient", () => {
  it("sends project identity and credential while preserving the exact request resource", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ dataVersion: "dc06-web-v1", items: [{ symbol: "600000.SH" }], nextCursor: null }), { status: 200 }));
    const client = new GeneratedMarketDataProjectDeliveryClient("http://market-data:3002/", "dc06-web", "secret-project-token", request);

    await expect(client.pageProjectData(pageRequest)).resolves.toMatchObject({ dataVersion: "dc06-web-v1", nextCursor: null });
    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://market-data:3002/v2/data/page");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("x-stockquant-project-id")).toBe("dc06-web");
    expect(new Headers(init.headers).get("x-stockquant-project-token")).toBe("secret-project-token");
    expect(new Headers(init.headers).has("x-stockquant-scopes")).toBe(false);
    expect(JSON.parse(String(init.body))).toEqual(pageRequest);
  });

  it("does not invent caller scopes when the project credential is unset", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: "UNAUTHENTICATED" }), { status: 401 }));
    const client = new GeneratedMarketDataProjectDeliveryClient("http://market-data:3002", "dc06-web", undefined, request);

    await expect(client.pageProjectData(pageRequest)).rejects.toMatchObject({ status: 401 });
    const [, init] = request.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.has("x-stockquant-project-token")).toBe(false);
    expect(headers.has("x-stockquant-scopes")).toBe(false);
  });

  it("preserves authenticated project authorization failures", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ code: "PROJECT_ACCESS_DENIED" }), { status: 403 }));
    const client = new GeneratedMarketDataProjectDeliveryClient("http://market-data:3002", "dc06-web", "project-token", request);

    const error = await client.exportProjectData({ projectId: "dc06-web", dataVersion: "dc06-web-v1", items: [] }).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(MarketDataProjectDeliveryHttpError);
    expect(error).toMatchObject({ status: 403, body: { code: "PROJECT_ACCESS_DENIED" } });
    expect(request).toHaveBeenCalledOnce();
  });
});
