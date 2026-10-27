import { createHash } from "node:crypto";
import { validateBars, type QualityBar } from "./minute-quality.js";
import { withMinuteBarContextDefaults, type MinuteImportBar } from "../domain/minute-import.js";

export type MinuteCsvField = "securityId" | "timestamp" | "open" | "high" | "low" | "close" | "volume" | "amount";
export type MinuteCsvMapping = Partial<Record<MinuteCsvField, string>>;
export type MinuteCsvRowError = { row: number; field: string; code: string; message: string };
export type MinuteCsvPreview = { headers: string[]; totalRows: number; acceptedRows: number; errors: MinuteCsvRowError[]; bars: MinuteImportBar[]; barsTruncated: boolean };
export type MinuteCsvProvenance = {
  sourceName: string;
  sourceReference: string | null;
  licenseStatement: string;
  licenseVerification: "OPERATOR_CONFIRMED" | "UNCONFIRMED";
  acquiredAt: string;
};
export type MinuteCsvHistoricalContext = { securityUniverseVersion: string | null; marketRuleSetVersion: string | null; corporateActionVersion: string | null };
const EMPTY_HISTORICAL_CONTEXT: MinuteCsvHistoricalContext = { securityUniverseVersion: null, marketRuleSetVersion: null, corporateActionVersion: null };

const REQUIRED: MinuteCsvField[] = ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"];
export const MAX_MINUTE_CSV_BYTES = 64 * 1024 * 1024;
export const MAX_MINUTE_CSV_PREVIEW_BARS = 100;
const MAX_ROWS = 100_000;
const SHANGHAI_STAMP_FORMATTER = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export type MinuteCsvSemantics = {
  fileFormat?: "CSV" | "PARQUET";
  market: "CN_A";
  frequency: "1m" | "5m";
  adjustment: "RAW";
  timezone: "Asia/Shanghai";
  timestampSemantics: "BAR_START" | "BAR_END";
  volumeUnit: "SHARES";
  amountUnit: "CNY";
};

export function minuteCsvImportIdentityFromSha(sourceSha256: string, mapping: MinuteCsvMapping, semantics: MinuteCsvSemantics, provenance: MinuteCsvProvenance, historicalContext: MinuteCsvHistoricalContext = EMPTY_HISTORICAL_CONTEXT): { sourceSha256: string; importKeySha256: string } {
  if (!/^[0-9a-f]{64}$/u.test(sourceSha256)) throw new Error("source SHA-256 is invalid");
  const canonicalMapping = REQUIRED.map((field) => [field, mapping[field] ?? null]);
  const canonicalSemantics = [semantics.market, semantics.frequency, semantics.adjustment, semantics.timezone, semantics.timestampSemantics, semantics.volumeUnit, semantics.amountUnit];
  const canonicalProvenance = [provenance.sourceName, provenance.sourceReference, provenance.licenseStatement, provenance.licenseVerification, provenance.acquiredAt];
  const canonical = JSON.stringify({ sourceSha256, mapping: canonicalMapping, semantics: canonicalSemantics, ...(semantics.fileFormat === "PARQUET" ? { fileFormat: "PARQUET" } : {}), provenance: canonicalProvenance, historicalContext });
  return { sourceSha256, importKeySha256: createHash("sha256").update(canonical).digest("hex") };
}

export function minuteCsvImportIdentity(content: string, mapping: MinuteCsvMapping, semantics: MinuteCsvSemantics, provenance: MinuteCsvProvenance, historicalContext?: MinuteCsvHistoricalContext): { sourceSha256: string; importKeySha256: string } {
  const sourceSha256 = createHash("sha256").update(content, "utf8").digest("hex");
  return minuteCsvImportIdentityFromSha(sourceSha256, mapping, semantics, provenance, historicalContext);
}

export function historicalContextStatus(context: MinuteCsvHistoricalContext): "READY_FOR_REVIEW" | "LIMITED_MISSING_REFERENCES" {
  return Object.values(context).every((value) => typeof value === "string" && value.trim().length > 0) ? "READY_FOR_REVIEW" : "LIMITED_MISSING_REFERENCES";
}

