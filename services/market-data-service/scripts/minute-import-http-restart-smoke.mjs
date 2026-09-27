import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { Pool } from "pg";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(serviceRoot, "../..");
const databaseUrl = process.env.MARKET_DATA_DATABASE_URL ?? "postgresql://market_data_test@127.0.0.1:5433/market_data_test";
if (decodeURIComponent(new URL(databaseUrl).pathname.slice(1)) !== "market_data_test") throw new Error("minute import HTTP smoke requires the dedicated market_data_test database");
const fixtureRoot = resolve(repositoryRoot, "fixtures/v2/v2.2");
const csvFixturePath = resolve(repositoryRoot, "fixtures/v2/v2.2-csv-smoke/minute-upload.csv");
const fixtureBytes = await Promise.all(["minute_bars.csv", "minute_bars_bad.csv"].map((name) => readFile(resolve(fixtureRoot, name))));
const hashes = fixtureBytes.map((bytes) => createHash("sha256").update(bytes).digest("hex"));
const csvBytes = await readFile(csvFixturePath);
const csvContent = csvBytes.toString("utf8");
const csvHash = createHash("sha256").update(csvContent, "utf8").digest("hex");
if (csvHash !== "86a4fcbb29d97f27925753c132c8d95ee1971c5f1c7583da6be2278be1c747d8") throw new Error("frozen CSV smoke Fixture hash changed; create a new Fixture version instead");
const badCsvContent = await readFile(resolve(repositoryRoot, "fixtures/v2/v2.2-csv-smoke/minute-upload-bad.csv"), "utf8");
const badCsvHash = createHash("sha256").update(badCsvContent, "utf8").digest("hex");
if (badCsvHash !== "51b926315d8db3df8d74e8979ca37b05cc3beedd78c15cb4d5ad03d0226f3838") throw new Error("frozen bad CSV smoke Fixture hash changed; create a new Fixture version instead");
const pool = new Pool({ connectionString: databaseUrl });
let preexisting = [null, null, null];
let migrationsReady = false;
let child;
let output = "";

const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close((error) => error ? reject(error) : resolvePort(address.port));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;

