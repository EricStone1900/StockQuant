import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

const adminUrl = new URL(process.env.STOCKQUANT_PARQUET_UPLOAD_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
const isolatedPostgresContainer = process.env.STOCKQUANT_PARQUET_UPLOAD_RESTART_POSTGRES_CONTAINER;
assert.ok((adminUrl.hostname === "127.0.0.1" && adminUrl.pathname === "/postgres" && (adminUrl.port === "5433" || (isolatedPostgresContainer && /^\d+$/u.test(adminUrl.port)))) && adminUrl.username === "postgres", "smoke is restricted to local test PostgreSQL or an explicitly named isolated test container");
const databaseName = `sq_md_parquet_resume_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${databaseName}`;
let admin = new Client({ connectionString: adminUrl.toString() });
admin.on("error", () => { /* expected when the isolated PostgreSQL test container is restarted */ });
const workDir = await mkdtemp(resolve(tmpdir(), "stockquant-parquet-resume-"));
const fixturePath = resolve(workDir, "resume.parquet");
const python = resolve("../market-data-adapter/.venv/bin/python");
let service; let created = false; let port; let base; let output = "";

function sha(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `docker ${args[0]} failed: ${(result.stderr ?? "").slice(0, 1500)}`);
  return result.stdout?.trim() ?? "";
}
async function waitForAdmin() {
  let lastError = "none";
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const candidate = new Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 500 });
    try {
      await candidate.connect(); await candidate.query("SELECT 1");
      admin = candidate;
      admin.on("error", () => { /* a later isolated database restart may close this connection */ });
      return;
    }
    catch (error) { lastError = error instanceof Error ? error.message : String(error); await candidate.end().catch(() => undefined); await delay(250); }
  }
  let containerState = "unavailable"; let containerLogs = "";
  if (isolatedPostgresContainer) {
    try { containerState = docker(["inspect", isolatedPostgresContainer, "--format", "{{.State.Status}} {{.State.Health.Status}}"]); } catch (error) { containerState = error instanceof Error ? error.message : String(error); }
    try { containerLogs = docker(["logs", "--tail", "30", isolatedPostgresContainer]); } catch (error) { containerLogs = error instanceof Error ? error.message : String(error); }
  }
  throw new Error(`isolated PostgreSQL did not recover at ${adminUrl.hostname}:${adminUrl.port} within 90 seconds; last connection error=${lastError}; container=${containerState}; logs=${containerLogs}`);
}
function capture(child) { for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 12000) output += chunk.toString().slice(0, 12000 - output.length); }); }
async function request(path, { method = "GET", body, owner } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...marketDataSmokeAuthHeaders, "x-stockquant-owner-id": owner, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(180_000) });
  return { status: response.status, body: await response.json() };
}
async function startService() {
  const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: tmpdir(), STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", ...marketDataSmokeAuthEnv };
  service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] }); capture(service);
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (service.exitCode !== null) throw new Error(`Market Data process exited: ${output}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* process startup */ }
    await delay(100);
  }
  throw new Error(`Market Data process did not become ready: ${output}`);
}
async function stopService() {
  if (!service || service.exitCode !== null) { service = undefined; return; }
  service.kill("SIGTERM");
  await Promise.race([new Promise((resolveClose) => service.once("close", resolveClose)), delay(3000)]);
  if (service.exitCode === null) service.kill("SIGKILL");
  service = undefined;
}

try {
  // Generate an uncompressed, bounded Parquet file so the durable upload has several chunks.
  const result = await new Promise((resolveExit, reject) => {
    const child = spawn(python, [resolve("scripts/generate-parquet-capacity-fixture.py"), fixturePath, "none"], { stdio: ["ignore", "ignore", "pipe"], env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: tmpdir(), PYTHONNOUSERSITE: "1" } });
    let stderr = ""; child.stderr.setEncoding("utf8").on("data", (chunk) => { if (stderr.length < 2000) stderr += chunk.slice(0, 2000 - stderr.length); });
    child.once("error", reject); child.once("exit", (code) => resolveExit({ code, stderr }));
  });
  assert.equal(result.code, 0, result.stderr);
  const bytes = await readFile(fixturePath); const expectedSha256 = sha(bytes);
  const chunkSize = 512 * 1024; const chunkCount = Math.ceil(bytes.length / chunkSize);
  assert.ok(bytes.length > chunkSize, `Parquet input must require multiple durable chunks; got ${bytes.length} bytes`);
  assert.ok(bytes.length < 64 * 1024 * 1024 && chunkCount <= 64, "input remains within the upload limits");

  const listener = createServer();
  port = await new Promise((resolvePort, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const value = listener.address().port; listener.close((error) => error ? reject(error) : resolvePort(value)); }); });
  base = `http://127.0.0.1:${port}`;
  await admin.connect(); await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  const owner = `parquet-resume-${randomUUID()}`; const uploadId = randomUUID();
  const metadata = {
    fileFormat: "PARQUET",
    mapping: Object.fromEntries(["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"].map((field) => [field, field])),
    provenance: { sourceName: `synthetic-parquet-resume-${databaseName}`, sourceReference: null, licenseStatement: "Deterministic synthetic test data", licenseVerification: "UNCONFIRMED", acquiredAt: "2026-09-26T00:00:00Z" },
    market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY",
  };
  await startService();
  const create = await request("/v2/minute/parquet/uploads", { method: "POST", owner, body: { uploadId, expectedSha256, expectedBytes: bytes.length, metadata } });
  assert.equal(create.status, 201); assert.equal(create.body.expectedChunks, chunkCount); assert.equal(create.body.status, "OPEN");
  const first = bytes.subarray(0, chunkSize);
  const firstBody = { contentBase64: first.toString("base64"), sha256: sha(first) };
  const firstPut = await request(`/v2/minute/parquet/uploads/${uploadId}/chunks/0`, { method: "PUT", owner, body: firstBody });
  assert.equal(firstPut.status, 200); assert.deepEqual(firstPut.body.receivedChunks, [0]);
  const duplicate = await request(`/v2/minute/parquet/uploads/${uploadId}/chunks/0`, { method: "PUT", owner, body: firstBody });
  assert.equal(duplicate.status, 200); assert.equal(duplicate.body.idempotent, true);
  const foreign = await request(`/v2/minute/parquet/uploads/${uploadId}`, { owner: `${owner}-foreign` });
  assert.equal(foreign.status, 409);

  let databaseRestartPreservedChunk = false;
  if (isolatedPostgresContainer) {
    assert.match(isolatedPostgresContainer, /^sq-md-parquet-pg-restart-[a-f0-9]{12}$/u);
    docker(["restart", isolatedPostgresContainer]);
    await waitForAdmin();
    await stopService(); output = ""; await startService();
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(`${base}/ready`)).ok) break; } catch { /* wait for the service pool to reconnect */ }
      await delay(250);
    }
    assert.equal((await fetch(`${base}/ready`)).status, 200, output);
    const afterDatabaseRestart = await request(`/v2/minute/parquet/uploads/${uploadId}`, { owner });
    assert.equal(afterDatabaseRestart.status, 200);
    assert.equal(afterDatabaseRestart.body.receivedBytes, first.length);
    assert.deepEqual(afterDatabaseRestart.body.receivedChunks, [0]);
    databaseRestartPreservedChunk = true;
  }

  await stopService(); output = ""; await startService();
  const resumed = await request(`/v2/minute/parquet/uploads/${uploadId}`, { owner });
  assert.equal(resumed.status, 200); assert.equal(resumed.body.receivedBytes, first.length); assert.deepEqual(resumed.body.receivedChunks, [0]);
  const incomplete = await request(`/v2/minute/parquet/uploads/${uploadId}/preview`, { method: "POST", owner, body: {} });
  assert.equal(incomplete.status, 409, "preview refuses missing Parquet chunks after process restart");
  for (let index = 1; index < chunkCount; index += 1) {
    const chunk = bytes.subarray(index * chunkSize, Math.min(bytes.length, (index + 1) * chunkSize));
    const put = await request(`/v2/minute/parquet/uploads/${uploadId}/chunks/${index}`, { method: "PUT", owner, body: { contentBase64: chunk.toString("base64"), sha256: sha(chunk) } });
    assert.equal(put.status, 200, `chunk ${index} upload failed`);
  }
  const preview = await request(`/v2/minute/parquet/uploads/${uploadId}/preview`, { method: "POST", owner, body: {} });
  assert.equal(preview.status, 200); assert.equal(preview.body.totalRows, 100_000); assert.equal(preview.body.acceptedRows, 100_000); assert.equal(preview.body.errors.length, 0);
  const finalized = await request(`/v2/minute/parquet/uploads/${uploadId}/finalize`, { method: "POST", owner, body: {} });
  assert.ok([200, 201].includes(finalized.status), JSON.stringify(finalized.body).slice(0, 1500));
  assert.equal(finalized.body.status, "PUBLISHED"); assert.equal(finalized.body.accepted, 100_000); assert.equal(finalized.body.sha256, expectedSha256);
  const completed = await request(`/v2/minute/parquet/uploads/${uploadId}`, { owner });
  assert.equal(completed.body.status, "COMPLETED"); assert.equal(completed.body.result.version, finalized.body.version);
  const verify = new Client({ connectionString: databaseUrl.toString() }); await verify.connect();
  try {
    const rows = await verify.query("SELECT count(*)::integer AS count FROM market_data_minute_import_bars_by_day WHERE version=$1", [finalized.body.version]);
    assert.equal(rows.rows[0].count, 100_000);
    const manifest = await verify.query("SELECT source_sha256,import_manifest->>'researchUseAllowed' AS research_allowed FROM market_data_minute_imports WHERE version=$1", [finalized.body.version]);
    assert.equal(manifest.rows[0].source_sha256, expectedSha256); assert.equal(manifest.rows[0].research_allowed, "false");
  } finally { await verify.end(); }
  await stopService(); output = ""; await startService();
  const afterRestart = await request(`/v2/minute/parquet/uploads/${uploadId}`, { owner });
  assert.equal(afterRestart.body.status, "COMPLETED"); assert.equal(afterRestart.body.result.version, finalized.body.version);
  console.log(JSON.stringify({ status: "PASS", uploadId, bytes: bytes.length, chunks: chunkCount, rows: 100_000, sha256: expectedSha256, processRestartResume: true, databaseRestartPreservedChunk, duplicateChunkIdempotent: true, missingChunkRefused: true, completedAfterSecondRestart: true, researchUseAllowed: false, importVersion: finalized.body.version }));
} finally {
  await stopService();
  try {
    if (created && !isolatedPostgresContainer) {
      try { await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); }
      catch { await waitForAdmin(); await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); }
      assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName])).rowCount, 0);
    }
  } finally {
    // In isolated-container mode, the wrapper destroys the whole disposable PostgreSQL cluster.
    await admin.end().catch(() => undefined);
    await rm(workDir, { recursive: true, force: true });
  }
}
