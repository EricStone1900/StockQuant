import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const has = (name) => args.includes(name);
const stage = value("--stage");
const scenario = value("--scenario");
const runId = value("--run");
const baseUrl = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";
const headers = { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" };

if (!['V1.1','V1.2','V1.3','V1.4'].includes(stage)) {
  console.error("only V1.1, V1.2, V1.3 and V1.4 are implemented");
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
  if (stage === 'V1.4') {
    if (value('--suite') === 'code') { for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) { const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode); } return; }
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.4/runs/${runId}`); console.log(JSON.stringify(run,null,2)); process.exit(run.status === 'COMPLETED' && run.assertions.every((a)=>a.status==='PASS') ? 0 : 2); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const accepted = await request('/api/v1/acceptance/v1/v1.4/runs', { method:'POST', body: JSON.stringify({ scenarioId: scenario, seed: Number(value('--seed') ?? 20260907) }) }); const run = await request(`/api/v1/acceptance/v1/v1.4/runs/${accepted.testRunId}`); console.log(JSON.stringify(run,null,2)); process.exit(run.status === 'COMPLETED' && run.assertions.every((a)=>a.status==='PASS') ? 0 : 1);
  }
  if (stage === 'V1.3') {
    if (value('--suite') === 'code') {
      for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) { const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode); }
      return;
    }
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.3/runs/${runId}`); console.log(JSON.stringify(run,null,2)); process.exit(run.status === 'COMPLETED' && run.assertions.every((a)=>a.status==='PASS') ? 0 : 2); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const accepted = await request('/api/v1/acceptance/v1/v1.3/runs', { method:'POST', body: JSON.stringify({ scenarioId: scenario, seed: Number(value('--seed') ?? 20260907) }) });
    const run = await request(`/api/v1/acceptance/v1/v1.3/runs/${accepted.testRunId}`); console.log(JSON.stringify(run,null,2)); process.exit(run.status === 'COMPLETED' && run.assertions.every((a)=>a.status==='PASS') ? 0 : 1);
  }
  if (stage === 'V1.2') {
    if (value('--suite') === 'code') {
      for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) {
        const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode);
      }
      return;
    }
    const marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? 'http://127.0.0.1:3002';
    const quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? 'http://127.0.0.1:3003';
    if (runId && has('--check-only')) { const probe = await (await fetch(`${quantUrl}/v1/qlib/probe`)).json(); process.exit(probe.probe?.status === 'READY' ? 0 : 2); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const normal = await (await fetch(`${marketUrl}/v1/fixtures/normal/preview`)).json();
    const bad = await (await fetch(`${marketUrl}/v1/fixtures/bad-future/preview`)).json();
    const probe = await (await fetch(`${quantUrl}/v1/qlib/probe`)).json();
    const factor = await (await fetch(`${quantUrl}/v1/factors/preview`)).json();
    const assertions = scenario === 'normal'
      ? [{id:'V1.2-DATA-NORMAL-001',pass:normal.barCount===6&&normal.securityCount===2&&normal.quality.status==='READY'},{id:'V1.2-FACTOR-PREVIEW-001',pass:Array.isArray(factor.ranking)&&factor.ranking.length===2}]
      : scenario === 'rejection'
        ? [{id:'V1.2-DATA-PIT-001',pass:bad.quality.status==='REJECTED'&&bad.quality.errors.some((e)=>e.code==='FUTURE_DATA')}]
        : [{id:'V1.2-QLIB-PROBE-001',pass:probe.probe?.status==='READY'}];
    const result = {stageId:'V1.2',scenarioId:scenario,seed:Number(value('--seed')??20260907),status:assertions.every((a)=>a.pass)?'COMPLETED':'FAILED',dataVersion:'v1.2-market-data-1',qlib:probe.probe,artifacts:{normal, bad, factor}, assertions};
    console.log(JSON.stringify(result,null,2)); process.exit(result.status==='COMPLETED'?0:1);
  }
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