function startService() {
  output = "";
  child = spawn(process.execPath, [resolve(serviceRoot, "dist/main.js")], {
    cwd: serviceRoot,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin",
      HOME: process.env.HOME ?? "/tmp",
      STOCKQUANT_PROJECT_ROOT: repositoryRoot,
      STOCKQUANT_BIND_HOST: "127.0.0.1",
      STOCKQUANT_PORT: String(port),
      STOCKQUANT_DATABASE_URL: databaseUrl,
      STOCKQUANT_COLLECTION_SOURCES: "",
      ...marketDataSmokeAuthEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => { if (output.length < 12_000) output += chunk.toString().slice(0, 12_000 - output.length); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
}

async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`temporary market-data service exited early: ${output}`);
    try { if ((await fetch(`${baseUrl}/ready`)).ok) return; } catch { /* database migrations and listener are starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`temporary market-data service did not become ready: ${output}`);
}

async function stopService() {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "close");
  }
}

async function jsonResponse(response) { return response.json(); }

try {
  startService();
  await waitReady();
  migrationsReady = true;
  const allHashes = [...hashes, csvHash, badCsvHash];
  const existingRows = await pool.query("SELECT source_sha256 FROM market_data_minute_imports WHERE source_sha256=ANY($1::text[])", [allHashes]);
  preexisting = allHashes.map((hash) => existingRows.rows.some((row) => row.source_sha256 === hash));

  const firstResponse = await fetch(`${baseUrl}/v2/minute/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify({ fixture: "normal" }) });
  if (firstResponse.status !== (preexisting[0] ? 200 : 201)) throw new Error(`normal import returned unexpected HTTP ${firstResponse.status}`);
  const first = await jsonResponse(firstResponse);
  if (first.status !== "PUBLISHED" || first.accepted !== 6 || first.sha256 !== hashes[0]) throw new Error(`normal import result mismatch: ${JSON.stringify(first)}`);
  const firstPageResponse = await fetch(`${baseUrl}/v2/minute/imports/${encodeURIComponent(first.version)}/bars?cursor=0&pageSize=2`, { headers: marketDataSmokeAuthHeaders });
  if (!firstPageResponse.ok) throw new Error(`first persistent minute page returned HTTP ${firstPageResponse.status}`);
  const firstPage = await jsonResponse(firstPageResponse);
  if (firstPage.items.length !== 2 || firstPage.nextCursor !== "2") throw new Error("first minute page did not return a durable two-row page and cursor");

  const rejectedResponse = await fetch(`${baseUrl}/v2/minute/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify({ fixture: "bad" }) });
  if (rejectedResponse.status !== (preexisting[1] ? 200 : 422)) throw new Error(`bad import returned unexpected HTTP ${rejectedResponse.status}`);
  const rejected = await jsonResponse(rejectedResponse);
  if (rejected.status !== "REJECTED" || rejected.accepted !== 0 || rejected.sha256 !== hashes[1]) throw new Error(`bad import result mismatch: ${JSON.stringify(rejected)}`);

  const mapping = { securityId: "code", timestamp: "time", open: "o", high: "h", low: "l", close: "c", volume: "vol", amount: "amt" };
  const semantics = { content: csvContent, mapping, provenance: { sourceName: "minute-import-http-restart-smoke", sourceReference: null, licenseStatement: "Synthetic frozen integration fixture", licenseVerification: "OPERATOR_CONFIRMED", acquiredAt: "2026-09-25T00:00:00.000Z" }, market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" };
  const previewResponse = await fetch(`${baseUrl}/v2/minute/csv/preview`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(semantics) });
  const preview = await jsonResponse(previewResponse);
  if (!previewResponse.ok || preview.acceptedRows !== 2 || preview.errors.length !== 0 || preview.bars[0].securityId !== "600000.SH") throw new Error(`CSV preview failed: ${JSON.stringify(preview)}`);
  const csvImportResponse = await fetch(`${baseUrl}/v2/minute/csv/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(semantics) });
  const csvImport = await jsonResponse(csvImportResponse);
  if (csvImportResponse.status !== (preexisting[2] ? 200 : 201) || csvImport.status !== "PUBLISHED" || csvImport.accepted !== 2 || csvImport.sha256 !== csvHash) throw new Error(`CSV import failed: ${JSON.stringify(csvImport)}`);
  const csvRetryResponse = await fetch(`${baseUrl}/v2/minute/csv/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(semantics) });
  const csvRetry = await jsonResponse(csvRetryResponse);
  if (csvRetryResponse.status !== 200 || csvRetry.idempotent !== true || csvRetry.version !== csvImport.version) throw new Error("identical CSV retry was not idempotent");
  const badSemantics = { ...semantics, content: badCsvContent };
  const badPreview = await fetch(`${baseUrl}/v2/minute/csv/preview`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(badSemantics) }).then(jsonResponse);
  if (badPreview.acceptedRows !== 0 || !badPreview.errors.some((error) => error.row === 2 && error.code === "OHLC_INVALID") || !badPreview.errors.some((error) => error.row === 2 && error.code === "NON_TRADING_SESSION")) throw new Error(`bad CSV row was not correctly rejected: ${JSON.stringify(badPreview.errors)}`);
  const badImportResponse = await fetch(`${baseUrl}/v2/minute/csv/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(badSemantics) });
  const badImport = await jsonResponse(badImportResponse);
  if (badImportResponse.status !== (preexisting[3] ? 200 : 422) || badImport.status !== "REJECTED" || badImport.accepted !== 0 || badImport.sha256 !== badCsvHash) throw new Error(`bad CSV was not durably rejected: ${JSON.stringify(badImport)}`);

  await stopService();
  startService();
  await waitReady();
  const detailsResponse = await fetch(`${baseUrl}/v2/minute/imports/${encodeURIComponent(first.version)}`, { headers: marketDataSmokeAuthHeaders });
  const details = await jsonResponse(detailsResponse);
  if (!detailsResponse.ok || details.status !== "PUBLISHED" || details.sha256 !== hashes[0]) throw new Error("normal import metadata did not survive a service process restart");
  const recoveredPages = [];
  let cursor = 0;
  do {
    const response = await fetch(`${baseUrl}/v2/minute/imports/${encodeURIComponent(first.version)}/bars?cursor=${cursor}&pageSize=2`, { headers: marketDataSmokeAuthHeaders });
    if (!response.ok) throw new Error(`recovered minute page returned HTTP ${response.status}`);
    const page = await jsonResponse(response);
    recoveredPages.push(...page.items);
    cursor = page.nextCursor === null ? null : Number(page.nextCursor);
    if (cursor !== null && !Number.isSafeInteger(cursor)) throw new Error("recovered page cursor is invalid");
  } while (cursor !== null);
  if (recoveredPages.length !== 6 || new Set(recoveredPages.map((bar) => `${bar.securityId}|${bar.barStart}`)).size !== 6) throw new Error("recovered minute pages are incomplete or contain duplicate keys");
  const rejectedAgainResponse = await fetch(`${baseUrl}/v2/minute/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify({ fixture: "bad" }) });
  const rejectedAgain = await jsonResponse(rejectedAgainResponse);
  if (rejectedAgainResponse.status !== 200 || rejectedAgain.idempotent !== true || rejectedAgain.status !== "REJECTED") throw new Error("rejected import status did not survive restart idempotently");
  const recoveredCsvPage = await fetch(`${baseUrl}/v2/minute/imports/${encodeURIComponent(csvImport.version)}/bars?cursor=0&pageSize=10`, { headers: marketDataSmokeAuthHeaders }).then(jsonResponse);
  if (recoveredCsvPage.items.length !== 2 || recoveredCsvPage.items[0].barStart !== "2026-09-24T01:30:00.000Z") throw new Error("CSV rows did not survive service restart with exact time semantics");
  const rejectedCsvAfterRestart = await fetch(`${baseUrl}/v2/minute/imports/${encodeURIComponent(badImport.version)}`, { headers: marketDataSmokeAuthHeaders }).then(jsonResponse);
  if (rejectedCsvAfterRestart.status !== "REJECTED" || rejectedCsvAfterRestart.accepted !== 0 || rejectedCsvAfterRestart.sha256 !== badCsvHash) throw new Error("rejected CSV status did not survive service restart");
  console.log(JSON.stringify({ status: "PASS", database: "market_data_test", normalRows: recoveredPages.length, normalPages: Math.ceil(recoveredPages.length / 2), normalSha256: hashes[0], csvRows: recoveredCsvPage.items.length, csvSha256: csvHash, csvPreview: "PASS", csvIdempotency: "PASS", badCsvRowErrors: badPreview.errors, rejectedCsvPersists: true, rejectedFixturePersists: true, serviceRestarted: true, preexistingFixturesPreserved: preexisting }));
} finally {
  await stopService();
  if (migrationsReady) {
    const allHashes = [...hashes, csvHash, badCsvHash];
    for (let index = 0; index < allHashes.length; index += 1) {
      if (preexisting[index] === false) await pool.query("DELETE FROM market_data_minute_imports WHERE source_sha256=$1", [allHashes[index]]);
    }
    const remaining = await pool.query("SELECT source_sha256 FROM market_data_minute_imports WHERE source_sha256=ANY($1::text[])", [allHashes]);
    for (let index = 0; index < allHashes.length; index += 1) {
      const count = remaining.rows.filter((row) => row.source_sha256 === allHashes[index]).length;
      if (preexisting[index] !== null && count !== (preexisting[index] ? 1 : 0)) throw new Error("minute import smoke exact cleanup/preservation assertion failed");
    }
  }
  await pool.end();
}
