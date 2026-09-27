import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";
import { PostgresV24ObservationRepository } from "../dist/adapters/postgres-v24-observation-repository.js";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(serviceRoot, "../..");
const webRoot = resolve(repositoryRoot, "apps/web");
const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test:platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || decodeURIComponent(parsed.username) === "platform_api") throw new Error("refusing non-dedicated platform_api_test database");
const ownerId = "acceptance-owner-1";
const testRunId = randomUUID();
const yearDay = (Number.parseInt(testRunId.slice(0, 8), 16) % 364) + 1;
const observationDate = new Date(Date.UTC(2098, 0, yearDay)).toISOString().slice(0, 10);
const namespace = `v24-observation-${observationDate}`;
const pool = new Pool({ connectionString: databaseUrl });
const stageRuns = new PostgresStageRunRepository(pool);
const observations = new PostgresV24ObservationRepository(pool);
const children = [];
const containerized = process.argv.includes("--containerized");
const dockerSuffix = randomUUID().replaceAll("-", "").slice(0, 16);
const dockerNetwork = `sq-p3-v24-${dockerSuffix}`;
const apiContainer = `${dockerNetwork}-api`;
const webContainer = `${dockerNetwork}-web`;
const apiImage = `${dockerNetwork}:api`;
const webImage = `${dockerNetwork}:web`;
let seeded = false;
let dockerNetworkCreated = false;
let apiImageBuilt = false;
let webImageBuilt = false;

function docker(args, { encoding = "utf8", stdio = "pipe" } = {}) {
  const result = spawnSync("docker", args, { cwd: repositoryRoot, encoding, stdio, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`containerized V2.4 smoke Docker operation failed (${args[0]})`);
  return result.stdout;
}

function dockerPort(container, targetPort) {
  const output = docker(["port", container, `${targetPort}/tcp`]);
  const mapped = output.trim().split(/\r?\n/u).at(-1) ?? "";
  const port = Number(mapped.slice(mapped.lastIndexOf(":") + 1));
  if (!Number.isSafeInteger(port) || port <= 0) throw new Error("Docker did not publish a valid temporary loopback port");
  return port;
}

function dockerDatabaseUrl(source) {
  const url = new URL(source);
  url.hostname = "host.docker.internal";
  return url.toString();
}

async function startContainerizedStack() {
  docker(["network", "create", dockerNetwork]);
  dockerNetworkCreated = true;
  docker(["build", "-f", "services/platform-api-service/Dockerfile", "-t", apiImage, "."]);
  apiImageBuilt = true;
  docker(["build", "-f", "apps/web/Dockerfile", "-t", webImage, "."]);
  webImageBuilt = true;
  const serviceToken = `p3-container-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
  docker(["run", "-d", "--name", apiContainer, "--network", dockerNetwork, "--network-alias", "platform-api",
    "-p", "127.0.0.1::3000",
    "-e", "STOCKQUANT_BIND_HOST=0.0.0.0", "-e", "STOCKQUANT_PORT=3000",
    "-e", `STOCKQUANT_DATABASE_URL=${dockerDatabaseUrl(databaseUrl)}`,
    "-e", "STOCKQUANT_LIVE_TRADING_ENABLED=false", "-e", "STOCKQUANT_BROKER_MODE=FAKE",
    "-e", "STOCKQUANT_LOCAL_DEVELOPMENT_USER=acceptance-owner-1",
    "-e", "STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED=true", "-e", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${serviceToken}`,
    "-e", "STOCKQUANT_PORTFOLIO_API_URL=http://127.0.0.1:1", "-e", "STOCKQUANT_TRADE_EXECUTION_URL=http://127.0.0.1:1",
    "-e", "STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL=http://127.0.0.1:1", "-e", "STOCKQUANT_RESEARCH_AUTOMATION_URL=http://127.0.0.1:1",
    apiImage]);
  const apiPort = dockerPort(apiContainer, 3000);
  const apiUrl = `http://127.0.0.1:${apiPort}`;
  await waitForUrl(`${apiUrl}/live`);

  docker(["run", "-d", "--name", webContainer, "--network", dockerNetwork, "--network-alias", "stockquant-web",
    "-p", "127.0.0.1::8080", "-e", "STOCKQUANT_PLATFORM_API_URL=http://platform-api:3000", webImage]);
  const webPort = dockerPort(webContainer, 8080);
  const webUrl = `http://127.0.0.1:${webPort}`;
  await waitForUrl(webUrl);
  return { apiUrl, webUrl };
}

async function waitForUrl(url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { if ((await fetch(url)).ok) return; } catch { /* waiting for the temporary container */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error("temporary container did not become available");
}

function cleanupDocker() {
  for (const name of [webContainer, apiContainer]) spawnSync("docker", ["rm", "-f", name], { cwd: repositoryRoot, stdio: "ignore" });
  if (dockerNetworkCreated) spawnSync("docker", ["network", "rm", dockerNetwork], { cwd: repositoryRoot, stdio: "ignore" });
  if (webImageBuilt) spawnSync("docker", ["image", "rm", "-f", webImage], { cwd: repositoryRoot, stdio: "ignore" });
  if (apiImageBuilt) spawnSync("docker", ["image", "rm", "-f", apiImage], { cwd: repositoryRoot, stdio: "ignore" });
}

async function freePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolvePort(address.port));
    });
  });
}

async function assertPortAvailable(port) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => server.close((error) => error ? reject(error) : resolvePort()));
  });
}

