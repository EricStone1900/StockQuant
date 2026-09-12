import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];
const defaultSecurityIds = ["600000.SH", "000001.SZ", "600519.SH"];

export function parseArgs(argv) {
  const args = { checkOnly: false, securityIds: defaultSecurityIds, outputDir: process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a" };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--") continue;
    if (value === "--check-only") args.checkOnly = true;
    else if (value === "--subscription") args.subscriptionId = argv[++index];
    else if (value === "--from") args.fromDate = argv[++index];
    else if (value === "--to") args.toDate = argv[++index];
    else if (value === "--security-ids") args.securityIds = String(argv[++index]).split(",").map((item) => item.trim()).filter(Boolean);
    else if (value === "--output-dir") args.outputDir = argv[++index];
    else throw new Error(`unknown argument: ${value}`);
  }
  if (!args.subscriptionId || !args.fromDate || !args.toDate) throw new Error("--subscription, --from and --to are required");
  if (!args.securityIds.length) throw new Error("at least one --security-ids value is required");
  return args;
}

export function buildExpectedKeys(securityIds, dates) {
  const result = [];
  for (const day of dates) {
    if (day.status !== "TRADING") continue;
    for (const session of day.sessions ?? []) {
      const [startHour, startMinute] = session.start.split(":").map(Number);
      const [endHour, endMinute] = session.end.split(":").map(Number);
      const start = new Date(Date.UTC(Number(day.date.slice(0, 4)), Number(day.date.slice(5, 7)) - 1, Number(day.date.slice(8, 10)), startHour - 8, startMinute));
      const end = new Date(Date.UTC(Number(day.date.slice(0, 4)), Number(day.date.slice(5, 7)) - 1, Number(day.date.slice(8, 10)), endHour - 8, endMinute));
      for (let cursor = start; cursor.getTime() + 5 * 60_000 <= end.getTime(); cursor = new Date(cursor.getTime() + 5 * 60_000)) {
        const barStart = cursor.toISOString();
        for (const securityId of securityIds) result.push(`${securityId}|${barStart}`);
      }
    }
  }
  return result;
}

function run(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `docker command failed: ${args.join(" ")}`);
  return result.stdout ?? "";
}

function sqlValue(value) { return String(value).replaceAll("'", "''"); }
function query(sql) { return run([...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "|", "-c", sql]); }
function parseRows(output, fields) {
  const text = String(output).trim();
  if (!text) return [];
  return text.split("\n").map((line) => Object.fromEntries(fields.map((field, index) => [field, line.split("|")[index] ?? null])));
}
function datesBetween(fromDate, toDate) {
  const dates = [];
  for (let cursor = new Date(`${fromDate}T12:00:00Z`); cursor.toISOString().slice(0, 10) <= toDate; cursor = new Date(cursor.getTime() + 86_400_000)) dates.push(cursor.toISOString().slice(0, 10));
  return dates;
}

async function calendarDays(dates, calendarUrl) {
  return Promise.all(dates.map(async (date) => {
    const response = await fetch(`${calendarUrl}/v2/calendar/cn-a-share/${date}`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`calendar HTTP ${response.status} for ${date}`);
    return response.json();
  }));
}

export function summarizeCoverage({ expectedKeys, rows, statuses, openGaps, pendingOutbox, calendarDays: days }) {
  const expected = new Set(expectedKeys);
  const counts = new Map();
  for (const row of rows) {
    const key = `${row.securityId}|${row.barStart}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const missingKeys = [...expected].filter((key) => !counts.has(key));
  const duplicateKeys = [...counts].filter(([, count]) => count > 1).map(([key]) => key);
  const unexpectedKeys = [...counts.keys()].filter((key) => !expected.has(key));
  const unknownCalendar = days.filter((day) => day.status === "UNKNOWN").map((day) => day.date);
  const status = unknownCalendar.length ? "WAITING_DEPENDENCY" : missingKeys.length || duplicateKeys.length || unexpectedKeys.length || openGaps > 0 || statuses.some((item) => item.status !== "COMPLETED") ? "INCOMPLETE" : expected.size > 0 ? "PASS" : "NOT_RUN";
  return { status, expectedBars: expected.size, actualRows: rows.length, actualUniqueBars: counts.size, missingBars: missingKeys.length, duplicateBars: duplicateKeys.length, unexpectedBars: unexpectedKeys.length, missingKeys, duplicateKeys, unexpectedKeys, statuses, openGaps, pendingOutbox, unknownCalendar };
}

export async function coverage({ subscriptionId, fromDate, toDate, securityIds = defaultSecurityIds, outputDir = "evidence/dc08a", calendarUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002" } = {}) {
  const dates = datesBetween(fromDate, toDate);
  const days = await calendarDays(dates, calendarUrl);
  const escaped = sqlValue(subscriptionId);
  const rows = parseRows(query(`SELECT ar.payload->>'securityId', ar.payload->>'barStart' FROM market_data_artifact_rows ar JOIN market_data_collection_artifacts a ON a.artifact_id=ar.artifact_id JOIN market_data_collection_runs r ON r.published_artifact_id=a.artifact_id WHERE r.subscription_id='${escaped}' AND (r.window_start AT TIME ZONE 'Asia/Shanghai')::date BETWEEN '${sqlValue(fromDate)}' AND '${sqlValue(toDate)}'`), ["securityId", "barStart"]);
  const statuses = parseRows(query(`SELECT status, count(*) FROM market_data_collection_runs WHERE subscription_id='${escaped}' AND (window_start AT TIME ZONE 'Asia/Shanghai')::date BETWEEN '${sqlValue(fromDate)}' AND '${sqlValue(toDate)}' GROUP BY status ORDER BY status`), ["status", "count"]).map((row) => ({ status: row.status, count: Number(row.count) }));
  const openGaps = Number(query(`SELECT count(*) FROM market_data_gap_records WHERE subscription_id='${escaped}' AND status='OPEN' AND (bar_start AT TIME ZONE 'Asia/Shanghai')::date BETWEEN '${sqlValue(fromDate)}' AND '${sqlValue(toDate)}'`).trim() || "0");
  const pendingOutbox = Number(query(`SELECT count(*) FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE r.subscription_id='${escaped}' AND o.sent_at IS NULL AND (r.window_start AT TIME ZONE 'Asia/Shanghai')::date BETWEEN '${sqlValue(fromDate)}' AND '${sqlValue(toDate)}'`).trim() || "0");
  const report = { schemaVersion: "dc08a-coverage-v1", capturedAt: new Date().toISOString(), subscriptionId, fromDate, toDate, securityIds, calendarDays: days, ...summarizeCoverage({ expectedKeys: buildExpectedKeys(securityIds, days), rows, statuses, openGaps, pendingOutbox, calendarDays: days }) };
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `coverage-${subscriptionId}-${fromDate}-${toDate}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  return { path, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await coverage({ ...args, calendarUrl: process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002" });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.report.status === "PASS" ? 0 : result.report.status === "NOT_RUN" || result.report.status === "WAITING_DEPENDENCY" || args.checkOnly ? 2 : 1;
  } catch (error) {
    console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
    process.exitCode = 1;
  }
}
