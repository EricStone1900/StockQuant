import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { previewMinuteParquetStream } from "../../src/application/minute-parquet-import.js";

const fixturePath = resolve(process.cwd(), "../../fixtures/v2/v2.2-parquet-smoke/minute-upload.parquet");
const mapping = Object.fromEntries(["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"].map((field) => [field, field]));
const semantics = { mapping, market: "CN_A" as const, frequency: "1m" as const, adjustment: "RAW" as const, timezone: "Asia/Shanghai" as const, timestampSemantics: "BAR_START" as const, volumeUnit: "SHARES" as const, amountUnit: "CNY" as const };

async function* chunks(bytes: Buffer) {
  for (let offset = 0; offset < bytes.length; offset += 127) yield bytes.subarray(offset, Math.min(bytes.length, offset + 127));
}

describe("streamed minute Parquet import", () => {
  it("preserves the binary source hash and stages normalized rows in bounded batches", async () => {
    const source = await readFile(fixturePath);
    const written: unknown[] = [];
    const parsed = await previewMinuteParquetStream(semantics, chunks(source), mapping, {
      retainBars: false,
      batchSize: 1,
      onBarsBatch: async (batch) => { written.push(...batch); },
    });

    expect(parsed.sourceSha256).toBe(createHash("sha256").update(source).digest("hex"));
    expect(parsed.preview.totalRows).toBe(2);
    expect(parsed.preview.acceptedRows).toBe(2);
    expect(parsed.preview.errors).toEqual([]);
    expect(parsed.preview.bars).toEqual([]);
    expect(written).toMatchObject([
      { securityId: "600000.SH", barStart: "2026-09-24T01:30:00.000Z", open: 10, close: 10.2, volume: 100 },
      { securityId: "000001.SZ", barStart: "2026-09-24T01:31:00.000Z", open: 12, close: 12.1, volume: 200 },
    ]);
  });

  it("rejects corrupt Parquet, unsupported semantics and duplicate source-column mappings", async () => {
    const source = await readFile(fixturePath);
    await expect(previewMinuteParquetStream({ ...semantics, timezone: "UTC" as "Asia/Shanghai" }, chunks(source), mapping)).rejects.toThrow("semantics");
    await expect(previewMinuteParquetStream(semantics, chunks(source), { ...mapping, amount: "volume" })).rejects.toThrow("distinct");
    await expect(previewMinuteParquetStream(semantics, chunks(Buffer.from("not parquet")), mapping)).rejects.toThrow("Parquet adapter rejected");
  });
});