function start(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const capture = (chunk) => { if (output.length < 12000) output += chunk.toString().slice(0, 12000 - output.length); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const entry = { child, get output() { return output; } };
  children.push(entry);
  return entry;
}

async function waitFor(entry, url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (entry.child.exitCode !== null) throw new Error(`temporary process exited early: ${entry.output}`);
    try { if ((await fetch(url)).ok) return; } catch { /* service is starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`temporary process did not become ready: ${entry.output}`);
}

async function stopChildren() {
  for (const entry of [...children].reverse()) {
    if (entry.child.exitCode === null) {
      entry.child.kill("SIGTERM");
      await new Promise((resolveClose) => entry.child.once("close", resolveClose));
    }
  }
}

try {
  await stageRuns.migrate();
  await observations.migrate();
  await stageRuns.save({
    testRunId, stageId: "V2.4", scenarioId: "observation", scenarioVersion: "1.0.0", ownerId,
    status: "COMPLETED", seed: 0,
    assertions: [{ assertionId: "P3-REVISION-ORIGINAL", status: "PASS", expected: "completed before delayed quality error", actual: "completed before delayed quality error" }],
    evidence: { observationDate, observationCounted: true, marker: "P3-REVISION-SAME-RUN" },
    namespace,
  });
  seeded = true;
  await pool.query(`INSERT INTO v24_observation_days
    (observation_date,source_available,signal_status,simulated_order_status,fill_status,reconciliation_status,outage_status,test_run_id,errors,recovery_actions,evidence)
    VALUES ($1,true,'HOLD','NONE','NONE','PASS','NONE',$2,$3::jsonb,'[]'::jsonb,$4::jsonb)`,
    [observationDate, testRunId, JSON.stringify(["synthetic-p3-readonly-web-db-check"]), JSON.stringify({ observationCounted: true })]);
  await observations.migrate();
  const revised = await stageRuns.find(testRunId, ownerId);
  const revisions = await observations.listRunRevisions(testRunId, ownerId);
  if (revised?.status !== "FAILED" || revisions.length !== 1 || revisions[0].reason !== "OBSERVATION_EVENT_ERRORS") throw new Error("isolated migration did not persist the expected revision");

  let apiUrl;
  let webUrl;
  if (containerized) {
    ({ apiUrl, webUrl } = await startContainerizedStack());
  } else {
    const apiPort = await freePort();
    apiUrl = `http://127.0.0.1:${apiPort}`;
    const apiChild = start(process.execPath, [resolve(serviceRoot, "dist/main.js")], serviceRoot, {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", NODE_ENV: "test",
      STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(apiPort), STOCKQUANT_DATABASE_URL: databaseUrl,
      STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId,
      STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1",
      STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1", STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1",
      STOCKQUANT_RESEARCH_AUTOMATION_URL: "http://127.0.0.1:1",
    });
    await waitFor(apiChild, `${apiUrl}/live`);

    const webPort = 5173;
    await assertPortAvailable(webPort);
    const webChild = start(process.execPath, [resolve(webRoot, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], webRoot, {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", STOCKQUANT_PLATFORM_API_URL: apiUrl,
    });
    webUrl = `http://127.0.0.1:${webPort}`;
    await waitFor(webChild, webUrl);
  }

  const e2e = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "tests/e2e/v24-observation-live-revision.spec.ts"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, PLAYWRIGHT_BASE_URL: webUrl, STOCKQUANT_P3_REVISION_TEST_RUN_ID: testRunId, STOCKQUANT_P3_REVISION_OBSERVATION_DATE: observationDate },
    maxBuffer: 2 * 1024 * 1024,
  });
  if (e2e.status !== 0) throw new Error(`isolated Web-to-API E2E failed: ${e2e.stdout}\n${e2e.stderr}`);

  const cli = spawnSync("pnpm", ["verify:stage", "--", "--stage", "V2.4", "--run", testRunId, "--check-only"], {
    cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true" }, maxBuffer: 2 * 1024 * 1024,
  });
  if (cli.status !== 1 || !cli.stdout.includes(testRunId) || !cli.stdout.includes('"status": "FAILED"')) throw new Error(`same-run CLI check did not report the preserved revision state (expected exit 1): ${cli.stdout}\n${cli.stderr}`);

  console.log(JSON.stringify({ status: "PASS", testRunId, observationDate, database: "platform_api_test", webAndApiContainerized: containerized, revisionCount: revisions.length, webApiDatabaseFlow: "PASS", sameRunCliCheck: "PASS_EXPECTED_FAILED_ASSERTION_EXIT_1", activeServicesTouched: false }));
} finally {
  await stopChildren();
  if (containerized) cleanupDocker();
  if (seeded) {
    await pool.query("DELETE FROM acceptance_stage_run_revisions WHERE test_run_id=$1", [testRunId]);
    await pool.query("DELETE FROM v24_observation_day_finalizations WHERE observation_date=$1", [observationDate]);
    await pool.query("DELETE FROM v24_observation_events WHERE observation_date=$1", [observationDate]);
    await pool.query("DELETE FROM v24_daily_test_runs WHERE observation_date=$1 AND test_run_id=$2", [observationDate, testRunId]);
    await pool.query("DELETE FROM v24_observation_days WHERE observation_date=$1 AND test_run_id=$2", [observationDate, testRunId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND namespace=$3", [testRunId, ownerId, namespace]);
    const [runs, days, revisionRows] = await Promise.all([
      pool.query("SELECT count(*)::int AS count FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]),
      pool.query("SELECT count(*)::int AS count FROM v24_observation_days WHERE observation_date=$1", [observationDate]),
      pool.query("SELECT count(*)::int AS count FROM acceptance_stage_run_revisions WHERE test_run_id=$1", [testRunId]),
    ]);
    if ([runs, days, revisionRows].some((result) => Number(result.rows[0].count) !== 0)) throw new Error("exact synthetic observation/TestRun cleanup failed");
  }
  await pool.end();
}
