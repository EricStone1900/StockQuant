import { createServer } from "node:net";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { resolve } from "node:path";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

const databaseUrl = process.env.MARKET_DATA_DATABASE_URL ?? "postgresql://market_data_test@127.0.0.1:5433/market_data_test";
const parsedDatabaseUrl = new URL(databaseUrl);
if (parsedDatabaseUrl.pathname !== "/market_data_test" || parsedDatabaseUrl.username !== "market_data_test") throw new Error("CSV identity HTTP smoke requires the isolated market_data_test database and role");
const pool = new Pool({ connectionString: databaseUrl });
const port = await new Promise((resolvePort, reject) => {
  const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); });
});
const base = `http://127.0.0.1:${port}`;
const uniqueRun = randomUUID();
const content = `code,time,alternateCode,alternateTime,o,h,l,c,vol,amt,smokeId\n600000.SH,2026-09-24 09:30,000001.SZ,2026-09-24 09:31,10,11,9,10.5,100,1050,${uniqueRun}\n`;
const mappingA = { securityId: "code", timestamp: "time", open: "o", high: "h", low: "l", close: "c", volume: "vol", amount: "amt" };
const mappingB = { securityId: "alternateCode", timestamp: "alternateTime", open: "o", high: "h", low: "l", close: "c", volume: "vol", amount: "amt" };
const semantics = { market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" };
const provenance = { sourceName: "mapping identity smoke synthetic source", sourceReference: null, licenseStatement: "synthetic test data for identity smoke only", licenseVerification: "OPERATOR_CONFIRMED", acquiredAt: "2026-09-25T00:00:00.000Z" };
const unconfirmedProvenance = { ...provenance, licenseStatement: "UNKNOWN", licenseVerification: "UNCONFIRMED" };
const bodyFor = (mapping, source = provenance) => ({ content, mapping, provenance: source, ...semantics });
const sourceSha256 = createHash("sha256").update(content, "utf8").digest("hex");
const fields = ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"];
const identityFor = (mapping, source) => createHash("sha256").update(JSON.stringify({ sourceSha256, mapping: fields.map((field) => [field, mapping[field] ?? null]), semantics: ["CN_A", "1m", "RAW", "Asia/Shanghai", "BAR_START", "SHARES", "CNY"], provenance: [source.sourceName, source.sourceReference, source.licenseStatement, source.licenseVerification, source.acquiredAt] })).digest("hex");
const importKeys = [identityFor(mappingA, provenance), identityFor(mappingB, provenance), identityFor(mappingA, unconfirmedProvenance)];
let service;
let output = "";
let firstVersion;
let secondVersion;
let thirdVersion;
let secondRowCount;
let databaseReady = false;

async function startService() {
  const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl, STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", ...marketDataSmokeAuthEnv };
  service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
  for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => { if (output.length < 12000) output += chunk.toString().slice(0, 12000 - output.length); });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (service.exitCode !== null) throw new Error(`market-data-service exited: ${output}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* wait for bind */ }
    await delay(100);
  }
  throw new Error(`market-data-service did not start: ${output}`);
}

async function stopService() {
  if (!service || service.exitCode !== null) return;
  service.kill("SIGTERM");
  await new Promise((resolveClose) => service.once("close", resolveClose));
  service = undefined;
}

async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

try {
  await startService();
  const existing = await pool.query("SELECT count(*) FROM market_data_minute_imports WHERE import_key_sha256=ANY($1::text[])", [importKeys]);
  databaseReady = true;
  if (Number(existing.rows[0].count) !== 0) throw new Error("unique CSV identity smoke keys unexpectedly exist before the run");
  const previewA = await post("/v2/minute/csv/preview", bodyFor(mappingA));
  const previewB = await post("/v2/minute/csv/preview", bodyFor(mappingB));
  if (previewA.status !== 200 || previewB.status !== 200 || previewA.body.acceptedRows !== 1 || previewB.body.acceptedRows !== 1) throw new Error("both explicit CSV mappings must preview as valid");
  const first = await post("/v2/minute/csv/import", bodyFor(mappingA));
  if (first.status === 201 || first.status === 200) firstVersion = first.body.version;
  const firstRetry = await post("/v2/minute/csv/import", bodyFor(mappingA));
  const second = await post("/v2/minute/csv/import", bodyFor(mappingB));
  const third = await post("/v2/minute/csv/import", bodyFor(mappingA, unconfirmedProvenance));
  if (second.status === 201 || second.status === 200) secondVersion = second.body.version;
  if (third.status === 201 || third.status === 200) thirdVersion = third.body.version;
  const secondRetry = await post("/v2/minute/csv/import", bodyFor(mappingB));
  if (first.status !== 201 || firstRetry.status !== 200 || firstRetry.body.version !== first.body.version || !firstRetry.body.idempotent) throw new Error("same mapping retry did not return the original import");
  if (second.status !== 201 || secondRetry.status !== 200 || secondRetry.body.version !== second.body.version || !secondRetry.body.idempotent) throw new Error("alternate mapping retry did not return its import");
  if (third.status !== 201 || first.body.sha256 !== second.body.sha256 || first.body.version === second.body.version || first.body.version === third.body.version) throw new Error("mapping/provenance-bound versions were not kept distinct");
  secondRowCount = second.body.accepted;
  await stopService();
  output = "";
  await startService();
  const persistedA = await (await fetch(`${base}/v2/minute/imports/${encodeURIComponent(firstVersion)}/bars?pageSize=10`, { headers: marketDataSmokeAuthHeaders })).json();
  const persistedB = await (await fetch(`${base}/v2/minute/imports/${encodeURIComponent(secondVersion)}/bars?pageSize=10`, { headers: marketDataSmokeAuthHeaders })).json();
  const manifestA = await (await fetch(`${base}/v2/minute/imports/${encodeURIComponent(firstVersion)}`, { headers: marketDataSmokeAuthHeaders })).json();
  const manifestB = await (await fetch(`${base}/v2/minute/imports/${encodeURIComponent(secondVersion)}`, { headers: marketDataSmokeAuthHeaders })).json();
  const manifestC = await (await fetch(`${base}/v2/minute/imports/${encodeURIComponent(thirdVersion)}`, { headers: marketDataSmokeAuthHeaders })).json();
  if (persistedA.items?.[0]?.securityId !== "600000.SH" || persistedB.items?.[0]?.securityId !== "000001.SZ" || persistedB.items.length !== secondRowCount) throw new Error("distinct mapped interpretations did not survive service restart");
  if (manifestA.manifest?.mapping?.securityId !== "code" || manifestB.manifest?.mapping?.securityId !== "alternateCode" || manifestA.manifest?.semantics?.timestampSemantics !== "BAR_START" || manifestB.manifest?.semantics?.amountUnit !== "CNY" || manifestA.manifest?.provenance?.sourceName !== provenance.sourceName || manifestB.manifest?.provenance?.licenseStatement !== provenance.licenseStatement || manifestA.manifest?.researchUseAllowed !== true || manifestB.manifest?.researchUseAllowed !== true || manifestC.manifest?.provenance?.licenseVerification !== "UNCONFIRMED" || manifestC.manifest?.researchUseAllowed !== false) throw new Error("mapping/semantics/provenance manifest did not survive service restart");
  console.log(JSON.stringify({ status: "PASS", sourceSha256: first.body.sha256, mappingAVersion: firstVersion, mappingBVersion: secondVersion, unconfirmedLicenseVersion: thirdVersion, sameMapReplay: firstRetry.body.idempotent && secondRetry.body.idempotent, restartMappingA: persistedA.items[0].securityId, restartMappingB: persistedB.items[0].securityId, provenancePersisted: true, unconfirmedResearchUseBlocked: manifestC.manifest.researchUseAllowed === false }));
} finally {
  await stopService();
  if (databaseReady) {
    await pool.query("DELETE FROM market_data_minute_imports WHERE import_key_sha256=ANY($1::text[])", [importKeys]);
    const remaining = await pool.query("SELECT count(*) FROM market_data_minute_imports WHERE import_key_sha256=ANY($1::text[])", [importKeys]);
    if (Number(remaining.rows[0].count) !== 0) throw new Error("exact CSV identity smoke rows were not cleaned up");
  }
  await pool.end();
}
