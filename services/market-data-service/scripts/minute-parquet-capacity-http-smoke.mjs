import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { performance } from "node:perf_hooks";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

const ADMIN = process.env.STOCKQUANT_TEST_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres";
const ROWS = 100_000;
const CHUNK_BYTES = 512 * 1024;
const OWNER = `parquet-capacity-${randomUUID()}`;
const UPLOAD_ID = randomUUID();
const suffix = randomUUID().replaceAll("-", "");
const database = `sq_md_parquet_${suffix}`;
const adminUrl = new URL(ADMIN);
const targetUrl = new URL(ADMIN); targetUrl.pathname = `/${database}`; targetUrl.username = "market_data_test";
if (process.env.STOCKQUANT_TEST_TARGET_DATABASE_HOST) targetUrl.hostname = process.env.STOCKQUANT_TEST_TARGET_DATABASE_HOST;
if (process.env.STOCKQUANT_TEST_TARGET_DATABASE_PORT) targetUrl.port = process.env.STOCKQUANT_TEST_TARGET_DATABASE_PORT;
const inspectionUrl = new URL(targetUrl);
if (process.env.STOCKQUANT_TEST_TARGET_DATABASE_HOST) { inspectionUrl.hostname = adminUrl.hostname; inspectionUrl.port = adminUrl.port; }
const admin = new Client({ connectionString: ADMIN });
const db = new Client({ connectionString: inspectionUrl.toString() });
const tempDir = await mkdtemp(resolve(tmpdir(), "stockquant-parquet-capacity-"));
const fixturePath = resolve(tempDir, "minute-100k.parquet");
const python = process.env.STOCKQUANT_PARQUET_GENERATOR_PYTHON ?? resolve("../market-data-adapter/.venv/bin/python");
const compression = process.env.STOCKQUANT_PARQUET_CAPACITY_COMPRESSION ?? "zstd";
const image = process.env.STOCKQUANT_PARQUET_CAPACITY_IMAGE;
const network = process.env.STOCKQUANT_PARQUET_CAPACITY_NETWORK;
const fixtureGenerator = process.env.STOCKQUANT_PARQUET_CAPACITY_GENERATOR ?? resolve("scripts/generate-parquet-capacity-fixture.py");
const containerName = process.env.STOCKQUANT_PARQUET_CAPACITY_CONTAINER_NAME ?? `sq-md-parquet-${suffix.slice(0, 16)}`;
const peerContainerName = process.env.STOCKQUANT_PARQUET_CAPACITY_PEER_CONTAINER_NAME;
const inContainer = Boolean(image);
let created = false; let service; let base; let peerBase; let serviceOutput = ""; let sampling = false; let peakServiceRssKiB = 0; let sampler; let rssDiagnostic = [];

function docker(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", timeout: 30_000, maxBuffer: 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed: ${(result.stderr ?? "").slice(0, 2000)}`);
  return result.stdout?.trim() ?? "";
}

function sha(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
async function request(path, method = "GET", body, baseUrl = base) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { ...marketDataSmokeAuthHeaders, "x-stockquant-owner-id": OWNER, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(180_000),
  });
  return { status: response.status, retryAfter: response.headers.get("retry-after"), body: await response.json() };
}
async function stopService() {
  if (!service) return;
  if (inContainer) {
    if (peerContainerName) { try { docker(["rm", "--force", peerContainerName]); } catch { /* exact peer may already have exited */ } }
    try { docker(["rm", "--force", containerName]); } catch { /* exact test container may already have exited */ }
    service = undefined;
    return;
  }
  if (service.exitCode === null) {
    service.kill("SIGTERM");
    await Promise.race([new Promise((done) => service.once("exit", done)), delay(3000)]);
    if (service.exitCode === null) service.kill("SIGKILL");
  }
}

function serviceRunning() {
  if (!service) return false;
  if (!inContainer) return service.exitCode === null;
  try { return docker(["inspect", containerName, "--format", "{{.State.Running}}"]) === "true"; }
  catch { return false; }
}

