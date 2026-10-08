import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createReadStream, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";

function freeLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

const temporalOutageMode = process.env.STOCKQUANT_V15_E2E_TEMPORAL_OUTAGE === "true";
const networkOutageMode = process.env.STOCKQUANT_V15_E2E_NETWORK_OUTAGE === "true";
const databaseRetryMode = process.env.STOCKQUANT_V15_E2E_DATABASE_RETRY === "true";
const databaseOutageMode = process.env.STOCKQUANT_V15_E2E_DATABASE_OUTAGE === "true";
const databaseConnectionDropMode = process.env.STOCKQUANT_V15_E2E_DATABASE_CONNECTION_DROP === "true";
const multiWorkerMode = process.env.STOCKQUANT_V15_E2E_MULTIWORKER === "true";
const workerFailoverMode = process.env.STOCKQUANT_V15_E2E_WORKER_FAILOVER === "true";
const backupRestoreMode = process.env.STOCKQUANT_V15_E2E_BACKUP_RESTORE === "true";
assert.ok([temporalOutageMode, networkOutageMode, databaseRetryMode, databaseOutageMode, databaseConnectionDropMode, multiWorkerMode, workerFailoverMode, backupRestoreMode].filter(Boolean).length <= 1, "select only one isolated fault mode");
const project = `sq-v15-e2e-${randomBytes(10).toString("hex")}`;
const evidenceRoot = mkdtempSync(join(tmpdir(), "sq-v15-e2e-evidence-"));
const composeFile = "infra/compose/docker-compose.v15-integration.yml";
const [apiPort, webPort] = await Promise.all([freeLoopbackPort(), freeLoopbackPort()]);
const env = {
  ...process.env,
  ...Object.fromEntries(["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"].map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")])),
  STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex"),
  STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_BROKER_MODE: "FAKE",
  STOCKQUANT_V14_TEST_HOOKS_ENABLED: "false",
  V11_HOST_PORT: String(apiPort),
  V14_WEB_HOST_PORT: String(webPort),
  V15_WEB_HOST_PORT: String(webPort),
  STOCKQUANT_CODE_VERSION: `sha256:${randomBytes(32).toString("hex")}`,
  STOCKQUANT_PLATFORM_API_URL: `http://127.0.0.1:${apiPort}`,
  STOCKQUANT_EVIDENCE_EXPORT_CWD: evidenceRoot,
  PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`,
  STOCKQUANT_V15_DISPATCH_TEST_DELAY_MS: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || backupRestoreMode ? "1000" : "30000",
  STOCKQUANT_V15_TEST_ACK_WAIT_MS: "3000",
  STOCKQUANT_V15_TEST_DROP_ACK_ONCE: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || backupRestoreMode ? "false" : "true",
  STOCKQUANT_V15_TEST_TEMPORAL_FAILURE_ONCE: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || backupRestoreMode ? "false" : "true",
  STOCKQUANT_V15_TEST_DATABASE_FAILURE_ONCE: databaseRetryMode ? "true" : "false",
  STOCKQUANT_V15_TEST_PRELOOKUP_DELAY_MS: workerFailoverMode ? "30000" : databaseOutageMode ? "2000" : databaseConnectionDropMode ? "8000" : "0",
  STOCKQUANT_V15_TEST_ACTIVITY_DELAY_MS: "500",
};
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
const composeWithFiles = (files, args) => spawnSync("docker", ["compose", "-p", project, ...files.flatMap((file) => ["-f", file]), ...args], { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
const dockerChecked = (args) => {
  const result = spawnSync("docker", args, { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
  assert.equal(result.status, 0, `docker ${args.slice(0, 4).join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
};
async function sha256File(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}
function parseRunResult(output) {
  const marker = '{\n  "testRunId"';
  const start = output.indexOf(marker);
  if (start < 0) throw new Error("CLI check-only did not emit the structured same-Run result");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < output.length; index += 1) {
    const char = output[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return JSON.parse(output.slice(start, index + 1));
  }
  throw new Error("CLI check-only emitted truncated structured output");
}
const resources = [
  ["containers", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`]],
  ["volumes", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
  ["networks", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
];
let started = false;
let exitCode = 1;
let resourcesRemoved = false;
let secondaryWorkerName;
const restoreVolumeNames = [];
const faultSequence = [];
const sourceFiles = ["services/platform-api-service/src/integration/v15-nats-dispatch.ts", "services/platform-api-service/src/integration/temporal-runtime.ts", "services/platform-api-service/src/integration/temporal-workflow.ts", "services/platform-api-service/src/adapters/postgres-stage-run-repository.ts", "services/platform-api-service/src/bootstrap/app.module.ts", "services/platform-api-service/src/main.ts", "services/portfolio-risk-service/src/bootstrap/app.module.ts", "services/trade-execution-service/src/bootstrap/main.ts", "services/quant-research-service/src/bootstrap/main.ts", "fixtures/v1/v1.5/no-trade-calendar.json", "infra/compose/docker-compose.v15-integration.yml", "apps/web/tests/e2e/v11-acceptance.spec.ts", "scripts/test-v15-web-e2e-isolated.mjs"];
const sourceSha256 = Object.fromEntries(sourceFiles.map((path) => [path, createHash("sha256").update(readFileSync(path)).digest("hex")]));
let auditRecord = { schemaVersion: "v1.5-nats-temporal-dispatch-e2e-v2", status: "FAIL", faultMode: temporalOutageMode ? "ACTUAL_TEMPORAL_SERVER_STOP_RESTART" : networkOutageMode ? "PLATFORM_CONTAINER_NETWORK_DISCONNECT_RECONNECT" : databaseRetryMode ? "INJECTED_DATABASE_BOUNDARY_FAILURE_NAK_REDELIVERY" : databaseOutageMode ? "ISOLATED_POSTGRES_SERVER_STOP_RESTART_NAK_REDELIVERY" : databaseConnectionDropMode ? "ISOLATED_PLATFORM_POSTGRES_CONNECTION_TERMINATION" : workerFailoverMode ? "PRIMARY_PLATFORM_WORKER_TERMINATED_SECONDARY_TAKEOVER" : multiWorkerMode ? "TWO_PLATFORM_CONSUMERS_DUPLICATE_WORKFLOW_START" : backupRestoreMode ? "ISOLATED_V1_DATABASE_NATS_TEMPORAL_VOLUME_BACKUP_RESTORE" : "NATS_AND_WORKER_RECOVERY", isolatedProject: project, stage: "V1.5", testRunIds: [], browserExitCode: null, output: "", faultSequence, externalSourceCalls: 0, realBrokerCalls: 0, exactProjectResourcesRemoved: false, sourceSha256, failureReason: null };

try {
  const up = compose(["--profile", "interactive", "up", "-d", "--build"]);
  started = true;
  if (up.status !== 0) compose(["logs", "platform-api-service"]);
  assert.equal(up.status, 0, "isolated V1.5 Web/API/NATS/Temporal stack failed to start");

  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}`;
  for (const [name, url] of [["Platform API", `${apiUrl}/live`], ["containerized Web", `${webUrl}/acceptance/v1/v1.5`]]) {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* wait for this isolated service */ }
      await delay(250);
    }
    assert.equal(ready, true, `${name} did not become ready at ${url}`);
  }
  if (temporalOutageMode) {
    const stoppedTemporal = compose(["stop", "temporal"], "pipe");
    assert.equal(stoppedTemporal.status, 0, "could not stop the isolated Temporal server before creating the browser Run");
    faultSequence.push({ event: "isolated_temporal_server_stopped_before_browser_run_creation", at: new Date().toISOString() });
  }
  if (multiWorkerMode) {
    secondaryWorkerName = `${project}-platform-api-worker-2`;
    const worker = compose(["run", "-d", "--no-deps", "--name", secondaryWorkerName,
      "-e", "STOCKQUANT_NATS_DURABLE=stockquant-v15-temporal-dispatch-worker-2",
      "-e", "STOCKQUANT_NATS_DELIVER_SUBJECT=stockquant.v1.5.dispatch.worker2",
      "platform-api-service"], "pipe");
    assert.equal(worker.status, 0, `could not start isolated secondary Platform worker: ${worker.stderr || worker.stdout}`);
    let consumerReady = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const logs = spawnSync("docker", ["logs", "--tail", "200", secondaryWorkerName], { encoding: "utf8" });
      if (logs.status === 0 && logs.stdout.includes("STOCKQUANT_V15_DISPATCH_CONSUMER_READY") && logs.stdout.includes("durable=stockquant-v15-temporal-dispatch-worker-2")) { consumerReady = true; break; }
      await delay(250);
    }
    assert.equal(consumerReady, true, "secondary Platform worker did not create its independent durable consumer");
    faultSequence.push({ event: "second_platform_worker_and_independent_durable_consumer_ready", worker: secondaryWorkerName, durable: "stockquant-v15-temporal-dispatch-worker-2", at: new Date().toISOString() });
  }
  if (workerFailoverMode) {
    secondaryWorkerName = `${project}-platform-api-worker-2`;
    const worker = compose(["run", "-d", "--no-deps", "--name", secondaryWorkerName,
      "-e", "STOCKQUANT_NATS_DURABLE=stockquant-v15-temporal-dispatch-worker-2",
      "-e", "STOCKQUANT_NATS_DELIVER_SUBJECT=stockquant.v1.5.dispatch.worker2",
      "-e", "STOCKQUANT_V15_TEST_PRELOOKUP_DELAY_MS=5000",
      "platform-api-service"], "pipe");
    assert.equal(worker.status, 0, `could not start isolated failover Platform worker: ${worker.stderr || worker.stdout}`);
    let consumerReady = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const logs = spawnSync("docker", ["logs", "--tail", "200", secondaryWorkerName], { env, encoding: "utf8" });
      if (logs.status === 0 && logs.stdout.includes("STOCKQUANT_V15_DISPATCH_CONSUMER_READY") && logs.stdout.includes("durable=stockquant-v15-temporal-dispatch-worker-2")) { consumerReady = true; break; }
      await delay(250);
    }
    assert.equal(consumerReady, true, "failover Platform worker did not create its independent durable consumer");
    faultSequence.push({ event: "failover_worker_and_independent_durable_consumer_ready", worker: secondaryWorkerName, durable: "stockquant-v15-temporal-dispatch-worker-2", preLookupDelayMs: 5000, primaryPreLookupDelayMs: 30000, at: new Date().toISOString() });
  }

  const browser = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1.5"], { env, stdio: ["inherit", "pipe", "pipe"] });
  let output = "";
  let outageTask;
  const capture = (chunk, stream) => {
    const value = chunk.toString();
    output += value;
    auditRecord.output = output;
    auditRecord.testRunIds = [...output.matchAll(/scenario=(normal|rejection|recovery) created testRunId=([0-9a-f-]{36})/gu)].map((match) => ({ scenario: match[1], testRunId: match[2] }));
    stream.write(value);
    const created = output.match(/scenario=normal created testRunId=([0-9a-f-]{36})/u);
    if (created && !outageTask && !backupRestoreMode) {
      const testRunId = created[1];
      outageTask = (async () => {
        faultSequence.push({ event: "normal_test_run_created", testRunId, at: new Date().toISOString() });
        if (temporalOutageMode) {
          let retryLine;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
            assert.equal(logs.status, 0, "could not observe the isolated Temporal outage dispatch result");
            retryLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_RETRY eventId=${testRunId} `));
            if (retryLine) break;
            await delay(250);
          }
          assert.ok(retryLine, "JetStream consumer did not report a transient dispatch retry while Temporal was stopped");
          assert.match(retryLine, /redelivered=false/u, "the initial server-outage failure should be observed before message redelivery");
          faultSequence.push({ event: "actual_temporal_server_outage_caused_dispatch_nak", testRunId, marker: retryLine.trim(), temporalWasStopped: true, at: new Date().toISOString() });
          const startedTemporal = compose(["start", "temporal"], "pipe");
          assert.equal(startedTemporal.status, 0, "could not restart the isolated Temporal server after observing NAK");
          let temporalReady = false;
          const readinessProbe = "import net from 'node:net'; const socket=net.createConnection({host:'temporal',port:7233}); socket.setTimeout(1000); socket.once('connect',()=>{socket.destroy();process.exit(0)}); socket.once('error',()=>process.exit(1)); socket.once('timeout',()=>{socket.destroy();process.exit(1)});";
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const probe = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", readinessProbe], "pipe");
            if (probe.status === 0) { temporalReady = true; break; }
            await delay(250);
          }
          assert.equal(temporalReady, true, "Temporal server did not accept connections after restart");
          faultSequence.push({ event: "same_temporal_server_restarted_and_accepting_connections", testRunId, at: new Date().toISOString() });
          return;
        }
        if (networkOutageMode) {
          const containerName = `${project}-platform-api-service-1`;
          const networkName = `${project}_integration`;
          const disconnected = spawnSync("docker", ["network", "disconnect", networkName, containerName], { encoding: "utf8" });
          assert.equal(disconnected.status, 0, `could not disconnect only the isolated Platform API from its project network: ${disconnected.stderr || disconnected.stdout}`);
          faultSequence.push({ event: "isolated_platform_network_disconnected_during_run", testRunId, containerName, networkName, at: new Date().toISOString() });
          await delay(3000);
          const reconnected = spawnSync("docker", ["network", "connect", "--alias", "platform-api-service", networkName, containerName], { encoding: "utf8" });
          assert.equal(reconnected.status, 0, `could not reconnect the isolated Platform API to its project network: ${reconnected.stderr || reconnected.stdout}`);
          let platformReady = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            try { if ((await fetch(`http://127.0.0.1:${apiPort}/live`)).ok) { platformReady = true; break; } } catch { /* wait for isolated network recovery */ }
            await delay(250);
          }
          assert.equal(platformReady, true, "Platform API did not recover after isolated network reconnect");
          faultSequence.push({ event: "isolated_platform_network_reconnected_and_api_ready", testRunId, containerName, networkName, at: new Date().toISOString() });
          return;
        }
        if (databaseRetryMode) {
          let retryLine;
          for (let attempt = 0; attempt < 80; attempt += 1) {
            const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
            assert.equal(logs.status, 0, "could not observe isolated database failure injection");
            retryLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_RETRY eventId=${testRunId} `));
            if (retryLine) break;
            await delay(250);
          }
          assert.ok(retryLine, "dispatch did not observe the injected transient database-boundary error");
          assert.match(retryLine, /redelivered=false/u, "initial database outage must be observed before message redelivery");
          const sequence = Number(retryLine.match(/seq=(\d+)/u)?.[1]);
          assert.ok(Number.isSafeInteger(sequence) && sequence > 0, "database retry marker did not include a JetStream sequence");
          faultSequence.push({ event: "injected_database_boundary_failure_caused_dispatch_nak", testRunId, sequence, marker: retryLine.trim(), at: new Date().toISOString() });
          return;
        }
        if (databaseOutageMode) {
          const databaseContainer = `${project}-postgres-1`;
          let receivedLine;
          for (let attempt = 0; attempt < 80; attempt += 1) {
            const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
            assert.equal(logs.status, 0, "could not observe isolated JetStream delivery before PostgreSQL server outage");
            receivedLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_DISPATCH_RECEIVED eventId=${testRunId} `));
            if (receivedLine) break;
            await delay(100);
          }
          assert.ok(receivedLine, "Platform did not receive the Run's JetStream message before PostgreSQL service outage");
          const stopped = spawnSync("docker", ["kill", "--signal", "KILL", databaseContainer], { encoding: "utf8" });
          assert.equal(stopped.status, 0, `could not terminate only the isolated PostgreSQL server process: ${stopped.stderr || stopped.stdout}`);
          faultSequence.push({ event: "isolated_postgres_server_process_terminated_after_jetstream_delivery", testRunId, databaseContainer, receivedMarker: receivedLine.trim(), at: new Date().toISOString() });
          await delay(5000);
          const startedDatabase = spawnSync("docker", ["start", databaseContainer], { encoding: "utf8" });
          assert.equal(startedDatabase.status, 0, `could not restart the same isolated PostgreSQL container: ${startedDatabase.stderr || startedDatabase.stdout}`);
          let databaseReady = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const probe = compose(["exec", "-T", "postgres", "pg_isready", "-U", "postgres", "-d", "postgres"], "pipe");
            if (probe.status === 0) { databaseReady = true; break; }
            await delay(250);
          }
          assert.equal(databaseReady, true, "the same isolated PostgreSQL service did not become ready after restart");
          faultSequence.push({ event: "same_isolated_postgres_server_restarted_and_ready", testRunId, databaseContainer, at: new Date().toISOString() });
          return;
        }
        if (databaseConnectionDropMode) {
          const postgresContainer = `${project}-postgres-1`;
          let receivedLine;
          for (let attempt = 0; attempt < 80; attempt += 1) {
            const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
            assert.equal(logs.status, 0, "could not observe isolated JetStream delivery before dropping Platform PostgreSQL connections");
            receivedLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_DISPATCH_RECEIVED eventId=${testRunId} `));
            if (receivedLine) break;
            await delay(250);
          }
          assert.ok(receivedLine, "Platform did not receive the Run's JetStream message before database connection fault injection");
          const terminateSql = "SELECT count(*) FROM (SELECT pg_terminate_backend(pid) AS terminated FROM pg_stat_activity WHERE datname='platform_api' AND usename='platform_api' AND pid <> pg_backend_pid()) sessions WHERE terminated";
          const terminated = spawnSync("docker", ["exec", postgresContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tAc", terminateSql], { encoding: "utf8" });
          assert.equal(terminated.status, 0, `could not terminate only isolated Platform PostgreSQL sessions: ${terminated.stderr || terminated.stdout}`);
          const terminatedCount = Number(terminated.stdout.trim());
          assert.ok(Number.isSafeInteger(terminatedCount) && terminatedCount > 0, "database fault injection did not terminate a Platform PostgreSQL session");
          faultSequence.push({ event: "platform_postgres_sessions_terminated_after_jetstream_delivery", testRunId, postgresContainer, terminatedCount, receivedMarker: receivedLine.trim(), at: new Date().toISOString() });
          return;
        }
        if (workerFailoverMode) {
          const primaryContainer = `${project}-platform-api-service-1`;
          let primaryReceived;
          for (let attempt = 0; attempt < 80; attempt += 1) {
            const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
            assert.equal(logs.status, 0, "could not observe primary Platform worker delivery before failover injection");
            primaryReceived = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_DISPATCH_RECEIVED eventId=${testRunId} `));
            if (primaryReceived) break;
            await delay(250);
          }
          assert.ok(primaryReceived, "primary Platform worker did not receive the Run before failover injection");
          let secondaryReceived;
          for (let attempt = 0; attempt < 40; attempt += 1) {
            const logs = spawnSync("docker", ["logs", "--tail", "500", secondaryWorkerName], { env, encoding: "utf8" });
            assert.equal(logs.status, 0, "could not observe secondary delivery before failover injection");
            secondaryReceived = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_DISPATCH_RECEIVED eventId=${testRunId} `));
            if (secondaryReceived) break;
            await delay(100);
          }
          assert.ok(secondaryReceived, "secondary Platform worker did not receive the same dispatch before failover injection");
          const killed = spawnSync("docker", ["kill", primaryContainer], { env, encoding: "utf8" });
          assert.equal(killed.status, 0, `could not terminate only the isolated primary Platform worker/API: ${killed.stderr || killed.stdout}`);
          faultSequence.push({ event: "primary_worker_killed_after_both_durables_received_before_secondary_lookup", testRunId, primaryContainer, primaryReceivedMarker: primaryReceived.trim(), secondaryReceivedMarker: secondaryReceived.trim(), at: new Date().toISOString() });
          let secondaryActivity;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const logs = spawnSync("docker", ["logs", "--tail", "1000", secondaryWorkerName], { env, encoding: "utf8" });
            assert.equal(logs.status, 0, "could not inspect isolated failover worker activity");
            secondaryActivity = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_ACTIVITY_STARTED testRunId=${testRunId} market=CN_A`));
            if (secondaryActivity) break;
            await delay(250);
          }
          assert.ok(secondaryActivity, "secondary Platform worker did not take over the TestRun and start its Temporal activity");
          const restarted = spawnSync("docker", ["start", primaryContainer], { env, encoding: "utf8" });
          assert.equal(restarted.status, 0, `could not restore isolated primary Platform API after failover: ${restarted.stderr || restarted.stdout}`);
          let apiReady = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            try { if ((await fetch(`http://127.0.0.1:${apiPort}/live`)).ok) { apiReady = true; break; } } catch { /* wait for the primary API recovery */ }
            await delay(250);
          }
          assert.equal(apiReady, true, "primary Platform API did not recover after secondary worker takeover");
          faultSequence.push({ event: "secondary_worker_started_same_run_activity_and_primary_api_recovered", testRunId, secondaryActivity: secondaryActivity.trim(), apiReady, at: new Date().toISOString() });
          return;
        }
        if (multiWorkerMode) return;
        const stopped = compose(["stop", "nats"], "pipe");
        assert.equal(stopped.status, 0, "could not stop NATS for the bounded recovery injection");
        faultSequence.push({ event: "isolated_nats_stopped", at: new Date().toISOString() });
        await delay(3000);
        const startedNats = compose(["start", "nats"], "pipe");
        assert.equal(startedNats.status, 0, "could not restore isolated NATS after the injected outage");
        faultSequence.push({ event: "isolated_nats_restored", at: new Date().toISOString() });
        const restartedPlatform = compose(["restart", "platform-api-service"], "pipe");
        assert.equal(restartedPlatform.status, 0, "could not restart isolated Platform API after the Outbox was persisted");
        let platformReady = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          try { if ((await fetch(`http://127.0.0.1:${apiPort}/live`)).ok) { platformReady = true; break; } } catch { /* wait for the restarted isolated Platform API */ }
          await delay(250);
        }
        assert.equal(platformReady, true, "Platform API did not recover after the injected process restart");
        faultSequence.push({ event: "platform_api_restarted_and_ready", at: new Date().toISOString() });
        const poisonProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect, headers } = require('nats');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const nc = await connect({ servers: 'nats://nats:4222' });
