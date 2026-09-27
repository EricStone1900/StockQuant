import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

const ADMIN = process.env.STOCKQUANT_TEST_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres";
const ROWS = 100_000;
const script = resolve(process.argv[1]);
const sha = (bytes) => import("node:crypto").then(({ createHash }) => createHash("sha256").update(bytes).digest("hex"));

function sourceRows(kind) {
  const dates = ["20240102", "20240103", "20240104", "20240105", "20240108"];
  const values = [];
  const duplicate = "600000.SH,20240102093000000,10,10.2,9.9,10.1,100,1000";
  for (let index = 0; index < ROWS; index += 1) {
    if (kind === "duplicate") values.push(duplicate);
    else {
      const security = index % 500;
      const ordinal = Math.floor(index / 500);
      const slot = ordinal % 48;
      const minuteOfDay = slot < 24 ? 570 + slot * 5 : 780 + (slot - 24) * 5;
      const hhmm = `${String(Math.floor(minuteOfDay / 60)).padStart(2, "0")}${String(minuteOfDay % 60).padStart(2, "0")}`;
      values.push(`${String(600000 + security).padStart(6, "0")}.SH,${dates[Math.floor(ordinal / 48)]}${hhmm}00000,10,9,10,10.1,100,1000`);
    }
  }
  return Buffer.from(`securityId,timestamp,open,high,low,close,volume,amount\n${values.join("\n")}\n`);
}

