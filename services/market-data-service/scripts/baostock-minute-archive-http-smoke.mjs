import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { resolve, relative, sep } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client, Pool } from "pg";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

const root = resolve(process.cwd(), "../..");
const sourceRoot = resolve(root, "data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1");
const manifest = JSON.parse(await readFile(resolve(sourceRoot, "manifest.json"), "utf8"));
assert.equal(manifest.source, "baostock");
assert.equal(manifest.sourceMode, "READ_ONLY");
assert.equal(manifest.frequency, "5m");
assert.equal(manifest.sampleSize, 500);
assert.equal(manifest.rows, 1_440_000);
assert.equal(Object.keys(manifest.artifacts).length, 500);
const concurrency = Number(process.env.STOCKQUANT_ARCHIVE_SMOKE_CONCURRENCY ?? "1");
assert.ok(Number.isInteger(concurrency) && concurrency >= 1 && concurrency <= 8, "archive smoke concurrency must be an integer from 1 to 8");
const instances = Number(process.env.STOCKQUANT_ARCHIVE_SMOKE_INSTANCES ?? "1");
assert.ok(Number.isInteger(instances) && instances >= 1 && instances <= 2, "archive smoke instances must be 1 or 2");

const adminUrl = new URL(process.env.STOCKQUANT_ARCHIVE_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres", "archive smoke only creates a random local test database");
const suffix = randomUUID().replaceAll("-", "");
const database = `sq_baostock_${suffix}`;
const testUrl = new URL(adminUrl); testUrl.pathname = `/${database}`; testUrl.username = "market_data_test";
const admin = new Client({ connectionString: adminUrl.toString() });
const pool = new Pool({ connectionString: testUrl.toString(), max: 4 });
async function reservePort() { return new Promise((resolvePort, reject) => { const listener = createServer(); listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const value = listener.address().port; listener.close((error) => error ? reject(error) : resolvePort(value)); }); }); }
const ports = await Promise.all(Array.from({ length: instances }, reservePort));
const bases = ports.map((value) => `http://127.0.0.1:${value}`);
const servicePath = resolve(root, "services/market-data-service/dist/main.js");
const children = [];
const serviceLogs = Array.from({ length: instances }, () => "");
let databaseCreated = false;

