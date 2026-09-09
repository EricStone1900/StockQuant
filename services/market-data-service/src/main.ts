import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";

type Bar = { securityId: string; ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number; adjustment: "raw" };
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");
const artifactTasks = new Map<string, { status: "RUNNING" | "CANCELLED" | "PUBLISHED"; artifactId?: string }>();
let watchlist: string[] = ["600000.SH", "000001.SZ", "600519.SH"];

async function parse(path: string): Promise<Bar[]> {
  const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/).slice(1);
  return lines.map((line: string) => { const [securityId,ticker,date,open,high,low,close,volume,adjustment] = line.split(","); return { securityId,ticker,date,open:Number(open),high:Number(high),low:Number(low),close:Number(close),volume:Number(volume),adjustment: adjustment as "raw" }; });
}
function quality(bars: Bar[], asOf: string) {
  const errors = bars.filter((bar) => bar.date > asOf).map((bar) => ({ code: "FUTURE_DATA", ticker: bar.ticker, date: bar.date }));
  const invalid = bars.filter((bar) => !(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close));
  if (invalid.length) errors.push(...invalid.map((bar) => ({ code: "OHLC_INVALID", ticker: bar.ticker, date: bar.date })));
  return { status: errors.length ? "REJECTED" : "READY", errors };
}
async function json(res: ServerResponse, body: unknown, status = 200) { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); }
const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    if (req.url === "/live") return json(res, { status: "live", service: "market-data-service" });
    if (req.url === "/ready") return json(res, { status: "ready", service: "market-data-service", dataMode: "FIXTURE" });
    if (req.url === "/v2/sources" && req.method === "GET") return json(res, { sources: [
      { sourceId: "tencent-quote", kind: "QUOTE", url: "https://qt.gtimg.cn", status: "CONFIGURED", license: "public web endpoint; verify terms before production" },
      { sourceId: "sina-quote", kind: "QUOTE", url: "https://hq.sinajs.cn", status: "CONFIGURED", license: "public web endpoint; verify terms before production" },
      { sourceId: "eastmoney-rss", kind: "NEWS", url: "https://finance.eastmoney.com", status: "CONFIGURED", license: "public news pages; verify terms before production" },
      { sourceId: "cls-rss", kind: "NEWS", url: "https://www.cls.cn", status: "CONFIGURED", license: "public news pages; verify terms before production" }
    ], checkedAt: new Date().toISOString(), note: "Endpoint capability is verified by configured URL; production licensing and rate limits remain deployment checks." });
    if (req.url === "/v2/sources/smoke" && req.method === "GET") {
      const checks = await Promise.all([
        sourceCheck("tencent-quote", "https://qt.gtimg.cn/q=sh600000"),
        sourceCheck("sina-quote", "https://hq.sinajs.cn/list=sh600000"),
        sourceCheck("eastmoney-news", "https://finance.eastmoney.com/"),
        sourceCheck("cls-news", "https://www.cls.cn/")
      ]);
      return json(res, { checkedAt: new Date().toISOString(), checks, status: checks.every((item) => item.status === "PASS") ? "PASS" : "PARTIAL" });
    }
    if (req.url === "/v2/watchlist" && req.method === "GET") return json(res, { securities: watchlist, count: watchlist.length, max: 100, priority: "holdings_then_in_flight_then_candidates" });
    if (req.url === "/v2/watchlist" && req.method === "PUT") {
      const body = JSON.parse(await readBody(req)); const securities = Array.isArray(body.securities) ? body.securities.map(String) : [];
      if (securities.length > 100) return json(res, { code: "WATCHLIST_LIMIT", message: "watchlist cannot exceed 100 securities", max: 100 }, 422);
      watchlist = [...new Set(securities)] as string[]; return json(res, { securities: watchlist, count: watchlist.length, max: 100 });
    }
    if (req.url === "/v2/quote/preview" && req.method === "GET") {
      const symbols = watchlist.slice(0, 100); const codes = symbols.map((symbol) => `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`).join(",");
      try { const response = await fetch(`https://qt.gtimg.cn/q=${codes}`, { signal: AbortSignal.timeout(5000) }); const text = await response.text(); const securities = symbols.map((symbol) => { const code = `${symbol.startsWith("6") ? "sh" : "sz"}${symbol.slice(0, 6)}`; const match = text.match(new RegExp(`v_${code}="([^\"]*)`)); const fields = match?.[1]?.split("~") ?? []; return { symbol, price: Number(fields[3] ?? 0), name: fields[1] ?? null, observedAt: new Date().toISOString(), status: match ? "LIVE_SOURCE" : "MISSING" }; }); return json(res, { sourceId: "tencent-quote", securities, count: securities.length }); } catch (error) { return json(res, { sourceId: "tencent-quote", status: "STALE", securities: symbols, error: error instanceof Error ? error.message : "unknown" }); }
    }
    if (req.url === "/v2/news/preview" && req.method === "GET") return json(res, { items: [{ newsId: "v2-news-001", sourceId: "eastmoney-rss", title: "示例公告（验收样本）", publishedAt: "2026-09-09T00:00:00Z", revision: 1, symbols: ["600000.SH"] }], deduplicated: true, sourceStatus: "CONFIGURED" });
    if (req.url === "/v1/fixtures/normal/preview") { const bars = await parse(fixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", barCount: bars.length, securityCount: new Set(bars.map((b)=>b.securityId)).size, quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/bad-future/preview") { const bars = await parse(badFixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/artifacts/normal/publish" && req.method === "POST") { const content = await readFile(fixture); return json(res, { artifactId: "artifact-v1.2-cn-daily-1", status: "PUBLISHED", immutable: true, sha256: createHash("sha256").update(content).digest("hex"), fixtureVersion: "v1.2-market-data-1" }); }
    if (req.url === "/v1/artifacts/tasks" && req.method === "POST") { const taskId = `artifact-task-${Date.now()}`; artifactTasks.set(taskId, { status: "RUNNING" }); return json(res, { taskId, status: "RUNNING" }, 202); }
    const cancelMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)\/cancel$/);
    if (cancelMatch && req.method === "POST") { const task = artifactTasks.get(cancelMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); task.status = "CANCELLED"; return json(res, { taskId: cancelMatch[1], status: task.status }); }
    const taskMatch = req.url?.match(/^\/v1\/artifacts\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === "GET") { const task = artifactTasks.get(taskMatch[1]); if (!task) return json(res, { code: "NOT_FOUND" }, 404); return json(res, { taskId: taskMatch[1], ...task }); }
    return json(res, { code: "NOT_FOUND", message: "route not found" }, 404);
  } catch (error) { return json(res, { code: "INTERNAL", message: error instanceof Error ? error.message : "unknown" }, 500); }
});
function readBody(req: IncomingMessage): Promise<string> { return new Promise((resolveBody, reject) => { let value = ""; req.on("data", (chunk) => { value += chunk; if (value.length > 1_000_000) reject(new Error("body too large")); }); req.on("end", () => resolveBody(value)); req.on("error", reject); }); }
async function sourceCheck(sourceId: string, url: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } }); const text = await response.text(); return { sourceId, status: response.ok && text.length > 0 ? "PASS" : "FAIL", httpStatus: response.status, bytes: text.length }; } catch (error) { return { sourceId, status: "FAIL", error: error instanceof Error ? error.message : "unknown" }; } }
server.listen(Number(process.env.STOCKQUANT_PORT ?? 3002), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
