import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];

export function parseRows(output, fields, delimiter = "\t") {
  const text = String(output ?? "").trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    const values = line.split(delimiter);
    return Object.fromEntries(fields.map((field, index) => [field, values[index] ?? null]));
  });
}

export function buildObservation({ ready, schedule, statusCounts, artifactSummary, pendingOutbox, openGaps, capturedAt }) {
  const totalRuns = statusCounts.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const completedRuns = Number(statusCounts.find((row) => row.status === "COMPLETED")?.count ?? 0);
  return {
    schemaVersion: "dc08a-observation-v1",
    capturedAt,
    subscription: schedule,
    ready,
    runs: { total: totalRuns, completed: completedRuns, byStatus: statusCounts },
    artifacts: artifactSummary,
    pendingOutbox: Number(pendingOutbox ?? 0),
    openGaps: Number(openGaps ?? 0),
    status: ready?.collectionExecutor === "ENABLED" && schedule?.enabled === true ? "ACTIVE" : "NOT_ACTIVE",
  };
}

function run(args) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(result.stderr?.trim() || `command failed: docker ${args.join(" ")}`);
  return result.stdout ?? "";
}

async function fetchReady(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

function query(sql) {
  return run([...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "|", "-c", sql]);
}

export async function capture({ subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1", outputDir = process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", readyUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002/ready", now = new Date() } = {}) {
  const ready = await fetchReady(readyUrl);
  const schedule = parseRows(query(`SELECT subscription_id, enabled, subscription_version, from_date, to_date, calendar_version, watermark_end, version FROM market_data_collection_schedules WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}'`), ["subscriptionId", "enabled", "subscriptionVersion", "fromDate", "toDate", "calendarVersion", "watermarkEnd", "version"], "|")[0] ?? null;
  const statusCounts = parseRows(query(`SELECT status, count(*) FROM market_data_collection_runs WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}' GROUP BY status ORDER BY status`), ["status", "count"], "|");
  const artifactSummary = parseRows(query(`SELECT count(*) AS artifact_count, coalesce(sum(a.row_count),0) AS row_count, max(a.created_at) AS latest_created_at FROM market_data_collection_artifacts a JOIN market_data_collection_runs r ON r.published_artifact_id=a.artifact_id WHERE r.subscription_id='${subscriptionId.replaceAll("'", "''")}'`), ["artifactCount", "rowCount", "latestCreatedAt"], "|")[0] ?? { artifactCount: "0", rowCount: "0", latestCreatedAt: null };
  const pendingOutbox = query(`SELECT count(*) FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE r.subscription_id='${subscriptionId.replaceAll("'", "''")}' AND o.sent_at IS NULL`).trim() || "0";
  const openGaps = query(`SELECT count(*) FROM market_data_gap_records WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}' AND status='OPEN'`).trim() || "0";
  const report = buildObservation({ ready, schedule: schedule ? { ...schedule, enabled: schedule.enabled === "t", subscriptionVersion: Number(schedule.subscriptionVersion), version: Number(schedule.version) } : null, statusCounts, artifactSummary: { artifactCount: Number(artifactSummary.artifactCount), rowCount: Number(artifactSummary.rowCount), latestCreatedAt: artifactSummary.latestCreatedAt }, pendingOutbox, openGaps, capturedAt: now.toISOString() });
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `observation-${now.toISOString().replaceAll(/[:.]/g, "-")}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  return { path, report };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await capture();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
    process.exitCode = 1;
  }
}
