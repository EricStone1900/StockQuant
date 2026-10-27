import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
const stageIndex = args.indexOf("--stage");
const stage = stageIndex >= 0 ? args[stageIndex + 1] : undefined;
if (stage === "V1.2") {
  const child = spawn(process.execPath, ["scripts/test-v12-e2e-isolated.mjs"], {
    env: { ...process.env, STOCKQUANT_V12_MANUAL_ACCEPTANCE: "1" },
    stdio: "inherit"
  });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(signal, () => {
      stopping = true;
      if (child.exitCode === null) child.kill(signal);
    });
  }
  const result = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  if (result.code !== 0 && !stopping) process.exitCode = result.code ?? 1;
  process.exit();
}
if (stage === "V1.3") {
  const child = spawn(process.execPath, ["scripts/test-v13-web-e2e-isolated.mjs"], {
    env: { ...process.env, STOCKQUANT_V13_MANUAL_ACCEPTANCE: "1" },
    stdio: "inherit"
  });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.once(signal, () => {
      stopping = true;
      if (child.exitCode === null) child.kill(signal);
    });
  }
  const result = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  if (result.code !== 0 && !stopping) process.exitCode = result.code ?? 1;
  process.exit();
}
if (stage === "V1.4") {
  const child = spawn(process.execPath, ["scripts/stack-up-v14-interactive.mjs"], { stdio: "inherit" });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, () => { stopping = true; if (child.exitCode === null) child.kill(signal); });
  const result = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  if (result.code !== 0 && !stopping) process.exitCode = result.code ?? 1;
  process.exit();
}
if (stage === "V1.5") {
  const child = spawn(process.execPath, ["scripts/stack-up-v15-interactive.mjs"], { stdio: "inherit" });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, () => { stopping = true; if (child.exitCode === null) child.kill(signal); });
  const result = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  if (result.code !== 0 && !stopping) process.exitCode = result.code ?? 1;
  process.exit();
}
if (stage === "V2.1") {
  const child = spawn(process.execPath, ["scripts/stack-up-v21-interactive.mjs"], { stdio: "inherit" });
  let stopping = false;
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, () => { stopping = true; if (child.exitCode === null) child.kill(signal); });
  const result = await new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  if (result.code !== 0 && !stopping) process.exitCode = result.code ?? 1;
  process.exit();
}
if (stage !== "V1.1") {
  console.error("usage: pnpm stack:up -- --stage V1.1|V1.2|V1.3|V1.4|V1.5|V2.1");
  process.exit(2);
}

function availableLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

const project = `sq-v11-stack-${randomBytes(10).toString("hex")}`;
const stateDirectory = path.resolve(".codex/isolated-stacks");
const envFile = path.join(stateDirectory, `${project}.env`);
const stateFile = path.join(stateDirectory, `${project}.json`);
const composeFile = "infra/compose/docker-compose.v11-integration.yml";
const [apiPort, webPort] = await Promise.all([availableLoopbackPort(), availableLoopbackPort()]);
const secretNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA", "MARKET_MONITOR"];
const env = [
  `V11_HOST_PORT=${apiPort}`,
  `V11_WEB_HOST_PORT=${webPort}`,
  `STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD=${randomBytes(32).toString("hex")}`,
  ...secretNames.map((name) => `STOCKQUANT_DATABASE_PASSWORD_${name}=${randomBytes(32).toString("hex")}`),
  `STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR=${randomBytes(32).toString("hex")}`,
].join("\n") + "\n";
const compose = (composeArgs, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "--env-file", envFile, "-f", composeFile, ...composeArgs], { encoding: "utf8", stdio });
let started = false;
try {
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  chmodSync(stateDirectory, 0o700);
  writeFileSync(envFile, env, { mode: 0o600, flag: "wx" });
  chmodSync(envFile, 0o600);
  writeFileSync(stateFile, JSON.stringify({ project, stage, composeFile, envFile, apiPort, webPort }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  const up = compose(["--profile", "interactive", "up", "-d", "--build"]);
  assert.equal(up.status, 0, "isolated V1.1 stack failed to start");
  started = true;
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}/acceptance/v1/v1.1`;
  for (const [name, url] of [["Platform API", `${apiUrl}/live`], ["containerized Web", webUrl]]) {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* isolated stack is starting */ }
      await delay(250);
    }
    assert.equal(ready, true, `${name} did not become ready at ${url}`);
  }
  console.log(JSON.stringify({ status: "READY", stage, isolatedProject: project, webUrl, platformApiUrl: apiUrl, identity: "first Web request establishes local acceptance-owner-1 session", brokerMode: "FAKE", environmentMode: "PAPER", liveTradingEnabled: false, stopCommand: `pnpm stack:down -- --project ${project}`, timeoutSeconds: 30 }));
} catch (error) {
  const projectContainers = spawnSync("docker", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], { encoding: "utf8" });
  if (started || projectContainers.stdout?.trim()) compose(["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
  rmSync(envFile, { force: true });
  rmSync(stateFile, { force: true });
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
