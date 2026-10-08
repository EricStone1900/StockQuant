import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { V14_MANIFEST_INPUTS } from "./v14-code-version-inputs.mjs";

function port() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

const project = `sq-v14-stack-${randomBytes(10).toString("hex")}`;
const directory = path.resolve(".codex/isolated-stacks");
const envFile = path.join(directory, `${project}.env`);
const stateFile = path.join(directory, `${project}.json`);
const stopFile = path.join(directory, `${project}.stop`);
const composeFile = "infra/compose/docker-compose.v14-integration.yml";
const [apiPort, webPort] = await Promise.all([port(), port()]);
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const values = Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")]));
Object.assign(values, {
  STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex"),
  V11_HOST_PORT: String(apiPort),
  V14_WEB_HOST_PORT: String(webPort),
  STOCKQUANT_V14_TEST_HOOKS_ENABLED: "false",
  STOCKQUANT_V14_TEST_DELAY_MS: "0",
  STOCKQUANT_V14_TEST_AFTER_QUANT_DELAY_MS: "0",
  STOCKQUANT_CODE_VERSION: `sha256:${createHash("sha256").update(V14_MANIFEST_INPUTS.map((input) => `${input}\0${createHash("sha256").update(readFileSync(path.resolve(input))).digest("hex")}`).join("\n")).digest("hex")}`
});
const envContents = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "--env-file", envFile, "-f", composeFile, ...args], { encoding: "utf8", stdio });
const resources = () => [
  ["containers", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`]],
  ["volumes", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
  ["networks", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]]
];
let started = false;
try {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  writeFileSync(envFile, envContents, { mode: 0o600, flag: "wx" });
  writeFileSync(stateFile, JSON.stringify({ project, stage: "V1.4", composeFile, envFile, apiPort, webPort, interactive: true }, null, 2) + "\n", { mode: 0o600, flag: "wx" });
  const up = compose(["--profile", "interactive", "up", "-d", "--build"]);
  assert.equal(up.status, 0, "isolated V1.4 interactive stack failed to start");
  started = true;
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}/acceptance/v1/v1.4`;
  for (const [name, url] of [["Platform API", `${apiUrl}/live`], ["containerized Web", webUrl]]) {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* wait for isolated services */ }
      await delay(250);
    }
    assert.equal(ready, true, `${name} failed readiness at ${url}`);
  }
  console.log(JSON.stringify({ status: "READY_FOR_MANUAL_ACCEPTANCE", stage: "V1.4", isolatedProject: project, webUrl, platformApiUrl: apiUrl, brokerMode: "FAKE", environmentMode: "BACKTEST", liveTradingEnabled: false, postgresAuth: "SCRAM-SHA-256", credentialFileMode: "0600", humanAcceptance: "NOT_RECORDED", stopCommand: `pnpm stack:down -- --project ${project}` }));
  let stopping = false;
  const stop = () => { stopping = true; };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, stop);
  while (!stopping && !existsSync(stopFile)) await delay(500);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (started) {
    const down = compose(["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) process.exitCode = down.status ?? 1;
    for (const [, args] of resources()) {
      const result = spawnSync("docker", args, { encoding: "utf8" });
      if (result.status !== 0 || result.stdout.trim()) process.exitCode = 1;
    }
    const images = spawnSync("docker", ["images", "-q", "--filter", `reference=${project}-*`], { encoding: "utf8" });
    const imageIds = [...new Set(images.stdout.trim().split(/\s+/u).filter(Boolean))];
    if (imageIds.length) spawnSync("docker", ["image", "rm", ...imageIds], { encoding: "utf8" });
    const remaining = spawnSync("docker", ["images", "-q", "--filter", `reference=${project}-*`], { encoding: "utf8" });
    if (remaining.status !== 0 || remaining.stdout.trim()) process.exitCode = 1;
  }
  rmSync(stopFile, { force: true });
  rmSync(stateFile, { force: true });
  rmSync(envFile, { force: true });
  console.log(JSON.stringify({ status: process.exitCode === 1 ? "CLEANUP_FAILED" : "MANUAL_STACK_CLEANUP_VERIFIED", isolatedProject: project, humanAcceptance: "NOT_RECORDED" }));
  process.exit(process.exitCode ?? 0);
}
