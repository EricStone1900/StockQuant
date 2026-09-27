import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

const ROWS = 100_000;
const script = resolve(process.argv[1]);

function stamp(dayIndex, barIndex) {
  const date = new Date(Date.UTC(2024, 0, 2 + dayIndex));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  const dateText = date.toISOString().slice(0, 10).replaceAll("-", "");
  const minuteOfSession = barIndex % 48;
  const minuteOfDay = minuteOfSession < 24 ? 570 + minuteOfSession * 5 : 780 + (minuteOfSession - 24) * 5;
  const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minute = String(minuteOfDay % 60).padStart(2, "0");
  return `${dateText}${hour}${minute}00000`;
}

async function* csvChunks(kind) {
  yield Buffer.from("securityId,timestamp,open,high,low,close,volume,amount\n");
  const batch = [];
  const duplicateRow = "600000.SH,20240102093000000,10,10.2,9.9,10.1,100,1000";
  for (let index = 0; index < ROWS; index += 1) {
    if (kind === "duplicate") batch.push(duplicateRow);
    else {
      const security = index % 500;
      const ordinal = Math.floor(index / 500);
      const day = Math.floor(ordinal / 48);
      const slot = ordinal % 48;
      batch.push(`${String(600000 + security).padStart(6, "0")}.SH,${stamp(day, slot)},10,9,10,10.1,100,1000`);
    }
    if (batch.length === 500) { yield Buffer.from(`${batch.join("\n")}\n`); batch.length = 0; }
  }
  if (batch.length) yield Buffer.from(`${batch.join("\n")}\n`);
}

if (process.argv[2] === "--case") {
  const kind = process.argv[3];
  assert.ok(["duplicate", "invalid"].includes(kind));
  const baselineRss = process.memoryUsage().rss;
  const startedAt = performance.now();
  const { previewMinuteCsvStream } = await import("../dist/application/minute-csv-import.js");
  const result = await previewMinuteCsvStream({ mapping: { securityId: "securityId", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" }, market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" }, csvChunks(kind), { retainBars: false, batchSize: 1_000, onBarsBatch: async () => undefined });
  assert.equal(result.preview.totalRows, ROWS);
  assert.equal(result.preview.acceptedRows, 0);
  assert.equal(result.preview.bars.length, 0);
  assert.equal(result.preview.errors.length, ROWS);
  assert.ok(result.preview.errors.every((error) => error.code === (kind === "duplicate" ? "DUPLICATE_CONFLICT" : "OHLC_INVALID")));
  const maxRssRaw = process.resourceUsage().maxRSS;
  const maxRssBytes = maxRssRaw * (process.platform === "darwin" ? 1024 : 1);
  assert.ok(maxRssBytes <= 512 * 1024 * 1024, `100,000-row parser worker must stay below 512 MiB RSS, observed ${Math.round(maxRssBytes / 1024 / 1024)} MiB`);
  console.log(JSON.stringify({ kind, rows: ROWS, errors: result.preview.errors.length, accepted: result.preview.acceptedRows, baselineRssBytes: baselineRss, maxRss: maxRssRaw, maxRssBytes, maxRssUnit: process.platform === "darwin" ? "KiB" : "bytes", elapsedMs: Math.round(performance.now() - startedAt) }));
} else {
  const reports = [];
  for (const kind of ["duplicate", "invalid"]) {
    const child = spawnSync(process.execPath, [script, "--case", kind], { encoding: "utf8", timeout: 120_000, maxBuffer: 1_000_000 });
    assert.equal(child.status, 0, child.stderr || child.stdout || `${kind} capacity case did not finish`);
    reports.push(JSON.parse(child.stdout.trim()));
  }
  console.log(JSON.stringify({ status: "PASS", maxRows: ROWS, cases: reports, scope: "streaming-parser-only; no database, broker or external service" }, null, 2));
}
