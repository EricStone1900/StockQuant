import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v13-web-${randomBytes(10).toString("hex")}`;
const manualAcceptance = process.env.STOCKQUANT_V13_MANUAL_ACCEPTANCE === "1";
const stateDirectory = path.resolve(".codex/isolated-stacks");
const envFile = path.join(stateDirectory, `${project}.env`);
const stateFile = path.join(stateDirectory, `${project}.json`);
const stopFile = path.join(stateDirectory, `${project}.stop`);
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
let tradePort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
while (tradePort === apiPort) tradePort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const composeFile = "infra/compose/docker-compose.v13-integration.yml";
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const isolatedPasswords = Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")]));
const tokens = {
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex")
};
const env = { ...process.env, ...isolatedPasswords, ...tokens, STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(32).toString("hex"), STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED: "true", STOCKQUANT_V13_TEST_MANUAL_MULTILEG_RESTART_DELAY_MS: process.env.STOCKQUANT_V13_TEST_MANUAL_MULTILEG_RESTART_DELAY_MS ?? (manualAcceptance ? "0" : "15000"), COMPOSE_PROJECT_NAME: project, V11_HOST_PORT: String(apiPort), V13_TRADE_HOST_PORT: String(tradePort), V13_WEB_HOST_PORT: String(webPort) };
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, ...(manualAcceptance ? ["--env-file", envFile] : []), "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
let started = false;
let exitCode = 1;

try {
  if (manualAcceptance) {
    mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
    chmodSync(stateDirectory, 0o700);
    const composeVars = Object.fromEntries(Object.entries(env).filter(([name]) => name.startsWith("STOCKQUANT_DATABASE_PASSWORD_") || name.startsWith("STOCKQUANT_SERVICE_TOKEN_") || ["STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD", "COMPOSE_PROJECT_NAME", "V11_HOST_PORT", "V13_TRADE_HOST_PORT", "V13_WEB_HOST_PORT", "STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED", "STOCKQUANT_V13_TEST_MANUAL_MULTILEG_RESTART_DELAY_MS"].includes(name)));
    writeFileSync(envFile, `${Object.entries(composeVars).map(([name, value]) => `${name}=${value}`).join("\n")}\n`, { mode: 0o600, flag: "wx" });
    chmodSync(envFile, 0o600);
    writeFileSync(stateFile, `${JSON.stringify({ project, stage: "V1.3", composeFile, envFile, apiPort, webPort, tradePort, interactive: true }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    chmodSync(stateFile, 0o600);
  }
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
  const session = await fetch(`${apiUrl}/api/v1/session`);
  assert.equal(session.status, 200, "isolated Platform API did not establish its local acceptance session");
  const sessionCookie = session.headers.get("set-cookie")?.split(";", 1)[0];
  assert.match(sessionCookie ?? "", /^sq_session=[^;\s]+$/u, "isolated acceptance session did not issue a scoped cookie");

  const unauthorizedRunId = "00000000-0000-4000-8000-000000000001";
  const unauthorizedProposalId = "00000000-0000-4000-8000-000000000002";
  const unauthorizedMandateId = "00000000-0000-4000-8000-000000000003";
  const unauthorizedOrderId = "unauthorized-client-order";
  const apiAuthCases = [
    ["scenario discovery", "GET", "/api/v1/acceptance/v1/v1.3/scenarios", undefined],
    ["run creation", "POST", "/api/v1/acceptance/v1/v1.3/runs", { scenarioId: "normal", seed: 20260907 }],
    ["account initialization", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/accounts`, { market: "CN_A" }],
    ["session clock read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/clock`, undefined],
    ["session advance", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/clock/advance-session`, { accountId: "unauthorized-account", expectedClock: "2026-09-07T09:30:00+08:00" }],
    ["external order observation", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/external-orders/observe`, {}],
    ["reconciliation read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/reconciliation`, undefined],
    ["proposal creation", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals`, { proposalType: "MANUAL_APPROVAL" }],
    ["AUTO_POLICY mandate creation", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/auto-mandates`, {}],
    ["AUTO_POLICY mandate read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/auto-mandates/${unauthorizedMandateId}`, undefined],
    ["AUTO_POLICY mandate budget read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/auto-mandates/${unauthorizedMandateId}/versions/1/budget`, undefined],
    ["AUTO_POLICY mandate activation", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/auto-mandates/${unauthorizedMandateId}/activate`, {}],
    ["AUTO_POLICY mandate pause", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/auto-mandates/${unauthorizedMandateId}/pause`, {}],
    ["proposal read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}`, undefined],
    ["proposal revision", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/revisions/append`, {}],
    ["proposal decision", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/approve`, {}],
    ["manual execution", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/execution/submit`, {}],
    ["sequenced execution", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/sequenced-execution/submit`, {}],
    ["sequenced fill report", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}/sequenced-reports/1`, {}],
    ["order cancel request", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}/cancel-request`, {}],
    ["order cancel result", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}/cancel-results/1`, {}],
    ["partial-fill cancellation", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}/cancel-partial-fill`, {}],
    ["fill fee correction", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}/fills/00000000-0000-4000-8000-000000000004/fee-corrections`, {}],
    ["AUTO_POLICY execution", "POST", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/auto-execution/submit`, {}],
    ["proposal order read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}/proposals/${unauthorizedProposalId}/orders/${unauthorizedOrderId}`, undefined],
    ["TestRun read", "GET", `/api/v1/acceptance/v1/v1.3/runs/${unauthorizedRunId}`, undefined],
    ["account snapshot", "GET", `/api/v1/accounts/${unauthorizedRunId}`, undefined],
  ];
  const platformSource = readFileSync("services/platform-api-service/src/bootstrap/app.module.ts", "utf8");
  const controllerMarker = '@Controller("api/v1/acceptance/v1/v1.3")';
  const controllerStart = platformSource.indexOf(controllerMarker);
  assert.notEqual(controllerStart, -1, "V1.3 Platform API controller must exist for auth route parity");
  const controllerEnd = platformSource.indexOf("\n@Controller(", controllerStart + controllerMarker.length);
  const controllerSource = platformSource.slice(controllerStart, controllerEnd < 0 ? undefined : controllerEnd);
  const declaredRoutes = [...controllerSource.matchAll(/@(Get|Post|Patch|Put|Delete)\("([^"]+)"\)/gu)]
    .map(([, verb, path]) => ({ method: verb.toUpperCase(), path: `/api/v1/acceptance/v1/v1.3/${path}` }));
  assert.equal(declaredRoutes.length, 26, "update the Platform identity route inventory when V1.3 controller operations change");
  const routeMatches = (pattern, actual) => new RegExp(`^${pattern.split("/").map((segment) => segment.startsWith(":") ? "[^/]+" : segment.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")).join("/")}$`, "u").test(actual);
  for (const declared of declaredRoutes) {
    const probes = apiAuthCases.filter(([label, method, route]) => method === declared.method && routeMatches(declared.path, route));
    assert.equal(probes.length, 1, `${declared.method} ${declared.path} must have exactly one anonymous/forged identity probe`);
  }
  for (const [label, method, route, body] of apiAuthCases) {
    for (const [identityName, headers, expected] of [
      ["anonymous", {}, 401],
      ["forged test header", { "x-stockquant-user": "unauthorized-owner" }, 403],
    ]) {
      const response = await fetch(`${apiUrl}${route}`, {
        method,
        headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      assert.equal(response.status, expected, `${label} must reject ${identityName} before business access`);
    }
  }
  console.info(`[V1.3 Platform identity boundary] ${JSON.stringify({ routes: apiAuthCases.map(([label, method, route]) => ({ label, method, route })), anonymousRejected: apiAuthCases.length, forgedOwnerRejected: apiAuthCases.length, expectedStatuses: { anonymous: 401, forgedOwner: 403 }, authenticatedSessionCookieIssued: true })}`);

  const webUrl = `http://127.0.0.1:${webPort}`;
  let webReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { if ((await fetch(`${webUrl}/acceptance/v1/v1.3`)).ok) { webReady = true; break; } } catch { /* wait for the containerized Web */ }
    await delay(250);
  }
  assert.equal(webReady, true, "containerized isolated V1.3 Web did not become ready");
  console.info(`[V1.3 isolated acceptance URLs] ${JSON.stringify({ webUrl: `${webUrl}/acceptance/v1/v1.3`, platformApiUrl: apiUrl, tradeExecutionUrl: `http://127.0.0.1:${tradePort}`, brokerMode: "FAKE", environmentMode: "PAPER", liveTradingEnabled: false })}`);
  if (manualAcceptance) {
    process.stdout.write(`${JSON.stringify({ status: "READY_FOR_MANUAL_ACCEPTANCE", stage: "V1.3", isolatedProject: project, webUrl: `${webUrl}/acceptance/v1/v1.3`, platformApiUrl: apiUrl, tradeExecutionUrl: `http://127.0.0.1:${tradePort}`, identity: "first Web request establishes local acceptance-owner-1 session cookie", brokerMode: "FAKE", environmentMode: "PAPER", liveTradingEnabled: false, databaseAuthentication: "SCRAM-SHA-256 with per-project random credentials", shutdown: `pnpm stack:down -- --project ${project}` })}\n`);
    const keepAlive = setInterval(() => {}, 60_000);
    exitCode = await new Promise((resolveSignal) => {
      let handled = false;
      let stopWatcher;
      const finish = (signal) => {
        if (handled) return;
        handled = true;
        clearInterval(stopWatcher);
        process.stdout.write(`${JSON.stringify({ status: "MANUAL_STACK_STOPPING", signal, isolatedProject: project })}\n`);
        resolveSignal(0);
      };
      process.once("SIGINT", () => finish("SIGINT"));
      process.once("SIGTERM", () => finish("SIGTERM"));
      process.once("SIGHUP", () => finish("SIGHUP"));
      stopWatcher = setInterval(() => { if (existsSync(stopFile)) finish("STACK_DOWN"); }, 300);
    });
    clearInterval(keepAlive);
  } else {
  const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", process.env.STOCKQUANT_V13_E2E_GREP ?? "V1.3"], {
    env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie, STOCKQUANT_V13_TRADE_URL: `http://127.0.0.1:${tradePort}`, STOCKQUANT_V13_TEST_COMPOSE_PROJECT: project, STOCKQUANT_V13_CAPTURE_RUN_ID: project, PLAYWRIGHT_BASE_URL: webUrl }, stdio: "inherit"
  });
  exitCode = browser.status ?? 1;
  if (exitCode !== 0) compose(["logs", "platform-api-service", "market-data-service", "trade-execution-service", "portfolio-risk-service"]);
  assert.equal(exitCode, 0, "V1.3 Web/API/CLI same-run E2E failed");
  }
} finally {
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
  const images = imageList.stdout.split(/\r?\n/u).filter((ref) => ref.startsWith(`${project}-`));
  if (images.length) {
    const removed = spawnSync("docker", ["image", "rm", ...images], { encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
  }
  const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(remainingImages.status, 0, remainingImages.stderr);
  assert.deepEqual(remainingImages.stdout.split(/\r?\n/u).filter((ref) => ref.startsWith(`${project}-`)), [], `isolated V1.3 images remain for ${project}`);
  if (manualAcceptance) {
    rmSync(stopFile, { force: true });
    rmSync(envFile, { force: true });
    rmSync(stateFile, { force: true });
  }
}
assert.equal(exitCode, 0, manualAcceptance ? "V1.3 isolated interactive stack failed" : "isolated V1.3 Web/API/CLI same-run E2E did not pass");
if (manualAcceptance) console.log(JSON.stringify({ status: "MANUAL_STACK_CLEANUP_VERIFIED", isolatedProject: project, containers: 0, volumes: 0, networks: 0, projectImages: 0, humanAcceptance: "NOT_RECORDED" }));
else console.log(JSON.stringify({ status: "PASS", scope: process.env.STOCKQUANT_V13_E2E_GREP ? `filtered Playwright scenario: ${process.env.STOCKQUANT_V13_E2E_GREP}` : "V1.3 isolated Platform/Portfolio/Governance/Trade Execution CN and US fixed-Fixture order loops, rejection boundaries, and Trade process-restart recovery", isolatedProject: project, externalSourceCalls: 0, realBrokerCalls: 0, ...(process.env.STOCKQUANT_V13_E2E_GREP ? {} : { FakeBrokerOrders: "one CN and one US normal order; same-clientOrderId recovery verified before and after Trade restart" }), exactProjectResourcesRemoved: true }));
if (manualAcceptance) process.exit(0);
