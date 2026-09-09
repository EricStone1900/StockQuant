import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";

type Bar = { securityId: string; ticker: string; date: string; open: number; high: number; low: number; close: number; volume: number; adjustment: "raw" };
const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
const fixture = resolve(root, "fixtures/v1/v1.2/cn_daily.csv");
const badFixture = resolve(root, "fixtures/v1/v1.2/cn_daily_bad_future.csv");

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
    if (req.url === "/v1/fixtures/normal/preview") { const bars = await parse(fixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", barCount: bars.length, securityCount: new Set(bars.map((b)=>b.securityId)).size, quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/fixtures/bad-future/preview") { const bars = await parse(badFixture); return json(res, { fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE", quality: quality(bars, "2024-12-31"), bars }); }
    if (req.url === "/v1/artifacts/normal/publish" && req.method === "POST") { const content = await readFile(fixture); return json(res, { artifactId: "artifact-v1.2-cn-daily-1", status: "PUBLISHED", immutable: true, sha256: createHash("sha256").update(content).digest("hex"), fixtureVersion: "v1.2-market-data-1" }); }
    return json(res, { code: "NOT_FOUND", message: "route not found" }, 404);
  } catch (error) { return json(res, { code: "INTERNAL", message: error instanceof Error ? error.message : "unknown" }, 500); }
});
server.listen(Number(process.env.STOCKQUANT_PORT ?? 3002), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