async function startService(index) {
  const child = spawn(process.execPath, [servicePath], { cwd: root, env: { ...process.env, ...marketDataSmokeAuthEnv, STOCKQUANT_PROJECT_ROOT: root, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(ports[index]), STOCKQUANT_DATABASE_URL: testUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0" }, stdio: ["ignore", "pipe", "pipe"] });
  children[index] = child;
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (serviceLogs[index].length < 20_000) serviceLogs[index] += chunk.toString().slice(0, 20_000 - serviceLogs[index].length); });
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Market Data service ${index + 1} exited during archive smoke: ${serviceLogs[index]}`);
    try { if ((await fetch(`${bases[index]}/ready`)).ok) return; } catch { /* startup race */ }
    await delay(100);
  }
  throw new Error(`Market Data service ${index + 1} did not become ready: ${serviceLogs[index]}`);
}

async function stopService(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveClose) => child.once("close", resolveClose)), delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}" OWNER market_data_test`);
  databaseCreated = true;
  for (let index = 0; index < instances; index += 1) await startService(index);
  const startedAt = performance.now();
  let importedRows = 0;
  let importedFiles = 0;
  let peakInFlight = 0;
  let inFlight = 0;
  let requestCount = 0;
  let throttledResponses = 0;
  const perInstance = Array.from({ length: instances }, () => ({ requests: 0, throttled429: 0, published: 0 }));
  const versions = new Map();
  const firstRecord = Object.entries(manifest.artifacts).sort(([left], [right]) => left.localeCompare(right))[0];
  let firstSourceRow;

  const artifacts = Object.entries(manifest.artifacts).sort(([left], [right]) => left.localeCompare(right));
  let nextArtifactIndex = 0;
  async function importArtifact(securityCode, artifact) {
    const path = resolve(sourceRoot, artifact.path);
    const pathReal = await realpath(path);
    const rel = relative(sourceRoot, pathReal);
    assert.ok(rel && !rel.startsWith(`..${sep}`) && rel !== "..", "manifest artifact must remain inside the frozen source root");
    const bytes = await readFile(pathReal);
    const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
    assert.equal(sourceSha256, artifact.sha256, `frozen file hash mismatch: ${artifact.path}`);
    const csv = bytes.toString("utf8");
    const dataLines = csv.trimEnd().split(/\r?\n/u);
    assert.equal(dataLines.length - 1, artifact.rows, `frozen row count mismatch: ${artifact.path}`);
    if (securityCode === firstRecord[0]) firstSourceRow = dataLines[1].split(",");
    const provenance = { sourceName: "BaoStock frozen READ_ONLY archive", sourceReference: `baostock-minute-500x60-2024-01-02-2024-04-02-v1/${artifact.path}`, licenseStatement: "Local frozen archive; source terms require separate review", licenseVerification: "UNCONFIRMED", acquiredAt: manifest.updatedAt };
    const body = {
      content: csv,
      mapping: { securityId: "code", timestamp: "time", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" },
      provenance,
      market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_END", volumeUnit: "SHARES", amountUnit: "CNY",
    };
    let response;
    let result;
    let attempt = 0;
    while (true) {
      inFlight += 1;
      peakInFlight = Math.max(peakInFlight, inFlight);
      requestCount += 1;
      const instanceIndex = (requestCount - 1) % instances;
      perInstance[instanceIndex].requests += 1;
      try {
        response = await fetch(`${bases[instanceIndex]}/v2/minute/csv/import`, { method: "POST", headers: { ...marketDataSmokeAuthHeaders, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
        result = await response.json();
      } finally {
        inFlight -= 1;
      }
      if (response.status !== 429) break;
      throttledResponses += 1;
      perInstance[instanceIndex].throttled429 += 1;
      attempt += 1;
      assert.ok(attempt <= 120, `${artifact.path} exceeded bounded 429 retry count`);
      const retryAfterSeconds = Number(response.headers.get("retry-after") ?? "1");
      assert.ok(Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0, "server Retry-After must be a nonnegative number");
      await delay(Math.ceil(retryAfterSeconds * 1000) + (attempt % 7) * 17);
    }
    assert.equal(response.status, 201, `${artifact.path} import failed: ${JSON.stringify(result).slice(0, 1200)}`);
    assert.equal(result.status, "PUBLISHED", `${artifact.path} did not publish`);
    assert.equal(result.sha256, artifact.sha256, "persisted source SHA must match immutable archive manifest");
    assert.equal(result.accepted, artifact.rows, `${artifact.path} accepted row count differs from source manifest`);
    assert.equal(result.manifest.semantics.frequency, "5m");
    assert.equal(result.manifest.provenance.licenseVerification, "UNCONFIRMED");
    assert.equal(result.manifest.researchUseAllowed, false);
    versions.set(securityCode, result.version);
    perInstance[(requestCount - 1) % instances].published += 1;
    importedRows += result.accepted;
    importedFiles += 1;
    if (importedFiles % 50 === 0) process.stdout.write(`${importedFiles}/${Object.keys(manifest.artifacts).length} frozen files imported (${importedRows} rows)\n`);
  }
  async function worker() {
    while (nextArtifactIndex < artifacts.length) {
      const index = nextArtifactIndex++;
      await importArtifact(...artifacts[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, artifacts.length) }, () => worker()));

  await Promise.all(children.map(stopService));
  const counts = await pool.query(`SELECT count(*)::integer AS rows, count(DISTINCT version)::integer AS versions,
    count(*) FILTER (WHERE bar->>'frequency' <> '5m')::integer AS wrong_frequency
    FROM market_data_minute_import_bars_by_day`);
  assert.equal(counts.rows[0].rows, manifest.rows);
  assert.equal(counts.rows[0].versions, manifest.sampleSize);
  assert.equal(counts.rows[0].wrong_frequency, 0);
  const importCounts = await pool.query("SELECT count(*)::integer AS files, sum(accepted)::bigint AS rows FROM market_data_minute_imports WHERE status='PUBLISHED'");
  assert.equal(importCounts.rows[0].files, manifest.sampleSize);
  assert.equal(Number(importCounts.rows[0].rows), manifest.rows);
  const securityId = `${firstRecord[0].split(".")[1]}.${firstRecord[0].split(".")[0].toUpperCase()}`;
  const page = await pool.query("SELECT bar FROM market_data_minute_import_bars_by_day WHERE version=$1 AND security_id=$2 ORDER BY bar_start LIMIT 1", [versions.get(firstRecord[0]), securityId]);
  assert.equal(page.rowCount, 1);
  assert.equal(page.rows[0].bar.securityId, securityId);
  assert.equal(page.rows[0].bar.frequency, "5m");
  assert.equal(page.rows[0].bar.open, Number(firstSourceRow[3]));
  assert.equal(page.rows[0].bar.volume, Number(firstSourceRow[7]));
  assert.equal(page.rows[0].bar.amount, Number(firstSourceRow[8]));
  const databaseBytes = Number((await pool.query("SELECT pg_database_size(current_database()) AS bytes")).rows[0].bytes);
  const partitionCount = Number((await pool.query("SELECT count(*) AS count FROM pg_inherits WHERE inhparent='market_data_minute_import_bars_by_day'::regclass")).rows[0].count);
  const elapsedMs = Math.round(performance.now() - startedAt);
  console.log(JSON.stringify({ status: "PASS", concurrency, instances, http: { requests: requestCount, throttled429: throttledResponses, peakInFlight, perInstance }, dataset: { source: manifest.source, sourceMode: manifest.sourceMode, frequency: manifest.frequency, files: importedFiles, securities: manifest.sampleSize, rows: importedRows, barsPerSecurity: manifest.rows / manifest.sampleSize, startDate: manifest.startDate, endDate: manifest.endDate, originalManifestRows: manifest.rows }, semantics: { market: "CN_A", frequency: "5m", timestampSemantics: "BAR_END", timezone: "Asia/Shanghai", timestampFormat: "BaoStock YYYYMMDDHHmmssSSS", licenseVerification: "UNCONFIRMED", researchUseAllowed: false }, persistence: { rows: counts.rows[0].rows, publishedImports: importCounts.rows[0].files, dailyPartitions: partitionCount, databaseBytes, exactFirstSourceRowMatched: true }, elapsedMs, throughputRowsPerSecond: Math.round(importedRows * 1000 / elapsedMs), externalCalls: 0, brokerCalls: 0, isolatedDatabase: database }, null, 2));
} finally {
  await Promise.all(children.map(stopService));
  await pool.end();
  if (databaseCreated) {
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    const remaining = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [database]);
    assert.equal(remaining.rowCount, 0, "random archive-smoke database must be dropped");
  }
  await admin.end().catch(() => undefined);
}