async function freePort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolveListen); });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("could not allocate an HTTP port");
  await new Promise((resolveClose, reject) => listener.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function startPeerContainer() {
  if (!peerContainerName) return;
  assert.ok(network, "peer container requires the isolated test network");
  const peerPort = await freePort();
  docker(["run", "--detach", "--name", peerContainerName, "--platform", "linux/arm64", "--network", network, "--memory", "2g", "--cpus", "2", "--pids-limit", "128", "--publish", `127.0.0.1:${peerPort}:3002`, "--env", "NODE_ENV=test", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_PORT=3002", "--env", `STOCKQUANT_DATABASE_URL=${targetUrl.toString()}`, "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${marketDataSmokeAuthEnv.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`, "--env", "STOCKQUANT_SCHEDULER_WORKER=0", "--env", "STOCKQUANT_COLLECTION_EXECUTOR=0", "--env", "STOCKQUANT_PROJECT_ROOT=/workspace", image]);
  peerBase = `http://127.0.0.1:${peerPort}`;
  for (let attempt = 0; attempt < 150; attempt += 1) {
    let running = false;
    try { running = docker(["inspect", peerContainerName, "--format", "{{.State.Running}}"] ).trim() === "true"; } catch { /* container not created yet */ }
    if (!running) throw new Error(`peer Market Data container exited: ${docker(["logs", peerContainerName])}`);
    try { if ((await fetch(`${peerBase}/ready`)).ok) return; } catch { /* wait for readiness */ }
    await delay(100);
  }
  throw new Error(`peer Market Data container did not become ready: ${docker(["logs", peerContainerName])}`);
}

try {
  assert.equal(adminUrl.pathname, "/postgres");
  const fixedTestEndpoint = (adminUrl.hostname === "127.0.0.1" && adminUrl.port === "5433") || (adminUrl.hostname === "postgres" && adminUrl.port === "5432");
  const isolatedContainerEndpoint = Boolean(image && network) && adminUrl.hostname === "127.0.0.1" && /^\d+$/u.test(adminUrl.port);
  assert.ok(fixedTestEndpoint || isolatedContainerEndpoint, "must target the local test PostgreSQL endpoint or an explicitly configured isolated-container localhost port");
  const generated = spawnSync(python, [fixtureGenerator, fixturePath, compression], { encoding: "utf8", timeout: 60_000 });
  assert.equal(generated.status, 0, generated.stderr || "Parquet fixture generation failed");
  const bytes = await readFile(fixturePath); const sourceSha256 = sha(bytes);
  assert.ok(bytes.length < 64 * 1024 * 1024, "input stays below the Parquet source-size limit");
  const chunkCount = Math.ceil(bytes.length / CHUNK_BYTES);
  assert.ok(chunkCount <= 64, "input stays below the upload chunk limit");

  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}" OWNER market_data_test`); created = true;
  await db.connect();
  if (inContainer) {
    assert.ok(network, "container run requires a dedicated isolated Docker network");
    docker(["run", "--detach", "--name", containerName, "--platform", "linux/arm64", "--network", network, "--memory", "2g", "--cpus", "2", "--pids-limit", "128", "--publish", `127.0.0.1:${port}:3002`, "--env", "NODE_ENV=test", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_PORT=3002", "--env", `STOCKQUANT_DATABASE_URL=${targetUrl.toString()}`, "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${marketDataSmokeAuthEnv.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`, "--env", "STOCKQUANT_SCHEDULER_WORKER=0", "--env", "STOCKQUANT_COLLECTION_EXECUTOR=0", "--env", "STOCKQUANT_PROJECT_ROOT=/workspace", image]);
    service = containerName;
  } else {
    service = spawn(process.execPath, [resolve("dist/main.js")], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: tmpdir(), STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: targetUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", ...marketDataSmokeAuthEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => { if (serviceOutput.length < 8000) serviceOutput += chunk.toString().slice(0, 8000 - serviceOutput.length); });
  }
  for (let attempt = 0; attempt < 150; attempt += 1) {
    if (!serviceRunning()) throw new Error(`Market Data service exited: ${inContainer ? docker(["logs", containerName]) : serviceOutput}`);
    try { if ((await fetch(`${base}/ready`)).ok) break; } catch { /* wait for readiness */ }
    await delay(100);
  }
  assert.equal((await fetch(`${base}/ready`)).status, 200, serviceOutput);
  await startPeerContainer();
  sampling = true;
  sampler = (async () => {
    while (sampling) {
      let rss = 0;
      if (inContainer) {
        for (const name of [containerName, ...(peerContainerName ? [peerContainerName] : [])]) {
          const usage = spawnSync("docker", ["exec", name, "cat", "/proc/1/status"], { encoding: "utf8" });
          const match = usage.stdout?.match(/^VmRSS:\s+(\d+)\s+kB$/m);
          if (usage.status === 0 && match) rss = Math.max(rss, Number(match[1]));
          else if (rssDiagnostic.length < 4) rssDiagnostic.push({ name, status: usage.status, error: usage.error?.message, stderr: usage.stderr?.slice(0, 500), stdout: usage.stdout?.slice(0, 500) });
        }
      } else if (process.platform === "linux") {
        try { rss = Number(readFileSync(`/proc/${service.pid}/status`, "utf8").match(/^VmRSS:\s+(\d+)\s+kB$/m)?.[1]); } catch { /* process may be exiting */ }
      } else {
        const sample = spawnSync("ps", ["-o", "rss=", "-p", String(service.pid)], { encoding: "utf8" });
        rss = Number(sample.stdout?.trim());
      }
      if (Number.isFinite(rss)) peakServiceRssKiB = Math.max(peakServiceRssKiB, rss);
      await delay(inContainer ? 100 : 25);
    }
  })();
  // Ensure the short HTTP smoke has at least one completed RSS sample before upload work begins.
  if (inContainer) await delay(500);

  const metadata = {
    fileFormat: "PARQUET",
    mapping: Object.fromEntries(["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"].map((field) => [field, field])),
    provenance: { sourceName: `synthetic-parquet-capacity-${suffix}`, sourceReference: null, licenseStatement: "Deterministic synthetic capacity input", licenseVerification: "UNCONFIRMED", acquiredAt: "2026-09-26T00:00:00Z" },
    market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY",
  };
  const uploadStartedAt = performance.now();
  const createdUpload = await request("/v2/minute/parquet/uploads", "POST", { uploadId: UPLOAD_ID, expectedSha256: sourceSha256, expectedBytes: bytes.length, metadata });
  assert.equal(createdUpload.status, 201); assert.equal(createdUpload.body.expectedChunks, chunkCount);
  for (let index = 0; index < chunkCount; index += 1) {
    const chunk = bytes.subarray(index * CHUNK_BYTES, Math.min(bytes.length, (index + 1) * CHUNK_BYTES));
    const uploaded = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/chunks/${index}`, "PUT", { contentBase64: chunk.toString("base64"), sha256: sha(chunk) });
    assert.equal(uploaded.status, 200, `chunk ${index}/${chunkCount} failed: ${JSON.stringify(uploaded.body)}`);
  }
  const uploadMs = Math.round(performance.now() - uploadStartedAt);

  const startedAt = performance.now();
  let preview;
  let crossInstancePreviewBusy = false;
  if (peerBase) {
    const attempts = await Promise.all([
      request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/preview`, "POST", {}, base),
      request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/preview`, "POST", {}, peerBase),
    ]);
    const accepted = attempts.filter((outcome) => outcome.status === 200);
    const busy = attempts.filter((outcome) => outcome.status === 429);
    assert.equal(accepted.length, 1, `one preview is admitted across two service processes: ${JSON.stringify(attempts.map(({ status, body }) => ({ status, code: body.code })))}`);
    assert.equal(busy.length, 1); assert.equal(busy[0].retryAfter, "1"); assert.equal(busy[0].body.code, "MINUTE_IMPORT_BUSY");
    crossInstancePreviewBusy = true;
    preview = accepted[0];
    await delay(1_100);
    const afterRelease = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/preview`, "POST", {}, peerBase);
    assert.equal(afterRelease.status, 200, JSON.stringify(afterRelease.body).slice(0, 1000));
  } else preview = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/preview`, "POST", {});
  const previewMs = Math.round(performance.now() - startedAt);
  assert.equal(preview.status, 200, JSON.stringify(preview.body).slice(0, 2000));
  assert.equal(preview.body.totalRows, ROWS); assert.equal(preview.body.acceptedRows, ROWS); assert.equal(preview.body.errors.length, 0);
  assert.equal(preview.body.bars.length, 100); assert.equal(preview.body.barsTruncated, true);

  const finalizeStart = performance.now();
  let published;
  let retry;
  let crossInstanceFinalizeBusy = false;
  if (peerBase) {
    const attempts = await Promise.all([
      request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/finalize`, "POST", {}, base),
      request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/finalize`, "POST", {}, peerBase),
    ]);
    const accepted = attempts.filter((outcome) => [200, 201].includes(outcome.status));
    const busy = attempts.filter((outcome) => outcome.status === 429);
    assert.equal(accepted.length, 1, `one finalize is admitted across two service processes: ${JSON.stringify(attempts.map(({ status, body }) => ({ status, code: body.code })))}`);
    assert.equal(busy.length, 1); assert.equal(busy[0].retryAfter, "1"); assert.equal(busy[0].body.code, "MINUTE_IMPORT_BUSY");
    crossInstanceFinalizeBusy = true;
    published = accepted[0];
    await delay(1_100);
    retry = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/finalize`, "POST", {}, peerBase);
  } else {
    published = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/finalize`, "POST", {});
    retry = await request(`/v2/minute/parquet/uploads/${UPLOAD_ID}/finalize`, "POST", {});
  }
  const finalizeMs = Math.round(performance.now() - finalizeStart);
  assert.ok([200, 201].includes(published.status), JSON.stringify(published.body).slice(0, 2000));
  assert.equal(published.body.status, "PUBLISHED"); assert.equal(published.body.accepted, ROWS);
  assert.equal(published.body.sha256, sourceSha256);
  assert.equal(retry.status, 200); assert.equal(retry.body.idempotent, true); assert.equal(retry.body.version, published.body.version);

  const upload = await db.query("SELECT status,completed_result FROM market_data_minute_uploads WHERE upload_id=$1", [UPLOAD_ID]);
  assert.equal(upload.rowCount, 1); assert.equal(upload.rows[0].status, "COMPLETED");
  const imported = await db.query("SELECT status,accepted,source_sha256,import_manifest FROM market_data_minute_imports WHERE version=$1", [published.body.version]);
  assert.equal(imported.rowCount, 1); assert.equal(imported.rows[0].status, "PUBLISHED"); assert.equal(imported.rows[0].accepted, ROWS);
  assert.equal(imported.rows[0].source_sha256, sourceSha256); assert.equal(imported.rows[0].import_manifest.researchUseAllowed, false);
  const counts = await db.query("SELECT count(*)::integer AS rows,count(DISTINCT (bar_start AT TIME ZONE 'Asia/Shanghai')::date)::integer AS days FROM market_data_minute_import_bars_by_day WHERE version=$1", [published.body.version]);
  assert.equal(counts.rows[0].rows, ROWS); assert.equal(counts.rows[0].days, 5);
  const first = await db.query("SELECT security_id,bar_start,bar->>'open' AS open,bar->>'high' AS high,bar->>'low' AS low,bar->>'close' AS close,bar->>'volume' AS volume,bar->>'amount' AS amount FROM market_data_minute_import_bars_by_day WHERE version=$1 ORDER BY bar_start,security_id LIMIT 1", [published.body.version]);
  assert.equal(first.rows[0].security_id, "600000.SH"); assert.equal(first.rows[0].bar_start.toISOString(), "2024-01-02T01:30:00.000Z");
  assert.equal(Number(first.rows[0].open), 10); assert.equal(Number(first.rows[0].high), 10.02); assert.equal(Number(first.rows[0].low), 9.98);

  const pageSize = 1000; let cursor = 0; let pagedRows = 0; let pageCount = 0; let firstPagedBar; let lastPagedBar;
  const observedKeys = new Set(); const pageStarted = performance.now();
  for (;;) {
    const page = await request(`/v2/minute/imports/${encodeURIComponent(published.body.version)}/bars?cursor=${cursor}&pageSize=${pageSize}`);
    assert.equal(page.status, 200, `durable Bar page ${pageCount + 1} failed: ${JSON.stringify(page.body).slice(0, 1000)}`);
    assert.equal(page.body.version, published.body.version); assert.ok(page.body.items.length > 0 && page.body.items.length <= pageSize);
    for (const bar of page.body.items) {
      assert.ok(Number.isFinite(bar.open) && Number.isFinite(bar.high) && Number.isFinite(bar.low) && Number.isFinite(bar.close) && Number.isFinite(bar.volume));
      const key = `${bar.securityId}|${bar.barStart}`;
      assert.equal(observedKeys.has(key), false, `duplicate paged Bar ${key}`); observedKeys.add(key);
      firstPagedBar ??= bar; lastPagedBar = bar;
    }
    pagedRows += page.body.items.length; pageCount += 1;
    if (page.body.nextCursor === null) break;
    const nextCursor = Number(page.body.nextCursor);
    assert.ok(Number.isSafeInteger(nextCursor) && nextCursor > cursor, "Bar page cursor must increase monotonically"); cursor = nextCursor;
    assert.ok(pageCount < 101, "100,000 persisted Bars should complete within 100 pages at pageSize=1,000");
  }
  const queryPagesMs = Math.round(performance.now() - pageStarted);
  assert.equal(pageCount, 100); assert.equal(pagedRows, ROWS); assert.equal(observedKeys.size, ROWS);
  assert.equal(firstPagedBar.securityId, "600000.SH"); assert.equal(firstPagedBar.barStart, "2024-01-02T01:30:00.000Z");
  assert.equal(lastPagedBar.securityId, "600499.SH"); assert.equal(lastPagedBar.barStart, "2024-01-08T06:15:00.000Z");
  let filteredCursor = 0; let filteredRows = 0; let filteredPages = 0;
  const filter = new URLSearchParams({ cursor: "0", pageSize: "25", securityId: "600000.SH", fromBarStart: "2024-01-02T01:30:00.000Z", toBarStart: "2024-01-03T01:30:00.000Z" });
  for (;;) {
    filter.set("cursor", String(filteredCursor));
    const filtered = await request(`/v2/minute/imports/${encodeURIComponent(published.body.version)}/bars?${filter}`);
    assert.equal(filtered.status, 200); assert.ok(filtered.body.items.every((bar) => bar.securityId === "600000.SH" && bar.barStart >= "2024-01-02T01:30:00.000Z" && bar.barStart < "2024-01-03T01:30:00.000Z"));
    filteredRows += filtered.body.items.length; filteredPages += 1;
    if (filtered.body.nextCursor === null) break;
    filteredCursor = Number(filtered.body.nextCursor); assert.ok(Number.isSafeInteger(filteredCursor) && filteredCursor > 0);
    assert.ok(filteredPages < 4);
  }
  assert.equal(filteredRows, 40); assert.equal(filteredPages, 2);

  const badBytes = Buffer.from("not a parquet file; deterministic corrupt-input recovery case");
  const badUploadId = randomUUID(); const badSourceHash = sha(badBytes);
  const badMetadata = { ...metadata, provenance: { ...metadata.provenance, sourceName: `synthetic-parquet-corrupt-${suffix}` } };
  const badCreated = await request("/v2/minute/parquet/uploads", "POST", { uploadId: badUploadId, expectedSha256: badSourceHash, expectedBytes: badBytes.length, metadata: badMetadata });
  assert.equal(badCreated.status, 201);
  const badChunk = await request(`/v2/minute/parquet/uploads/${badUploadId}/chunks/0`, "PUT", { contentBase64: badBytes.toString("base64"), sha256: badSourceHash });
  assert.equal(badChunk.status, 200);
  const badPreview = await request(`/v2/minute/parquet/uploads/${badUploadId}/preview`, "POST", {});
  assert.equal(badPreview.status, 422); assert.equal(badPreview.body.code, "PARQUET_PARSE_REJECTED");
  await delay(1_100);
  const badRetryPreview = await request(`/v2/minute/parquet/uploads/${badUploadId}/preview`, "POST", {});
  assert.equal(badRetryPreview.status, 422); assert.equal(badRetryPreview.body.code, "PARQUET_PARSE_REJECTED", "failed preview releases the finalization lease for diagnosis/retry");
  const cancelled = await request(`/v2/minute/parquet/uploads/${badUploadId}/cancel`, "POST", {});
  assert.equal(cancelled.status, 200); assert.equal(cancelled.body.status, "CANCELLED");
  const badRows = await db.query("SELECT status FROM market_data_minute_imports WHERE import_manifest->'provenance'->>'sourceName'=$1", [badMetadata.provenance.sourceName]);
  assert.equal(badRows.rowCount, 0, "bad Parquet created no published or rejected import record");
  assert.equal(Number((await db.query("SELECT count(*) AS count FROM market_data_minute_import_bars_by_day WHERE version=$1", [published.body.version])).rows[0].count), ROWS, "bad parse/retry/cancel did not alter the good publication");
  const databaseBytes = Number((await db.query("SELECT pg_database_size(current_database()) AS bytes")).rows[0].bytes);
  sampling = false; await sampler;
  assert.ok(peakServiceRssKiB > 0, `container RSS sampler produced no samples: ${JSON.stringify(rssDiagnostic)}`);
  await stopService();
  console.log(JSON.stringify({
    status: "PASS", fixture: { format: "Parquet", compression, rows: ROWS, securities: 500, fiveMinuteBarsPerSecurity: 200, tradingDays: counts.rows[0].days, bytes: bytes.length, chunks: chunkCount, sha256: sourceSha256, provenance: "synthetic; UNCONFIRMED; researchUseAllowed=false" },
    http: { uploadMs, previewMs, finalizeMs, queryPagesMs, queryPageSize: pageSize, queryPageCount: pageCount, queriedRows: pagedRows, uniqueQueriedBars: observedKeys.size, filteredQueryRows: filteredRows, filteredQueryPages: filteredPages, previewRows: preview.body.totalRows, previewRetainedBars: preview.body.bars.length, publishedRows: published.body.accepted, idempotentRetry: retry.body.idempotent, crossInstanceCount: peerBase ? 2 : 1, crossInstancePreviewBusy, crossInstanceFinalizeBusy, corruptParquetRejectedTwice: badPreview.body.code === "PARQUET_PARSE_REJECTED" && badRetryPreview.body.code === "PARQUET_PARSE_REJECTED", corruptUploadCancelled: cancelled.body.status, corruptRowsPublished: badRows.rowCount },
    persistence: { database, version: published.body.version, rows: counts.rows[0].rows, distinctTradingDays: counts.rows[0].days, sourceHashMatch: true, databaseBytes },
    resourceUsage: { peakServiceRssKiB },
    environment: { platform: inContainer ? "Docker Linux/arm64" : process.platform, architecture: inContainer ? "arm64" : process.arch, containerLimits: inContainer ? { memory: "2 GiB", cpus: 2, pids: 128 } : undefined }, externalCalls: 0, modelCalls: 0, brokerCalls: 0,
  }, null, 2));
} finally {
  sampling = false; if (sampler) await sampler;
  await stopService();
  await db.end().catch(() => undefined);
  if (created) {
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    assert.equal((await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [database])).rowCount, 0, "random capacity database must be removed");
  }
  await admin.end().catch(() => undefined);
  await rm(tempDir, { recursive: true, force: true });
}
