import { describe, expect, it } from "vitest";
import { historicalContextStatus, MAX_MINUTE_CSV_BYTES, minuteCsvImportIdentity, previewMinuteCsv, previewMinuteCsvStream } from "../../src/application/minute-csv-import.js";

const metadata = {
  mapping: { securityId: "code", timestamp: "time", open: "o", high: "h", low: "l", close: "c", volume: "vol", amount: "amt" },
  market: "CN_A" as const,
  frequency: "1m" as const,
  adjustment: "RAW" as const,
  timezone: "Asia/Shanghai" as const,
  timestampSemantics: "BAR_START" as const,
  volumeUnit: "SHARES" as const,
  amountUnit: "CNY" as const,
};
const provenance = { sourceName: "fixture test source", sourceReference: null, licenseStatement: "synthetic tests only", licenseVerification: "OPERATOR_CONFIRMED" as const, acquiredAt: "2026-09-24T12:00:00.000Z" };

describe("minute CSV preview", () => {
  it("binds idempotency to raw bytes, canonical field mapping and declared semantics", () => {
    const content = "code,time,o,h,l,c,vol,amt\n600000,2026-09-24 09:30,10,11,9,10,100,1000\n";
    const first = minuteCsvImportIdentity(content, metadata.mapping, metadata, provenance);
    const reordered = minuteCsvImportIdentity(content, Object.fromEntries(Object.entries(metadata.mapping).reverse()), { ...metadata }, { ...provenance });
    const changedMapping = minuteCsvImportIdentity(content, { ...metadata.mapping, securityId: "time", timestamp: "code" }, metadata, provenance);
    const changedProvenance = minuteCsvImportIdentity(content, metadata.mapping, metadata, { ...provenance, licenseStatement: "unknown license" });
    const changedHistoricalContext = minuteCsvImportIdentity(content, metadata.mapping, metadata, provenance, { securityUniverseVersion: "universe-2026-09", marketRuleSetVersion: "rules-cn-a-v3", corporateActionVersion: "actions-2026-q3" });
    expect(reordered).toEqual(first);
    expect(changedMapping.sourceSha256).toBe(first.sourceSha256);
    expect(changedMapping.importKeySha256).not.toBe(first.importKeySha256);
    expect(changedProvenance.sourceSha256).toBe(first.sourceSha256);
    expect(changedProvenance.importKeySha256).not.toBe(first.importKeySha256);
    expect(changedHistoricalContext.sourceSha256).toBe(first.sourceSha256);
    expect(changedHistoricalContext.importKeySha256).not.toBe(first.importKeySha256);
  });

  it("limits historical use until universe, MarketRuleSet and corporate action references are all provided", () => {
    expect(historicalContextStatus({ securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null })).toBe("LIMITED_MISSING_REFERENCES");
    expect(historicalContextStatus({ securityUniverseVersion: "universe-v1", marketRuleSetVersion: "rules-v1", corporateActionVersion: "actions-v1" })).toBe("READY_FOR_REVIEW");
  });

  it("maps explicit columns and converts Shanghai bar starts to UTC", async () => {
    const result = await previewMinuteCsv({ ...metadata, content: "code,time,o,h,l,c,vol,amt\n600000,2026-09-24 09:30,10,11,9,10.5,100,1050\n" });
    expect(result).toMatchObject({ totalRows: 1, acceptedRows: 1, errors: [] });
    expect(result.bars[0]).toMatchObject({ securityId: "600000.SH", barStart: "2026-09-24T01:30:00.000Z", barEnd: "2026-09-24T01:31:00.000Z", adjustment: "RAW", tradingStatus: "UNKNOWN", tradingStatusReference: null, limitPriceReference: { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null } });
  });

  it("imports BaoStock compact Shanghai timestamps as aligned five-minute bars", async () => {
    const result = await previewMinuteCsv({ ...metadata, frequency: "5m", timestampSemantics: "BAR_END", mapping: { securityId: "code", timestamp: "time", open: "o", high: "h", low: "l", close: "c", volume: "volume", amount: "amount" }, content: "date,time,code,o,h,l,c,volume,amount\n2024-01-02,20240102093500000,sh.600259,36.58,36.58,34.8,34.87,3191500,113428416\n" });
    expect(result).toMatchObject({ totalRows: 1, acceptedRows: 1, errors: [] });
    expect(result.bars[0]).toMatchObject({ securityId: "600259.SH", frequency: "5m", barStart: "2024-01-02T01:30:00.000Z", barEnd: "2024-01-02T01:35:00.000Z", availableAt: "2024-01-02T01:35:00.000Z" });
  });

  it("rejects compact timestamps outside the declared frequency boundary", async () => {
    const result = await previewMinuteCsv({ ...metadata, frequency: "5m", content: "code,time,o,h,l,c,vol,amt\n600000,20240102093600000,10,11,9,10,100,1000\n" });
    expect(result.acceptedRows).toBe(0);
    expect(result.errors[0]).toMatchObject({ row: 2, code: "TIMESTAMP_ALIGNMENT_INVALID" });
  });

  it("preserves quoted commas and reports malformed rows and invalid dates", async () => {
    const result = await previewMinuteCsv({ ...metadata, content: 'code,time,o,h,l,c,vol,amt\n"600000",2026-09-24 09:30,10,11,9,10,100,1000\n600000,2026-02-30 09:30,10,11,9,10,100,1000\n600000,2026-09-24 09:31,,11,9,10,100,1000\n' });
    expect(result.acceptedRows).toBe(1);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ row: 3, code: "TIMESTAMP_INVALID" }),
      expect.objectContaining({ row: 4, code: "NUMBER_INVALID" }),
    ]));
  });

  it("locates repeated-key errors in one row-wise pass without losing source row numbers", async () => {
    const rows = Array.from({ length: 250 }, () => "600000,2026-09-24 09:30,10,11,9,10,100,1000");
    const result = await previewMinuteCsv({ ...metadata, content: `code,time,o,h,l,c,vol,amt\n${rows.join("\n")}` });
    expect(result.acceptedRows).toBe(0);
    expect(result.errors.filter((error) => error.code === "DUPLICATE_CONFLICT")).toHaveLength(250);
    expect(result.errors[0]).toMatchObject({ row: 2, code: "DUPLICATE_CONFLICT" });
  });

  it("rejects implicit or conflicting field semantics before parsing data", async () => {
    await expect(previewMinuteCsv({ ...metadata, timezone: "UTC" as "Asia/Shanghai", content: "code,time,o,h,l,c,vol,amt\n" })).rejects.toThrow();
    await expect(previewMinuteCsv({ ...metadata, content: "a,a,o,h,l,c,vol,amt\n" })).rejects.toThrow("unique");
    await expect(previewMinuteCsv({ ...metadata, content: "code,time,o,h,l,c,vol,amt\n", mapping: { ...metadata.mapping, timestamp: "missing" } })).rejects.toThrow("existing CSV header");
    await expect(previewMinuteCsv({ ...metadata, content: "code,time,o,h,l,c,vol,amt\n", mapping: { ...metadata.mapping, timestamp: "code" } })).rejects.toThrow("distinct header");
  });

  it("rejects oversized content and malformed quoting", async () => {
    await expect(previewMinuteCsv({ ...metadata, content: "x".repeat(MAX_MINUTE_CSV_BYTES + 1) })).rejects.toThrow(`${MAX_MINUTE_CSV_BYTES} byte limit`);
    await expect(previewMinuteCsv({ ...metadata, content: 'code,time,o,h,l,c,vol,amt\n"unterminated' })).rejects.toThrow("quoted field");
    await expect(previewMinuteCsv({ ...metadata, content: 'code,time,o,h,l,c,vol,amt\n"600000"x,2026-09-24 09:30,10,11,9,10,100,1000' })).rejects.toThrow("after a closing CSV quote");
  });

  it("parses split UTF-8/quoted CSV chunks without materializing the source rows", async () => {
    const content = '\ufeffcode,time,o,h,l,c,vol,amt,memo\r\n"600000",2026-09-24 09:30,10,11,9,10,100,1000,"浦发,行情"\r\n';
    const bytes = Buffer.from(content, "utf8");
    async function* chunks() { for (let offset = 0; offset < bytes.length; offset += 1) yield bytes.subarray(offset, offset + 1); }
    const result = await previewMinuteCsvStream(metadata, chunks());
    expect(result.preview).toMatchObject({ totalRows: 1, acceptedRows: 1, errors: [], headers: expect.arrayContaining(["memo"]) });
    expect(result.preview.bars[0].securityId).toBe("600000.SH");
    expect(result.sourceSha256).toBe(minuteCsvImportIdentity(content, metadata.mapping, metadata, provenance).sourceSha256);
  });

  it("emits bounded persistence batches without retaining all bars during finalization", async () => {
    const content = `code,time,o,h,l,c,vol,amt\n${Array.from({ length: 5 }, (_, index) => `60000${index}.SH,2026-09-24 09:${String(30 + index).padStart(2, "0")},10,11,9,10,100,1000`).join("\n")}\n`;
    const bytes = Buffer.from(content);
    async function* chunks() { yield bytes.subarray(0, 37); yield bytes.subarray(37); }
    const batches: string[][] = [];
    const result = await previewMinuteCsvStream(metadata, chunks(), {
      retainBars: false,
      batchSize: 2,
      onBarsBatch: async (batch) => { batches.push(batch.map((bar) => bar.securityId)); },
    });
    expect(result.preview).toMatchObject({ totalRows: 5, acceptedRows: 5, errors: [], bars: [] });
    expect(batches).toEqual([["600000.SH", "600001.SH"], ["600002.SH", "600003.SH"], ["600004.SH"]]);
  });

  it("does not stage rejected OHLC rows or duplicate occurrences during streaming finalization", async () => {
    const content = [
      "code,time,o,h,l,c,vol,amt",
      "600000.SH,2026-09-24 09:30,10,11,9,10,100,1000",
      "600000.SH,2026-09-24 09:30,10,11,9,10,100,1000",
      "600001.SH,2026-09-24 09:30,10,9,10,10.1,100,1000",
    ].join("\n");
    async function* chunks() { yield Buffer.from(content); }
    const batches: string[][] = [];
    const result = await previewMinuteCsvStream(metadata, chunks(), {
      retainBars: false,
      batchSize: 1,
      onBarsBatch: async (batch) => { batches.push(batch.map((bar) => bar.securityId)); },
    });
    expect(result.preview).toMatchObject({ totalRows: 3, acceptedRows: 0, bars: [] });
    expect(result.preview.errors.map(({ code }) => code)).toEqual(["DUPLICATE_CONFLICT", "DUPLICATE_CONFLICT", "OHLC_INVALID"]);
    expect(batches).toEqual([["600000.SH"]]);
  });

  it("bounds retained preview bars and signals when accepted rows exceed the sample", async () => {
    const rows = Array.from({ length: 4 }, (_, index) => `60000${index}.SH,2026-09-24 09:30,10,11,9,10,100,1000`);
    async function* chunks() { yield Buffer.from(`code,time,o,h,l,c,vol,amt\n${rows.join("\n")}\n`); }
    const result = await previewMinuteCsvStream(metadata, chunks(), { maxRetainedBars: 2 });
    expect(result.preview.acceptedRows).toBe(4);
    expect(result.preview.bars).toHaveLength(2);
    expect(result.preview.bars.map((bar) => bar.securityId)).toEqual(["600000.SH", "600001.SH"]);
    expect(result.preview.barsTruncated).toBe(true);
  });

  it("enforces the row ceiling when the last record has no trailing newline", async () => {
    const row = "600000,2026-09-24 09:30,10,11,9,10,100,1000";
    const content = `code,time,o,h,l,c,vol,amt\n${Array.from({ length: 100_001 }, () => row).join("\n")}`;
    await expect(previewMinuteCsv({ ...metadata, content })).rejects.toThrow("100000 data rows");
  }, 20_000);
});
