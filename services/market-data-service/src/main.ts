import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";

type Bar = { securityId: string; ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number; adjustment: "raw" };
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");
const minuteFixture = resolve(root, "fixtures/v2/v2.2/minute_bars.csv");
const minuteBadFixture = resolve(root, "fixtures/v2/v2.2/minute_bars_bad.csv");
const artifactTasks = new Map<string, { status: "RUNNING" | "CANCELLED" | "PUBLISHED"; artifactId?: string }>();
const minuteImports = new Map<string, { importId: string; version: string; status: string; accepted: number; errors: unknown[]; sha256: string }>();
let watchlist: string[] = ["600000.SH", "000001.SZ", "600519.SH"];
let samplingMinutes = 30;
const sourceState = new Map<string, { status: "HEALTHY" | "OPEN"; failures: number }>;
for (const id of ["tencent-quote", "sina-quote", "eastmoney-news", "cls-news"]) sourceState.set(id, { status: "HEALTHY", failures: 0 });

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
    ].map((source) => ({ ...source, circuit: sourceState.get(source.sourceId)?.status ?? "HEALTHY" })), checkedAt: new Date().toISOString(), note: "Endpoint capability is verified by configured URL; production licensing and rate limits remain deployment checks." });
    if (req.url === "/v2/sampling" && req.method === "GET") return json(res, { intervalMinutes: samplingMinutes, allowed: [20, 30], tradingWindows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], lunchBreak: ["11:30", "13:00"], placeOrders: false });
    if (req.url === "/v2/sampling" && req.method === "PUT") { const body = JSON.parse(await readBody(req)); const value = Number(body.intervalMinutes); if (![20, 30].includes(value)) return json(res, { code: "INVALID_SAMPLING_INTERVAL", allowed: [20, 30] }, 422); samplingMinutes = value; return json(res, { intervalMinutes: samplingMinutes, placeOrders: false }); }
    const breakerMatch = req.url?.match(/^\/v2\/sources\/([^/]+)\/(fail|recover)$/);
    if (breakerMatch && req.method === "POST") { const state = sourceState.get(breakerMatch[1]); if (!state) return json(res, { code: "SOURCE_NOT_FOUND" }, 404); if (breakerMatch[2] === "fail") { state.failures += 1; state.status = "OPEN"; } else { state.failures = 0; state.status = "HEALTHY"; } return json(res, { sourceId: breakerMatch[1], circuit: state.status, failures: state.failures }); }
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
    if (req.url === "/v2/news/live" && req.method === "GET") {
      const observedAt = new Date().toISOString();
      const results = await Promise.all([
        liveNews("eastmoney-news", "https://finance.eastmoney.com/", observedAt),
        liveNews("cls-news", "https://www.cls.cn/", observedAt)
      ]);
      const items = results.filter((item): item is NonNullable<typeof item> => item !== null);
      const deduplicated = [...new Map(items.map((item) => [`${item.title}|${item.sourceId}`, item])).values()];
      return json(res, { observedAt, items: deduplicated, sourceCount: 2, deduplicated: deduplicated.length === items.length, status: deduplicated.length === 2 ? "PASS" : "PARTIAL" });
    }
    if (req.url === "/v2/minute/preview" && req.method === "GET") { const bars = await parseMinute(minuteFixture); return json(res, { fixtureVersion: "v2.2-minute-bars-1", rows: bars.length, securities: new Set(bars.map((bar) => bar.securityId)).size, quality: minuteQuality(bars), bars }); }
    if (req.url === "/v2/minute/import" && req.method === "POST") { const body = JSON.parse(await readBody(req)); const file = body.fixture === "bad" ? minuteBadFixture : minuteFixture; const content = await readFile(file); const sha256 = createHash("sha256").update(content).digest("hex"); const existing = [...minuteImports.values()].find((item) => item.sha256 === sha256); if (existing) return json(res, { ...existing, idempotent: true }); const bars = await parseMinute(file); const errors = minuteQuality(bars); const accepted = errors.length ? 0 : bars.length; const result = { importId: `minute-import-${Date.now()}`, version: `v2.2-import-${sha256.slice(0, 12)}`, status: errors.length ? "REJECTED" : "PUBLISHED", accepted, errors, sha256 }; minuteImports.set(result.version, result); return json(res, { ...result, idempotent: false }, errors.length ? 422 : 201); }
    const minuteGet = req.url?.match(/^\/v2\/minute\/imports\/([^/]+)$/); if (minuteGet && req.method === "GET") { const result = minuteImports.get(minuteGet[1]); if (!result) return json(res, { code: "NOT_FOUND" }, 404); return json(res, result); }
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
type MinuteBar = { securityId: string; market: string; frequency: string; barStart: string; barEnd: string; availableAt: string; open: number; high: number; low: number; close: number; volume: number; amount: number; adjustment: string };
async function parseMinute(path: string): Promise<MinuteBar[]> { const lines = (await readFile(path, "utf8")).trim().split(/\r?\n/).slice(1); return lines.map((line) => { const [securityId, market, frequency, barStart, barEnd, availableAt, open, high, low, close, volume, amount, adjustment] = line.split(","); return { securityId, market, frequency, barStart, barEnd, availableAt, open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume), amount: Number(amount), adjustment }; }); }
function minuteQuality(bars: MinuteBar[]) { const errors: Array<Record<string, unknown>> = []; const seen = new Set<string>(); for (const [index, bar] of bars.entries()) { const key = `${bar.securityId}|${bar.barStart}`; if (seen.has(key)) errors.push({ code: "DUPLICATE_CONFLICT", row: index + 2, key }); seen.add(key); if (!(bar.high >= bar.low && bar.high >= bar.open && bar.high >= bar.close && bar.low <= bar.open && bar.low <= bar.close)) errors.push({ code: "OHLC_INVALID", row: index + 2 }); const time = bar.barStart.slice(11, 16); if ((time >= "11:30" && time < "13:00") || time < "09:30" || time >= "15:00") errors.push({ code: "NON_TRADING_SESSION", row: index + 2, time }); if (bar.volume < 0 || bar.amount < 0) errors.push({ code: "UNIT_INVALID", row: index + 2 }); } return errors; }
async function sourceCheck(sourceId: string, url: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } }); const text = await response.text(); return { sourceId, status: response.ok && text.length > 0 ? "PASS" : "FAIL", httpStatus: response.status, bytes: text.length }; } catch (error) { return { sourceId, status: "FAIL", error: error instanceof Error ? error.message : "unknown" }; } }
async function liveNews(sourceId: string, url: string, observedAt: string) { try { const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { "user-agent": "StockQuant-V2.1" } }); const html = await response.text(); const match = html.match(/<title[^>]*>\s*([^<]{3,200})\s*<\/title>/i); if (!response.ok || !match) return null; const title = match[1].replace(/\s+/g, " ").trim(); return { newsId: createHash("sha256").update(`${sourceId}:${title}`).digest("hex").slice(0, 24), sourceId, title, publishedAt: null, observedAt, ingestedAt: observedAt, availableAt: observedAt, revision: 1, symbols: [] as string[] }; } catch { return null; } }
server.listen(Number(process.env.STOCKQUANT_PORT ?? 3002), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