try {
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();
  const waitForAckFloor = async (sequence) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const info = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
      if (info.ack_floor.stream_seq >= sequence) return info.ack_floor.stream_seq;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error('JetStream dispatch message was not acknowledged by the durable consumer');
  };
  const poisonHeaders = headers(); poisonHeaders.set('Nats-Msg-Id', 'poison-probe-${project}');
  const poisoned = await js.publish('stockquant.v1.5.events', new TextEncoder().encode('{malformed'), { headers: poisonHeaders });
  const poisonAckFloor = await waitForAckFloor(poisoned.seq);
  const fixtureBytes = readFileSync('/workspace/fixtures/v1/v1.5/no-trade-calendar.json');
  const fixture = JSON.parse(fixtureBytes.toString('utf8'));
  const duplicatePayload = { testRunId: '${testRunId}', ownerId: 'acceptance-owner-1', namespace: 'v1-5-normal-${testRunId}', seed: 20260907, scenarioId: 'normal', sessions: fixture.sessions, fixtureVersion: fixture.fixtureVersion, fixtureSha256: createHash('sha256').update(fixtureBytes).digest('hex') };
  const invalidOwnerHeaders = headers(); invalidOwnerHeaders.set('Nats-Msg-Id', 'invalid-owner-probe-${project}');
  const invalidOwnerPayload = { ...duplicatePayload, ownerId: 'unauthorized-owner' };
  const invalidOwner = await js.publish('stockquant.v1.5.events', new TextEncoder().encode(JSON.stringify({ eventId: '${testRunId}', payload: invalidOwnerPayload })), { headers: invalidOwnerHeaders });
  const invalidOwnerAckFloor = await waitForAckFloor(invalidOwner.seq);
  const duplicateHeaders = headers(); duplicateHeaders.set('Nats-Msg-Id', 'duplicate-probe-${project}');
  const duplicated = await js.publish('stockquant.v1.5.events', new TextEncoder().encode(JSON.stringify({ eventId: '${testRunId}', payload: duplicatePayload })), { headers: duplicateHeaders });
  const duplicateAckFloor = await waitForAckFloor(duplicated.seq);
  if (duplicateAckFloor < duplicated.seq) throw new Error('duplicate dispatch message was not acknowledged');
  const consumerInfo = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
  console.log(JSON.stringify({ poisonStreamSequence: poisoned.seq, poisonAckFloor, invalidOwnerStreamSequence: invalidOwner.seq, invalidOwnerAckFloor, duplicateStreamSequence: duplicated.seq, duplicateAckFloor, numRedelivered: consumerInfo.num_redelivered, stableWorkflowId: 'v15-no-trade-${testRunId}' }));
} finally { await nc.drain(); }`;
        const poison = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", poisonProbe], "pipe");
        assert.equal(poison.status, 0, `isolated JetStream poison-envelope termination probe failed: ${poison.stderr || poison.stdout}`);
        let activeActivityMarker;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect isolated Temporal activity start before Worker restart");
          activeActivityMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_ACTIVITY_STARTED testRunId=${testRunId} market=CN_A`));
          if (activeActivityMarker) break;
          await delay(250);
        }
        assert.ok(activeActivityMarker, "NO_TRADE Temporal activity did not start before Worker restart");
        assert.ok(!output.includes("scenario=normal 120 observations complete"), "workflow completed before the in-flight Worker restart could be injected");
        const workerRestart = compose(["restart", "platform-api-service"], "pipe");
        assert.equal(workerRestart.status, 0, "could not restart Platform API/Temporal Worker during workflow execution");
        let workerReady = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          try { if ((await fetch(`http://127.0.0.1:${apiPort}/live`)).ok) { workerReady = true; break; } } catch { /* wait for isolated Platform API and Temporal Worker recovery */ }
          await delay(250);
        }
        assert.equal(workerReady, true, "Platform API/Temporal Worker did not recover during the active workflow");
        faultSequence.push({ event: "platform_temporal_worker_restarted_during_workflow_activity", testRunId, activityMarker: activeActivityMarker.trim(), workflowCompleteBeforeRestart: false, at: new Date().toISOString() });
        const duplicateSequence = Number(JSON.parse(poison.stdout).duplicateStreamSequence);
        let logs;
        let ackDroppedMarker;
        let droppedSequence;
        let redeliveryMarker;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect isolated Platform dispatch fault marker");
          ackDroppedMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_ACK_DROPPED eventId=${testRunId} `));
          droppedSequence = Number(ackDroppedMarker?.match(/seq=(\d+)/u)?.[1]);
          if (Number.isSafeInteger(droppedSequence) && droppedSequence > 0) redeliveryMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=${testRunId} seq=${droppedSequence}`));
          if (ackDroppedMarker && redeliveryMarker) break;
          await delay(250);
        }
        assert.ok(ackDroppedMarker, "Platform must have intentionally omitted the first dispatch ACK for this TestRun");
        if (!redeliveryMarker) faultSequence.push({ event: "lost_ack_redelivery_observation_timeout", testRunId, expectedDuplicateSequence: duplicateSequence, droppedSequence, ackDroppedMarker: ackDroppedMarker.trim(), relevantPlatformMarkers: logs.stdout.split(/\r?\n/u).filter((line) => line.includes(testRunId) && /ACK|REDELIVER|DISPATCH/u.test(line)).slice(-20).map((line) => line.trim()), at: new Date().toISOString() });
        assert.ok(redeliveryMarker, `JetStream must redeliver the deliberately unacknowledged message at sequence ${droppedSequence}`);
        faultSequence.push({ event: "malformed_and_wrong_owner_terminated_then_jetstream_redelivered_unacked_duplicate", output: poison.stdout.trim(), redeliveryMarker, at: new Date().toISOString() });
      })();
      outageTask.catch((error) => browser.kill("SIGTERM"));
    }
    const completionEvent = databaseRetryMode ? "normal_run_completed_after_database_boundary_retry" : databaseOutageMode ? "normal_run_completed_after_postgres_server_recovery" : databaseConnectionDropMode ? "normal_run_completed_after_platform_postgres_recovery" : workerFailoverMode ? "normal_run_completed_after_worker_failover" : multiWorkerMode ? "normal_run_completed_after_multiworker_dispatch" : "workflow_completed_after_nats_restore";
    if (output.includes("scenario=normal 120 observations complete") && !faultSequence.some((event) => event.event === completionEvent)) {
      faultSequence.push({ event: completionEvent, testRunId: created?.[1] ?? null, at: new Date().toISOString() });
    }
  };
  browser.stdout.on("data", (chunk) => capture(chunk, process.stdout));
  browser.stderr.on("data", (chunk) => capture(chunk, process.stderr));
  const browserStatus = await new Promise((resolve, reject) => {
    browser.once("error", reject);
    browser.once("close", (code) => resolve(code ?? 1));
  });
  if (outageTask) await outageTask;
  exitCode = Number(browserStatus);
  auditRecord.browserExitCode = exitCode;
  if (exitCode === 0 && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !backupRestoreMode) {
    const relayProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect } = require('nats');
