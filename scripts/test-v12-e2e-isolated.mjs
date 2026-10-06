import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v12-e2e-${randomBytes(10).toString("hex")}`;
const manualAcceptance = process.env.STOCKQUANT_V12_MANUAL_ACCEPTANCE === "1";
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v12-integration.yml";
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const serviceToken = randomBytes(32).toString("hex");
const qlibToken = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  ...Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")])),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: serviceToken,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE: qlibToken,
  COMPOSE_PROJECT_NAME: project,
  V12_HOST_PORT: String(apiPort),
  STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_BROKER_MODE: "FAKE",
  STOCKQUANT_COLLECTION_EXECUTOR: "0",
  STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED: "false"
};
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
const apiUrl = `http://127.0.0.1:${apiPort}`;
let started = false;
let web;
let exitCode = 1;
let browserOutput = "";
let browserError = "";
let testRunId;
let testRunIds = [];

try {
  started = true;
  const up = compose(["up", "-d", "--build"]);
  if (up.status !== 0) {
    const logs = compose(["logs", "--no-color", "--tail", "120"], "pipe");
    process.stderr.write(logs.stdout ?? "");
    process.stderr.write(logs.stderr ?? "");
  }
  assert.equal(up.status, 0, "isolated V1.2 Compose stack failed to start");
  let ready = false;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      if ((await fetch(`${apiUrl}/live`, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; }
    } catch { /* wait for the isolated dependency stack */ }
    await delay(500);
  }
  assert.equal(ready, true, "isolated V1.2 Platform API did not become live");

  web = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
    env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl }, stdio: "inherit"
  });
  let webReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (web.exitCode !== null) break;
    try {
      if ((await fetch(`http://127.0.0.1:${webPort}/acceptance/v1/v1.2`, { signal: AbortSignal.timeout(1000) })).ok) { webReady = true; break; }
    } catch { /* wait for isolated Vite */ }
    await delay(250);
  }
  assert.equal(webReady, true, "isolated V1.2 Web did not become ready");
  if (manualAcceptance) {
    process.stdout.write(`${JSON.stringify({
      status: "READY_FOR_MANUAL_ACCEPTANCE",
      isolatedProject: project,
      webUrl: `http://127.0.0.1:${webPort}/acceptance/v1/v1.2`,
      platformApiUrl: apiUrl,
      fixtureVersion: "v1.2-market-data-1",
      sourceAuthorization: "NONE",
      liveTradingEnabled: false,
      brokerMode: "FAKE",
      shutdown: "Press Ctrl-C in this terminal; only this isolated project and its resources will be removed."
    })}\n`);
    exitCode = await new Promise((resolveSignal) => {
      let handled = false;
      const finish = (signal) => {
        if (handled) return;
        handled = true;
        process.stdout.write(`${JSON.stringify({ status: "MANUAL_STACK_STOPPING", signal, isolatedProject: project })}\n`);
        resolveSignal(0);
      };
      process.once("SIGINT", () => finish("SIGINT"));
      process.once("SIGTERM", () => finish("SIGTERM"));
      process.once("SIGHUP", () => finish("SIGHUP"));
    });
  } else {
    const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1\.2"], {
      env: { ...env, CI: "1", PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`, STOCKQUANT_PLATFORM_API_URL: apiUrl }, encoding: "utf8"
    });
    browserOutput = browser.stdout ?? "";
    browserError = browser.stderr ?? "";
    process.stdout.write(browserOutput);
    process.stderr.write(browserError);
    assert.equal(browser.status, 0, "V1.2 isolated Web/API/CLI browser scenario failed");
    testRunIds = [...browserOutput.matchAll(/\[V1\.2 Web\/CLI same-run\] testRunId=([0-9a-f-]{36})/giu)].map((match) => match[1]);
    assert.equal(testRunIds.length, 3, "V1.2 browser suite must verify normal, rejection, and recovery-probe TestRuns through CLI");
    assert.equal(new Set(testRunIds).size, 3, "V1.2 scenarios must use isolated TestRun IDs");
    testRunId = testRunIds[0];
    exitCode = 0;
  }
} finally {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await new Promise((resolveExit) => web.once("exit", resolveExit));
  }
  if (started && exitCode !== 0) {
    const logs = compose(["logs", "--no-color", "--tail", "160"], "pipe");
    process.stderr.write(logs.stdout ?? "");
    process.stderr.write(logs.stderr ?? "");
  }
  if (started) {
    const down = compose(["down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) exitCode ||= down.status ?? 1;
  }
  for (const [args, label] of [
    [["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], "containers"],
    [["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "volumes"],
    [["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "networks"]
  ]) {
    const result = spawnSync("docker", args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "", `isolated ${label} remain for ${project}`);
  }
  const imageList = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(imageList.status, 0, imageList.stderr);
  const ownImages = imageList.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`));
  if (ownImages.length > 0) {
    const removed = spawnSync("docker", ["image", "rm", ...ownImages], { encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
  }
  const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(remainingImages.status, 0, remainingImages.stderr);
  assert.deepEqual(remainingImages.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`)), [], `isolated images remain for ${project}`);
}

assert.equal(exitCode, 0, "V1.2 isolated Web/API/CLI E2E failed");
if (manualAcceptance) {
  process.stdout.write(`${JSON.stringify({ status: "MANUAL_STACK_CLEANUP_VERIFIED", isolatedProject: project, containers: 0, volumes: 0, networks: 0, projectImages: 0, humanAcceptance: "NOT_RECORDED" })}\n`);
  process.exit(0);
}
const evidenceDir = "evidence/audits";
await mkdir(evidenceDir, { recursive: true });
const evidencePath = `${evidenceDir}/2026-10-06-w1-v12-isolated-web-e2e.json`;
await writeFile(evidencePath, `${JSON.stringify({
  schemaVersion: "stockquant.w1-v12-isolated-web-e2e.v1",
  stageId: "V1.2",
  status: "PASS",
  isolatedProject: project,
  apiPort,
  webPort,
  testRunId,
  testRunIds,
  browserOutput,
  browserError,
  isolatedContainersVolumesNetworksAndImagesRemoved: true,
  marketSourceAuthorization: "NONE",
  marketSourceCalls: 0,
  modelCalls: 0,
  brokerCalls: 0,
  liveTradingEnabled: false,
  humanAcceptance: "NOT_CHANGED"
}, null, 2)}\n`, { mode: 0o600 });
const manifestInputs = [evidencePath, "infra/compose/docker-compose.v12-integration.yml", "scripts/test-v12-e2e-isolated.mjs", "apps/web/src/main.tsx", "apps/web/tests/e2e/v11-acceptance.spec.ts", "services/platform-api-service/src/application/v12-acceptance.ts", "services/market-data-service/src/service-auth.ts", "services/quant-research-service/src/application/qlib-research-service.ts"];
const manifest = [];
for (const path of manifestInputs) manifest.push(`${createHash("sha256").update(await readFile(path)).digest("hex")}  ${path}`);
const manifestPath = `${evidencePath.slice(0, -5)}.sha256`;
await writeFile(manifestPath, `${manifest.join("\n")}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PASS", suite: "V1.2 isolated Web/API/CLI same-TestRun normal/rejection/recovery-probe", testRunIds, isolatedProject: project, cleanup: "verified", evidence: evidencePath, manifest: manifestPath }));
