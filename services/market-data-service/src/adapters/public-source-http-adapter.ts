import { createHash } from "node:crypto";
import { decodeTencentQuote, previewTencentQuotes } from "../application/tencent-quote-preview.js";
import { decodeSinaQuote, previewSinaQuotes } from "../application/sina-quote-preview.js";

export type PublicSourceCheck = { sourceId: string; status: "PASS" | "FAIL"; httpStatus?: number; bytes?: number; error?: string };
export type TencentQuotePreviewResult = {
  sourceId: "tencent-quote";
  requestedSymbols: string[];
  securities: ReturnType<typeof previewTencentQuotes>;
  count: number;
  ingestedAt: string;
  status?: "STALE";
  error?: string;
};
export type SinaQuotePreviewResult = {
  sourceId: "sina-quote";
  requestedSymbols: string[];
  securities: ReturnType<typeof previewSinaQuotes>;
  count: number;
  ingestedAt: string;
  status?: "STALE";
  error?: string;
};

export type SourceNewsArticle = { newsId: string; sourceId: string; sourceItemId: string; sourceUrl: string; title: string; publishedAt: string | null; observedAt: string; ingestedAt: string; availableAt: string; revision: 1; symbols: string[] };

const newsSources = {
  "eastmoney-news": { entry: "https://finance.eastmoney.com/", origin: "https://finance.eastmoney.com", articlePath: /^\/a\/\d+\.html$/u },
  "cls-news": { entry: "https://www.cls.cn/", origin: "https://www.cls.cn", articlePath: /^\/detail\/\d+$/u },
} as const;
export type NewsSourceId = keyof typeof newsSources;

/** Only article URLs from the registered source are eligible; never follow arbitrary links. */
export function discoverSourceNewsArticles(sourceId: NewsSourceId, html: string): string[] {
  const source = newsSources[sourceId];
  const urls = new Set<string>();
  if (html.length > 1_000_000) throw new Error("NEWS_RESPONSE_TOO_LARGE");
  for (const tag of html.match(/<a\b[^>]*>/giu) ?? []) {
    const href = attribute(tag, "href");
    if (!href) continue;
    try {
      const url = new URL(href, source.entry);
      if (url.origin !== source.origin || url.username || url.password || !source.articlePath.test(url.pathname)) continue;
      urls.add(url.origin + url.pathname);
      if (urls.size === 3) break;
    } catch { /* malformed navigation links are not articles */ }
  }
  return [...urls];
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"));
  return match?.[2]?.replace(/&amp;/giu, "&").replace(/&quot;/giu, '"').replace(/&#39;/giu, "'").trim() ?? null;
}

/** Parse an article page only; a homepage title is not a news article. */
export function parseSourceNewsArticle(sourceId: string, requestedUrl: string, html: string, observedAt: string, ingestedAt: string): SourceNewsArticle | null {
  if (html.length > 1_000_000) return null;
  const registeredSource = newsSources[sourceId as NewsSourceId];
  let requested: URL;
  try { requested = new URL(requestedUrl); } catch { return null; }
  // A plain document title is admissible only after discovery has constrained it
  // to this source's registered article path. This keeps navigation/home pages
  // and arbitrary caller-provided URLs from becoming news records.
  if (requested.username || requested.password || (registeredSource && (requested.origin !== registeredSource.origin || !registeredSource.articlePath.test(requested.pathname)))) return null;
  const metaTags = html.match(/<meta\b[^>]*>/giu) ?? [];
  const readMeta = (keyName: string, key: string) => {
    const tag = metaTags.find((item) => attribute(item, keyName)?.toLowerCase() === key.toLowerCase());
    return tag ? attribute(tag, "content") : null;
  };
  const metadataArticle = readMeta("property", "og:type")?.toLowerCase() === "article";
  if (!metadataArticle && !registeredSource) return null;
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1]?.replace(/<[^>]+>/gu, " ");
  const title = (readMeta("property", "og:title") ?? titleTag)?.replace(/\s+/gu, " ").trim();
  const canonicalTag = (html.match(/<link\b[^>]*>/giu) ?? []).find((item) => attribute(item, "rel")?.toLowerCase().split(/\s+/u).includes("canonical"));
  const canonicalHref = canonicalTag ? attribute(canonicalTag, "href") : null;
  const articleUrl = canonicalHref ?? readMeta("property", "og:url") ?? (registeredSource ? requested.href : null);
  if (!title || !articleUrl) return null;
  if (/(?:访问验证|安全验证|验证码|访问受限|页面不存在|页面未找到|access denied|captcha|not found|^\s*404\b)/iu.test(title)) return null;
  let canonical: URL;
  try { canonical = new URL(articleUrl, requestedUrl); } catch { return null; }
  if (canonical.protocol !== "https:" || canonical.origin !== requested.origin || canonical.pathname === "/") return null;
  if (registeredSource && !registeredSource.articlePath.test(canonical.pathname)) return null;
  canonical.hash = ""; canonical.search = "";
  const sourceItemId = `${canonical.origin}${canonical.pathname}`;
  const publishedRaw = readMeta("property", "article:published_time") ?? readMeta("name", "pubdate");
  const published = publishedRaw && Number.isFinite(Date.parse(publishedRaw)) ? new Date(publishedRaw).toISOString() : null;
  const newsId = createHash("sha256").update(`${sourceId}:${sourceItemId}`).digest("hex").slice(0, 24);
  return { newsId, sourceId, sourceItemId, sourceUrl: sourceItemId, title, publishedAt: published, observedAt, ingestedAt, availableAt: ingestedAt, revision: 1, symbols: [] };
}