const nc = await connect({ servers: 'nats://nats:4222' });
try {
  const jsm = await nc.jetstreamManager();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const info = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
    if (info.ack_floor.stream_seq >= 4) { console.log(JSON.stringify({ originalOutboxSequence: 4, consumerAckFloor: info.ack_floor.stream_seq })); break; }
    if (attempt === 199) throw new Error('recovered Platform Relay did not publish and acknowledge the original Outbox message');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
} finally { await nc.drain(); }`;
    const relayed = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", relayProbe], "pipe");
    assert.equal(relayed.status, 0, `original Outbox dispatch was not observed after Relay recovery: ${relayed.stderr || relayed.stdout}`);
    faultSequence.push({ event: "original_outbox_message_acknowledged_after_relay_recovery", output: relayed.stdout.trim(), at: new Date().toISOString() });

    const retryRunResponse = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.5/runs`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" },
      body: JSON.stringify({ scenarioId: "normal", seed: 20260907 }),
    });
    const retryRunResponseText = await retryRunResponse.text();
    assert.equal(retryRunResponse.status, 202, `could not create the transient-retry Run through the V1.5 API: ${retryRunResponseText}`);
    const retryRun = JSON.parse(retryRunResponseText);
    assert.match(retryRun.testRunId, /^[0-9a-f-]{36}$/iu);
    let transientNakLine;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
      assert.equal(logs.status, 0, "could not inspect isolated Platform transient-dispatch result");
      transientNakLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_TRANSIENT_NAK eventId=${retryRun.testRunId} `));
      if (transientNakLine) break;
      await delay(250);
    }
    assert.ok(transientNakLine, "injected transient Temporal UNAVAILABLE did not produce an observed NAK for this Run");
    const retrySequence = Number(transientNakLine.match(/seq=(\d+)/u)?.[1]);
    assert.ok(Number.isSafeInteger(retrySequence) && retrySequence > 4, "transient NAK did not identify a new JetStream stream sequence");
    faultSequence.push({ event: "injected_temporal_unavailable_caused_transient_nak", testRunId: retryRun.testRunId, sequence: retrySequence, marker: transientNakLine.trim(), at: new Date().toISOString() });
    let recoveredRun;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      const response = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.5/runs/${retryRun.testRunId}`, { headers: { "x-stockquant-user": "acceptance-owner-1" } });
      assert.equal(response.status, 200, "transient-retry Run could not be read through its owner-scoped API");
      recoveredRun = await response.json();
      if (recoveredRun.evidence?.localSessions?.authoritativeObservations === 120) break;
      await delay(250);
    }
    assert.equal(recoveredRun?.evidence?.localSessions?.authoritativeObservations, 120, "Temporal restore did not complete the retried normal Run");
    assert.equal(recoveredRun?.evidence?.temporal, "COMPLETED");
    const ackProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect } = require('nats');
