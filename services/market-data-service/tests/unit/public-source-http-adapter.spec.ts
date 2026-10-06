import { describe, expect, it, vi } from "vitest";
import { PublicSourceHttpAdapter } from "../../src/adapters/public-source-http-adapter.js";

describe("PublicSourceHttpAdapter", () => {
  it("performs source probes through the injected HTTP transport", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request);
    await expect(adapter.check("source-a", "https://example.test/")).resolves.toMatchObject({ sourceId: "source-a", status: "PASS", httpStatus: 200, bytes: 2 });
    expect(request).toHaveBeenCalledWith("https://example.test/", expect.objectContaining({ headers: { "user-agent": "StockQuant-V2.1" } }));
  });

  it("turns provider transport failure into a stale quote result without throwing", async () => {
    const request = vi.fn<typeof fetch>().mockRejectedValue(new Error("network unavailable"));
    const adapter = new PublicSourceHttpAdapter(request, () => new Date("2026-10-02T01:00:00.000Z"));
    await expect(adapter.tencentQuotePreview(["600000.SH"])).resolves.toMatchObject({ sourceId: "tencent-quote", status: "STALE", count: 0, ingestedAt: "2026-10-02T01:00:00.000Z", error: "network unavailable" });
    expect(request).toHaveBeenCalledWith("https://qt.gtimg.cn/q=sh600000", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("bounds live news parsing and preserves observed time in its idempotent identity", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response("<html><title> market update  </title></html>", { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request);
    const first = await adapter.liveNews("eastmoney-news", "https://news.test/", "2026-10-02T01:00:00.000Z");
    const second = await adapter.liveNews("eastmoney-news", "https://news.test/", "2026-10-02T01:00:00.000Z");
    expect(first).toMatchObject({ sourceId: "eastmoney-news", title: "market update", observedAt: "2026-10-02T01:00:00.000Z", availableAt: "2026-10-02T01:00:00.000Z" });
    expect(second?.newsId).toBe(first?.newsId);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
