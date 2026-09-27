import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Client, Pool } from "pg";
import { MinuteImportRepository } from "../dist/application/minute-import-repository.js";

const adminUrl = new URL(process.env.STOCKQUANT_PARTITION_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(adminUrl.username, "postgres");
assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres", "capacity smoke only creates a random local test database");
const suffix = randomUUID().replaceAll("-", "");
const database = `sq_md_partition_load_${suffix}`;
const targetUrl = new URL(adminUrl); targetUrl.pathname = `/${database}`;
const admin = new Client({ connectionString: adminUrl.toString() });
const pool = new Pool({ connectionString: targetUrl.toString(), max: 4 });
let created = false;

function shanghaiTimestamp(index) {
  const minuteOfDay = index < 24 ? 570 + index * 5 : 780 + (index - 24) * 5;
  return `${String(Math.floor(minuteOfDay / 60)).padStart(2,"0")}:${String(minuteOfDay % 60).padStart(2,"0")}`;
}

function tradingDates(count) {
  const dates = []; const day = new Date("2026-01-05T00:00:00Z");
  while (dates.length < count) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) dates.push(day.toISOString().slice(0,10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return dates;
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${database}"`); created = true;
  const repository = new MinuteImportRepository(pool);
  await repository.migrate();
  const dbSizeBefore = Number((await pool.query("SELECT pg_database_size(current_database()) AS bytes")).rows[0].bytes);
  const totalRows = Number(process.env.STOCKQUANT_PARTITION_SMOKE_ROWS ?? 100_000);
  assert.ok(Number.isSafeInteger(totalRows) && totalRows > 0 && totalRows <= 1_440_000, "STOCKQUANT_PARTITION_SMOKE_ROWS must be an integer from 1 to 1440000");
  const sourceSha256 = createHash("sha256").update(`synthetic-partition-smoke-${totalRows}-${suffix}`).digest("hex");
  const importKeySha256 = createHash("sha256").update(`synthetic-partition-key-${totalRows}-${suffix}`).digest("hex");
  const securities = 500; const barsPerDay = 48; const rowsPerDay = securities * barsPerDay; const dates = tradingDates(Math.ceil(totalRows / rowsPerDay)); let observedRss = process.resourceUsage().maxRSS;
  const startedAt = performance.now();
  const result = await repository.publishStream({
    expectedSha256: sourceSha256,
    manifest: { mapping: { securityId: "securityId", timestamp: "timestamp" }, semantics: { market: "CN_A", frequency: "1m", fixtureVersion: "synthetic-capacity-v1" }, provenance: null, researchUseAllowed: false },
    importKeyForSha: () => importKeySha256,
    parse: async (writeBatch) => {
      for (let offset = 0; offset < totalRows; offset += 1_000) {
        const batch = [];
        for (let local = 0; local < Math.min(1_000,totalRows-offset); local += 1) {
          const sequence = offset + local; const security = sequence % securities; const barNumber = Math.floor(sequence / securities); const dayNumber = Math.floor(barNumber / barsPerDay); const minute = barNumber % barsPerDay;
          const time = shanghaiTimestamp(minute); const date = `${dates[dayNumber]}T${time}:00+08:00`;
          const end = new Date(new Date(date).getTime() + 300_000).toISOString();
          batch.push({ securityId: `${String(600000 + security).padStart(6,"0")}.SH`, market: "CN_A", frequency: "5m", barStart: date, barEnd: end, availableAt: new Date(new Date(date).getTime() + 301_000).toISOString(), open: 10, high: 10.2, low: 9.9, close: 10.1, volume: 100, amount: 1_010, adjustment: "RAW" });
        }
        await writeBatch(batch);
        observedRss = Math.max(observedRss, process.resourceUsage().maxRSS);
      }
      return { sourceSha256, accepted: totalRows, errors: [] };
    },
  });
  const elapsedMs = Math.round(performance.now() - startedAt);
  assert.equal(result.record.status,"PUBLISHED"); assert.equal(result.record.accepted,totalRows);
  const persisted = Number((await pool.query("SELECT count(*) AS count FROM market_data_minute_import_bars_by_day WHERE version=$1",[result.record.version])).rows[0].count);
  assert.equal(persisted,totalRows);
  const firstDate = dates[0]; const nextDate = new Date(`${firstDate}T00:00:00Z`); nextDate.setUTCDate(nextDate.getUTCDate()+1); const nextDateText = nextDate.toISOString().slice(0,10);
  const page = await repository.page(result.record.version,0,10,"600000.SH",`${firstDate}T09:30:00+08:00`,`${firstDate}T09:35:00+08:00`);
  assert.equal(page.items.length,1); assert.equal(page.items[0].securityId,"600000.SH");
  const explain = await pool.query(`EXPLAIN (COSTS OFF) SELECT row_number FROM market_data_minute_import_bars_by_day WHERE version=$1 AND bar_start >= $2::timestamptz AND bar_start < $3::timestamptz`,[result.record.version,`${firstDate}T00:00:00+08:00`,`${nextDateText}T00:00:00+08:00`]);
  const plan = explain.rows.map(row => row["QUERY PLAN"]).join("\n"); assert.match(plan,new RegExp(`market_data_minute_import_bars_${firstDate.replaceAll("-","")}`,"u"));
  const dbSizeAfter = Number((await pool.query("SELECT pg_database_size(current_database()) AS bytes")).rows[0].bytes);
  const serverVersion = (await pool.query("SHOW server_version")).rows[0].server_version;
  const report = { status: "PASS", dataset: { rows: totalRows, securities, barsPerSecurity: totalRows / securities, barsPerDay, tradingDays: dates.length, firstDate: dates[0], lastDate: dates.at(-1), source: "deterministic synthetic; direct repository stream" }, runtime: { platform: process.platform, architecture: process.arch, postgresVersion: serverVersion }, elapsedMs, throughputRowsPerSecond: Math.round(totalRows * 1000 / elapsedMs), maxRss: { value: observedRss, unit: process.platform === "darwin" ? "KiB" : "bytes" }, databaseBytesBefore: dbSizeBefore, databaseBytesAfter: dbSizeAfter, databaseBytesDelta: dbSizeAfter - dbSizeBefore, partitionCount: Number((await pool.query("SELECT count(*) AS count FROM pg_inherits WHERE inhparent='market_data_minute_import_bars_by_day'::regclass")).rows[0].count), explainPlan: plan, pagedRows: page.items.length, brokerCalls: 0, externalCalls: 0 };
  console.log(JSON.stringify(report,null,2));
} finally {
  await pool.end();
  if (created) {
    await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
    const remaining = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1",[database]);
    assert.equal(remaining.rowCount,0,"random capacity-test database must be dropped");
  }
  await admin.end().catch(() => undefined);
}