const nc = await connect({ servers: 'nats://nats:4222' });
try {
  const jsm = await nc.jetstreamManager();
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const info = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
    if (info.ack_floor.stream_seq >= ${retrySequence}) { console.log(JSON.stringify({ streamSequence: ${retrySequence}, consumerAckFloor: info.ack_floor.stream_seq })); break; }
    if (attempt === 119) throw new Error('transiently NAKed JetStream message was not ACKed after Temporal recovery');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
} finally { await nc.drain(); }`;
    const ackedRetry = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", ackProbe], "pipe");
    assert.equal(ackedRetry.status, 0, `retried Temporal dispatch was not ACKed: ${ackedRetry.stderr || ackedRetry.stdout}`);
    faultSequence.push({ event: "temporal_retry_run_completed_and_message_acknowledged", testRunId: retryRun.testRunId, output: ackedRetry.stdout.trim(), authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !backupRestoreMode && (!faultSequence.some((event) => event.event === "malformed_and_wrong_owner_terminated_then_jetstream_redelivered_unacked_duplicate") || !faultSequence.some((event) => event.event === "workflow_completed_after_nats_restore"))) throw new Error("NATS outage, Platform restart, malformed/wrong-owner termination, lost-ACK redelivery and post-recovery workflow completion were not fully observed");
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !backupRestoreMode && exitCode === 0 && !faultSequence.some((event) => event.event === "temporal_retry_run_completed_and_message_acknowledged")) throw new Error("transient Temporal retry and recovery were not fully observed");
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !backupRestoreMode && exitCode === 0 && !faultSequence.some((event) => event.event === "original_outbox_message_acknowledged_after_relay_recovery")) throw new Error("original Outbox event was not acknowledged after Relay recovery");
  if (temporalOutageMode && (!faultSequence.some((event) => event.event === "actual_temporal_server_outage_caused_dispatch_nak") || !faultSequence.some((event) => event.event === "same_temporal_server_restarted_and_accepting_connections"))) throw new Error("actual Temporal server outage and restart were not both observed");
  if (networkOutageMode && (!faultSequence.some((event) => event.event === "isolated_platform_network_disconnected_during_run") || !faultSequence.some((event) => event.event === "isolated_platform_network_reconnected_and_api_ready"))) throw new Error("isolated Platform network outage and recovery were not both observed");
  if (databaseRetryMode) {
    const databaseNak = faultSequence.find((event) => event.event === "injected_database_boundary_failure_caused_dispatch_nak");
    if (!databaseNak) throw new Error("injected database-boundary NAK was not observed");
    const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
    assert.equal(logs.status, 0, "could not observe database-boundary redelivery");
    const redelivery = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=${databaseNak.testRunId} seq=${databaseNak.sequence}`));
    assert.ok(redelivery, "database-failed JetStream message was not observed redelivered by the dispatcher");
    faultSequence.push({ event: "database_boundary_retry_redelivered_and_same_run_completed", testRunId: databaseNak.testRunId, sequence: databaseNak.sequence, marker: redelivery.trim(), authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (databaseOutageMode) {
    const stopped = faultSequence.find((event) => event.event === "isolated_postgres_server_process_terminated_after_jetstream_delivery");
    const restarted = faultSequence.find((event) => event.event === "same_isolated_postgres_server_restarted_and_ready");
    if (!stopped || !restarted) throw new Error("actual isolated PostgreSQL server stop and restart were not both observed");
    const testRunId = stopped.testRunId;
    const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
    assert.equal(logs.status, 0, "could not inspect Platform PostgreSQL outage retry logs");
    const retryLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_RETRY eventId=${testRunId} `));
    assert.ok(retryLine, "PostgreSQL server outage did not cause Platform dispatch retry/NAK");
    const sequence = Number(retryLine.match(/seq=(\d+)/u)?.[1]);
    assert.ok(Number.isSafeInteger(sequence) && sequence > 0, "PostgreSQL outage NAK did not identify a JetStream sequence");
    let redelivery;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const currentLogs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
      assert.equal(currentLogs.status, 0, "could not inspect PostgreSQL outage message redelivery");
      redelivery = currentLogs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=${testRunId} seq=${sequence}`));
      if (redelivery) break;
      await delay(250);
    }
    assert.ok(redelivery, "PostgreSQL outage message was not redelivered at the same JetStream sequence");
    assert.match(redelivery, /DISPATCH_REDELIVERED/u);
    assert.match(output, /scenario=normal 120 observations complete/u, "same normal Run did not finish after PostgreSQL service recovery");
    const ackProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect } = require('nats');
