import { createHash } from "node:crypto";
import { decodeTencentQuote, previewTencentQuotes } from "../application/tencent-quote-preview.js";

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

/** External HTTP transport adapter. Callers must enforce the source-authorization gate first. */
export class PublicSourceHttpAdapter {
  constructor(private readonly request: typeof fetch = fetch, private readonly now: () => Date = () => new Date()) {}

  async check(sourceId: string, url: string): Promise<PublicSourceCheck> {
    try {
      const response = await this.request(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } });
      const text = await response.text();
      return { sourceId, status: response.ok && text.length > 0 ? "PASS" : "FAIL", httpStatus: response.status, bytes: text.length };
    } catch (error) {
      return { sourceId, status: "FAIL", error: error instanceof Error ? error.message : "unknown" };
    }
  }

  async tencentQuotePreview(symbols: string[]): Promise<TencentQuotePreviewResult> {
    const ingestedAt = this.now().toISOString();
    try {
      const codes = symbols.map((symbol) => `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`).join(",");
      const response = await this.request(`https://qt.gtimg.cn/q=${codes}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Tencent quote returned HTTP ${response.status}`);
      const securities = previewTencentQuotes(symbols, decodeTencentQuote(await response.arrayBuffer()), ingestedAt);
      return { sourceId: "tencent-quote", requestedSymbols: symbols, securities, count: securities.length, ingestedAt };
    } catch (error) {
      return { sourceId: "tencent-quote", requestedSymbols: symbols, status: "STALE", securities: symbols.map((symbol) => ({ symbol, price: 0, name: null, status: "SOURCE_ERROR" as const, observedAt: null, ingestedAt })), count: 0, ingestedAt, error: error instanceof Error ? error.message : "unknown" };
    }
  }

  async liveNews(sourceId: string, url: string, observedAt: string) {
    try {
      const response = await this.request(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } });
      const html = await response.text();
      const match = html.match(/<title[^>]*>\s*([^<]{3,200})\s*<\/title>/i);
      if (!response.ok || !match) return null;
      const title = match[1].replace(/\s+/g, " ").trim();
      return { newsId: createHash("sha256").update(`${sourceId}:${title}`).digest("hex").slice(0, 24), sourceId, title, publishedAt: null, observedAt, ingestedAt: observedAt, availableAt: observedAt, revision: 1, symbols: [] as string[] };
    } catch { return null; }
  }
}
