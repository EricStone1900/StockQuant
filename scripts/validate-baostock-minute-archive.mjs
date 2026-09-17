import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const argument = (name, fallback) => { const index = argv.indexOf(name); return index >= 0 ? argv[index + 1] : fallback; };
const manifestPath = resolve(argument("--manifest", "data/local/baostock-minute-20x60-2024-01-02-2024-04-02-v1/manifest.json"));
const outputPath = resolve(argument("--output", "evidence/dc08a/historical-coverage-2026-09-16.json"));
const manifestBytes = await readFile(manifestPath);
const manifest = JSON.parse(manifestBytes);
const results = [];
for (const code of manifest.selectedCodes ?? []) {
  const artifact = manifest.artifacts?.[code];
  if (!artifact?.path) throw new Error(`missing artifact for ${code}`);
  const bytes = await readFile(resolve(manifestPath, "..", artifact.path));
  const lines = bytes.toString("utf8").trim().split(/\r?\n/);
  if (lines.shift() !== "date,time,code,open,high,low,close,volume,amount") throw new Error(`invalid header for ${code}`);
  const dayCounts = new Map();
  const keys = new Set();
  let duplicateRows = 0;
  let badRows = 0;
  for (const line of lines) {
    const [date, time, sourceCode, open, high, low, close, volume, amount] = line.split(",");
    const key = `${date}|${time}|${sourceCode}`;
    if (keys.has(key)) duplicateRows += 1;
    keys.add(key);
    dayCounts.set(date, (dayCounts.get(date) ?? 0) + 1);
    const numeric = [open, high, low, close, volume, amount].map(Number);
    if (numeric.some((value) => !Number.isFinite(value)) || numeric[4] < 0 || numeric[0] > numeric[1] || numeric[2] > numeric[1] || numeric[0] < numeric[2]) badRows += 1;
  }
  const dayCountsValid = [...dayCounts.values()].every((count) => count === 48);
  results.push({ code, rows: lines.length, tradingDays: dayCounts.size, dayCountsValid, duplicateRows, badRows, sha256Matches: createHash("sha256").update(bytes).digest("hex") === artifact.sha256 });
}
const expectedBars = results.length * 60 * 48;
const report = { schemaVersion: "dc-t23-historical-coverage-v2", capturedAt: new Date().toISOString(), source: manifest.source, frequency: manifest.frequency, sourceManifest: manifestPath, sourceManifestSha256: createHash("sha256").update(manifestBytes).digest("hex"), status: manifest.status === "COMPLETED" && results.length === 20 && results.every((item) => item.rows === 2880 && item.tradingDays === 60 && item.dayCountsValid && item.duplicateRows === 0 && item.badRows === 0 && item.sha256Matches) ? "PASS" : "INCOMPLETE", scope: { securities: results.length, startDate: manifest.startDate, endDate: manifest.endDate, tradingDaysPerSecurity: 60, barsPerTradingDay: 48, expectedBars, actualBars: results.reduce((sum, item) => sum + item.rows, 0) }, assertions: { manifestCompleted: manifest.status === "COMPLETED" ? "PASS" : "FAIL", allSecuritiesCompleted: results.length === 20 ? "PASS" : "FAIL", rowsPerSecurity: results.every((item) => item.rows === 2880) ? "PASS" : "FAIL", tradingDaysPerSecurity: results.every((item) => item.tradingDays === 60) ? "PASS" : "FAIL", barsPerTradingDay: results.every((item) => item.dayCountsValid) ? "PASS" : "FAIL", duplicateDateTime: results.every((item) => item.duplicateRows === 0) ? "PASS" : "FAIL", manifestSha256: results.every((item) => item.sha256Matches) ? "PASS" : "FAIL", ohlcvQuality: results.every((item) => item.badRows === 0) ? "PASS" : "FAIL" }, securities: results, limitations: ["历史归档覆盖不代表已运行60个实际交易日", "不替代DC-08A盘中来源稳定性和V2.4实际交易日观察"] };
await mkdir(resolve(outputPath, ".."), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, status: report.status, scope: report.scope }, null, 2));
process.exitCode = report.status === "PASS" ? 0 : 2;
