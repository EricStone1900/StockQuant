import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { Pool } from "pg";

assert.ok(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER?.startsWith("sq-test-postgres-"));
assert.ok(process.env.MARKET_DATA_DATABASE_URL, "MARKET_DATA_DATABASE_URL is required");
const root = resolve("../..");
const port = 32000 + Number.parseInt(randomBytes(2).toString("hex"), 16) % 2000;
const token = `local-learning-${randomBytes(18).toString("hex")}`;
const base = `http://127.0.0.1:${port}`;
const headers = { authorization: `Bearer ${token}` };
const service = spawn(process.execPath, ["dist/bootstrap/main.js"], {
  cwd: process.cwd(),
  env: {
    ...process.env, STOCKQUANT_PROJECT_ROOT: root, STOCKQUANT_PORT: String(port), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_DATABASE_URL: process.env.MARKET_DATA_DATABASE_URL, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token,
    STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_MARKET_QUOTE_SOURCE_AUTHORIZATION_REF: "OD-008-local-learning-2026-10-21", STOCKQUANT_MARKET_QUOTE_DATA_VERSION: "local-learning-probe-2026-10-21", STOCKQUANT_MARKET_QUOTE_AUTHORIZED_SOURCE_IDS: "tencent-quote",
    STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_MARKET_NEWS_SOURCE_AUTHORIZATION_REF: "OD-008-local-learning-2026-10-21", STOCKQUANT_MARKET_NEWS_DATA_VERSION: "local-learning-probe-2026-10-21", STOCKQUANT_MARKET_NEWS_AUTHORIZED_SOURCE_IDS: "eastmoney-news,cls-news",
    STOCKQUANT_SAMPLING_TASK_WORKER: "0", STOCKQUANT_DAILY_BAR_WORKER: "0", STOCKQUANT_DAILY_BAR_SCHEDULER: "0", STOCKQUANT_ARTIFACT_TASK_EXECUTOR: "0", STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0",
  }, stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
service.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
async function waitForReady() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (service.exitCode !== null) throw new Error(`market-data service exited before readiness: ${stderr}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`market-data service did not become ready: ${stderr}`);
}
function compactQuote(body) { return { sourceId: body.sourceId, requestedSymbols: body.requestedSymbols, count: body.count, status: body.status ?? "RECEIVED", securities: (body.securities ?? []).map((item) => ({ symbol: item.symbol, status: item.status, observedAt: item.observedAt, ingestedAt: item.ingestedAt, hasPrice: typeof item.price === "number", hasName: typeof item.name === "string" && item.name.length > 0 })) }; }
function storedTitleSha256(title) { return createHash("sha256").update(title.trim().normalize("NFKC")).digest("hex"); }
function compactNews(body) { return { status: body.status, sourceFailures: body.sourceFailures ?? [], items: (body.items ?? []).map((item) => ({ sourceId: item.sourceId, sourceIds: item.sourceIds, sourceItemId: item.sourceItemId, sourceUrl: item.sourceUrl, titleSha256: storedTitleSha256(item.title), publishedAt: item.publishedAt, observedAt: item.observedAt, revision: item.revision })) }; }
async function requestJson(path, options = {}) { const response = await fetch(`${base}${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } }); const text = await response.text(); return { status: response.status, body: text ? JSON.parse(text) : null }; }
const report = { status: "PARTIAL", testRunId: randomUUID(), purpose: "PERSONAL_LOCAL_NONCOMMERCIAL_LEARNING", dataMode: "LIVE_SOURCE_BOUNDED_PROBE", boundaries: { quoteRequest: "one Tencent request for exactly two securities", newsRequests: "per source one listing plus at most three candidate articles; no page body is stored", retention: "metadata only, default 30 days; this disposable probe database is removed after the run", sharing: "none", excluded: ["minute collection", "historical research", "strategy", "orders", "real broker"] }, environment: { node: process.version, hostPlatform: process.platform, hostArchitecture: process.arch, postgresContainer: process.env.STOCKQUANT_ISOLATED_PG_CONTAINER }, codeSha256: {}, requests: { quote: 0, newsListingOrArticleMaximum: 8 }, quote: null, news: null, persistedNews: [], limitations: [], humanAcceptance: "NOT_RUN" };
try {
  await waitForReady();
  const watchlist = await requestJson("/v2/watchlist", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: ["600000.SH", "000001.SZ"] }) }); assert.equal(watchlist.status, 200, "two-security watchlist must be accepted");
  const quote = await requestJson("/v2/quote/preview"); report.requests.quote = 1; report.quote = { httpStatus: quote.status, ...compactQuote(quote.body ?? {}) };
  if (quote.status !== 200 || quote.body?.count !== 2 || quote.body?.securities?.some((item) => item.status !== "LIVE_SOURCE")) report.limitations.push("tencent-quote did not return two parseable current quote records");
  const news = await requestJson("/v2/news/live"); report.news = { httpStatus: news.status, ...compactNews(news.body ?? {}) };
  if (news.status !== 200) report.limitations.push("news route did not complete");
  for (const sourceId of ["eastmoney-news", "cls-news"]) if (!(news.body?.items ?? []).some((item) => item.sourceIds?.includes(sourceId) || item.sourceId === sourceId)) report.limitations.push(`${sourceId} yielded no eligible article metadata`);
  const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  try { const rows = await pool.query("SELECT source_id, source_item_id, source_url, published_at, observed_at, revision, title FROM market_data_news_revisions ORDER BY source_id, revision"); report.persistedNews = rows.rows.map((row) => ({ sourceId: row.source_id, sourceItemId: row.source_item_id, sourceUrl: row.source_url, publishedAt: row.published_at, observedAt: row.observed_at, revision: row.revision, titleSha256: storedTitleSha256(row.title) })); } finally { await pool.end(); }
  if (report.persistedNews.length === 0) report.limitations.push("no live article metadata was persisted"); report.status = report.limitations.length === 0 ? "PASS" : "PARTIAL";
  for (const item of report.news?.items ?? []) if (!report.persistedNews.some((stored) => stored.sourceId === item.sourceId && stored.sourceItemId === item.sourceItemId && stored.titleSha256 === item.titleSha256 && stored.revision === item.revision)) report.limitations.push(`persisted metadata did not match ${item.sourceId}`);
  report.status = report.limitations.length === 0 ? "PASS" : "PARTIAL";
} finally {
  if (service.exitCode === null) { service.kill("SIGTERM"); await Promise.race([once(service, "exit"), new Promise((resolveDelay) => setTimeout(resolveDelay, 3_000))]); }
  if (service.exitCode === null) service.kill("SIGKILL");
}
report.codeSha256 = Object.fromEntries(await Promise.all(["scripts/local-learning-source-probe.mjs", "src/adapters/public-source-http-adapter.ts", "src/application/v21-news-collection.ts", "src/bootstrap/main.ts"].map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")])));
const directory = resolve(root, "evidence/local/V2.1", report.testRunId); await mkdir(directory, { recursive: true }); const serialized = JSON.stringify(report, null, 2) + "\n";
await writeFile(resolve(directory, "local-learning-source-probe.json"), serialized, { flag: "wx" }); await writeFile(resolve(directory, "manifest.sha256"), `${createHash("sha256").update(serialized).digest("hex")}  local-learning-source-probe.json\n`, { flag: "wx" });
console.log(JSON.stringify({ status: report.status, evidenceDirectory: directory, quote: report.quote, news: report.news, persistedNews: report.persistedNews, limitations: report.limitations })); process.exitCode = report.status === "PASS" ? 0 : 2;
