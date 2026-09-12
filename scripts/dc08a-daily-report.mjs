import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];

export function expectedBars(securityCount, sessions = 2, barsPerSession = 24) {
  return Math.max(0, securityCount) * Math.max(0, sessions) * Math.max(0, barsPerSession);
}

export function classifyDailyStatus({ tradingDay, expected, actual, statuses, openGaps }) {
  if (!tradingDay || expected === 0 || actual === 0) return "NOT_RUN";
  if (openGaps > 0 || statuses.some((item) => item.status !== "COMPLETED") || actual < expected) return "INCOMPLETE";
  return "PASS";
}

function run(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `command failed: docker ${args.join(" ")}`);
  return result.stdout ?? "";
}

function query(sql) {
  return run([...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "|", "-c", sql]);
}

function rows(output, fields) {
  const text = String(output).trim();
  if (!text) return [];
  return text.split("\n").map((line) => Object.fromEntries(fields.map((field, index) => [field, line.split("|")[index] ?? null])));
}

function safeDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("REPORT_DATE must be YYYY-MM-DD");
  return value;
}

export async function createDailyReport({ date = process.env.REPORT_DATE ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date()), subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1", securityCount = Number(process.env.DC08A_SECURITY_COUNT ?? 3), tradingDay, outputDir = process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", calendarUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002" } = {}) {
  const reportDate = safeDate(date);
  const calendarTradingDay = tradingDay ?? (await fetch(`${calendarUrl}/v2/calendar/cn-a-share/${reportDate}`, { signal: AbortSignal.timeout(3000) }).then(async (response) => response.ok && (await response.json()).status === "TRADING").catch(() => false));
  const escaped = subscriptionId.replaceAll("'", "''");
  const statuses = rows(query(`SELECT status, count(*) FROM market_data_collection_runs WHERE subscription_id='${escaped}' AND (window_start AT TIME ZONE 'Asia/Shanghai')::date='${reportDate}' GROUP BY status ORDER BY status`), ["status", "count"]).map((item) => ({ status: item.status, count: Number(item.count) }));
  const totals = rows(query(`SELECT coalesce(sum(a.row_count),0), count(*) FROM market_data_collection_artifacts a JOIN market_data_collection_runs r ON r.published_artifact_id=a.artifact_id WHERE r.subscription_id='${escaped}' AND (r.window_start AT TIME ZONE 'Asia/Shanghai')::date='${reportDate}'`), ["actualBars", "artifactCount"])[0] ?? { actualBars: "0", artifactCount: "0" };
  const openGaps = Number(query(`SELECT count(*) FROM market_data_gap_records WHERE subscription_id='${escaped}' AND status='OPEN' AND (bar_start AT TIME ZONE 'Asia/Shanghai')::date='${reportDate}'`).trim() || "0");
  const pendingOutbox = Number(query(`SELECT count(*) FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE r.subscription_id='${escaped}' AND o.sent_at IS NULL AND (r.window_start AT TIME ZONE 'Asia/Shanghai')::date='${reportDate}'`).trim() || "0");
  const expected = calendarTradingDay ? expectedBars(securityCount) : 0;
  const actual = Number(totals.actualBars);
  const report = { schemaVersion: "dc08a-daily-report-v1", reportDate, subscriptionId, tradingDay: calendarTradingDay, securityCount, expectedBars: expected, actualBars: actual, artifactCount: Number(totals.artifactCount), statuses, openGaps, pendingOutbox, status: classifyDailyStatus({ tradingDay: calendarTradingDay, expected, actual, statuses, openGaps }) };
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `daily-report-${reportDate}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  return { path, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(JSON.stringify(await createDailyReport(), null, 2)); } catch (error) { console.error(JSON.stringify({ status: "FAILED", error: String(error) })); process.exitCode = 1; }
}
