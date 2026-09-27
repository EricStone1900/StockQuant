import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { MinuteImportRepository } from "../dist/application/minute-import-repository.js";

const connectionString = process.env.MARKET_DATA_TEST_DATABASE_URL ?? "postgresql://market_data_test@127.0.0.1:5433/market_data_test";
const target = new URL(connectionString);
const database = decodeURIComponent(target.pathname.replace(/^\//u, ""));
assert.notEqual(database, "market_data", "partition smoke refuses the formal market_data database");
assert.notEqual(decodeURIComponent(target.username), "market_data", "partition smoke refuses the formal service identity");
const pool = new Pool({ connectionString });
const suffix = randomUUID().replaceAll("-", "");
const sourceHash = createHash("sha256").update(`partition-backfill-smoke-${suffix}`).digest("hex");
const importKey = createHash("sha256").update(`partition-backfill-key-${suffix}`).digest("hex");
const version = `partition-smoke-${suffix}`;
const importId = `partition-smoke-${suffix}`;
const bar = { securityId: "600000.SH", market: "CN_A", frequency: "1m", barStart: "2026-09-11T09:30:00+08:00", barEnd: "2026-09-11T09:31:00+08:00", availableAt: "2026-09-11T09:31:00+08:00", open: 10, high: 10.2, low: 9.9, close: 10.1, volume: 100, amount: 1000, adjustment: "RAW" };
const backfillScript = new URL("./minute-import-partition-backfill.mjs", import.meta.url);

function runBackfill(args) {
  const result = spawnSync(process.execPath, [backfillScript.pathname, ...args], { encoding: "utf8", env: { ...process.env, MARKET_DATA_PARTITION_BACKFILL_DATABASE_URL: connectionString } });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
}

try {
  await new MinuteImportRepository(pool).migrate();
  await pool.query(`INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest)
    VALUES($1,$2,$3,$4,'PUBLISHED',1,'[]'::jsonb,'{"mapping":{},"semantics":{},"provenance":null,"researchUseAllowed":false}'::jsonb)`, [importKey,sourceHash,importId,version]);
  await pool.query("INSERT INTO market_data_minute_import_rows(version,row_number,security_id,bar_start,bar) VALUES($1,1,$2,$3,$4::jsonb)", [version,bar.securityId,bar.barStart,JSON.stringify(bar)]);
  const preview = runBackfill([]);
  assert.equal(preview.mode, "PREVIEW"); assert.equal(preview.pendingBefore, 1); assert.equal(preview.insertedRows, 0);
  const applied = runBackfill(["--apply", "--batch-size=1"]);
  assert.equal(applied.mode, "APPLY"); assert.equal(applied.insertedRows, 1); assert.equal(applied.pendingAfter, 0);
  const retried = runBackfill(["--apply", "--batch-size=1"]);
  assert.equal(retried.insertedRows, 0); assert.equal(retried.pendingAfter, 0);
  const page = await new MinuteImportRepository(pool).page(version,0,10);
  assert.deepEqual(page,{ version,items:[bar],nextCursor:null });
  console.log(JSON.stringify({ status: "PASS", database, version, previewPending: preview.pendingBefore, insertedRows: applied.insertedRows, retryInsertedRows: retried.insertedRows, pageRows: page.items.length },null,2));
} finally {
  await pool.query("DELETE FROM market_data_minute_imports WHERE version=$1", [version]).catch(() => undefined);
  await pool.end();
}