async function* parseCsvRows(chunks: AsyncIterable<string>): AsyncGenerator<string[]> {
  let row: string[] = [], field = "", quoted = false, closedQuotedField = false;
  let pending = "", firstCharacter = true, rowNumber = 0;
  const consume = (text: string, final: boolean): string[][] => {
    const rows: string[][] = [];
    let offset = 0;
    if (firstCharacter && text.length) {
      firstCharacter = false;
      if (text.charCodeAt(0) === 0xfeff) offset = 1;
    }
    const limit = final ? text.length : Math.max(offset, text.length - 1);
    for (let index = offset; index < limit; index += 1) {
      const char = text[index];
      if (char === "\0") throw new Error("CSV contains a NUL byte");
      if (quoted) {
        if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
        else if (char === '"') { quoted = false; closedQuotedField = true; }
        else field += char;
      } else if (closedQuotedField && char !== "," && char !== "\n" && char !== "\r") {
        throw new Error("unexpected character after a closing CSV quote");
      } else if (char === '"') {
        if (field.length) throw new Error("unexpected quote in an unquoted CSV field");
        quoted = true;
      } else if (char === ",") { row.push(field); field = ""; closedQuotedField = false; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[index + 1] === "\n") index += 1;
        row.push(field); field = ""; closedQuotedField = false;
        if (row.some((cell) => cell.length > 0)) { rows.push(row); rowNumber += 1; }
        row = [];
        if (rowNumber > MAX_ROWS + 1) throw new Error(`CSV exceeds ${MAX_ROWS} data rows`);
      } else field += char;
    }
    pending = final ? "" : text.slice(limit);
    return rows;
  };
  for await (const chunk of chunks) {
    const text = pending + chunk;
    for (const parsed of consume(text, false)) yield parsed;
  }
  for (const parsed of consume(pending, true)) yield parsed;
  if (quoted) throw new Error("CSV ends inside a quoted field");
  row.push(field);
  if (row.some((cell) => cell.length > 0)) yield row;
}

export type MinuteCsvPreviewInput = {
  mapping: MinuteCsvMapping;
  market: "CN_A";
  frequency: "1m" | "5m";
  adjustment: "RAW";
  timezone: "Asia/Shanghai";
  timestampSemantics: "BAR_START" | "BAR_END";
  volumeUnit: "SHARES";
  amountUnit: "CNY";
};

export type MinuteCsvStreamOptions = { retainBars?: boolean; maxRetainedBars?: number; batchSize?: number; onBarsBatch?: (bars: MinuteImportBar[]) => Promise<void> };

