import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { migrateMarketDataSchema } from "../dist/adapters/postgres-schema-migrations.js";
import { PostgresNewsRevisionRepository } from "../dist/adapters/postgres-news-revision-repository.js";
import { PublicSourceHttpAdapter } from "../dist/adapters/public-source-http-adapter.js";
import { collectV21News } from "../dist/application/v21-news-collection.js";

assert.ok(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER?.startsWith("sq-test-postgres-"));
const root = resolve("../..");
const manifest = JSON.parse(await readFile(resolve(root, "fixtures/v2/v2.1-news-revisions/manifest.json"), "utf8"));
const bytes = await readFile(resolve(root, manifest.files[0].path));
assert.equal(createHash("sha256").update(bytes).digest("hex"), manifest.files[0].sha256);
const fixture = JSON.parse(bytes);
const pool = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
const calls = []; let revised = false; let failEastmoney = false;
let instant = new Date("2026-10-21T01:00:00.000Z");
const sourceIds = ["eastmoney-news", "cls-news"];
const articleUrls = { "eastmoney-news": "https://finance.eastmoney.com/a/123.html", "cls-news": "https://www.cls.cn/detail/123" };
// These are synthetic HTML templates generated from the frozen news Fixture.
// HTTP is injected, never sent to these real hostnames.
const request = async (input, options) => {
  const url = String(input); calls.push({ url, redirect: options.redirect });
  const source = url.includes("eastmoney") ? "eastmoney-news" : "cls-news";
  if (source === "eastmoney-news" && failEastmoney) return new Response("synthetic source unavailable", { status: 503 });
  if (url !== articleUrls[source]) return new Response(`<a href="${articleUrls[source]}">synthetic listing</a>`);
  const record = fixture.records[source === "eastmoney-news" ? revised ? 1 : 0 : 2];
  const html = `<meta property="og:type" content="article"><meta property="og:title" content="${record.title}"><link rel="canonical" href="${url}">${record.publishedAt ? `<meta property="article:published_time" content="${record.publishedAt}">` : ""}`;
  return new Response(html);
};
try {
  await migrateMarketDataSchema(pool);
  const repository = new PostgresNewsRevisionRepository(pool);
  const adapter = new PublicSourceHttpAdapter(request, () => instant);
  const collect = () => collectV21News(sourceIds, (source) => adapter.latestNews(source, instant.toISOString()), (article) => repository.append(article));
  const first = await collect(); assert.equal(first.status, "PASS"); assert.equal(first.items.length, 2);
  await collect(); assert.equal(calls.length, 4, "same-window reads must reuse the per-source cache");
  revised = true; instant = new Date("2026-10-21T01:31:00.000Z");
  const updated = await collect(); assert.equal(updated.status, "PASS"); assert.equal(updated.items.length, 1);
  assert.equal(updated.deduplicated, true); assert.equal(updated.items[0].sourceArticles.length, 2);
  const revisions = await repository.list("eastmoney-news", articleUrls["eastmoney-news"]);
  assert.equal(revisions.length, 2); assert.equal(revisions[1].revision, 2); assert.equal(revisions[1].supersedesRevision, 1);
  assert.equal((await repository.list("cls-news", articleUrls["cls-news"]))[0].publishedAt, null);
  failEastmoney = true; instant = new Date("2026-10-21T02:02:00.000Z");
  const partial = await collect(); assert.equal(partial.status, "PARTIAL"); assert.deepEqual(partial.sourceFailures, ["eastmoney-news"]);
  assert.equal(partial.items[0].sourceId, "cls-news");
  assert.equal((await repository.list("eastmoney-news", articleUrls["eastmoney-news"])).length, 2, "failure must preserve revision history");
  await pool.end();
  const restarted = new Pool({ connectionString: process.env.MARKET_DATA_DATABASE_URL });
  try { assert.equal((await new PostgresNewsRevisionRepository(restarted).list("eastmoney-news", articleUrls["eastmoney-news"]))[1].supersedesRevision, 1); }
  finally { await restarted.end(); }
  const testRunId = randomUUID();
  const report = { status: "PASS", testRunId, dataMode: "SYNTHETIC_HTTP_REAL_POSTGRESQL", externalRequests: 0,
    environment: { node: process.version, hostPlatform: process.platform, hostArchitecture: process.arch, postgresContainer: process.env.STOCKQUANT_ISOLATED_PG_CONTAINER },
    codeSha256: Object.fromEntries(await Promise.all(["scripts/news-collection-persistence-smoke.mjs", "src/adapters/public-source-http-adapter.ts", "src/application/v21-news-collection.ts", "src/adapters/postgres-news-revision-repository.ts", "src/bootstrap/main.ts"].map(async (path) => [path, createHash("sha256").update(await readFile(path)).digest("hex")]))),
    fixtureVersion: manifest.fixtureVersion, fixtureSha256: manifest.files[0].sha256,
    transformation: "synthetic og:article HTML using frozen titles/publication fields; source IDs mapped to registered candidate hosts; no actual page was downloaded",
    assertions: { twoSources: true, listingToArticle: true, repeatIdempotency: true, revisionSupersedes: true,
      crossSourceReferences: true, unknownPublicationTime: true, singleSourceFailureIsolation: true, freshConnectionReadback: true },
    calls, humanAcceptance: "NOT_RUN", realProviderCapability: "NOT_RUN_OD008" };
  const directory = resolve(root, "evidence/local/V2.1", testRunId); await mkdir(directory, { recursive: true });
  const serialized = JSON.stringify(report, null, 2) + "\n";
  await writeFile(resolve(directory, "news-collection.json"), serialized, { flag: "wx" });
  await writeFile(resolve(directory, "manifest.sha256"), createHash("sha256").update(serialized).digest("hex") + "  news-collection.json\n", { flag: "wx" });
  console.log(JSON.stringify({ ...report, evidenceDirectory: directory }));
} finally { if (!pool.ended) await pool.end(); }