const nc = await connect({ servers: 'nats://nats:4222' });
try { const jsm=await nc.jetstreamManager(); for(let attempt=0;attempt<120;attempt+=1){const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); if(info.ack_floor.stream_seq>=${sequence}){console.log(JSON.stringify({sequence:${sequence},ackFloor:info.ack_floor.stream_seq}));break;} if(attempt===119) throw new Error('recovered PostgreSQL outage event was not ACKed'); await new Promise(resolve=>setTimeout(resolve,250));} } finally { await nc.drain(); }`;
    const acked = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", ackProbe], "pipe");
    assert.equal(acked.status, 0, `PostgreSQL outage message did not ACK after same-Run recovery: ${acked.stderr || acked.stdout}`);
    faultSequence.push({ event: "postgres_server_outage_nak_same_sequence_redelivery_and_same_run_completed", testRunId, sequence, retryMarker: retryLine.trim(), redeliveryMarker: redelivery.trim(), ack: JSON.parse(acked.stdout.trim()), authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (databaseConnectionDropMode) {
    assert.match(output, /scenario=normal 120 observations complete/u, "the same Run did not finish after Platform PostgreSQL sessions were terminated");
    const terminated = faultSequence.find((event) => event.event === "platform_postgres_sessions_terminated_after_jetstream_delivery");
    if (!terminated) throw new Error("isolated Platform PostgreSQL connection termination was not observed");
    const postgresContainer = terminated.postgresContainer;
    const activeSessionsProbe = "SELECT count(*) FROM pg_stat_activity WHERE datname='platform_api' AND usename='platform_api' AND pid <> pg_backend_pid()";
    const activeSessions = spawnSync("docker", ["exec", postgresContainer, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tAc", activeSessionsProbe], { encoding: "utf8" });
    assert.equal(activeSessions.status, 0, `could not verify Platform PostgreSQL session recovery: ${activeSessions.stderr || activeSessions.stdout}`);
    const activeSessionCount = Number(activeSessions.stdout.trim());
    assert.ok(Number.isSafeInteger(activeSessionCount) && activeSessionCount > 0, "Platform did not establish a PostgreSQL session after terminating its prior sessions");
    const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
    assert.equal(logs.status, 0, "could not inspect PostgreSQL connection recovery logs");
    const retryLine = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_RETRY eventId=${terminated.testRunId} `));
    const redelivery = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=${terminated.testRunId} `));
    if (retryLine && redelivery) faultSequence.push({ event: "postgres_connection_error_nak_redelivery_and_same_run_completed", testRunId: terminated.testRunId, retryMarker: retryLine.trim(), redeliveryMarker: redelivery.trim(), authoritativeObservations: 120, at: new Date().toISOString() });
    else faultSequence.push({ event: "postgres_backend_sessions_terminated_platform_reconnected_and_same_run_completed", testRunId: terminated.testRunId, terminatedSessionCount: terminated.terminatedCount, laterPlatformSessionCount: activeSessionCount, authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (multiWorkerMode) {
    assert.match(output, /scenario=normal 120 observations complete/u, "normal Run did not complete with both Platform workers active");
    const testRunId = auditRecord.testRunIds.find((run) => run.scenario === "normal")?.testRunId;
    assert.ok(testRunId, "normal TestRun ID was not captured for multiworker evidence");
    const primaryLogs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
    const secondaryLogs = spawnSync("docker", ["logs", "--tail", "500", secondaryWorkerName], { encoding: "utf8" });
    assert.equal(primaryLogs.status, 0, "could not read primary Platform worker logs");
    assert.equal(secondaryLogs.status, 0, "could not read secondary Platform worker logs");
    const combinedLogs = `${primaryLogs.stdout}\n${secondaryLogs.stdout}`;
    assert.ok(combinedLogs.includes(`STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED`) && combinedLogs.includes(`eventId=${testRunId} `), "independent consumers did not observe Temporal workflow-start idempotency for the same TestRun");
    const consumerProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect } = require('nats');
const nc = await connect({ servers: 'nats://nats:4222' });
try { const jsm = await nc.jetstreamManager(); const names = ['stockquant-v15-temporal-dispatch','stockquant-v15-temporal-dispatch-worker-2']; const result=[]; for (const durable of names) { const info=await jsm.consumers.info('SQV15APP',durable); result.push({durable,ackFloor:info.ack_floor.stream_seq}); } console.log(JSON.stringify(result)); if (result.some(item=>item.ackFloor < 1)) throw new Error('both independent consumers did not acknowledge the dispatch event'); } finally { await nc.drain(); }`;
    const consumers = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", consumerProbe], "pipe");
    assert.equal(consumers.status, 0, `could not verify both independent JetStream consumer acknowledgements: ${consumers.stderr || consumers.stdout}`);
    faultSequence.push({ event: "two_independent_durables_acknowledged_one_run_and_temporal_start_was_idempotent", testRunId, consumers: JSON.parse(consumers.stdout.trim()), duplicateStartMarker: combinedLogs.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED") && line.includes(`eventId=${testRunId} `))?.trim(), authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (workerFailoverMode) {
    assert.match(output, /scenario=normal 120 observations complete/u, "the same Run did not complete after primary Platform worker failure");
    const testRunId = auditRecord.testRunIds.find((run) => run.scenario === "normal")?.testRunId;
    assert.ok(testRunId, "normal TestRun ID was not captured for worker failover evidence");
    assert.ok(faultSequence.some((event) => event.event === "primary_worker_killed_after_both_durables_received_before_secondary_lookup" && event.testRunId === testRunId), "primary worker failure was not injected after both durable consumers received this Run");
    assert.ok(faultSequence.some((event) => event.event === "secondary_worker_started_same_run_activity_and_primary_api_recovered" && event.testRunId === testRunId), "secondary worker takeover and primary API recovery were not observed");
    const secondaryLogs = spawnSync("docker", ["logs", "--tail", "1000", secondaryWorkerName], { env, encoding: "utf8" });
    assert.equal(secondaryLogs.status, 0, "could not read failover worker logs");
    const primaryReceiveMarker = faultSequence.find((event) => event.event === "primary_worker_killed_after_both_durables_received_before_secondary_lookup")?.primaryReceivedMarker;
    const sequence = Number(primaryReceiveMarker?.match(/seq=(\d+)/u)?.[1]);
    assert.ok(Number.isSafeInteger(sequence) && sequence > 0, "primary receive marker did not contain the original JetStream sequence");
    const ackProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect } = require('nats'); const nc = await connect({servers:'nats://nats:4222'});
try { const jsm=await nc.jetstreamManager(); const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch-worker-2'); console.log(JSON.stringify({sequence:${sequence},ackFloor:info.ack_floor.stream_seq,delivered:info.delivered.stream_seq})); if(info.ack_floor.stream_seq<${sequence}) throw new Error('secondary durable did not acknowledge the failed-over Run'); } finally { await nc.drain(); }`;
    const ack = spawnSync("docker", ["exec", secondaryWorkerName, "node", "--input-type=module", "-e", ackProbe], { env, encoding: "utf8" });
    assert.equal(ack.status, 0, `secondary consumer did not acknowledge the original Run: ${ack.stderr || ack.stdout}`);
    faultSequence.push({ event: "normal_run_completed_after_worker_failover", testRunId, sequence, secondaryWorker: secondaryWorkerName, secondaryAck: JSON.parse(ack.stdout.trim()), authoritativeObservations: 120, at: new Date().toISOString() });
  }
  if (backupRestoreMode) {
    const normalRunId = auditRecord.testRunIds.find((run) => run.scenario === "normal")?.testRunId;
    assert.ok(normalRunId, "normal TestRun ID was not captured for paired backup/restore");
    const listedVolumes = dockerChecked(["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]).split(/\r?\n/u).filter(Boolean);
    const sourceVolumes = new Map();
    for (const volume of listedVolumes) {
      const info = JSON.parse(dockerChecked(["volume", "inspect", volume]))[0];
      const logical = info.Labels?.["com.docker.compose.volume"];
      if (["v14-integration-postgres", "nats-jetstream", "temporal-dev-state"].includes(logical)) sourceVolumes.set(logical, volume);
    }
    const requiredVolumes = ["v14-integration-postgres", "nats-jetstream", "temporal-dev-state"];
    assert.deepEqual([...sourceVolumes.keys()].sort(), [...requiredVolumes].sort(), "isolated V1.5 stack did not expose all three required persistent volumes");
    const postgresContainer = compose(["ps", "-q", "postgres"], "pipe").stdout.trim();
    assert.ok(postgresContainer, "isolated PostgreSQL container is missing before backup");
    const postgresImage = dockerChecked(["inspect", "--format", "{{.Image}}", postgresContainer]);
    assert.match(postgresImage, /^sha256:[a-f0-9]{64}$/u, "PostgreSQL backup helper must use the exact running image ID");

    const stopped = compose(["down", "--remove-orphans"], "pipe");
    assert.equal(stopped.status, 0, `could not quiesce the isolated stack before paired backup: ${stopped.stderr || stopped.stdout}`);
    const restoreVolumes = new Map();
    const snapshots = [];
    for (const logical of requiredVolumes) {
      const archive = `${logical}.tar`;
      const source = sourceVolumes.get(logical);
      const captured = spawnSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--cap-add", "DAC_READ_SEARCH", "--cap-add", "DAC_OVERRIDE", "--cap-add", "CHOWN", "--security-opt", "no-new-privileges", "--mount", `type=volume,src=${source},dst=/source,readonly`, "--mount", `type=bind,src=${evidenceRoot},dst=/backup`, "--entrypoint", "sh", postgresImage, "-ec", `tar -C /source -cpf /backup/${archive} .`], { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
      assert.equal(captured.status, 0, `could not snapshot isolated ${logical} volume: ${captured.stderr || captured.stdout}`);
      const archiveHash = await sha256File(join(evidenceRoot, archive));
      const restored = `sq-v15-restore-${randomBytes(6).toString("hex")}-${logical}`;
      dockerChecked(["volume", "create", "--name", restored]);
      restoreVolumeNames.push(restored);
      restoreVolumes.set(logical, restored);
      const extracted = spawnSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--cap-add", "DAC_READ_SEARCH", "--cap-add", "DAC_OVERRIDE", "--cap-add", "CHOWN", "--security-opt", "no-new-privileges", "--mount", `type=volume,src=${restored},dst=/restore`, "--mount", `type=bind,src=${evidenceRoot},dst=/backup,readonly`, "--entrypoint", "sh", postgresImage, "-ec", `tar -C /restore -xpf /backup/${archive}`], { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
      assert.equal(extracted.status, 0, `could not restore isolated ${logical} volume: ${extracted.stderr || extracted.stdout}`);
      snapshots.push({ logicalVolume: logical, archiveSha256: archiveHash, archiveBytes: statSync(join(evidenceRoot, archive)).size, sourceVolume: source, restoredVolume: restored });
    }
    const overridePath = join(evidenceRoot, "restore-volumes.yml");
    const override = { "v14-integration-postgres": restoreVolumes.get("v14-integration-postgres"), "nats-jetstream": restoreVolumes.get("nats-jetstream"), "temporal-dev-state": restoreVolumes.get("temporal-dev-state") };
    writeFileSync(overridePath, `volumes:\n  v14-integration-postgres:\n    name: ${override["v14-integration-postgres"]}\n  nats-jetstream:\n    name: ${override["nats-jetstream"]}\n  temporal-dev-state:\n    name: ${override["temporal-dev-state"]}\n`, { mode: 0o600 });
    const restoreFiles = [composeFile, overridePath];
    const restoredStack = composeWithFiles(restoreFiles, ["--profile", "interactive", "up", "-d"]);
    assert.equal(restoredStack.status, 0, `could not start the isolated stack from restored volumes: ${restoredStack.stderr || restoredStack.stdout}`);
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const ready = await fetch(`http://127.0.0.1:${apiPort}/live`).then((response) => response.ok).catch(() => false);
      if (ready) break;
      if (attempt === 119) throw new Error("Platform did not become ready from restored PostgreSQL/NATS/Temporal volumes");
      await delay(250);
    }
    const cli = spawnSync("pnpm", ["verify:stage", "--", "--stage", "V1.5", "--run", normalRunId, "--check-only"], { cwd: process.cwd(), env, encoding: "utf8", stdio: "pipe", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(cli.status, 2, `V1.5 check-only should preserve the known incomplete version gate while reading restored run facts: ${cli.stderr || cli.stdout}`);
    const restoredRun = parseRunResult(cli.stdout);
    assert.equal(restoredRun.testRunId, normalRunId, "restored check-only returned a different TestRun");
    const holdAssertion = restoredRun.assertions.find((assertion) => assertion.assertionId === "V1.5-HOLD-002");
    assert.equal(holdAssertion?.status, "PASS", "restored PostgreSQL did not preserve the authoritative NO_TRADE assertion");
    assert.equal(holdAssertion?.actual?.authoritativeObservations, 120, "restored PostgreSQL did not preserve all 120 authoritative observations");
    const temporalWorkflowId = `v15-no-trade-${normalRunId}`;
    const temporal = composeWithFiles(restoreFiles, ["exec", "-T", "temporal", "temporal", "workflow", "describe", "--workflow-id", temporalWorkflowId]);
    assert.equal(temporal.status, 0, `restored Temporal history could not be read for ${temporalWorkflowId}: ${temporal.stderr || temporal.stdout}`);
    const natsProbe = `import { createRequire } from 'node:module'; const require=createRequire('/workspace/services/platform-api-service/package.json'); const {connect}=require('nats'); const nc=await connect({servers:'nats://nats:4222'}); try { const jsm=await nc.jetstreamManager(); const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); const result={ackFloor:info.ack_floor.stream_seq,delivered:info.delivered.stream_seq}; console.log(JSON.stringify(result)); if(result.ackFloor<1||result.delivered<1) throw new Error('restored JetStream consumer state is incomplete'); } finally { await nc.drain(); }`;
    const nats = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", natsProbe]);
    assert.equal(nats.status, 0, `restored JetStream stream/consumer state could not be read: ${nats.stderr || nats.stdout}`);
    const cleanupRestored = composeWithFiles(restoreFiles, ["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
    assert.equal(cleanupRestored.status, 0, `could not remove the isolated restored stack: ${cleanupRestored.stderr || cleanupRestored.stdout}`);
    const remainingRestoreVolumes = spawnSync("docker", ["volume", "ls", "-q"], { encoding: "utf8" }).stdout.split(/\r?\n/u).filter((name) => [...restoreVolumes.values()].includes(name));
    assert.deepEqual(remainingRestoreVolumes, [], "restored test volumes remain after exact project cleanup");
    faultSequence.push({ event: "isolated_v1_all_domain_postgres_nats_temporal_volumes_backed_up_restored_and_same_run_verified", testRunId: normalRunId, snapshots, restoredRunCheckExitCode: cli.status, restoredRunStatus: restoredRun.status, restoredHoldAssertion: holdAssertion, temporalWorkflowId, temporalDescribeExcerpt: temporal.stdout.slice(0, 1200), restoredJetStream: JSON.parse(nats.stdout.trim()), restoredVolumeCleanupVerified: true, artifactDataScope: "V1.5 E2E creates no external Artifact volume; persisted run/evidence facts are in PostgreSQL.", at: new Date().toISOString() });
  }
  assert.equal(exitCode, 0, "isolated V1.5 Web/API/CLI/evidence E2E failed");
} catch (error) {
  auditRecord.failureReason = error instanceof Error ? error.message : String(error);
  console.error(auditRecord.failureReason);
  exitCode = 1;
} finally {
  if (started) {
    if (secondaryWorkerName) spawnSync("docker", ["rm", "--force", secondaryWorkerName], { encoding: "utf8" });
    const down = compose(["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) exitCode = 1;
    for (const volume of restoreVolumeNames) {
      const present = spawnSync("docker", ["volume", "inspect", volume], { encoding: "utf8" });
      if (present.status === 0 && spawnSync("docker", ["volume", "rm", volume], { encoding: "utf8" }).status !== 0) {
        console.error(`isolated restored V1.5 volume could not be removed: ${volume}`);
        exitCode = 1;
      }
    }
    for (const [name, args] of resources) {
      const result = spawnSync("docker", args, { encoding: "utf8" });
      if (result.status !== 0 || result.stdout.trim()) {
        console.error(`isolated V1.5 ${name} remain for ${project}: ${result.stdout.trim()}`);
        exitCode = 1;
      }
    }
    const images = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
    const projectImages = images.stdout.split(/\r?\n/u).filter((reference) => reference.startsWith(`${project}-`));
    if (projectImages.length && spawnSync("docker", ["image", "rm", ...projectImages], { encoding: "utf8" }).status !== 0) exitCode = 1;
    const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
    if (remainingImages.status !== 0 || remainingImages.stdout.split(/\r?\n/u).some((reference) => reference.startsWith(`${project}-`))) exitCode = 1;
    resourcesRemoved = exitCode === 0 || resources.every(([, args]) => {
      const result = spawnSync("docker", args, { encoding: "utf8" });
      return result.status === 0 && result.stdout.trim() === "";
    });
  }
  rmSync(evidenceRoot, { recursive: true, force: true });
  auditRecord.status = exitCode === 0 ? "PASS" : "FAIL";
  auditRecord.exactProjectResourcesRemoved = resourcesRemoved;
  mkdirSync("evidence/audits", { recursive: true });
  const auditPath = temporalOutageMode ? "evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.json" : networkOutageMode ? "evidence/audits/2026-10-07-v15-network-outage-e2e.json" : databaseRetryMode ? "evidence/audits/2026-10-07-v15-database-retry-e2e.json" : databaseOutageMode ? "evidence/audits/2026-10-07-v15-database-outage-e2e.json" : databaseConnectionDropMode ? "evidence/audits/2026-10-07-v15-database-connection-drop-e2e.json" : workerFailoverMode ? "evidence/audits/2026-10-07-v15-worker-failover-e2e.json" : multiWorkerMode ? "evidence/audits/2026-10-07-v15-multiworker-e2e.json" : backupRestoreMode ? "evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.json" : "evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json";
  writeFileSync(auditPath, `${JSON.stringify(auditRecord, null, 2)}\n`);
  console.log(JSON.stringify({ status: exitCode === 0 ? "PASS" : "FAIL", isolatedProject: project, stage: "V1.5", e2e: exitCode === 0 ? "WAITING/NOT_RUN verified for normal, rejection, recovery" : "NOT_PASSED", externalSourceCalls: 0, realBrokerCalls: 0, exactProjectResourcesRemoved: resourcesRemoved }));
}

process.exit(exitCode);
