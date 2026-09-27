import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const script = resolve("scripts/minute-parquet-capacity-http-smoke.mjs");
const codecs = ["zstd", "snappy", "none"];
const cases = [];
for (const compression of codecs) {
  const run = spawnSync(process.execPath, [script], { encoding: "utf8", timeout: 600_000, maxBuffer: 4 * 1024 * 1024, env: { ...process.env, STOCKQUANT_PARQUET_CAPACITY_COMPRESSION: compression } });
  assert.equal(run.status, 0, `${compression} capacity smoke failed:\n${run.stderr}\n${run.stdout}`);
  const report = JSON.parse(run.stdout.trim());
  assert.equal(report.status, "PASS"); assert.equal(report.fixture.compression, compression);
  assert.equal(report.fixture.rows, 100_000); assert.equal(report.http.publishedRows, 100_000);
  assert.equal(report.persistence.rows, 100_000); assert.equal(report.persistence.sourceHashMatch, true);
  assert.equal(report.http.idempotentRetry, true); assert.equal(report.http.corruptUploadCancelled, "CANCELLED");
  assert.equal(report.externalCalls + report.modelCalls + report.brokerCalls, 0);
  cases.push({ codec: compression, report });
}
const sizes = cases.map(({ report }) => report.fixture.bytes);
assert.ok(sizes[0] < sizes[1] && sizes[1] < sizes[2], `expected zstd < snappy < uncompressed source sizes, got ${sizes.join(", ")}`);
const uncompressed = sizes[2];
console.log(JSON.stringify({
  status: "PASS",
  comparison: cases.map(({ codec, report }) => ({
    codec, sourceBytes: report.fixture.bytes, sourceSha256: report.fixture.sha256,
    sourceSizeRatioToUncompressed: Number((uncompressed / report.fixture.bytes).toFixed(2)),
    uploadMs: report.http.uploadMs, previewMs: report.http.previewMs, finalizeMs: report.http.finalizeMs,
    rows: report.persistence.rows, databaseBytes: report.persistence.databaseBytes, peakServiceRssKiB: report.resourceUsage.peakServiceRssKiB,
  })),
  note: "same deterministic 100k synthetic rows; each codec used a distinct temporary PostgreSQL database that the underlying smoke drops; database bytes are total size after import, not an attributed per-codec delta",
  externalCalls: 0, modelCalls: 0, brokerCalls: 0,
}, null, 2));
