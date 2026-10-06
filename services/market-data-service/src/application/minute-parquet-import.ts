import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { previewMinuteCsvStream, type MinuteCsvField, type MinuteCsvMapping, type MinuteCsvPreviewInput, type MinuteCsvStreamOptions } from "./minute-csv-import.js";
import type { MinuteImportBar } from "../domain/minute-import.js";

export const MAX_MINUTE_PARQUET_BYTES = 64 * 1024 * 1024;
const FIELDS: MinuteCsvField[] = ["securityId", "timestamp", "open", "high", "low", "close", "volume", "amount"];

type JsonLine = Record<MinuteCsvField, unknown>;

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[\r\n,\"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function* normalizedCsv(child: ReturnType<typeof spawn>, stdout: NonNullable<ReturnType<typeof spawn>["stdout"]>, stderr: () => string, spawnError: () => Error | undefined): AsyncGenerator<Uint8Array> {
  const lines = createInterface({ input: stdout, crlfDelay: Infinity });
  let completed = false;
  const closed = once(child, "close").catch((): [number | null, NodeJS.Signals | null] => [null, null]) as Promise<[number | null, NodeJS.Signals | null]>;
  try {
    yield Buffer.from(`${FIELDS.join(",")}\n`, "utf8");
    for await (const line of lines) {
      let row: JsonLine;
      try { row = JSON.parse(line) as JsonLine; }
      catch { throw new Error("Parquet adapter returned invalid JSONL"); }
      if (!row || typeof row !== "object" || FIELDS.some((field) => !Object.hasOwn(row, field))) throw new Error("Parquet adapter returned an incomplete row");
      yield Buffer.from(`${FIELDS.map((field) => csvCell(row[field])).join(",")}\n`, "utf8");
    }
    const [code] = await closed;
    completed = true;
    if (spawnError()) throw new Error(`Could not start the Parquet adapter: ${spawnError()!.message}`);
    if (code !== 0) throw new Error(`Parquet adapter rejected the file: ${stderr().slice(0, 1000)}`);
  } finally {
    lines.close();
    if (!completed && child.exitCode === null) child.kill("SIGTERM");
  }
}

export async function previewMinuteParquetStream(
  input: MinuteCsvPreviewInput,
  sourceChunks: AsyncIterable<Uint8Array>,
  mapping: MinuteCsvMapping,
  options: MinuteCsvStreamOptions = {},
): Promise<{ preview: { headers: string[]; totalRows: number; acceptedRows: number; errors: unknown[]; bars: MinuteImportBar[]; barsTruncated: boolean }; sourceSha256: string }> {
  if (input.market !== "CN_A" || !["1m", "5m"].includes(input.frequency) || input.adjustment !== "RAW" || input.timezone !== "Asia/Shanghai" || !["BAR_START", "BAR_END"].includes(input.timestampSemantics) || input.volumeUnit !== "SHARES" || input.amountUnit !== "CNY") throw new Error("Parquet semantics must explicitly match CN_A/1m-or-5m/RAW/Asia-Shanghai/BAR_START-or-BAR_END/SHARES/CNY");
  for (const field of FIELDS) if (!mapping[field] || typeof mapping[field] !== "string") throw new Error(`Parquet mapping for ${field} must name a source column`);
  if (new Set(FIELDS.map((field) => mapping[field])).size !== FIELDS.length) throw new Error("each Parquet field must map to a distinct source column");

  const directory = await mkdtemp(resolve(tmpdir(), "stockquant-parquet-"));
  const path = resolve(directory, "source.parquet");
  const output = createWriteStream(path, { flags: "wx", mode: 0o600 });
  const hash = createHash("sha256");
  let byteLength = 0;
  try {
    for await (const chunk of sourceChunks) {
      byteLength += chunk.byteLength;
      if (byteLength > MAX_MINUTE_PARQUET_BYTES) throw new Error(`Parquet content exceeds the ${MAX_MINUTE_PARQUET_BYTES} byte limit`);
      hash.update(chunk);
      if (!output.write(chunk)) await once(output, "drain");
    }
    output.end();
    await once(output, "close");
    if (byteLength === 0) throw new Error("Parquet content is empty");

    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const helper = resolve(moduleDir, "../../../../services/market-data-adapter/src/market_data_adapter/parquet_to_jsonl.py");
    const localAdapterPython = resolve(moduleDir, "../../../../services/market-data-adapter/.venv/bin/python");
    const python = process.env.STOCKQUANT_PARQUET_PYTHON ?? (existsSync(localAdapterPython) ? localAdapterPython : "python3");
    const child = spawn(python, [helper], { stdio: ["pipe", "pipe", "pipe"], env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? tmpdir(), PYTHONNOUSERSITE: "1" } });
    if (!child.stdin || !child.stdout || !child.stderr) throw new Error("Parquet adapter pipes could not be created");
    let errorText = "";
    let spawnError: Error | undefined;
    child.on("error", (error) => { spawnError = error; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { if (errorText.length < 4096) errorText += chunk.slice(0, 4096 - errorText.length); });
    child.stdin.end(JSON.stringify({ path, mapping: Object.fromEntries(FIELDS.map((field) => [field, mapping[field]])) }));
    const canonicalMapping = Object.fromEntries(FIELDS.map((field) => [field, field])) as MinuteCsvMapping;
    const parsed = await previewMinuteCsvStream({ ...input, mapping: canonicalMapping }, normalizedCsv(child, child.stdout, () => errorText, () => spawnError), options);
    return { preview: parsed.preview, sourceSha256: hash.digest("hex") };
  } finally {
    if (!output.closed) output.destroy();
    await rm(directory, { recursive: true, force: true });
  }
}
