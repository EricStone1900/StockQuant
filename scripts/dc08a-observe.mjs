import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const compose = ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml"];

export function parseRows(output, fields, delimiter = "\t") {
  const text = String(output ?? "").trim();
  if (!text) return [];
  return text.split("\n").map((line) => {
    const values = line.split(delimiter);
    return Object.fromEntries(fields.map((field, index) => [field, values[index] ?? null]));
  });
}

export function buildObservation({ ready, schedule, statusCounts, artifactSummary, pendingOutbox, openGaps, capturedAt, observationCounted = false, runDetails = [], fieldEvidence = [] }) {
  const totalRuns = statusCounts.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  const completedRuns = Number(statusCounts.find((row) => row.status === "COMPLETED")?.count ?? 0);
  return {
    schemaVersion: "dc08a-observation-v2",
    capturedAt,
    observationCounted,
    subscription: schedule,
    ready,
    runs: { total: totalRuns, completed: completedRuns, byStatus: statusCounts, details: runDetails },
    artifacts: artifactSummary,
    fieldEvidence,
    pendingOutbox: Number(pendingOutbox ?? 0),
    openGaps: Number(openGaps ?? 0),
    status: ready?.collectionSchedulerWorker === "ENABLED" && ready?.collectionExecutor === "ENABLED" && schedule?.enabled === true ? "ACTIVE" : "NOT_ACTIVE",
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

function jsonQuery(sql, fallback = []) {
  const raw = query(sql).trim();
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

export async function capture({ subscriptionId = process.env.DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1", outputDir = process.env.DC08A_OUTPUT_DIR ?? "evidence/dc08a", archiveDir = null, readyUrl = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002/ready", now = new Date(), observationCounted = false } = {}) {
  const ready = await fetchReady(readyUrl);
  const schedule = parseRows(query(`SELECT subscription_id, enabled, subscription_version, from_date, to_date, calendar_version, watermark_end, version FROM market_data_collection_schedules WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}'`), ["subscriptionId", "enabled", "subscriptionVersion", "fromDate", "toDate", "calendarVersion", "watermarkEnd", "version"], "|")[0] ?? null;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(now);
  const statusCounts = parseRows(query(`SELECT status, count(*) FROM market_data_collection_runs WHERE subscription_id='${subscriptionId.replaceAll("'", "''")}' AND window_start >= '${day} 00:00:00+08' AND window_start < '${day} 24:00:00+08' GROUP BY status ORDER BY status`), ["status", "count"], "|");
  const escaped = subscriptionId.replaceAll("'", "''");
  const artifactSummary = parseRows(query(`SELECT count(*) AS artifact_count, coalesce(sum(a.row_count),0) AS row_count, max(a.created_at) AS latest_created_at FROM market_data_collection_artifacts a JOIN market_data_collection_runs r ON r.published_artifact_id=a.artifact_id WHERE r.subscription_id='${escaped}' AND r.window_start >= '${day} 00:00:00+08' AND r.window_start < '${day} 24:00:00+08'`), ["artifactCount", "rowCount", "latestCreatedAt"], "|")[0] ?? { artifactCount: "0", rowCount: "0", latestCreatedAt: null };
  const pendingOutbox = query(`SELECT count(*) FROM market_data_collection_outbox o JOIN market_data_collection_runs r ON r.run_id=o.run_id WHERE r.subscription_id='${escaped}' AND r.status <> 'CANCELLED' AND o.sent_at IS NULL AND r.window_start >= '${day} 00:00:00+08' AND r.window_start < '${day} 24:00:00+08'`).trim() || "0";
  const openGaps = query(`SELECT count(*) FROM market_data_gap_records WHERE subscription_id='${escaped}' AND status='OPEN' AND bar_start >= '${day} 00:00:00+08' AND bar_start < '${day} 24:00:00+08'`).trim() || "0";
  const runDetails = jsonQuery(`SELECT coalesce(json_agg(json_build_object('runId', run_id, 'windowStart', window_start, 'windowEnd', window_end, 'jobKind', job_kind, 'status', status, 'createdAt', created_at, 'updatedAt', updated_at, 'retryAt', retry_at, 'artifactId', published_artifact_id, 'checkpoint', checkpoint) ORDER BY window_start), '[]'::json) FROM market_data_collection_runs WHERE subscription_id='${escaped}' AND window_start >= '${day} 00:00:00+08' AND window_start < '${day} 24:00:00+08'`);
  const fieldEvidence = jsonQuery(`WITH ranked AS (SELECT ar.payload, row_number() OVER (ORDER BY r.window_start, ar.row_number) AS row_number FROM market_data_artifact_rows ar JOIN market_data_collection_artifacts a ON a.artifact_id=ar.artifact_id JOIN market_data_collection_runs r ON r.published_artifact_id=a.artifact_id WHERE r.subscription_id='${escaped}' AND r.window_start >= '${day} 00:00:00+08' AND r.window_start < '${day} 24:00:00+08') SELECT coalesce(json_agg(payload ORDER BY row_number) FILTER (WHERE row_number <= 3), '[]'::json) FROM ranked`);
  const report = buildObservation({ ready, schedule: schedule ? { ...schedule, enabled: schedule.enabled === "t", subscriptionVersion: Number(schedule.subscriptionVersion), version: Number(schedule.version) } : null, statusCounts, artifactSummary: { artifactCount: Number(artifactSummary.artifactCount), rowCount: Number(artifactSummary.rowCount), latestCreatedAt: artifactSummary.latestCreatedAt }, pendingOutbox, openGaps, capturedAt: now.toISOString(), observationCounted, runDetails, fieldEvidence });
  const directory = resolve(outputDir);
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, `observation-${now.toISOString().replaceAll(/[:.]/g, "-")}.json`);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  let archivePath = null;
  if (archiveDir) {
    await mkdir(resolve(archiveDir), { recursive: true });
    archivePath = resolve(archiveDir, "observation-" + now.toISOString().replaceAll(/[:.]/g, "-") + ".json");
    await writeFile(archivePath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return { path, archivePath, report };
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
