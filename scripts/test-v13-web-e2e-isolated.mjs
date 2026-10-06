import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v13-web-${randomBytes(10).toString("hex")}`;
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v11-integration.yml";
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const isolatedPasswords = Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")]));
const env = { ...process.env, ...isolatedPasswords, COMPOSE_PROJECT_NAME: project, V11_HOST_PORT: String(apiPort) };
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
let started = false;
let webServer;
let exitCode = 1;

try {
  started = true;
  const up = compose(["up", "-d", "--build"]);
  assert.equal(up.status, 0, "isolated V1.3 web stack failed to start");
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* wait for the isolated API */ }
    await delay(250);
  }
  assert.equal(ready, true, "isolated Platform API did not become live");

  webServer = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
    env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl }, stdio: "inherit"
  });
  let webReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (webServer.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${webPort}/acceptance/v1/v1.3`)).ok) { webReady = true; break; } } catch { /* wait for Vite */ }
    await delay(250);
  }
  assert.equal(webReady, true, "isolated V1.3 Web did not become ready");
  const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1.3"], {
    env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}` }, stdio: "inherit"
  });
  exitCode = browser.status ?? 1;
  assert.equal(exitCode, 0, "V1.3 Web/API/CLI same-run E2E failed");
} finally {
  if (webServer && webServer.exitCode === null) {
    webServer.kill("SIGTERM");
    await new Promise((resolveExit) => webServer.once("exit", resolveExit));
  }
  if (started) {
    const down = compose(["down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) exitCode ||= down.status ?? 1;
  }
  for (const [label, args] of [
    ["containers", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`]],
    ["volumes", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
    ["networks", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]]
  ]) {
    const remaining = spawnSync("docker", args, { encoding: "utf8" });
    assert.equal(remaining.status, 0, remaining.stderr);
    assert.equal(remaining.stdout.trim(), "", `isolated ${label} remain for ${project}`);
  }
  const imageList = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(imageList.status, 0, imageList.stderr);
  const images = imageList.stdout.split(/\r?\n/u).filter((ref) => [`${project}-platform-api-service:latest`, `${project}-portfolio-risk-service:latest`].includes(ref));
  if (images.length) {
    const removed = spawnSync("docker", ["image", "rm", ...images], { encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
  }
}
assert.equal(exitCode, 0, "isolated V1.3 Web/API/CLI same-run E2E did not pass");
console.log(JSON.stringify({ status: "PASS", scope: "V1.3 synthetic Platform acceptance surface only", isolatedProject: project, externalSourceCalls: 0, brokerCalls: 0, exactProjectResourcesRemoved: true }));