/** External HTTP transport adapter. Callers must enforce the source-authorization gate first. */
export class PublicSourceHttpAdapter {
  constructor(private readonly request: typeof fetch = fetch, private readonly now: () => Date = () => new Date()) {}

  private readonly newsInFlight = new Map<NewsSourceId, Promise<SourceNewsArticle | null>>();
  private readonly newsCache = new Map<NewsSourceId, { until: number; article: SourceNewsArticle | null }>();
  private readonly newsErrors = new Map<NewsSourceId, string>();
  newsError(sourceId: NewsSourceId): string | null { return this.newsErrors.get(sourceId) ?? null; }

  /** One listing plus at most three articles per source per 30 minutes; cache failures too. */
  async latestNews(sourceId: NewsSourceId, observedAt: string): Promise<SourceNewsArticle | null> {
    const cached = this.newsCache.get(sourceId);
    if (cached && cached.until > this.now().getTime()) return cached.article;
    const existing = this.newsInFlight.get(sourceId);
    if (existing) return existing;
    const pending = (async () => {
      let article: SourceNewsArticle | null = null;
      this.newsErrors.delete(sourceId);
      try {
        const html = await this.newsHtml(newsSources[sourceId].entry);
        for (const url of discoverSourceNewsArticles(sourceId, html)) {
          try {
            article = parseSourceNewsArticle(sourceId, url, await this.newsHtml(url), observedAt, this.now().toISOString());
            if (article) break;
          } catch (error) { this.newsErrors.set(sourceId, error instanceof Error ? error.message : "NEWS_REQUEST_FAILED"); }
        }
      } catch (error) { this.newsErrors.set(sourceId, error instanceof Error ? error.message : "NEWS_REQUEST_FAILED"); }
      if (article) this.newsErrors.delete(sourceId);
      else if (!this.newsErrors.has(sourceId)) this.newsErrors.set(sourceId, "NEWS_NO_VALID_ARTICLE");
      this.newsCache.set(sourceId, { until: this.now().getTime() + 30 * 60_000, article });
      return article;
    })();
    this.newsInFlight.set(sourceId, pending);
    try { return await pending; } finally { this.newsInFlight.delete(sourceId); }
  }

  private async newsHtml(url: string): Promise<string> {
    const response = await this.request(url, { redirect: "error", signal: AbortSignal.timeout(1500), headers: { "user-agent": "StockQuant-V2.1" } });
    if (!response.ok) throw new Error(`NEWS_HTTP_${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("NEWS_EMPTY_BODY");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength;
        if (size > 1_000_000) throw new Error("NEWS_RESPONSE_TOO_LARGE");
        chunks.push(next.value);
      }
    } finally { await reader.cancel(); }
    return new TextDecoder().decode(Buffer.concat(chunks));
  }

  async check(sourceId: string, url: string): Promise<PublicSourceCheck> {
    try {
      const response = await this.request(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } });
      const text = await response.text();
      return { sourceId, status: response.ok && text.length > 0 ? "PASS" : "FAIL", httpStatus: response.status, bytes: text.length };
    } catch (error) {
      return { sourceId, status: "FAIL", error: error instanceof Error ? error.message : "unknown" };
    }
  }

  async tencentQuotePreview(symbols: string[], ingestedAt = this.now().toISOString()): Promise<TencentQuotePreviewResult> {
    try {
      const codes = symbols.map((symbol) => `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`).join(",");
      const response = await this.request(`https://qt.gtimg.cn/q=${codes}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Tencent quote returned HTTP ${response.status}`);
      const securities = previewTencentQuotes(symbols, decodeTencentQuote(await response.arrayBuffer()), ingestedAt);
      return { sourceId: "tencent-quote", requestedSymbols: symbols, securities, count: securities.length, ingestedAt };
    } catch (error) {
      return { sourceId: "tencent-quote", requestedSymbols: symbols, status: "STALE", securities: symbols.map((symbol) => ({ symbol, price: null, name: null, status: "SOURCE_ERROR" as const, observedAt: null, ingestedAt })), count: 0, ingestedAt, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  async sinaQuotePreview(symbols: string[], ingestedAt = this.now().toISOString()): Promise<SinaQuotePreviewResult> {
    try {
      const codes = symbols.map((symbol) => {
        const match = /^(\d{6})\.(SH|SZ)$/u.exec(symbol);
        if (!match) throw new Error("SINA_QUOTE_INVALID_SECURITY_ID");
        return `${match[2] === "SH" ? "sh" : "sz"}${match[1]}`;
      }).join(",");
      const response = await this.request(`https://hq.sinajs.cn/list=${codes}`, {
        signal: AbortSignal.timeout(5000),
        headers: { "user-agent": "StockQuant-V2.1", referer: "https://finance.sina.com.cn/" },
      });
      if (!response.ok) throw new Error(`Sina quote returned HTTP ${response.status}`);
      const securities = previewSinaQuotes(symbols, decodeSinaQuote(await response.arrayBuffer()), ingestedAt);
      return { sourceId: "sina-quote", requestedSymbols: symbols, securities, count: securities.length, ingestedAt };
    } catch (error) {
      return { sourceId: "sina-quote", requestedSymbols: symbols, status: "STALE", securities: symbols.map((symbol) => ({ symbol, price: null, name: null, status: "SOURCE_ERROR" as const, observedAt: null, ingestedAt })), count: 0, ingestedAt, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  async liveNews(sourceId: string, url: string, observedAt: string): Promise<SourceNewsArticle | null> {
    try {
      const response = await this.request(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } });
      if (!response.ok) return null;
      const html = await response.text();
      return parseSourceNewsArticle(sourceId, response.url || url, html, observedAt, this.now().toISOString());
    } catch { return null; }
  }
}
