import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v11-stage-${randomBytes(10).toString("hex")}`;
const hostPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v11-integration.yml";
const databaseRoleEnvNames = [
  "STOCKQUANT_DATABASE_PASSWORD_PLATFORM_API",
  "STOCKQUANT_DATABASE_PASSWORD_PORTFOLIO_RISK",
  "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION",
  "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION_TEST",
  "STOCKQUANT_DATABASE_PASSWORD_HISTORICAL_REPLAY",
  "STOCKQUANT_DATABASE_PASSWORD_DECISION_GOVERNANCE",
  "STOCKQUANT_DATABASE_PASSWORD_QUANT_RESEARCH",
  "STOCKQUANT_DATABASE_PASSWORD_RESEARCH_AUTOMATION",
  "STOCKQUANT_DATABASE_PASSWORD_MARKET_DATA",
];
const isolatedDatabasePasswords = Object.fromEntries(databaseRoleEnvNames.map((name) => [name, randomBytes(32).toString("hex")]));
const composeEnv = { ...process.env, ...isolatedDatabasePasswords, COMPOSE_PROJECT_NAME: project, V11_HOST_PORT: String(hostPort) };
const compose = (args, env = composeEnv, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { env: { ...env, COMPOSE_PROJECT_NAME: project }, encoding: "utf8", stdio });
let started = false;
let webServer;
let testExitCode = 1;

try {
  started = true;
  const up = compose(["up", "-d", "--build"]);
  assert.equal(up.status, 0, "isolated V1.1 Compose stack failed to start");

  const expectedPortfolio = compose(["ps", "-q", "portfolio-risk-service"], composeEnv, "pipe");
  assert.equal(expectedPortfolio.status, 0);
  const expectedId = expectedPortfolio.stdout.trim();
  assert.ok(expectedId, "isolated Portfolio container is missing");
  const recoveryTarget = spawnSync("docker", ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "ps", "-q", "portfolio-risk-service"], {
    env: { ...process.env, COMPOSE_PROJECT_NAME: project }, encoding: "utf8"
  });
  assert.equal(recoveryTarget.status, 0, recoveryTarget.stderr);
  assert.equal(recoveryTarget.stdout.trim(), expectedId, "the V1.1 recovery command would not target the isolated Portfolio container");

  const apiUrl = `http://127.0.0.1:${hostPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* service startup */ }
    await delay(250);
  }
  assert.equal(ready, true, "isolated Platform API did not become live");

  const apiContainer = compose(["ps", "-q", "platform-api-service"], composeEnv, "pipe");
  assert.equal(apiContainer.status, 0);
  const config = spawnSync("docker", ["inspect", "--format", "{{range .Config.Env}}{{println .}}{{end}}", apiContainer.stdout.trim()], { encoding: "utf8" });
  assert.equal(config.status, 0, config.stderr);
  assert.ok(config.stdout.split("\n").includes("STOCKQUANT_V11_RUN_STORAGE=stage"), "isolated API must start in unified-store mode");

  const suite = spawnSync("pnpm", ["verify:stage", "--", "--stage", "V1.1", "--suite", "code"], {
    env: { ...process.env, COMPOSE_PROJECT_NAME: project, STOCKQUANT_PLATFORM_API_URL: apiUrl },
    stdio: "inherit"
  });
  testExitCode = suite.status ?? 1;
  assert.equal(testExitCode, 0, "V1.1 code suite failed against the isolated stage-mode stack");

  webServer = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
    env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl },
    stdio: "inherit"
  });
  let webReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (webServer.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${webPort}/acceptance/v1/v1.1`)).ok) { webReady = true; break; } } catch { /* Vite startup */ }
    await delay(250);
  }
  assert.equal(webReady, true, "isolated V1.1 Web did not become ready");
  const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1.1"], {
    env: {
      ...process.env,
      COMPOSE_PROJECT_NAME: project,
      STOCKQUANT_ISOLATED_V11_PROJECT: project,
      STOCKQUANT_PLATFORM_API_URL: apiUrl,
      PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`
    },
    stdio: "inherit"
  });
  testExitCode = browser.status ?? 1;
  assert.equal(testExitCode, 0, "V1.1 Web normal/rejection/recovery same-run E2E failed");
} finally {
  if (webServer && webServer.exitCode === null) {
    webServer.kill("SIGTERM");
    await new Promise((resolveExit) => webServer.once("exit", resolveExit));
  }
  if (started) {
    const down = compose(["down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) testExitCode ||= down.status ?? 1;
  }
  const remaining = spawnSync("docker", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], { encoding: "utf8" });
  assert.equal(remaining.status, 0, remaining.stderr);
  assert.equal(remaining.stdout.trim(), "", `isolated containers remain for ${project}`);
  const volumes = spawnSync("docker", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], { encoding: "utf8" });
  assert.equal(volumes.status, 0, volumes.stderr);
  assert.equal(volumes.stdout.trim(), "", `isolated volumes remain for ${project}`);
  const networks = spawnSync("docker", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], { encoding: "utf8" });
  assert.equal(networks.status, 0, networks.stderr);
  assert.equal(networks.stdout.trim(), "", `isolated networks remain for ${project}`);
  const imageRefs = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(imageRefs.status, 0, imageRefs.stderr);
  const projectImages = imageRefs.stdout.split(/\r?\n/u).filter((ref) => [
    `${project}-platform-api-service:latest`,
    `${project}-portfolio-risk-service:latest`,
  ].includes(ref));
  if (projectImages.length > 0) {
    const removedImages = spawnSync("docker", ["image", "rm", ...projectImages], { encoding: "utf8" });
    assert.equal(removedImages.status, 0, removedImages.stderr);
  }
  const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(remainingImages.status, 0, remainingImages.stderr);
  assert.deepEqual(remainingImages.stdout.split(/\r?\n/u).filter((ref) => [
    `${project}-platform-api-service:latest`,
    `${project}-portfolio-risk-service:latest`,
  ].includes(ref)), [], `isolated images remain for ${project}`);
}

console.log(JSON.stringify({ status: "PASS", suite: "V1.1 code", storageMode: "stage", isolatedProject: project, recoveryRestartTargetVerified: true, exactContainersAndVolumesRemoved: true, exactImagesRemoved: true, resourcesRemoved: ["containers", "volumes", "networks", "images"] }));
