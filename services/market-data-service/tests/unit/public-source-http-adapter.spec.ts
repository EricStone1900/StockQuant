import { describe, expect, it, vi } from "vitest";
import { PublicSourceHttpAdapter, discoverSourceNewsArticles } from "../../src/adapters/public-source-http-adapter.js";

describe("PublicSourceHttpAdapter", () => {
  it("rejects access verification and missing-page titles even on registered article paths", async () => {
    for (const title of ["安全验证", "Access denied", "404 Not Found"]) {
      const adapter = new PublicSourceHttpAdapter(vi.fn<typeof fetch>().mockResolvedValue(new Response(`<title>${title}</title>`)));
      expect(await adapter.liveNews("cls-news", "https://www.cls.cn/detail/123", "2026-10-21T01:00:00Z")).toBeNull();
    }
  });
  it("discovers only three unique registered article paths, excluding external and credentialed URLs", () => {
    expect(discoverSourceNewsArticles("eastmoney-news", '<a href="https://evil.test/a/123.html"><a href="http://finance.eastmoney.com/a/123.html"><a href="https://x:y@finance.eastmoney.com/a/123.html"><a href="/a/123.html?tracking=1"><a href="/a/123.html"><a href="/a/124.html"><a href="/a/125.html"><a href="/a/126.html">')).toEqual([
      "https://finance.eastmoney.com/a/123.html", "https://finance.eastmoney.com/a/124.html", "https://finance.eastmoney.com/a/125.html",
    ]);
    expect(discoverSourceNewsArticles("cls-news", '<a href="/detail/123"><a href="/about"><a href="/detail/124#x">')).toEqual(["https://www.cls.cn/detail/123", "https://www.cls.cn/detail/124"]);
  });

  it("fetches an article after discovery, shares concurrent requests and preserves revised identity after the cache expires", async () => {
    let instant = new Date("2026-10-21T01:00:00Z"); let title = "合成新闻";
    const request = vi.fn<typeof fetch>().mockImplementation(async (url) => new Response(String(url).endsWith(".html")
      ? `<meta property="og:type" content="article"><meta property="og:title" content="${title}"><link rel="canonical" href="https://finance.eastmoney.com/a/123.html">`
      : '<a href="/a/123.html">synthetic article</a>'));
    const adapter = new PublicSourceHttpAdapter(request, () => instant);
    const results = await Promise.all([adapter.latestNews("eastmoney-news", instant.toISOString()), adapter.latestNews("eastmoney-news", instant.toISOString())]);
    expect(results[0]).toEqual(results[1]); expect(results[0]?.title).toBe("合成新闻"); expect(request).toHaveBeenCalledTimes(2);
    await adapter.latestNews("eastmoney-news", instant.toISOString()); expect(request).toHaveBeenCalledTimes(2);
    instant = new Date("2026-10-21T01:31:00Z"); title = "合成新闻修订";
    const revised = await adapter.latestNews("eastmoney-news", instant.toISOString());
    expect(revised?.newsId).toBe(results[0]?.newsId); expect(revised?.title).toBe(title); expect(request).toHaveBeenCalledTimes(4);
    expect(request).toHaveBeenCalledWith("https://finance.eastmoney.com/a/123.html", expect.objectContaining({ redirect: "error" }));
  });

  it("isolates source failures, bounds candidate attempts, and caches failure without erasing a healthy source", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async (url) => {
      if (String(url).includes("eastmoney")) return new Response("upstream unavailable", { status: 503 });
      if (String(url).includes("/detail/")) return new Response('<meta property="og:type" content="article"><meta property="og:title" content="合成公告"><link rel="canonical" href="https://www.cls.cn/detail/123">');
      return new Response('<a href="/detail/123">announcement</a>');
    });
    const adapter = new PublicSourceHttpAdapter(request, () => new Date("2026-10-21T01:00:00Z"));
    const result = await Promise.all([adapter.latestNews("eastmoney-news", "2026-10-21T01:00:00Z"), adapter.latestNews("cls-news", "2026-10-21T01:00:00Z")]);
    expect(result[0]).toBeNull(); expect(result[1]?.sourceItemId).toBe("https://www.cls.cn/detail/123");
    await adapter.latestNews("eastmoney-news", "2026-10-21T01:00:00Z"); expect(request).toHaveBeenCalledTimes(3);
  });

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

  it("parses deterministic Sina quote payloads and preserves source time in Asia/Shanghai", async () => {
    const fields = ["Bank", "10.00", "9.90", "10.25", "10.30", "9.80", ...Array.from({ length: 24 }, () => "0"), "2026-10-16", "09:31:02", "00"];
    const payload = `var hq_str_sh600000="${fields.join(",")}";\n`;
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(new TextEncoder().encode(payload), { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request, () => new Date("2026-10-16T01:31:03.000Z"));
    await expect(adapter.sinaQuotePreview(["600000.SH"])).resolves.toMatchObject({
      sourceId: "sina-quote", count: 1, ingestedAt: "2026-10-16T01:31:03.000Z",
      securities: [{ symbol: "600000.SH", price: 10.25, observedAt: "2026-10-16T09:31:02+08:00", status: "LIVE_SOURCE" }],
    });
    expect(request).toHaveBeenCalledWith("https://hq.sinajs.cn/list=sh600000", expect.objectContaining({ signal: expect.any(AbortSignal), headers: { "user-agent": "StockQuant-V2.1", referer: "https://finance.sina.com.cn/" } }));
  });

  it("keeps missing or malformed Sina fields out of live quote results", async () => {
    const fields = ["Bank", "10.00", "9.90", "0", "10.30", "9.80", ...Array.from({ length: 24 }, () => "0"), "2026-10-16", "09:31:02", "00"];
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(`var hq_str_sh600000="${fields.join(",")}";`, { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request);
    await expect(adapter.sinaQuotePreview(["600000.SH"])).resolves.toMatchObject({ securities: [{ price: null, status: "MALFORMED" }] });
    await expect(adapter.sinaQuotePreview(["bad-symbol"])).resolves.toMatchObject({ count: 0, status: "STALE", error: "SINA_QUOTE_INVALID_SECURITY_ID" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects an impossible Sina calendar timestamp", async () => {
    const fields = ["Bank", "10.00", "9.90", "10.25", "10.30", "9.80", ...Array.from({ length: 24 }, () => "0"), "2026-02-31", "09:31:02", "00"];
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(`var hq_str_sh600000="${fields.join(",")}";`, { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request);
    await expect(adapter.sinaQuotePreview(["600000.SH"])).resolves.toMatchObject({ securities: [{ observedAt: null, status: "MISSING_TIMESTAMP" }] });
  });

  it("uses a stable canonical article URL rather than a mutable homepage title as its identity", async () => {
    const html = '<html><meta property="og:type" content="article"><meta property="og:title" content=" market update  "><meta property="article:published_time" content="2026-10-02T00:55:00Z"><link rel="canonical" href="https://finance.eastmoney.com/a/123.html?campaign=one"></html>';
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(html, { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request, () => new Date("2026-10-02T01:00:01.000Z"));
    const first = await adapter.liveNews("eastmoney-news", "https://finance.eastmoney.com/a/123.html", "2026-10-02T01:00:00.000Z");
    const second = await adapter.liveNews("eastmoney-news", "https://finance.eastmoney.com/a/123.html", "2026-10-02T01:00:00.000Z");
    expect(first).toMatchObject({ sourceId: "eastmoney-news", sourceItemId: "https://finance.eastmoney.com/a/123.html", sourceUrl: "https://finance.eastmoney.com/a/123.html", title: "market update", publishedAt: "2026-10-02T00:55:00.000Z", observedAt: "2026-10-02T01:00:00.000Z", ingestedAt: "2026-10-02T01:00:01.000Z", availableAt: "2026-10-02T01:00:01.000Z" });
    expect(second?.newsId).toBe(first?.newsId);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not mislabel a homepage title as an article", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("<html><title>market homepage</title></html>", { status: 200 }));
    const adapter = new PublicSourceHttpAdapter(request);
    await expect(adapter.liveNews("eastmoney-news", "https://news.test/", "2026-10-02T01:00:00.000Z")).resolves.toBeNull();
  });

  it("accepts a title-only registered article path while keeping its requested URL as the stable source identity", async () => {
    const adapter = new PublicSourceHttpAdapter(vi.fn<typeof fetch>().mockResolvedValue(new Response("<title> article title </title>")));
    await expect(adapter.liveNews("cls-news", "https://www.cls.cn/detail/123", "2026-10-02T01:00:00.000Z")).resolves.toMatchObject({
      sourceItemId: "https://www.cls.cn/detail/123", sourceUrl: "https://www.cls.cn/detail/123", title: "article title", publishedAt: null,
    });
  });

  it("does not treat an HTTP error page title as successful news", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("<title>upstream error</title>", { status: 503 }));
    const adapter = new PublicSourceHttpAdapter(request);
    await expect(adapter.liveNews("source-a", "https://news.test/", "2026-10-02T01:00:00.000Z")).resolves.toBeNull();
  });
});
