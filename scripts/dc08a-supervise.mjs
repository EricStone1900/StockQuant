import { spawnSync } from "node:child_process";

export const composeArgs = ["compose", "-f", "infra/compose/docker-compose.yml"];

export function classifyReady(body, httpStatus = 200) {
  if (httpStatus !== 200 || !body || body.status !== "ready") return "UNHEALTHY";
  if (body.collectionPersistence !== "POSTGRES") return "WAITING_CONFIGURATION";
  if (body.collectionExecutor !== "ENABLED") return "WAITING_CONFIGURATION";
  return "HEALTHY";
}

export function buildRepairPlan(state, mode) {
  if (mode !== "repair" || state !== "UNHEALTHY") return [];
  // Operational repair is deliberately bounded to a single reversible service start.
  return [["docker", [...composeArgs, "up", "-d", "market-data-service"]]];
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

async function ready(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const body = await response.json().catch(() => ({}));
    return { state: classifyReady(body, response.status), status: response.status, body };
  } catch (error) {
    return { state: "UNHEALTHY", status: 0, body: {}, error: String(error) };
  }
}

function usage() {
  console.error("Usage: node scripts/dc08a-supervise.mjs [--check-only|--repair]");
}

export async function supervise({ mode = "check-only", url = process.env.DC08A_MARKET_URL ?? "http://127.0.0.1:3002/ready", command = run, probe = () => ready(url), waitMs = 15_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  let observation = await probe();
  const actions = [];
  if (observation.state === "UNHEALTHY") {
    for (const [binary, args] of buildRepairPlan(observation.state, mode)) {
      const result = command(binary, args);
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