export async function previewMinuteCsvStream(input: MinuteCsvPreviewInput, chunks: AsyncIterable<Uint8Array>, options: MinuteCsvStreamOptions = {}): Promise<{ preview: MinuteCsvPreview; sourceSha256: string }> {
  if (input.market !== "CN_A" || !["1m", "5m"].includes(input.frequency) || input.adjustment !== "RAW" || input.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(input.timestampSemantics) || input.volumeUnit !== "SHARES" || input.amountUnit !== "CNY") throw new Error("CSV semantics must explicitly match CN_A/1m-or-5m/RAW/Asia-Shanghai/BAR_START-or-BAR_END/SHARES/CNY");
  const hash = createHash("sha256");
  let byteLength = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  async function* decodeChunks(): AsyncGenerator<string> {
    for await (const chunk of chunks) {
      byteLength += chunk.byteLength;
      if (byteLength > MAX_MINUTE_CSV_BYTES) throw new Error(`CSV content exceeds the ${MAX_MINUTE_CSV_BYTES} byte limit`);
      hash.update(chunk);
      yield decoder.decode(chunk, { stream: true });
    }
    yield decoder.decode();
  }
  const rows = parseCsvRows(decodeChunks());
  const first = await rows.next();
  const headers = first.done ? [] : first.value.map((value) => value.trim());
  if (!headers.length || headers.some((header) => !header) || new Set(headers).size !== headers.length) throw new Error("CSV headers must be non-empty and unique");
  for (const field of REQUIRED) {
    const column = input.mapping[field];
    if (!column || !headers.includes(column)) throw new Error(`mapping for ${field} must name an existing CSV header`);
  }
  if (new Set(REQUIRED.map((field) => input.mapping[field])).size !== REQUIRED.length) throw new Error("each CSV field must map to a distinct header");
  const errors: MinuteCsvRowError[] = [];
  const retainedBars = new Map<number, MinuteImportBar>();
  const invalidCandidateRows = new Set<number>();
  const duplicateReportedRows = new Set<number>();
  const seen = new Map<string, number>();
  const pendingBatch: MinuteImportBar[] = [];
  const retainBars = options.retainBars ?? true;
  const maxRetainedBars = options.maxRetainedBars ?? MAX_ROWS;
  const batchSize = options.batchSize ?? 1_000;
  if (!Number.isSafeInteger(maxRetainedBars) || maxRetainedBars < 0 || maxRetainedBars > MAX_ROWS) throw new Error(`CSV maxRetainedBars must be between 0 and ${MAX_ROWS}`);
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 10_000) throw new Error("CSV parser batchSize must be between 1 and 10000");
  const flushBatch = async () => {
    if (!pendingBatch.length || !options.onBarsBatch) { pendingBatch.length = 0; return; }
    await options.onBarsBatch([...pendingBatch]);
    pendingBatch.length = 0;
  };
  let rowNumber = 1;
  let candidateCount = 0;
  for await (const cells of rows) {
    rowNumber += 1;
    if (rowNumber > MAX_ROWS + 1) throw new Error(`CSV exceeds ${MAX_ROWS} data rows`);
    if (cells.length !== headers.length) throw new Error("CSV rows must have the same number of columns as the header");
    const get = (field: MinuteCsvField) => cells[headers.indexOf(input.mapping[field]!)].trim();
    const rowErrors: MinuteCsvRowError[] = [];
    const ticker = get("securityId");
    const timestamp = get("timestamp");
    const stamp = /^(?:(\d{4}-\d{2}-\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?|([0-9]{4})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{3}))$/u.exec(timestamp);
    const values = Object.fromEntries((['open', 'high', 'low', 'close', 'volume', 'amount'] as const).map((field) => [field, Number(get(field))]));
    if (!/^(?:(?:\d{6}\.(?:SH|SZ|BJ))|(?:(?:sh|sz)\.)?\d{6})$/iu.test(ticker)) rowErrors.push({ row: rowNumber, field: input.mapping.securityId!, code: "SECURITY_INVALID", message: "证券代码格式无效" });
    if (!stamp) rowErrors.push({ row: rowNumber, field: input.mapping.timestamp!, code: "TIMESTAMP_INVALID", message: "时间戳须为 YYYY-MM-DD HH:mm[:ss]，按 Asia/Shanghai 解释" });
    for (const field of ["open", "high", "low", "close", "volume", "amount"] as const) if (!get(field) || !Number.isFinite(values[field])) rowErrors.push({ row: rowNumber, field: input.mapping[field]!, code: "NUMBER_INVALID", message: "字段必须是非空有限数字" });
    if (rowErrors.length) { errors.push(...rowErrors); continue; }
    const baostockCode = /^(sh|sz)\.(\d{6})$/iu.exec(ticker);
    const securityId = baostockCode ? `${baostockCode[2]}.${baostockCode[1]!.toUpperCase()}` : ticker.includes(".") ? ticker.toUpperCase() : `${ticker}.${ticker.startsWith("6") ? "SH" : ["4", "8"].some((prefix) => ticker.startsWith(prefix)) ? "BJ" : "SZ"}`;
    const date = stamp![1] ?? `${stamp![5]}-${stamp![6]}-${stamp![7]}`;
    const hour = stamp![2] ?? stamp![8]; const minute = stamp![3] ?? stamp![9]; const second = stamp![4] ?? stamp![10] ?? "00"; const millis = stamp![11] ?? "000";
    if (Number(millis) !== 0 || Number(second) !== 0 || (input.frequency === "5m" && Number(minute) % 5 !== 0)) { errors.push({ row: rowNumber, field: input.mapping.timestamp!, code: "TIMESTAMP_ALIGNMENT_INVALID", message: "分钟Bar时间必须落在频率边界且精确到整分钟" }); continue; }
    const local = `${date}T${hour}:${minute}:${second}+08:00`;
    const sourceTime = new Date(local);
    if (Number.isNaN(sourceTime.getTime()) || SHANGHAI_STAMP_FORMATTER.format(sourceTime) !== `${date} ${hour}:${minute}:${second}`) { errors.push({ row: rowNumber, field: input.mapping.timestamp!, code: "TIMESTAMP_INVALID", message: "时间戳不是有效上海本地日期" }); continue; }
    const durationMs = input.frequency === "5m" ? 300_000 : 60_000;
    const barStart = new Date(sourceTime.getTime() - (input.timestampSemantics === "BAR_END" ? durationMs : 0));
    const barEnd = new Date(sourceTime.getTime() + (input.timestampSemantics === "BAR_START" ? durationMs : 0));
    const bar = withMinuteBarContextDefaults({ securityId, market: input.market, frequency: input.frequency, barStart: barStart.toISOString(), barEnd: barEnd.toISOString(), availableAt: barEnd.toISOString(), open: values.open, high: values.high, low: values.low, close: values.close, volume: values.volume, amount: values.amount, adjustment: input.adjustment });
    candidateCount += 1;
    const key = `${bar.securityId}|${bar.barStart}`;
    const firstSourceRow = seen.get(key);
    let persistCandidate = true;
    if (firstSourceRow === undefined) seen.set(key, rowNumber);
    else {
      persistCandidate = false;
      for (const duplicateRow of [firstSourceRow, rowNumber]) {
        invalidCandidateRows.add(duplicateRow);
        retainedBars.delete(duplicateRow);
        if (!duplicateReportedRows.has(duplicateRow)) {
          duplicateReportedRows.add(duplicateRow);
          errors.push({ row: duplicateRow, field: "DUPLICATE_CONFLICT", code: "DUPLICATE_CONFLICT", message: "质量校验失败：DUPLICATE_CONFLICT" });
        }
      }
    }
    const qualityIssues = validateBars([bar]);
    if (qualityIssues.length) {
      persistCandidate = false;
      invalidCandidateRows.add(rowNumber);
      retainedBars.delete(rowNumber);
      for (const issue of qualityIssues) errors.push({ row: rowNumber, field: issue.code, code: issue.code, message: `质量校验失败：${issue.code}` });
    }
    if (retainBars && qualityIssues.length === 0 && firstSourceRow === undefined && retainedBars.size < maxRetainedBars) retainedBars.set(rowNumber, bar);
    if (options.onBarsBatch && persistCandidate) {
      pendingBatch.push(bar);
      if (pendingBatch.length >= batchSize) await flushBatch();
    }
  }
  await flushBatch();
  const acceptedRows = candidateCount - invalidCandidateRows.size;
  const acceptedBars = retainBars ? [...retainedBars.values()] : [];
  return { preview: { headers, totalRows: rowNumber - 1, acceptedRows, errors, bars: acceptedBars, barsTruncated: acceptedRows > acceptedBars.length }, sourceSha256: hash.digest("hex") };
}

export async function previewMinuteCsv(input: MinuteCsvPreviewInput & { content: string }): Promise<MinuteCsvPreview> {
  async function* chunks() { yield Buffer.from(input.content, "utf8"); }
  const { content: _content, ...metadata } = input;
  return (await previewMinuteCsvStream(metadata, chunks())).preview;
}
