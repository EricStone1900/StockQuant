import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v21-stack-${randomBytes(10).toString("hex")}`;
const directory = path.join(tmpdir(), "stockquant-v21-isolated-stacks");
const envFile = path.join(directory, `${project}.env`);
const overrideFile = path.join(directory, `${project}.override.yml`);
const stateFile = path.join(directory, `${project}.json`);
const stopFile = path.join(directory, `${project}.stop`);
const composeFile = "infra/compose/docker-compose.yml";
const values = {};
for (const name of ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA", "MARKET_MONITOR"]) {
  values[`STOCKQUANT_DATABASE_PASSWORD_${name}`] = randomBytes(32).toString("hex");
}
for (const name of ["PLATFORM_API", "TRADE_EXECUTION", "HISTORICAL_REPLAY", "QUANT_VALIDATION_WORKER", "QUANT_RESEARCH_SERVICE", "DECISION_GOVERNANCE", "RESEARCH_AUTOMATION", "RUNNER_HOST", "MARKET_MONITOR", "MARKET_DATA"]) {
  values[`STOCKQUANT_SERVICE_TOKEN_${name}`] = randomBytes(32).toString("hex");
}
Object.assign(values, {
  STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(32).toString("hex"),
  STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF: "",
  STOCKQUANT_MARKET_QUOTE_SOURCE_AUTHORIZATION_REF: "",
  STOCKQUANT_MARKET_NEWS_SOURCE_AUTHORIZATION_REF: "",
  STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF: "",
  STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS: "",
  STOCKQUANT_MARKET_QUOTE_AUTHORIZED_SOURCE_IDS: "",
  STOCKQUANT_MARKET_NEWS_AUTHORIZED_SOURCE_IDS: "",
  STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS: ""
});
const envContents = Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n";
const override = `services:\n  nats:\n    ports: !reset []\n  temporal:\n    ports: !reset []\n  postgres:\n    ports: !reset []\n  portfolio-risk-service:\n    ports: !reset []\n  trade-execution-service:\n    ports: !reset []\n  platform-api-service:\n    ports: !override ["127.0.0.1::3000"]\n  historical-replay-worker:\n    ports: !reset []\n  market-data-service:\n    env_file: !reset []\n    ports: !override ["127.0.0.1::3002"]\n  quant-research-service:\n    ports: !reset []\n  research-automation-service:\n    ports: !reset []\n  decision-governance-service:\n    ports: !reset []\n  qlib-worker:\n    ports: !reset []\n  web:\n    ports: !override ["127.0.0.1::8080"]\n`;
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "--env-file", envFile, "-f", composeFile, "-f", overrideFile, ...args], { encoding: "utf8", stdio });
const stop = () => spawnSync("docker", ["compose", "-p", project, "--env-file", envFile, "-f", composeFile, "-f", overrideFile, "--profile", "web", "down", "--volumes", "--remove-orphans"], { encoding: "utf8", stdio: "inherit" });
let started = false;
try {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  writeFileSync(envFile, envContents, { mode: 0o600, flag: "wx" });
  writeFileSync(overrideFile, override, { mode: 0o600, flag: "wx" });
  writeFileSync(stateFile, JSON.stringify({ project, stage: "V2.1", composeFile, envFile, overrideFile, interactive: true }, null, 2) + "\n", { mode: 0o600, flag: "wx" });

  const config = compose(["--profile", "web", "config", "--format", "json"], "pipe");
  assert.equal(config.status, 0, `isolated V2.1 Compose configuration failed: ${config.stderr || config.stdout}`);
  const model = JSON.parse(config.stdout);
  for (const service of Object.values(model.services)) {
    for (const [key, value] of Object.entries(service.environment ?? {})) {
      if (/SOURCE_USE_AUTHORIZED$/u.test(key)) assert.equal(value, "false", `${key} must remain disabled in V2.1 acceptance`);
    }
  }
  assert.deepEqual(model.services["market-data-service"].env_file ?? [], [], "V2.1 isolated stack must not import the local .env.local file into Market Data");
  // Compose can partially create the isolated project before reporting a failed `up`, so always run exact-project cleanup.
  started = true;
  const up = compose(["--profile", "web", "up", "-d", "--build"]);
  assert.equal(up.status, 0, "isolated V2.1 stack failed to start");

  function publishedPort(service, target) {
    const result = compose(["--profile", "web", "port", service, String(target)], "pipe");
    assert.equal(result.status, 0, `could not determine isolated ${service} port: ${result.stderr || result.stdout}`);
    const match = /127\.0\.0\.1:(\d+)/u.exec(result.stdout);
    assert.ok(match, `Compose did not report a loopback port for ${service}`);
    return Number(match[1]);
  }
  const apiPort = publishedPort("platform-api-service", 3000);
  const marketDataPort = publishedPort("market-data-service", 3002);
  const webPort = publishedPort("web", 8080);

  const urls = [
    ["Platform API", `http://127.0.0.1:${apiPort}/live`],
    ["Market Data", `http://127.0.0.1:${marketDataPort}/live`],
    ["containerized Web", `http://127.0.0.1:${webPort}/acceptance/v2/v2.1`]
  ];
  for (const [name, url] of urls) {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* isolated stack is starting */ }
      await delay(250);
    }
    assert.equal(ready, true, `${name} did not become ready at ${url}`);
  }
  console.log(JSON.stringify({ status: "READY_FOR_MANUAL_ACCEPTANCE", stage: "V2.1", isolatedProject: project, webUrl: `http://127.0.0.1:${webPort}/acceptance/v2/v2.1`, platformApiUrl: `http://127.0.0.1:${apiPort}`, marketDataUrl: `http://127.0.0.1:${marketDataPort}`, sourceAuthorization: "DISABLED", brokerMode: "FAKE", liveTradingEnabled: false, projectScopedVolumes: true, credentialFileMode: "0600", humanAcceptance: "NOT_RECORDED", stopCommand: `pnpm stack:down -- --project ${project}` }));
  let stopping = false;
  const requestStop = () => { stopping = true; };
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.once(signal, requestStop);
  while (!stopping && !existsSync(stopFile)) await delay(500);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  if (started) {
    const logs = compose(["logs", "--no-color", "--tail", "80", "market-monitor-db-provisioner"], "pipe");
    if (logs.stdout?.trim()) console.error(`market-monitor-db-provisioner diagnostic:\n${logs.stdout.trim()}`);
    if (logs.stderr?.trim()) console.error(logs.stderr.trim());
  }
  process.exitCode = 1;
} finally {
  if (started) {
    const down = stop();
    if (down.status !== 0) process.exitCode = down.status ?? 1;
    for (const [kind, args] of [
      ["containers", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`]],
      ["volumes", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
      ["networks", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]]
    ]) {
      const check = spawnSync("docker", args, { encoding: "utf8" });
      if (check.status !== 0 || check.stdout.trim()) { console.error(`isolated V2.1 ${kind} cleanup could not be verified`); process.exitCode = 1; }
    }
    const images = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}", "--filter", `reference=${project}-*`], { encoding: "utf8" });
    if (images.status !== 0) process.exitCode = 1;
    else if (images.stdout.trim()) {
      const refs = images.stdout.trim().split(/\r?\n/u).filter((name) => name.startsWith(`${project}-`));
      if (refs.length !== images.stdout.trim().split(/\r?\n/u).length || spawnSync("docker", ["image", "rm", ...refs], { encoding: "utf8" }).status !== 0) process.exitCode = 1;
    }
  }
  rmSync(stopFile, { force: true });
  rmSync(stateFile, { force: true });
  rmSync(envFile, { force: true });
  rmSync(overrideFile, { force: true });
  console.log(JSON.stringify({ status: started ? (process.exitCode === 1 ? "CLEANUP_FAILED" : "ISOLATED_STACK_STOPPED") : "NOT_STARTED", stage: "V2.1", isolatedProject: project, humanAcceptance: "NOT_RECORDED" }));
}
