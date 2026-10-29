import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

const adminUrl = new URL(process.env.STOCKQUANT_MINUTE_UPLOAD_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres", "smoke is restricted to the local PostgreSQL admin endpoint");
assert.equal(adminUrl.username, "postgres");
const databaseName = `stockquant_upload_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${databaseName}`;
const admin = new Client({ connectionString: adminUrl.toString() });
let service; let created = false; let port; let base; let output = ""; let databaseReady = false; let minuteWorkerEnabled = false;
const uploadIds = [];

function capture(child) { for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 12000) output += chunk.toString().slice(0, 12000 - output.length); }); }
async function startService() {
  const env = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", STOCKQUANT_PROJECT_ROOT: resolve("../.."), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", STOCKQUANT_MINUTE_UPLOAD_WORKER: minuteWorkerEnabled ? "1" : "0", ...marketDataSmokeAuthEnv };
  service = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] }); capture(service);
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
  await Promise.race([new Promise((resolveClose) => service.once("close", resolveClose)), delay(3000)]);
  if (service.exitCode === null) service.kill("SIGKILL");
  service = undefined;
}
async function request(path, { method = "GET", body, owner = "upload-owner" } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { ...marketDataSmokeAuthHeaders, "x-stockquant-owner-id": owner, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(15000) });
  return { status: response.status, body: await response.json() };
}
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

