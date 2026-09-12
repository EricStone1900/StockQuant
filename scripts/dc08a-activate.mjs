import { spawnSync } from "node:child_process";

const compose = ["compose", "-f", "infra/compose/docker-compose.yml"];

export function evaluateActivation({ ready, schedules, expected }) {
  const reasons = [];
  if (ready?.status !== "ready" || ready.collectionPersistence !== "POSTGRES") reasons.push("market-data-service is not ready with PostgreSQL persistence");
  if (!expected.subscriptionId || !expected.calendarVersion || !expected.fromDate || !expected.toDate) reasons.push("DC-08A subscription parameters are incomplete");
  const enabled = schedules.filter((schedule) => schedule.enabled);
  if (enabled.length !== 1) reasons.push(`expected exactly one enabled subscription, found ${enabled.length}`);
  const target = enabled[0];
  if (target && target.subscriptionId !== expected.subscriptionId) reasons.push("enabled subscription is not the approved DC-08A subscription");
  if (target && (target.calendarVersion !== expected.calendarVersion || target.fromDate !== expected.fromDate || target.toDate !== expected.toDate)) reasons.push("approved subscription window or calendar does not match");
  return { ok: reasons.length === 0, reasons };
}

function run(args, options = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function getReady(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
  return response.json();
}

function readSchedules() {
  const sql = "SELECT subscription_id, enabled, subscription_version, from_date, to_date, calendar_version FROM market_data_collection_schedules ORDER BY subscription_id";
  const result = run([...compose, "exec", "-T", "postgres", "psql", "-U", "market_data", "-d", "market_data", "-At", "-F", "|", "-c", sql]);
  if (result.status !== 0) throw new Error(result.stderr.trim() || "unable to read collection schedules");
  return result.stdout.trim() ? result.stdout.trim().split("\n").map((line) => {
    const [subscriptionId, enabled, subscriptionVersion, fromDate, toDate, calendarVersion] = line.split("|");
    return { subscriptionId, enabled: enabled === "t", subscriptionVersion: Number(subscriptionVersion), fromDate, toDate, calendarVersion };
  }) : [];
}

export async function activate({ env = process.env, command = run, ready = getReady, read = readSchedules, url = env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002/ready", dryRun = false } = {}) {
  const expected = { subscriptionId: env.DC08A_SUBSCRIPTION_ID, calendarVersion: env.DC08A_CALENDAR_VERSION, fromDate: env.DC08A_FROM_DATE, toDate: env.DC08A_TO_DATE };
  let observation;
  let schedules;
  try {
    observation = await ready(url);
    schedules = await read();
  } catch (error) {
    return { status: "BLOCKED", reasons: [String(error)], exitCode: 2 };
  }
  const decision = evaluateActivation({ ready: observation, schedules, expected });
  if (!decision.ok) return { status: "BLOCKED", reasons: decision.reasons, exitCode: 2 };
  if (dryRun) return { status: "READY_TO_ENABLE", subscriptionId: expected.subscriptionId, exitCode: 0 };
  const result = command([...compose, "up", "-d", "--force-recreate", "market-data-service"], {
    env: { ...env, STOCKQUANT_SCHEDULER_WORKER: "1", STOCKQUANT_COLLECTION_EXECUTOR: "1" },
  });
  if (result.status !== 0) return { status: "FAILED", reasons: [result.stderr.trim() || "compose activation failed"], exitCode: 1 };
  return { status: "ENABLED", subscriptionId: expected.subscriptionId, exitCode: 0 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--check-only");
  const result = await activate({ dryRun });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.exitCode;
}
