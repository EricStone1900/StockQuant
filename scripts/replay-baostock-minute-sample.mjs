import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { V23ReplayEngine } from "../services/platform-api-service/dist/application/v23-replay.js";

const argv = process.argv.slice(2);
const argument = (name, fallback) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : fallback; };
const manifestPath = resolve(argument("--manifest", "data/local/baostock-minute-20x60-2024-01-02-2024-04-02-v1/manifest.json"));
const outputPath = resolve(argument("--output", "evidence/dc08a/historical-replay-2026-09-16.json"));

function securityId(code) { const [market, number] = code.split("."); return `${number}.${market === "sh" ? "SH" : "SZ"}`; }
function timestamp(date, time) {
  const compact = String(time).replaceAll("-", "").replaceAll(":", "");
  if (/^\d{14}/.test(compact)) return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T${compact.slice(8, 10)}:${compact.slice(10, 12)}:${compact.slice(12, 14)}+08:00`;
  return `${date}T${time}+08:00`;
}
function parseCsv(csv, code) {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.shift() !== "date,time,code,open,high,low,close,volume,amount") throw new Error(`invalid BaoStock header for ${code}`);
  return lines.map((line) => {
    const [date, time, sourceCode, open, high, low, close, volume] = line.split(",");
    const bar = { security: securityId(sourceCode), timestamp: timestamp(date, time), open: Number(open), high: Number(high), low: Number(low), close: Number(close), volume: Number(volume) };
    if (!Number.isFinite(bar.open) || !Number.isFinite(bar.high) || !Number.isFinite(bar.low) || !Number.isFinite(bar.close) || !Number.isFinite(bar.volume) || bar.volume < 0) throw new Error(`invalid OHLCV row for ${code}: ${line}`);
    return bar;
  });
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.status !== "COMPLETED" || manifest.completed?.length !== manifest.selectedCodes?.length || manifest.selectedCodes?.length !== 20) throw new Error("BaoStock manifest must be COMPLETED for exactly 20 securities");
const engine = new V23ReplayEngine();
const summaries = [];
for (const code of manifest.selectedCodes) {
  const artifact = manifest.artifacts?.[code];
  if (!artifact?.path) throw new Error(`missing artifact for ${code}`);
  const csv = await readFile(resolve(manifestPath, "..", artifact.path), "utf8");
  const bars = parseCsv(csv, code).sort((left, right) => left.timestamp.localeCompare(right.timestamp));
  const days = [...new Set(bars.map((bar) => bar.timestamp.slice(0, 10)))];
  const decision = bars.find((bar) => bar.timestamp.startsWith(`${days[0]}T`));
  const execution = bars.find((bar) => bar.timestamp.startsWith(`${days[1]}T`));
  if (!decision || !execution) throw new Error(`missing first/second trading-day bars for ${code}`);
  const result = engine.run("normal", 20260907, bars, `dc08b-${code.replace(".", "-")}`, { focusSecurity: securityId(code), decisionTimestamp: decision.timestamp, executionTimestamp: execution.timestamp });
  if (result.status !== "COMPLETED" || result.assertions.some((item) => item.status !== "PASS")) throw new Error(`replay failed for ${code}: ${JSON.stringify(result.assertions)}`);
  summaries.push({ code, rows: bars.length, tradingDays: days.length, decisionTimestamp: decision.timestamp, executionTimestamp: execution.timestamp, finalNav: result.evidence.normal.finalNav, fillCount: result.evidence.normal.fills.length, replayHash: createHash("sha256").update(JSON.stringify(result.evidence.normal)).digest("hex") });
}
const report = { schemaVersion: "dc-t23-real-minute-replay-v1", generatedAt: new Date().toISOString(), sourceManifest: manifestPath, sourceManifestSha256: createHash("sha256").update(await readFile(manifestPath)).digest("hex"), source: "baostock", frequency: "5m", dataMode: "BACKTEST", brokerMode: "FAKE", status: "PASS", securities: summaries, totals: { securities: summaries.length, rows: summaries.reduce((sum, item) => sum + item.rows, 0), tradingDaysPerSecurity: [...new Set(summaries.map((item) => item.tradingDays))] } };
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, status: report.status, totals: report.totals }, null, 2));
