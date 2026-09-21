import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const compose = ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml"];
const baseUrl = process.env.MARKET_DATA_URL ?? "http://127.0.0.1:3002";

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function has(name) { return process.argv.includes(`--${name}`); }
function isoDate(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) throw new Error(`--${name} must be YYYY-MM-DD`);
  return String(value);
}
function positiveInt(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`);
  return parsed;
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `${command} failed`);
  return result.stdout ?? "";
}
function controlToken() {
  return process.env.STOCKQUANT_COLLECTION_CONTROL_TOKEN
    ?? readFileSync(".env.local", "utf8").match(/^STOCKQUANT_COLLECTION_CONTROL_TOKEN=(.+)$/m)?.[1]
    ?? "";
}
function failedRuns({ subscriptionId, fromDate, toDate, limit }) {
  const sql = `SELECT run_id, version, window_start, window_end FROM market_data_collection_runs WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}' AND status='FAILED' AND window_start >= '${fromDate} 00:00:00+00' AND window_start < ('${toDate}'::date + interval '1 day') AND job_kind IN ('INTRADAY_WINDOW','GAP_REPAIR') ORDER BY window_start, run_id LIMIT ${limit}`;
  const output = run("docker", [...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "|", "-c", sql]);
  return output.trim() ? output.trim().split("\n").map((line) => {
    const [runId, version, windowStart, windowEnd] = line.split("|");
    return { runId, version: Number(version), windowStart, windowEnd };
  }) : [];
}
async function resume(run) {
  const response = await fetch(`${baseUrl}/v2/collection-runs/${encodeURIComponent(run.runId)}/resume`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-stockquant-control-token": controlToken() },
    body: JSON.stringify({ expectedVersion: run.version }),
    signal: AbortSignal.timeout(5000),
  });
  const body = await response.json().catch(() => ({}));
  return { ...run, responseStatus: response.status, resumed: response.ok, body };
}

const subscriptionId = arg("subscription", process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260917-20-v1");
const fromDate = isoDate(arg("from", new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date())), "from");
const toDate = isoDate(arg("to", fromDate), "to");
if (toDate < fromDate) throw new Error("--to must be on or after --from");
const limit = positiveInt(arg("limit", "20"), "limit");
if (limit > 100) throw new Error("--limit must not exceed 100");

try {
  const candidates = failedRuns({ subscriptionId, fromDate, toDate, limit });
  if (has("check-only")) {
    console.log(JSON.stringify({ status: "CHECK_ONLY", subscriptionId, fromDate, toDate, limit, candidates }, null, 2));
    process.exitCode = 0;
} else {
    const results = [];
    for (const candidate of candidates) results.push(await resume(candidate));
    const failed = results.filter((item) => !item.resumed);
    console.log(JSON.stringify({ status: failed.length ? "PARTIAL" : "QUEUED", subscriptionId, fromDate, toDate, limit, candidates: results }, null, 2));
    process.exitCode = failed.length ? 1 : 0;
  }
} catch (error) {
  console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
  process.exitCode = 1;
}