try {
  const listener = createServer();
  port = await new Promise((resolvePort, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", () => { const value = listener.address().port; listener.close((error) => error ? reject(error) : resolvePort(value)); }); });
  base = `http://127.0.0.1:${port}`;
  await admin.connect(); await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  const owner = `upload-owner-${randomUUID()}`;
  const provenance = { sourceName: `resumable-smoke-${randomUUID()}`, sourceReference: null, licenseStatement: "synthetic integration fixture", licenseVerification: "OPERATOR_CONFIRMED", acquiredAt: "2026-09-25T00:00:00.000Z" };
  const metadata = { mapping: { securityId: "securityId", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" }, provenance, market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" };
  const rows = ["securityId,timestamp,open,high,low,close,volume,amount"];
  for (let minute = 0; minute < 160; minute += 1) {
    const totalMinutes = minute < 120 ? 9 * 60 + 30 + minute : 13 * 60 + minute - 120;
    const timestamp = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    for (let security = 0; security < 100; security += 1) rows.push(`${String(600000 + security).padStart(6, "0")}.SH,2026-09-21 ${timestamp},10,10.2,9.9,10.1,100,1000`);
  }
  const content = Buffer.from(`${rows.join("\n")}\n`, "utf8");
  assert.ok(content.length > 700_000, `fixture should exercise uploads larger than the legacy limit (${content.length})`);
  const expectedSha256 = sha(content); const uploadId = randomUUID(); uploadIds.push(uploadId);
  await startService(); databaseReady = true;
  const create = await request("/v2/minute/csv/uploads", { method: "POST", owner, body: { uploadId, expectedSha256, expectedBytes: content.length, metadata } });
  assert.equal(create.status, 201); assert.equal(create.body.expectedChunks, 2); assert.equal(create.body.status, "OPEN");
  const chunkSize = 512 * 1024; const first = content.subarray(0, chunkSize); const last = content.subarray(chunkSize);
  const firstBody = { contentBase64: first.toString("base64"), sha256: sha(first) };
  const lastBody = { contentBase64: last.toString("base64"), sha256: sha(last) };
  const firstPut = await request(`/v2/minute/csv/uploads/${uploadId}/chunks/0`, { method: "PUT", owner, body: firstBody });
  assert.equal(firstPut.status, 200); assert.deepEqual(firstPut.body.receivedChunks, [0]);
  const replayPut = await request(`/v2/minute/csv/uploads/${uploadId}/chunks/0`, { method: "PUT", owner, body: firstBody });
  assert.equal(replayPut.body.idempotent, true);
  const otherOwner = await request(`/v2/minute/csv/uploads/${uploadId}`, { owner: `${owner}-other` });
  assert.equal(otherOwner.status, 409, "an upload is not visible outside its owner scope");
  await stopService(); output = ""; await startService();
  const resumed = await request(`/v2/minute/csv/uploads/${uploadId}`, { owner });
  assert.equal(resumed.body.receivedBytes, first.length); assert.deepEqual(resumed.body.receivedChunks, [0]);
  const incomplete = await request(`/v2/minute/csv/uploads/${uploadId}/preview`, { method: "POST", owner, body: {} });
  assert.equal(incomplete.status, 409, "preview must refuse missing chunks");
  const lastPut = await request(`/v2/minute/csv/uploads/${uploadId}/chunks/1`, { method: "PUT", owner, body: lastBody });
  assert.equal(lastPut.status, 200); assert.deepEqual(lastPut.body.receivedChunks, [0, 1]);
  const preview = await request(`/v2/minute/csv/uploads/${uploadId}/preview`, { method: "POST", owner, body: {} });
  assert.equal(preview.status, 200); assert.equal(preview.body.totalRows, 16_000); assert.equal(preview.body.acceptedRows, 16_000); assert.equal(preview.body.errors.length, 0);
  const queued = await request(`/v2/minute/csv/uploads/${uploadId}/finalize-queued`, { method: "POST", owner, body: {} });
  assert.equal(queued.status, 202); assert.equal(queued.body.status, "QUEUED");
  assert.equal((await request(`/v2/minute/csv/uploads/${uploadId}/finalization`, { owner })).body.status, "QUEUED", "queued finalization state must be durable and owner scoped");
  await stopService(); output = ""; await startService();
  const interrupted = await request(`/v2/minute/csv/uploads/${uploadId}`, { owner });
  assert.equal(interrupted.status, 200); assert.equal(interrupted.body.status, "QUEUED", "queued state must survive service restart");
  const simulateWorkerCrash = new Client({ connectionString: databaseUrl.toString() }); await simulateWorkerCrash.connect();
  await simulateWorkerCrash.query("UPDATE market_data_minute_upload_jobs SET status='RUNNING',attempt=1,lease_owner='crashed-worker',lease_until=now()-interval '1 second' WHERE upload_id=$1", [uploadId]);
  await simulateWorkerCrash.query("UPDATE market_data_minute_uploads SET status='FINALIZING' WHERE upload_id=$1", [uploadId]);
  await simulateWorkerCrash.end();
  minuteWorkerEnabled = true;
  await stopService(); output = ""; await startService();
  let finalization;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    finalization = await request(`/v2/minute/csv/uploads/${uploadId}/finalization`, { owner });
    if (finalization.body?.status === "COMPLETED") break;
    await delay(500);
  }
  assert.equal(finalization.body.status, "COMPLETED"); assert.equal(finalization.body.attempt, 2, "worker must reclaim the expired RUNNING lease after process restart");
  const imported = finalization.body.result.body;
  assert.equal(imported.status, "PUBLISHED"); assert.equal(imported.accepted, 16_000); assert.equal(imported.sha256, expectedSha256); assert.equal(imported.uploadStatus, "COMPLETED");
  const completed = await request(`/v2/minute/csv/uploads/${uploadId}`, { owner });
  assert.equal(completed.body.receivedBytes, content.length); assert.equal(completed.body.status, "COMPLETED");
  const cancelAfterComplete = await request(`/v2/minute/csv/uploads/${uploadId}/cancel`, { method: "POST", owner, body: {} });
  assert.equal(cancelAfterComplete.status, 409);
  await stopService(); output = ""; await startService();
  const persisted = await request(`/v2/minute/imports/${encodeURIComponent(imported.version)}/bars?pageSize=1000`);
  assert.equal(persisted.body.items.length, 1000); assert.equal(persisted.body.nextCursor, "1000");
  const verify = new Client({ connectionString: databaseUrl.toString() }); await verify.connect();
  try {
    const staged = await verify.query("SELECT count(*)::integer AS rows FROM market_data_minute_import_bars_by_day WHERE version=$1", [imported.version]);
    assert.equal(staged.rows[0].rows, 16_000, "streamed batches must be atomically published with the exact accepted row count");
  } finally { await verify.end(); }

  const invalidRows = Array.from({ length: 1_001 }, (_, index) => `${String(100000 + index).padStart(6, "0")}.SH,2026-09-21 09:30,10,10.2,9.9,10.1,100,1000`);
  const invalidBytes = Buffer.from(`securityId,timestamp,open,high,low,close,volume,amount\n${invalidRows.join("\n")}\n\"unterminated`, "utf8");
  const verifyAtomicity = new Client({ connectionString: databaseUrl.toString() }); await verifyAtomicity.connect();
  const importsBeforeInvalid = Number((await verifyAtomicity.query("SELECT count(*) AS count FROM market_data_minute_imports")).rows[0].count);
  await verifyAtomicity.end();
  const invalidUploadId = randomUUID(); uploadIds.push(invalidUploadId);
  const invalidCreate = await request("/v2/minute/csv/uploads", { method: "POST", owner, body: { uploadId: invalidUploadId, expectedSha256: sha(invalidBytes), expectedBytes: invalidBytes.length, metadata } });
  assert.equal(invalidCreate.status, 201);
  const invalidChunk = await request(`/v2/minute/csv/uploads/${invalidUploadId}/chunks/0`, { method: "PUT", owner, body: { contentBase64: invalidBytes.toString("base64"), sha256: sha(invalidBytes) } });
  assert.equal(invalidChunk.status, 200);
  const invalidFinalize = await request(`/v2/minute/csv/uploads/${invalidUploadId}/finalize`, { method: "POST", owner, body: {} });
  assert.equal(invalidFinalize.status, 422);
  const released = await request(`/v2/minute/csv/uploads/${invalidUploadId}`, { owner });
  assert.equal(released.body.status, "OPEN", "parser failure must release FINALIZING so the owner can retry or cancel");
  const afterInvalid = new Client({ connectionString: databaseUrl.toString() }); await afterInvalid.connect();
  try {
    const importsAfter = Number((await afterInvalid.query("SELECT count(*) AS count FROM market_data_minute_imports")).rows[0].count);
    const rowsAfter = Number((await afterInvalid.query("SELECT count(*) AS count FROM market_data_minute_import_bars_by_day")).rows[0].count);
    assert.equal(importsAfter, importsBeforeInvalid, "failed streamed finalization must not persist an import record");
    assert.equal(rowsAfter, 16_000, "failed streamed finalization must roll back its already-written 1,000-row staging batch");
  } finally { await afterInvalid.end(); }
  const cancelledAfterFailure = await request(`/v2/minute/csv/uploads/${invalidUploadId}/cancel`, { method: "POST", owner, body: {} });
  assert.equal(cancelledAfterFailure.body.status, "CANCELLED");

  const quotaSeed = new Client({ connectionString: databaseUrl.toString() }); await quotaSeed.connect();
  const quotaSeedKey = sha(Buffer.from("published-minute-quota-seed")); const quotaSeedSource = sha(Buffer.from("published-minute-quota-seed-source"));
  await quotaSeed.query("INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest) VALUES($1,$2,$3,$4,'PUBLISHED',1440000,'[]'::jsonb,'{}'::jsonb)", [quotaSeedKey,quotaSeedSource,"quota-seed-import","quota-seed-version"]);
  const quotaBefore = Number((await quotaSeed.query("SELECT count(*) AS count FROM market_data_minute_imports")).rows[0].count);
  await quotaSeed.end();
  const oneBarCsv = "securityId,timestamp,open,high,low,close,volume,amount\n600000.SH,2026-09-21 09:30,10,10.2,9.9,10.1,100,1000\n";
  const quotaAttempt = await request("/v2/minute/csv/import", { method: "POST", owner, body: { content: oneBarCsv, mapping: { securityId: "securityId", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" }, provenance, market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" } });
  assert.equal(quotaAttempt.status, 429); assert.equal(quotaAttempt.body.code, "MINUTE_STORAGE_QUOTA_EXCEEDED", "real PostgreSQL accepted-count at capacity must reject the next HTTP import");
  const quotaAfter = new Client({ connectionString: databaseUrl.toString() }); await quotaAfter.connect();
  try { assert.equal(Number((await quotaAfter.query("SELECT count(*) AS count FROM market_data_minute_imports")).rows[0].count), quotaBefore, "quota rejection must not publish an import record"); }
  finally { await quotaAfter.end(); }

  const quotaOwner = `${owner}-quota`; const tinyHash = sha(Buffer.from("x")); const quotaIds = [randomUUID(), randomUUID(), randomUUID()]; uploadIds.push(...quotaIds);
  for (const quotaId of quotaIds.slice(0, 2)) assert.equal((await request("/v2/minute/csv/uploads", { method: "POST", owner: quotaOwner, body: { uploadId: quotaId, expectedSha256: tinyHash, expectedBytes: 1, metadata } })).status, 201);
  const denied = await request("/v2/minute/csv/uploads", { method: "POST", owner: quotaOwner, body: { uploadId: quotaIds[2], expectedSha256: tinyHash, expectedBytes: 1, metadata } });
  assert.equal(denied.status, 429);
  const cancelled = await request(`/v2/minute/csv/uploads/${quotaIds[0]}/cancel`, { method: "POST", owner: quotaOwner, body: {} });
  assert.equal(cancelled.body.status, "CANCELLED"); assert.equal(cancelled.body.receivedBytes, 0);
  const admitted = await request("/v2/minute/csv/uploads", { method: "POST", owner: quotaOwner, body: { uploadId: quotaIds[2], expectedSha256: tinyHash, expectedBytes: 1, metadata } });
  assert.equal(admitted.status, 201, "cancellation releases the per-owner active upload quota");
  const releaseOne = await request(`/v2/minute/csv/uploads/${quotaIds[1]}/cancel`, { method: "POST", owner: quotaOwner, body: {} }); assert.equal(releaseOne.body.status, "CANCELLED");
  const queuedCancelId = randomUUID(); uploadIds.push(queuedCancelId);
  const queuedCancelCreate = await request("/v2/minute/csv/uploads", { method: "POST", owner: quotaOwner, body: { uploadId: queuedCancelId, expectedSha256: tinyHash, expectedBytes: 1, metadata } }); assert.equal(queuedCancelCreate.status, 201);
  const queuedCancelChunk = await request(`/v2/minute/csv/uploads/${queuedCancelId}/chunks/0`, { method: "PUT", owner: quotaOwner, body: { contentBase64: "eA==", sha256: tinyHash } }); assert.equal(queuedCancelChunk.status, 200);
  const queuedCancelJob = await request(`/v2/minute/csv/uploads/${queuedCancelId}/finalize-queued`, { method: "POST", owner: quotaOwner, body: {} }); assert.equal(queuedCancelJob.body.status, "QUEUED");
  const queuedCancel = await request(`/v2/minute/csv/uploads/${queuedCancelId}/cancel`, { method: "POST", owner: quotaOwner, body: {} }); assert.equal(queuedCancel.body.status, "CANCELLED");
  assert.equal((await request(`/v2/minute/csv/uploads/${queuedCancelId}/finalization`, { owner: quotaOwner })).body.status, "CANCELLED");
  console.log(JSON.stringify({ status: "PASS", uploadId, bytes: content.length, sha256: expectedSha256, rows: imported.accepted, chunks: 2, serviceRestartResume: true, queuedFinalizationRecoveredAfterRestart: interrupted.body.status === "QUEUED" && finalization.body.status === "COMPLETED", expiredRunningLeaseReclaimedAfterRestart: finalization.body.attempt === 2, queuedCancellation: queuedCancel.body.status === "CANCELLED", wrongOwnerQueueHidden: (await request(`/v2/minute/csv/uploads/${queuedCancelId}/finalization`, { owner: `${quotaOwner}-other` })).status === 404, publishedCapacityHttpRefusal: quotaAttempt.status === 429 && quotaAttempt.body.code === "MINUTE_STORAGE_QUOTA_EXCEEDED", quotaRefusalIsAtomic: true, missingChunkRefused: true, parserFailureReleasesFinalization: released.body.status === "OPEN", parserFailureRollsBackStagedBatch: true, wrongOwnerRefused: true, duplicateChunkIdempotent: true, cancellationReleasesQuota: true, finalStatus: completed.body.status, importVersion: imported.version }));
} finally {
  await stopService();
  if (created) {
    const cleanup = new Client({ connectionString: adminUrl.toString() }); await cleanup.connect(); await cleanup.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); await cleanup.end();
  }
  await admin.end().catch(() => undefined);
}