if (process.argv[2] === "--case") {
  const kind = process.argv[3];
  assert.ok(["duplicate", "invalid"].includes(kind));
  const suffix = randomUUID().replaceAll("-", "");
  const database = `sq_md_error_${suffix}`;
  const testUrl = new URL(ADMIN); testUrl.pathname = `/${database}`; testUrl.username = "market_data_test";
  const admin = new Client({ connectionString: ADMIN });
  const db = new Client({ connectionString: testUrl.toString() });
  let created = false; let server; let base; let output = ""; let peakRssKiB = 0;
  const owner = `error-capacity-${suffix}`; const uploadId = randomUUID(); const provenance = { sourceName: `error-capacity-${kind}-${suffix}`, sourceReference: null, licenseStatement: "synthetic stress input", licenseVerification: "UNCONFIRMED", acquiredAt: "2026-09-26T00:00:00Z" };
  const metadata = { mapping: { securityId: "securityId", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" }, provenance, market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" };
  async function stop() { if (!server || server.exitCode !== null) return; server.kill("SIGTERM"); await Promise.race([new Promise(done => server.once("exit", done)), delay(3000)]); if (server.exitCode === null) server.kill("SIGKILL"); }
  async function request(path, options = {}) {
    const response = await fetch(`${base}${path}`, { method: options.method ?? "GET", headers: { ...marketDataSmokeAuthHeaders, "x-stockquant-owner-id": owner, ...(options.body === undefined ? {} : { "content-type": "application/json" }) }, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }), signal: AbortSignal.timeout(120_000) });
    return { status: response.status, retryAfter: response.headers.get("retry-after"), body: await response.json() };
  }
  async function samplePeak(task) {
    let sampling = true; let phasePeakRssKiB = 0;
    const sampler = (async () => { while (sampling) { let rss; if (process.platform === "linux") { try { rss = Number(readFileSync(`/proc/${server.pid}/status`, "utf8").match(/^VmRSS:\s+(\d+)\s+kB$/m)?.[1]); } catch { rss = Number.NaN; } } else { const result = spawnSync("ps", ["-o", "rss=", "-p", String(server.pid)], { encoding: "utf8" }); rss = Number(result.stdout?.trim()); } if (Number.isFinite(rss)) { peakRssKiB = Math.max(peakRssKiB, rss); phasePeakRssKiB = Math.max(phasePeakRssKiB, rss); } await delay(25); } })();
    try { return { value: await task(), peakRssKiB: phasePeakRssKiB }; } finally { sampling = false; await sampler; }
  }
  try {
    const listener = createServer(); const port = await new Promise((resolvePort, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const value = listener.address().port; listener.close((error) => error ? reject(error) : resolvePort(value)); }); });
    base = `http://127.0.0.1:${port}`;
    await admin.connect(); await admin.query(`CREATE DATABASE "${database}" OWNER market_data_test`); created = true; await db.connect();
    server = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: testUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", ...marketDataSmokeAuthEnv }, stdio: ["ignore", "pipe", "pipe"] });
    for (const stream of [server.stdout, server.stderr]) stream.on("data", chunk => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); });
    for (let attempt = 0; attempt < 150; attempt += 1) { if (server.exitCode !== null) throw new Error(`service exited: ${output}`); try { if ((await fetch(`${base}/ready`)).ok) break; } catch { /* startup */ } await delay(100); }
    assert.equal((await fetch(`${base}/ready`)).status, 200, output);
    const bytes = sourceRows(kind); const sourceHash = await sha(bytes); const chunkSize = 512 * 1024; const chunkCount = Math.ceil(bytes.length / chunkSize);
    assert.ok(bytes.length < 64 * 1024 * 1024); assert.ok(chunkCount <= 64);
    const create = await request("/v2/minute/csv/uploads", { method: "POST", body: { uploadId, expectedSha256: sourceHash, expectedBytes: bytes.length, metadata } });
    assert.equal(create.status, 201); assert.equal(create.body.expectedChunks, chunkCount);
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = bytes.subarray(index * chunkSize, Math.min(bytes.length, (index + 1) * chunkSize));
      const put = await request(`/v2/minute/csv/uploads/${uploadId}/chunks/${index}`, { method: "PUT", body: { contentBase64: chunk.toString("base64"), sha256: await sha(chunk) } });
      assert.equal(put.status, 200, `chunk ${index} upload failed`);
    }
    const previewSample = await samplePeak(async () => {
      const outcomes = await Promise.all([request(`/v2/minute/csv/uploads/${uploadId}/preview`, { method: "POST", body: {} }), request(`/v2/minute/csv/uploads/${uploadId}/preview`, { method: "POST", body: {} })]);
      const accepted = outcomes.filter(result => result.status === 200); const busy = outcomes.filter(result => result.status === 429);
      assert.equal(accepted.length, 1, `exactly one concurrent preview is admitted: ${JSON.stringify(outcomes.map(({ status, body }) => ({ status, code: body.code })))}`);
      assert.equal(busy.length, 1); assert.equal(busy[0].body.code, "MINUTE_IMPORT_BUSY"); assert.equal(busy[0].retryAfter, "1");
      return accepted[0];
    }); const preview = previewSample.value;
    assert.equal(preview.status, 200); assert.equal(preview.body.totalRows, ROWS); assert.equal(preview.body.acceptedRows, 0); assert.equal(preview.body.errors.length, ROWS); assert.equal(preview.body.bars.length, 0); assert.equal(preview.body.barsTruncated, false);
    const expectedError = kind === "duplicate" ? "DUPLICATE_CONFLICT" : "OHLC_INVALID";
    assert.ok(preview.body.errors.every(error => error.code === expectedError));
    const finalizeSample = await samplePeak(async () => {
      const outcomes = await Promise.all([request(`/v2/minute/csv/uploads/${uploadId}/finalize`, { method: "POST", body: {} }), request(`/v2/minute/csv/uploads/${uploadId}/finalize`, { method: "POST", body: {} })]);
      const rejected = outcomes.filter(result => result.status === 422); const busy = outcomes.filter(result => result.status === 429);
      assert.equal(rejected.length, 1); assert.equal(busy.length, 1); assert.equal(busy[0].body.code, "MINUTE_IMPORT_BUSY");
      return rejected[0];
    }); const finalize = finalizeSample.value;
    assert.equal(finalize.status, 422); assert.equal(finalize.body.status, "REJECTED"); assert.equal(finalize.body.accepted, 0); assert.equal(finalize.body.errors.length, ROWS); assert.equal(finalize.body.sha256, sourceHash);
    const completedRetry = await request(`/v2/minute/csv/uploads/${uploadId}/finalize`, { method: "POST", body: {} }); assert.equal(completedRetry.status, 200); assert.equal(completedRetry.body.status, "REJECTED"); assert.equal(completedRetry.body.idempotent, true, "a retry after 429 returns the durable rejected result");
    const upload = await db.query("SELECT status,completed_result FROM market_data_minute_uploads WHERE upload_id=$1", [uploadId]); assert.equal(upload.rowCount, 1); assert.equal(upload.rows[0].status, "COMPLETED"); assert.equal(upload.rows[0].completed_result.status, "REJECTED");
    const imported = await db.query("SELECT status,accepted,jsonb_array_length(errors) AS errors FROM market_data_minute_imports WHERE import_manifest->'provenance'->>'sourceName'=$1", [provenance.sourceName]); assert.equal(imported.rowCount, 1); assert.equal(imported.rows[0].status, "REJECTED"); assert.equal(imported.rows[0].accepted, 0); assert.equal(imported.rows[0].errors, ROWS);
    const bars = await db.query("SELECT count(*)::integer AS count FROM market_data_minute_import_bars_by_day"); assert.equal(bars.rows[0].count, 0);
    await stop();
    assert.ok(peakRssKiB <= 768 * 1024, `HTTP parser worker must stay below 768 MiB RSS, observed ${Math.round(peakRssKiB / 1024)} MiB`);
    const containerMemoryPeakKiB = process.platform === "linux" ? Number(readFileSync("/sys/fs/cgroup/memory.peak", "utf8").trim()) / 1024 : null;
    if (containerMemoryPeakKiB !== null) assert.ok(containerMemoryPeakKiB <= 2 * 1024 * 1024, `container memory peak must stay below 2 GiB, observed ${Math.round(containerMemoryPeakKiB / 1024)} MiB`);
    console.log(JSON.stringify({ kind, status: "PASS", rows: ROWS, errors: ROWS, uploadBytes: bytes.length, chunks: chunkCount, peakServiceRssKiB: peakRssKiB, containerMemoryPeakKiB, previewPeakRssKiB: previewSample.peakRssKiB, finalizePeakRssKiB: finalizeSample.peakRssKiB, rejectedRecordPersisted: true, publishedBars: bars.rows[0].count, sourceSha256: sourceHash, externalCalls: 0, brokerCalls: 0, isolatedDatabase: database }));
  } finally {
    await stop(); await db.end().catch(() => undefined);
    if (created) { await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`); const remaining = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [database]); assert.equal(remaining.rowCount, 0); }
    await admin.end().catch(() => undefined);
  }
} else {
  const adminUrl = new URL(ADMIN);
  assert.equal(adminUrl.pathname, "/postgres");
  assert.ok((adminUrl.hostname === "127.0.0.1" && adminUrl.port === "5433") || (adminUrl.hostname === "postgres" && adminUrl.port === "5432"), "test admin URL must target the local test PostgreSQL endpoint");
  const reports = [];
  for (const kind of ["duplicate", "invalid"]) {
    const child = spawnSync(process.execPath, [script, "--case", kind], { encoding: "utf8", timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
    assert.equal(child.status, 0, child.stderr || child.stdout || `${kind} HTTP capacity case failed`);
    reports.push(JSON.parse(child.stdout.trim()));
  }
  console.log(JSON.stringify({ status: "PASS", cases: reports, safety: "each case used and dropped a random PostgreSQL database; no real source, model or broker calls" }, null, 2));
}
