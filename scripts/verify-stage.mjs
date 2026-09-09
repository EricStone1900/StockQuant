import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const has = (name) => args.includes(name);
const stage = value("--stage");
const scenario = value("--scenario");
const runId = value("--run");
const baseUrl = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";
const headers = { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" };

if (stage !== "V1.1") {
  console.error("only V1.1 is implemented");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({ message: "non-JSON response" }));
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function waitForRun(id) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const run = await request(`/api/v1/acceptance/runs/${id}`);
    if (["COMPLETED", "FAILED", "WAITING"].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting for ${id}`);
}

function runCommand(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env: process.env });
  return result.status ?? 1;
}

async function main() {
  if (value("--suite") === "code") {
    const commands = [
      ["pnpm", ["baseline:check"]],
      ["pnpm", ["build"]],
      ["pnpm", ["lint"]],
      ["pnpm", ["test"]],
      ["pnpm", ["test:integration"]],
      ["pnpm", ["test:contract"]]
    ];
    for (const [command, commandArgs] of commands) {
      const exitCode = runCommand(command, commandArgs);
      if (exitCode !== 0) process.exit(exitCode);
    }
    return;
  }
  if (runId && has("--check-only")) {
    const run = await request(`/api/v1/acceptance/runs/${runId}`);
    console.log(JSON.stringify({ checkOnly: true, testRunId: runId, status: run.status, assertions: run.assertions }, null, 2));
    process.exit(run.status === "COMPLETED" && run.assertions.every((item) => item.status === "PASS") ? 0 : 2);
  }
  if (!["normal", "rejection", "recovery"].includes(scenario)) {
    console.error("specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only");
    process.exit(2);
  }
  const accepted = await request("/api/v1/acceptance/v1/v1.1/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907) }) });
  let run = await waitForRun(accepted.testRunId);
  if (scenario === "recovery" && run.status === "WAITING") {
    const restarted = runCommand("docker", ["compose", "-f", "infra/compose/docker-compose.yml", "restart", "portfolio-risk-service"]);
    if (restarted !== 0) process.exit(restarted);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const ready = await fetch(`${baseUrl}/ready`);
        if (ready.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await request(`/api/v1/acceptance/runs/${run.testRunId}/continue-recovery`, { method: "POST", body: "{}" });
    run = await waitForRun(run.testRunId);
  }
  console.log(JSON.stringify(run, null, 2));
  process.exit(run.status === "COMPLETED" && run.assertions.every((item) => item.status === "PASS") ? 0 : 1);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
