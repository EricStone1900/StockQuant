import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

export const composeArgs = ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml"];

function expectedRuntime(env = process.env) {
  let local = {};
  try {
    local = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).filter((line) => /^[A-Z_]+=/.test(line)).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; }));
  } catch { /* .env.local is optional in unit-test environments */ }
  const subscriptionId = env.STOCKQUANT_COLLECTION_SUBSCRIPTION_ID ?? local.STOCKQUANT_COLLECTION_SUBSCRIPTION_ID;
  const rawIds = env.STOCKQUANT_COLLECTION_SECURITY_IDS ?? local.STOCKQUANT_COLLECTION_SECURITY_IDS;
  return { subscriptionId, securityIds: rawIds ? rawIds.split(",").map((value) => value.trim()).filter(Boolean) : [] };
}

export function classifyReady(body, httpStatus = 200) {
  if (httpStatus !== 200 || !body || body.status !== "ready") return "UNHEALTHY";
  if (body.collectionPersistence !== "POSTGRES") return "WAITING_CONFIGURATION";
  if (body.collectionSchedulerWorker !== "ENABLED" || body.collectionExecutor !== "ENABLED") return "WAITING_CONFIGURATION";
  return "HEALTHY";
}

export function buildRepairPlan(state, mode) {
  if (mode !== "repair" || state !== "UNHEALTHY") return [];
  // Operational repair is deliberately bounded to a single reversible service start.
  return [["docker", [...composeArgs, "up", "-d", "market-data-service"]]];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function ready(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const body = await response.json().catch(() => ({}));
    const state = classifyReady(body, response.status);
    if (state !== "HEALTHY") return { state, status: response.status, body };
    const expected = expectedRuntime();
    const baseUrl = url.replace(/\/ready\/?$/, "");
    if (expected.securityIds.length > 0) {
      const actualIds = Array.isArray(body.collectionSecurityIds) ? body.collectionSecurityIds : [];
      if (actualIds.length !== expected.securityIds.length || actualIds.some((id, index) => id !== expected.securityIds[index])) {
        return { state: "UNHEALTHY", status: response.status, body, error: `runtime security universe mismatch: expected ${expected.securityIds.length}, got ${actualIds.length}` };
      }
    }
    if (expected.subscriptionId) {
      const schedulesResponse = await fetch(`${baseUrl}/v2/collection-schedules`, { signal: AbortSignal.timeout(3000) });
      const schedules = schedulesResponse.ok ? (await schedulesResponse.json()).schedules ?? [] : [];
      const active = schedules.filter((schedule) => schedule.enabled === true);
      if (active.length !== 1 || active[0].subscriptionId !== expected.subscriptionId) {
        return { state: "UNHEALTHY", status: response.status, body, error: `active subscription mismatch: expected ${expected.subscriptionId}` };
      }
    }
    return { state, status: response.status, body };
  } catch (error) {
    return { state: "UNHEALTHY", status: 0, body: {}, error: String(error) };
  }
}

function usage() {
  console.error("Usage: node scripts/dc08a-supervise.mjs [--check-only|--repair]");
}

export async function supervise({ mode = "check-only", url = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002/ready", command = run, probe = () => ready(url), waitMs = 15_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), preserveEnabled = process.env.DC08A_PRESERVE_ENABLED !== "0" } = {}) {
  let observation = await probe();
  const actions = [];
  if (observation.state === "UNHEALTHY") {
    for (const [binary, args] of buildRepairPlan(observation.state, mode)) {
      // Let Compose restart the existing container with its persisted environment. Never
      // replace an active subscription with an empty or hard-coded fallback during repair.
      const repairEnv = preserveEnabled ? { ...process.env, STOCKQUANT_SCHEDULER_WORKER: process.env.STOCKQUANT_SCHEDULER_WORKER ?? "1", STOCKQUANT_COLLECTION_EXECUTOR: process.env.STOCKQUANT_COLLECTION_EXECUTOR ?? "1" } : undefined;
      const result = command(binary, args, repairEnv ? { env: repairEnv } : undefined);
      actions.push({ command: [binary, ...args].join(" "), exitCode: result.status });
      if (result.status !== 0) return { state: "REPAIR_FAILED", observation, actions, exitCode: 1 };
    }
    if (actions.length > 0) {
      const deadline = Date.now() + waitMs;
      do {
        await sleep(500);
        observation = await probe();
      } while (observation.state === "UNHEALTHY" && Date.now() < deadline);
    }
  }
  const exitCode = observation.state === "HEALTHY" ? 0 : observation.state === "WAITING_CONFIGURATION" ? 2 : 1;
  return { state: observation.state, observation, actions, exitCode };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv.slice(2).find((argument) => argument.startsWith("--") && argument !== "--") ?? "--check-only";
  if (!["--check-only", "--repair"].includes(mode)) {
    usage();
    process.exitCode = 2;
  } else {
    const result = await supervise({ mode: mode.slice(2) });
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.exitCode;
  }
}
