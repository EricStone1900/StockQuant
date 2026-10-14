import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { cpSync, createReadStream, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { writeUniqueEvidence } from "./unique-evidence.mjs";

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
const tradeFailoverMode = process.env.STOCKQUANT_V15_E2E_TRADE_FAILOVER === "true";
const tradeDoubleFailureMode = process.env.STOCKQUANT_V15_E2E_TRADE_DOUBLE_FAILURE === "true";
const tradeAndDatabaseFailureMode = process.env.STOCKQUANT_V15_E2E_TRADE_AND_DATABASE_FAILURE === "true";
const backupRestoreMode = process.env.STOCKQUANT_V15_E2E_BACKUP_RESTORE === "true";
const autoCancelMode = process.env.STOCKQUANT_V15_E2E_AUTO_CANCEL === "true";
const tradeWorkerFailureMode = tradeFailoverMode || tradeDoubleFailureMode || tradeAndDatabaseFailureMode;
assert.ok([temporalOutageMode, networkOutageMode, databaseRetryMode, databaseOutageMode, databaseConnectionDropMode, multiWorkerMode, workerFailoverMode, tradeFailoverMode, tradeDoubleFailureMode, tradeAndDatabaseFailureMode, backupRestoreMode, autoCancelMode].filter(Boolean).length <= 1, "select only one isolated fault mode");
const project = `sq-v15-e2e-${randomBytes(10).toString("hex")}`;
const evidenceRoot = mkdtempSync(join(tmpdir(), "sq-v15-e2e-evidence-"));
const preserveRunExports = process.env.STOCKQUANT_V15_PRESERVE_RUN_EXPORTS === "true";
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
  STOCKQUANT_V13_TEST_FAULTS_ENABLED: "true",
  STOCKQUANT_V15_TEST_PAUSE_AFTER_AUTHORIZATION_DELAY_MS: tradeWorkerFailureMode || autoCancelMode ? "0" : "8000",
  STOCKQUANT_V15_TEST_AUTO_COMMIT_RESTART_DELAY_MS: autoCancelMode ? "8000" : temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || backupRestoreMode ? "0" : "30000",
  STOCKQUANT_V14_TEST_HOOKS_ENABLED: "false",
  V11_HOST_PORT: String(apiPort),
  V14_WEB_HOST_PORT: String(webPort),
  V15_WEB_HOST_PORT: String(webPort),
  STOCKQUANT_CODE_VERSION: `sha256:${randomBytes(32).toString("hex")}`,
  STOCKQUANT_PLATFORM_API_URL: `http://127.0.0.1:${apiPort}`,
  STOCKQUANT_EVIDENCE_EXPORT_CWD: evidenceRoot,
  PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`,
  STOCKQUANT_V15_E2E_PROJECT: project,
  STOCKQUANT_V15_DISPATCH_TEST_DELAY_MS: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || tradeWorkerFailureMode || backupRestoreMode || autoCancelMode ? "1000" : "30000",
  STOCKQUANT_V15_TEST_ACK_WAIT_MS: "3000",
  STOCKQUANT_V15_TEST_DROP_ACK_ONCE: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || tradeWorkerFailureMode || backupRestoreMode || autoCancelMode ? "false" : "true",
  STOCKQUANT_V15_TEST_TEMPORAL_FAILURE_ONCE: temporalOutageMode || networkOutageMode || databaseRetryMode || databaseOutageMode || databaseConnectionDropMode || multiWorkerMode || workerFailoverMode || tradeWorkerFailureMode || backupRestoreMode || autoCancelMode ? "false" : "true",
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
let secondaryTradeName;
const restoreVolumeNames = [];
const faultSequence = [];
const sourceFiles = ["services/platform-api-service/src/application/v15-run-incidents.ts", "services/platform-api-service/tests/unit/v15-run-incidents.spec.ts", "services/platform-api-service/tests/integration/v15-run-incidents.spec.ts", "services/platform-api-service/src/application/v15-auto-trade-cancellation.ts", "services/platform-api-service/tests/unit/v15-auto-trade-cancellation.spec.ts", "services/platform-api-service/src/integration/v15-nats-dispatch.ts", "services/platform-api-service/src/integration/temporal-runtime.ts", "services/platform-api-service/src/integration/temporal-workflow.ts", "services/platform-api-service/src/application/v15-auto-trade.ts", "services/platform-api-service/src/application/v15-auto-trade-calendar.ts", "services/platform-api-service/src/application/v15-orchestration.ts", "services/platform-api-service/src/adapters/postgres-stage-run-repository.ts", "services/platform-api-service/src/bootstrap/app.module.ts", "services/platform-api-service/src/main.ts", "services/platform-api-service/src/contracts/generated-v13-auto-mandate-client.ts", "services/platform-api-service/tests/unit/v15-auto-trade.spec.ts", "services/decision-governance-service/src/application/governance-api.ts", "services/decision-governance-service/src/application/service-auth.ts", "services/decision-governance-service/src/ports/auto-mandate-repository.ts", "services/decision-governance-service/src/adapters/postgres-auto-mandate-repository.ts", "services/decision-governance-service/src/bootstrap/main.ts", "services/decision-governance-service/tests/unit/governance-api.spec.ts", "packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json", "packages/contracts/openapi/v15-run-incidents.v1.json", "packages/contracts/schemas/common/v15-run-incident.schema.json", "scripts/generate-v13-auto-mandate-client.mjs", "services/portfolio-risk-service/src/bootstrap/app.module.ts", "services/trade-execution-service/src/application/v13-manual-execution.ts", "services/trade-execution-service/src/application/v13-manual-paper-execution.ts", "services/trade-execution-service/src/adapters/postgres-fake-broker-repository.ts", "services/trade-execution-service/src/bootstrap/main.ts", "services/trade-execution-service/tests/unit/v13-manual-execution.spec.ts", "services/trade-execution-service/tests/unit/v13-auto-paper-execution.spec.ts", "packages/contracts/schemas/common/v13-auto-paper-execution-command.schema.json", "packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json", "services/quant-research-service/src/bootstrap/main.ts", "fixtures/v1/v1.5/no-trade-calendar.json", "fixtures/v1/v1.5/auto-trade-calendar.json", "fixtures/v1/v1.5/auto-trade-calendar-manifest.json", "fixtures/v1/v1.5/auto-trade-calendar-2.json", "fixtures/v1/v1.5/auto-trade-calendar-2-manifest.json", "infra/compose/docker-compose.v15-integration.yml", "apps/web/src/main.tsx", "apps/web/tests/e2e/v11-acceptance.spec.ts", "scripts/unique-evidence.mjs", "scripts/test-v15-web-e2e-isolated.mjs"];
const sourceSha256 = Object.fromEntries(sourceFiles.map((path) => [path, createHash("sha256").update(readFileSync(path)).digest("hex")]));
let auditRecord = { schemaVersion: "v1.5-nats-temporal-dispatch-e2e-v2", status: "FAIL", faultMode: temporalOutageMode ? "ACTUAL_TEMPORAL_SERVER_STOP_RESTART" : networkOutageMode ? "PLATFORM_CONTAINER_NETWORK_DISCONNECT_RECONNECT" : databaseRetryMode ? "INJECTED_DATABASE_BOUNDARY_FAILURE_NAK_REDELIVERY" : databaseOutageMode ? "ISOLATED_POSTGRES_SERVER_STOP_RESTART_NAK_REDELIVERY" : databaseConnectionDropMode ? "ISOLATED_PLATFORM_POSTGRES_CONNECTION_TERMINATION" : tradeAndDatabaseFailureMode ? "TRADE_INSTANCES_AND_POSTGRES_TERMINATED_AFTER_COMMIT_AND_RECOVERED" : tradeDoubleFailureMode ? "ALL_TRADE_EXECUTION_INSTANCES_TERMINATED_AFTER_COMMIT_AND_RECOVERED" : tradeFailoverMode ? "TRADE_EXECUTION_WORKER_TERMINATED_AFTER_COMMIT_SECONDARY_RECOVERY" : autoCancelMode ? "DURABLE_AUTO_CANCEL_AFTER_MANDATE_AUTHORIZATION" : workerFailoverMode ? "PRIMARY_PLATFORM_WORKER_TERMINATED_SECONDARY_TAKEOVER" : multiWorkerMode ? "TWO_PLATFORM_CONSUMERS_DUPLICATE_WORKFLOW_START" : backupRestoreMode ? "ISOLATED_V1_DATABASE_NATS_TEMPORAL_VOLUME_BACKUP_RESTORE" : "NATS_AND_WORKER_RECOVERY", isolatedProject: project, stage: "V1.5", testRunIds: [], browserExitCode: null, output: "", faultSequence, externalSourceCalls: 0, realBrokerCalls: 0, exactProjectResourcesRemoved: false, sourceSha256, failureReason: null };

try {
  const up = compose(["--profile", "interactive", "up", "-d", "--build"]);
  started = true;
  if (up.status !== 0) compose(["logs", "platform-api-service"]);
  assert.equal(up.status, 0, "isolated V1.5 Web/API/NATS/Temporal stack failed to start");

  const apiUrl = `http://127.0.0.1:${apiPort}`;
  const webUrl = `http://127.0.0.1:${webPort}`;
  auditRecord.webUrl = `${webUrl}/acceptance/v1/v1.5`;
  auditRecord.apiHealthUrl = `${apiUrl}/live`;
  console.info(`[V1.5 isolated Web] webUrl=${auditRecord.webUrl} apiHealthUrl=${auditRecord.apiHealthUrl} liveTradingEnabled=false brokerMode=FAKE`);
  for (const [name, url] of [["Platform API", `${apiUrl}/live`], ["containerized Web", `${webUrl}/acceptance/v1/v1.5`]]) {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try { if ((await fetch(url)).ok) { ready = true; break; } } catch { /* wait for this isolated service */ }
      await delay(250);
    }
    assert.equal(ready, true, `${name} did not become ready at ${url}`);
  }

  const identityRoutes = [
    { label: "scenario discovery", method: "GET", path: "/api/v1/acceptance/v1/v1.5/scenarios" },
    { label: "owner-scoped run history", method: "GET", path: "/api/v1/acceptance/v1/v1.5/runs?limit=20" },
    { label: "owner-scoped arbitrary Fill trace lookup", method: "GET", path: "/api/v1/acceptance/v1/v1.5/fills/missing-fill/trace" },
    { label: "run creation", method: "POST", path: "/api/v1/acceptance/v1/v1.5/runs", body: { scenarioId: "rejection", seed: 20260907 } },
    { label: "TestRun read", method: "GET", path: "/api/v1/acceptance/v1/v1.5/runs/00000000-0000-4000-8000-000000000001" },
    { label: "owner-scoped Run incidents", method: "GET", path: "/api/v1/acceptance/v1/v1.5/runs/00000000-0000-4000-8000-000000000001/incidents" },
    { label: "Run incident acknowledgement", method: "POST", path: "/api/v1/acceptance/v1/v1.5/runs/00000000-0000-4000-8000-000000000001/incidents/00000000-0000-4000-8000-000000000002/acknowledge", body: {} },
    { label: "AUTO run cancellation", method: "POST", path: "/api/v1/acceptance/v1/v1.5/runs/00000000-0000-4000-8000-000000000001/cancel", body: {} },
  ];
  const platformSource = readFileSync("services/platform-api-service/src/bootstrap/app.module.ts", "utf8");
  const controllerMarker = '@Controller("api/v1/acceptance/v1/v1.5")';
  const controllerStart = platformSource.indexOf(controllerMarker);
  const controllerEnd = platformSource.indexOf("\n@Controller(", controllerStart + controllerMarker.length);
  assert.notEqual(controllerStart, -1, "V1.5 Platform controller must exist");
  const controllerSource = platformSource.slice(controllerStart, controllerEnd < 0 ? undefined : controllerEnd);
  const declaredRoutes = [...controllerSource.matchAll(/@(Get|Post|Patch|Put|Delete)\("([^"]+)"\)/gu)]
    .map(([, method, route]) => `${method.toUpperCase()} /api/v1/acceptance/v1/v1.5/${route}`);
  const requiredRoutes = [
    "GET /api/v1/acceptance/v1/v1.5/scenarios",
    "GET /api/v1/acceptance/v1/v1.5/runs",
    "GET /api/v1/acceptance/v1/v1.5/fills/:externalFillId/trace",
    "POST /api/v1/acceptance/v1/v1.5/runs",
    "GET /api/v1/acceptance/v1/v1.5/runs/:testRunId",
    "GET /api/v1/acceptance/v1/v1.5/runs/:testRunId/incidents",
    "POST /api/v1/acceptance/v1/v1.5/runs/:testRunId/incidents/:incidentId/acknowledge",
    "POST /api/v1/acceptance/v1/v1.5/runs/:testRunId/cancel",
  ];
  assert.equal(declaredRoutes.length, requiredRoutes.length, "update V1.5 identity probes with every controller route");
  for (const route of requiredRoutes) assert.equal(declaredRoutes.filter((item) => item === route).length, 1, `V1.5 route must be inventoried exactly once: ${route}`);
  for (const route of identityRoutes) {
    for (const [identityName, headers, expectedStatus] of [
      ["anonymous", {}, 401],
      ["forged owner", { "x-stockquant-user": "unauthorized-owner" }, 403],
    ]) {
      const response = await fetch(`${apiUrl}${route.path}`, {
        method: route.method,
        headers: { ...(route.body ? { "content-type": "application/json" } : {}), ...headers },
        ...(route.body ? { body: JSON.stringify(route.body) } : {}),
      });
      assert.equal(response.status, expectedStatus, `${route.label} must reject ${identityName}`);
    }
  }
  console.info(`[V1.5 Platform identity boundary] ${JSON.stringify({ routes: identityRoutes.map(({ label, method, path }) => ({ label, method, path })), anonymousRejected: identityRoutes.length, forgedOwnerRejected: identityRoutes.length, expectedStatuses: { anonymous: 401, forgedOwner: 403 } })}`);

  const v15RunCount = () => {
    const query = compose(["exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "platform_api", "-Atc", "SELECT count(*) FROM acceptance_stage_runs WHERE stage_id='V1.5'"], "pipe");
    assert.equal(query.status, 0, query.stderr);
    return Number(query.stdout.trim());
  };
  const runCountBeforeModeProbe = v15RunCount();
  const rejectedModes = [
    { environmentMode: "PAPER", brokerMode: "FAKE" },
    { environmentMode: "PAPER", brokerMode: "REAL" },
    { environmentMode: "LIVE", brokerMode: "FAKE" },
    { environmentMode: "BACKTEST", brokerMode: "FAKE" },
    { environmentMode: "BACKTEST", brokerMode: "REAL" },
    { environmentMode: "LIVE", brokerMode: "REAL" },
  ];
  for (const modes of rejectedModes) {
    const response = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.5/runs`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" },
      body: JSON.stringify({ scenarioId: "rejection", seed: 20260907, ...modes }),
    });
    assert.equal(response.status, 422, `V1.5 run creation must reject client mode injection ${JSON.stringify(modes)}`);
  }
  assert.equal(v15RunCount(), runCountBeforeModeProbe, "rejected V1.5 mode injection must not create a TestRun or dispatch a workflow");
  auditRecord.platformModeInjectionBoundary = { rejectedModes, status: 422, testRunCountUnchanged: true };
  console.info(`[V1.5 Platform mode-injection boundary] ${JSON.stringify(auditRecord.platformModeInjectionBoundary)}`);

  const incidentRunId = randomUUID();
  const incidentRunNamespace = `v1-5-normal-${incidentRunId}`;
  const incidentRunRow = {
    testRunId: incidentRunId, stageId: "V1.5", scenarioId: "normal", scenarioVersion: "1.1.0",
    ownerId: "acceptance-owner-1", namespace: incidentRunNamespace, status: "WAITING", seed: 20260907,
    assertions: [{ assertionId: "V15-INCIDENT-HTTP-001", status: "WAITING", actual: "NOT_RUN" }],
    evidence: { workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "NOT_RUN", businessExecution: "NOT_RUN" },
  };
  const seedIncidentRunCode = `import {createRequire} from 'node:module'; const require=createRequire('/workspace/services/platform-api-service/package.json'); const {Pool}=require('pg'); const pool=new Pool({connectionString:process.env.STOCKQUANT_DATABASE_URL}); try { await pool.query('INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)',[${JSON.stringify(incidentRunRow.testRunId)},${JSON.stringify(incidentRunRow.stageId)},${JSON.stringify(incidentRunRow.scenarioId)},${JSON.stringify(incidentRunRow.scenarioVersion)},${JSON.stringify(incidentRunRow.ownerId)},${JSON.stringify(incidentRunRow.namespace)},${JSON.stringify(incidentRunRow.status)},${incidentRunRow.seed},${JSON.stringify(JSON.stringify(incidentRunRow.assertions))},${JSON.stringify(JSON.stringify(incidentRunRow.evidence))}]); console.log('SEEDED'); } finally { await pool.end(); }`;
  const seedIncidentRun = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", seedIncidentRunCode], "pipe");
  assert.equal(seedIncidentRun.status, 0, `could not seed an isolated persisted V1.5 Run for the incident HTTP probe: ${seedIncidentRun.stderr || seedIncidentRun.stdout}`);
  const incidentBasePath = `/api/v1/acceptance/v1/v1.5/runs/${incidentRunId}/incidents`;
  const incidentRequest = async (path = incidentBasePath, method = "GET", owner = "acceptance-owner-1", body = {}) => fetch(`${apiUrl}${path}`, {
    method,
    headers: { "x-stockquant-user": owner, ...(method === "POST" ? { "content-type": "application/json" } : {}) },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });
  try {
    const firstIncidentResponse = await incidentRequest();
    assert.equal(firstIncidentResponse.status, 200, `owner could not read the persisted V1.5 incident${firstIncidentResponse.status === 200 ? "" : `: ${await firstIncidentResponse.text()}`}`);
    const firstIncidents = await firstIncidentResponse.json();
    assert.equal(firstIncidents.length, 1, "NOT_CONNECTED should create one Run-scoped capability incident");
    assert.deepEqual({ alertKey: firstIncidents[0].alertKey, state: firstIncidents[0].state, acknowledgedBy: firstIncidents[0].acknowledgedBy }, { alertKey: "capability:workflow", state: "OPEN", acknowledgedBy: null });
    const incidentId = firstIncidents[0].incidentId;
    const wrongOwner = await incidentRequest(`${incidentBasePath}/${incidentId}/acknowledge`, "POST", "unauthorized-owner");
    assert.equal(wrongOwner.status, 403, "another owner must not acknowledge this Run incident");
    const injectedAcknowledgement = await incidentRequest(`${incidentBasePath}/${incidentId}/acknowledge`, "POST", "acceptance-owner-1", { state: "ACKNOWLEDGED", status: "COMPLETED", cash: { amount: "999999.00", currency: "CNY" } });
    assert.equal(injectedAcknowledgement.status, 422, "incident acknowledgement must reject client-supplied state or business facts");
    for (const modes of [
      { environmentMode: "PAPER", brokerMode: "FAKE" },
      { environmentMode: "PAPER", brokerMode: "REAL" },
      { environmentMode: "LIVE", brokerMode: "FAKE" },
      { environmentMode: "BACKTEST", brokerMode: "FAKE" },
      { environmentMode: "BACKTEST", brokerMode: "REAL" },
      { environmentMode: "LIVE", brokerMode: "REAL" },
    ]) {
      const modeAcknowledgement = await incidentRequest(`${incidentBasePath}/${incidentId}/acknowledge`, "POST", "acceptance-owner-1", modes);
      assert.equal(modeAcknowledgement.status, 422, `incident acknowledgement must reject mode injection ${JSON.stringify(modes)}`);
      const unchangedIncidents = await incidentRequest();
      assert.equal((await unchangedIncidents.json())[0].state, "OPEN", `rejected mode injection must leave incident open ${JSON.stringify(modes)}`);
    }
    const incidentAfterRejectedAcknowledgement = await incidentRequest();
    assert.equal((await incidentAfterRejectedAcknowledgement.json())[0].state, "OPEN", "rejected acknowledgement must leave the incident open");
    const acknowledgedResponse = await incidentRequest(`${incidentBasePath}/${incidentId}/acknowledge`, "POST");
    assert.equal(acknowledgedResponse.status, 200, `authenticated incident acknowledgment failed${acknowledgedResponse.status === 200 ? "" : `: ${await acknowledgedResponse.text()}`}`);
    const acknowledged = await acknowledgedResponse.json();
    assert.deepEqual({ incidentId: acknowledged.incidentId, state: acknowledged.state, acknowledgedBy: acknowledged.acknowledgedBy }, { incidentId, state: "ACKNOWLEDGED", acknowledgedBy: "acceptance-owner-1" });
    const acknowledgementReplay = await incidentRequest(`${incidentBasePath}/${incidentId}/acknowledge`, "POST");
    const replayedIncident = await acknowledgementReplay.json();
    assert.equal(acknowledgementReplay.status, 200);
    assert.equal(replayedIncident.acknowledgedAt, acknowledged.acknowledgedAt, "incident acknowledgment retry must preserve its first timestamp");
    const recoveredEvidence = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", `import {createRequire} from 'node:module';const require=createRequire('/workspace/services/platform-api-service/package.json');const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.STOCKQUANT_DATABASE_URL});try{await pool.query('UPDATE acceptance_stage_runs SET evidence=$2::jsonb WHERE test_run_id=$1',[${JSON.stringify(incidentRunId)},${JSON.stringify(JSON.stringify({ workflow: "COMPLETED", nats: "DELIVERED", temporal: "COMPLETED", businessExecution: "NOT_RUN" }))}]);console.log('RECOVERED');}finally{await pool.end();}`], "pipe");
    assert.equal(recoveredEvidence.status, 0, `could not update the isolated Run evidence for recovery: ${recoveredEvidence.stderr || recoveredEvidence.stdout}`);
    const resolvedIncidentsResponse = await incidentRequest();
    const resolvedIncidents = await resolvedIncidentsResponse.json();
    assert.equal(resolvedIncidents[0]?.state, "RESOLVED", "cleared persisted capability blocker must resolve its incident");
    assert.ok(resolvedIncidents[0]?.resolvedAt, "resolved Run incident must preserve a resolution timestamp");
    faultSequence.push({ event: "v15_run_incident_http_lifecycle_verified", testRunId: incidentRunId, incidentId, opened: true, acknowledgedBy: acknowledged.acknowledgedBy, acknowledgmentRetryPreservedTimestamp: replayedIncident.acknowledgedAt === acknowledged.acknowledgedAt, resolved: resolvedIncidents[0].state === "RESOLVED", wrongOwnerStatus: wrongOwner.status, at: new Date().toISOString() });
  } finally {
    const cleanupIncidentRunCode = `import {createRequire} from 'node:module';const require=createRequire('/workspace/services/platform-api-service/package.json');const {Pool}=require('pg');const pool=new Pool({connectionString:process.env.STOCKQUANT_DATABASE_URL});try{await pool.query('DELETE FROM v15_run_incidents WHERE test_run_id=$1',[${JSON.stringify(incidentRunId)}]);await pool.query('DELETE FROM acceptance_stage_runs WHERE test_run_id=$1',[${JSON.stringify(incidentRunId)}]);console.log('CLEANED');}finally{await pool.end();}`;
    const cleanupIncidentRun = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", cleanupIncidentRunCode], "pipe");
    assert.equal(cleanupIncidentRun.status, 0, `could not remove the exact seeded V1.5 Run incident test rows: ${cleanupIncidentRun.stderr || cleanupIncidentRun.stdout}`);
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
  if (tradeWorkerFailureMode) {
    secondaryTradeName = `${project}-trade-execution-worker-2`;
    const worker = compose(["run", "-d", "--no-deps", "--name", secondaryTradeName, "--use-aliases", "trade-execution-service"], "pipe");
    assert.equal(worker.status, 0, `could not start the isolated secondary Trade Execution worker: ${worker.stderr || worker.stdout}`);
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const state = spawnSync("docker", ["inspect", "--format", "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}", secondaryTradeName], { env, encoding: "utf8" });
      if (state.status === 0 && state.stdout.trim() === "healthy") { ready = true; break; }
      await delay(250);
    }
    assert.equal(ready, true, "secondary Trade Execution worker did not become healthy against the shared isolated PostgreSQL");
    const aliases = JSON.parse(dockerChecked(["inspect", "--format", "{{json .NetworkSettings.Networks}}", secondaryTradeName]));
    const network = Object.values(aliases)[0];
    assert.ok(network?.Aliases?.includes("trade-execution-service"), "secondary Trade Execution worker is not reachable through the configured service alias");
    faultSequence.push({ event: "secondary_trade_execution_worker_ready_on_shared_database_and_service_alias", worker: secondaryTradeName, aliases: network.Aliases, at: new Date().toISOString() });
  }

  const browser = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1.5"], { env, stdio: ["inherit", "pipe", "pipe"] });
  let output = "";
  let outageTask;
  let pauseMandateTask;
  let activeAutoReplayTask;
  let tradeRestartTask;
  let tradeFailoverTask;
  const capture = (chunk, stream) => {
    const value = chunk.toString();
    output += value;
    auditRecord.output = output;
    auditRecord.testRunIds = [...output.matchAll(/scenario=(normal|auto-trade|rejection|recovery) created testRunId=([0-9a-f-]{36})/gu)].map((match) => ({ scenario: match[1], testRunId: match[2] }));
    stream.write(value);
    const autoTradeRun = auditRecord.testRunIds.find((run) => run.scenario === "auto-trade");
    if (autoTradeRun && !tradeRestartTask && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
      tradeRestartTask = (async () => {
        const testRunId = autoTradeRun.testRunId;
        let pendingResponseMarker;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          const logs = compose(["logs", "--no-color", "trade-execution-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect Trade Execution commit boundary before service restart");
          pendingResponseMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("V15_AUTO_RESPONSE_PENDING_BEFORE_TRADE_RESTART") && line.includes(`\"testRunId\":\"${testRunId}\"`));
          if (pendingResponseMarker) break;
          await delay(100);
        }
        assert.ok(pendingResponseMarker, `AUTO FakeBroker commit was not observed before Trade service restart; logs: ${compose(["logs", "--no-color", "trade-execution-service"], "pipe").stdout.slice(-12000)}`);
        const event = JSON.parse(pendingResponseMarker.slice(pendingResponseMarker.indexOf("{")));
        assert.ok(event.clientOrderId.endsWith("-session-2"), "Trade restart must target the first AUTO execution session");
        assert.ok(!output.includes("scenario=auto-trade CLI/export complete"), "AUTO workflow completed before Trade Execution restart injection");
        const stopped = compose(["kill", "trade-execution-service"], "pipe");
        assert.equal(stopped.status, 0, `could not terminate Trade Execution after FakeBroker commit: ${stopped.stderr || stopped.stdout}`);
        faultSequence.push({ event: "trade_execution_terminated_after_fakebroker_commit_before_http_response", testRunId, marker: event, at: new Date().toISOString() });
        const started = compose(["start", "trade-execution-service"], "pipe");
        assert.equal(started.status, 0, `could not restart Trade Execution with its persistent database: ${started.stderr || started.stdout}`);
        let ready = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const probe = compose(["exec", "-T", "platform-api-service", "node", "-e", "fetch('http://trade-execution-service:3005/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], "pipe");
          if (probe.status === 0) { ready = true; break; }
          await delay(250);
        }
        assert.equal(ready, true, "Trade Execution did not become ready after restarting with its original database volume");
        let replayMarker;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const logs = compose(["logs", "--no-color", "trade-execution-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect Trade Execution replay after restart");
          replayMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("V15_AUTO_ORIGINAL_ORDER_LOOKUP_AFTER_TRADE_RESTART") && line.includes(`\"testRunId\":\"${testRunId}\"`));
          if (replayMarker) break;
          await delay(250);
        }
        assert.ok(replayMarker, `Temporal did not retry the same AUTO command through the persisted Mandate and original order after Trade restart; logs: ${compose(["logs", "--no-color", "trade-execution-service"], "pipe").stdout.slice(-12000)}`);
        const replay = JSON.parse(replayMarker.slice(replayMarker.indexOf("{")));
        assert.equal(replay.clientOrderId, event.clientOrderId, "Trade restart recovery must query the original clientOrderId");
        faultSequence.push({ event: "temporal_retry_queried_original_order_after_trade_execution_restart", testRunId, marker: replay, at: new Date().toISOString() });
      })();
      tradeRestartTask.catch(() => browser.kill("SIGTERM"));
    }
    if (autoTradeRun && tradeWorkerFailureMode && !tradeFailoverTask) {
      const testRunId = autoTradeRun.testRunId;
      tradeFailoverTask = (async () => {
        const primaryName = `${project}-trade-execution-service-1`;
        const candidateNames = [primaryName, secondaryTradeName];
        let commitMarker;
        let commitContainer;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          for (const name of candidateNames) {
            const logs = spawnSync("docker", ["logs", "--tail", "500", name], { env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
            assert.equal(logs.status, 0, `could not inspect isolated Trade Execution worker ${name}`);
            commitMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("V15_AUTO_RESPONSE_PENDING_BEFORE_TRADE_RESTART") && line.includes(`\"testRunId\":\"${testRunId}\"`));
            if (commitMarker) { commitContainer = name; break; }
          }
          if (commitMarker) break;
          await delay(100);
        }
        assert.ok(commitMarker && commitContainer, `AUTO FakeBroker commit was not observed on either Trade Execution worker; primary=${spawnSync("docker", ["logs", "--tail", "100", primaryName], { env, encoding: "utf8" }).stdout} secondary=${spawnSync("docker", ["logs", "--tail", "100", secondaryTradeName], { env, encoding: "utf8" }).stdout}`);
        const committed = JSON.parse(commitMarker.slice(commitMarker.indexOf("{")));
        assert.ok(committed.clientOrderId.endsWith("-session-2"), "Trade failover must target the first AUTO execution session");
        const remainingWorker = candidateNames.find((name) => name !== commitContainer);
        if (tradeAndDatabaseFailureMode) {
          const databaseContainer = `${project}-postgres-1`;
          const failed = spawnSync("docker", ["kill", "--signal", "KILL", commitContainer, remainingWorker, databaseContainer], { env, encoding: "utf8", timeout: 10_000 });
          assert.equal(failed.status, 0, `could not terminate both Trade Execution instances and the isolated PostgreSQL server after the durable FakeBroker commit: ${failed.stderr || failed.stdout}`);
          const stoppedNames = [commitContainer, remainingWorker, databaseContainer];
          const states = stoppedNames.map((name) => {
            const inspected = spawnSync("docker", ["inspect", "--format", "{{.State.Status}}", name], { env, encoding: "utf8" });
            assert.equal(inspected.status, 0, `could not inspect injected outage target ${name}`);
            return { name, status: inspected.stdout.trim() };
          });
          assert.ok(states.every((entry) => entry.status === "exited"), `not all isolated fault targets stopped: ${JSON.stringify(states)}`);
          faultSequence.push({ event: "both_trade_instances_and_postgres_terminated_after_fakebroker_commit_before_http_response", testRunId, stopped: states, marker: committed, at: new Date().toISOString() });
          await delay(1500);
          const databaseStarted = spawnSync("docker", ["start", databaseContainer], { env, encoding: "utf8", timeout: 10_000 });
          assert.equal(databaseStarted.status, 0, `could not restart the same isolated PostgreSQL container: ${databaseStarted.stderr || databaseStarted.stdout}`);
          let databaseReady = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const probe = compose(["exec", "-T", "postgres", "pg_isready", "-U", "postgres", "-d", "postgres"], "pipe");
            if (probe.status === 0) { databaseReady = true; break; }
            await delay(250);
          }
          assert.equal(databaseReady, true, "the same PostgreSQL server and volume did not recover after the combined Trade/PostgreSQL outage");
          faultSequence.push({ event: "same_postgres_container_and_volume_restarted_and_ready_after_combined_outage", testRunId, databaseContainer, at: new Date().toISOString() });
          const dependentServices = [
            { name: "decision-governance-service", url: "http://decision-governance-service:3007/ready" },
            { name: "portfolio-risk-service", url: "http://portfolio-risk-service:3001/ready" },
          ];
          for (const service of dependentServices) {
            let ready = false;
            let lastProbe = "not attempted";
            for (let attempt = 0; attempt < 120; attempt += 1) {
              const code = `fetch(${JSON.stringify(service.url)}).then(async response=>{console.log(JSON.stringify({status:response.status,ok:response.ok}));process.exit(response.ok?0:1)}).catch(error=>{console.error(error.cause?.code||error.message);process.exit(1)})`;
              const probe = compose(["exec", "-T", "platform-api-service", "node", "-e", code], "pipe");
              lastProbe = (probe.stdout || probe.stderr || `exit=${probe.status}`).trim();
              if (probe.status === 0) { ready = true; break; }
              await delay(250);
            }
            assert.equal(ready, true, `${service.name} did not become resolvable and ready from Platform API after PostgreSQL recovery; last probe=${lastProbe}; state=${spawnSync("docker", ["inspect", "--format", "{{.State.Status}}/{{if .State.Health}}{{.State.Health.Status}}{{else}}no-health{{end}}", `${project}-${service.name}-1`], { env, encoding: "utf8" }).stdout.trim()}`);
            faultSequence.push({ event: "database_dependent_business_service_resolved_and_ready_after_postgres_recovery", testRunId, service: service.name, lastProbe, at: new Date().toISOString() });
          }
          const tradeStarted = spawnSync("docker", ["start", remainingWorker], { env, encoding: "utf8", timeout: 10_000 });
          assert.equal(tradeStarted.status, 0, `could not restart a Trade Execution instance after the combined outage: ${tradeStarted.stderr || tradeStarted.stdout}`);
          let ready = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const probe = compose(["exec", "-T", "platform-api-service", "node", "-e", "fetch('http://trade-execution-service:3005/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], "pipe");
            if (probe.status === 0) { ready = true; break; }
            await delay(250);
          }
          assert.equal(ready, true, "Trade Execution did not recover after PostgreSQL and both Trade instances were restarted");
          faultSequence.push({ event: "trade_instance_restarted_and_ready_after_combined_outage", testRunId, restartedWorker: remainingWorker, at: new Date().toISOString() });
        } else if (tradeDoubleFailureMode) {
          const failed = spawnSync("docker", ["kill", "--signal", "KILL", commitContainer, remainingWorker], { env, encoding: "utf8", timeout: 10_000 });
          assert.equal(failed.status, 0, `could not terminate both Trade Execution workers after the durable FakeBroker commit: ${failed.stderr || failed.stdout}`);
          faultSequence.push({ event: "both_trade_execution_instances_terminated_after_fakebroker_commit_before_http_response", testRunId, failedWorkers: [commitContainer, remainingWorker], marker: committed, at: new Date().toISOString() });
          await delay(1500);
          faultSequence.push({ event: "both_trade_execution_instances_unavailable_during_fixed_recovery_window", testRunId, durationMs: 1500, at: new Date().toISOString() });
          const started = spawnSync("docker", ["start", remainingWorker], { env, encoding: "utf8", timeout: 10_000 });
          assert.equal(started.status, 0, `could not restart a Trade Execution worker after the double-instance outage: ${started.stderr || started.stdout}`);
          let ready = false;
          for (let attempt = 0; attempt < 120; attempt += 1) {
            const probe = compose(["exec", "-T", "platform-api-service", "node", "-e", "fetch('http://trade-execution-service:3005/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"], "pipe");
            if (probe.status === 0) { ready = true; break; }
            await delay(250);
          }
          assert.equal(ready, true, "Trade Execution did not recover through the restarted instance after both workers were terminated");
          faultSequence.push({ event: "trade_execution_worker_restarted_and_ready_after_double_instance_outage", testRunId, restartedWorker: remainingWorker, at: new Date().toISOString() });
        } else {
          const failed = spawnSync("docker", ["kill", "--signal", "KILL", commitContainer], { env, encoding: "utf8" });
          assert.equal(failed.status, 0, `could not terminate the exact Trade Execution worker that committed the AUTO order: ${failed.stderr || failed.stdout}`);
          faultSequence.push({ event: "trade_execution_worker_terminated_after_fakebroker_commit_before_http_response", testRunId, failedWorker: commitContainer, marker: committed, remainingWorker, at: new Date().toISOString() });
        }
        let recoveryMarker;
        for (let attempt = 0; attempt < 240; attempt += 1) {
          const logs = spawnSync("docker", ["logs", "--tail", "1000", remainingWorker], { env, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
          assert.equal(logs.status, 0, `could not inspect surviving Trade Execution worker ${remainingWorker}`);
          recoveryMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("V15_AUTO_ORIGINAL_ORDER_LOOKUP_AFTER_TRADE_RESTART") && line.includes(`\"testRunId\":\"${testRunId}\"`));
          if (recoveryMarker) break;
          await delay(250);
        }
        assert.ok(recoveryMarker, `Temporal did not retry the same AUTO command through the surviving Trade Execution worker and read the original clientOrderId; logs=${spawnSync("docker", ["logs", "--tail", "200", remainingWorker], { env, encoding: "utf8" }).stdout}`);
        const recovered = JSON.parse(recoveryMarker.slice(recoveryMarker.indexOf("{")));
        assert.equal(recovered.clientOrderId, committed.clientOrderId, "Trade failover recovery must query the exact original clientOrderId");
        faultSequence.push({ event: tradeAndDatabaseFailureMode ? "temporal_retried_same_auto_command_after_combined_trade_database_outage_and_read_original_order" : tradeDoubleFailureMode ? "temporal_retried_same_auto_command_after_double_instance_outage_and_read_original_order" : "temporal_retried_same_auto_command_on_surviving_trade_worker_and_read_original_order", testRunId, survivingWorker: remainingWorker, marker: recovered, at: new Date().toISOString() });
      })();
      tradeFailoverTask.catch(() => browser.kill("SIGTERM"));
    }
    if (autoTradeRun && !pauseMandateTask && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
      const testRunId = autoTradeRun.testRunId;
      pauseMandateTask = (async () => {
        let authorizationMarker;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          const logs = compose(["logs", "--no-color", "trade-execution-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect the isolated AUTO authorization pause boundary");
          authorizationMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`V15_PAUSE_AFTER_MANDATE_AUTHORIZATION`) && line.includes(`"testRunId":"${testRunId}"`));
          if (authorizationMarker) break;
          await delay(100);
        }
        assert.ok(authorizationMarker, `the AUTO CN order was not observed after exact mandate authorization and before Portfolio reservation/FakeBroker send; Trade logs: ${compose(["logs", "--no-color", "trade-execution-service"], "pipe").stdout.slice(-12000)}`);
        const event = JSON.parse(authorizationMarker.slice(authorizationMarker.indexOf("{")));
        const pauseBody = { mandateVersion: 1, testRunId, reason: "V1.5 fixed fault pauses Mandate after authorization while the already-authorized CN order is in flight", now: event.now };
        const pauseProbe = `const body=${JSON.stringify(pauseBody)}; const response=await fetch('http://decision-governance-service:3007/internal/v1/auto-mandates/${event.mandateId}/pause',{method:'POST',headers:{'content-type':'application/json','x-stockquant-service-id':'platform-api-service','x-stockquant-owner-id':'acceptance-owner-1','x-stockquant-actor-id':'acceptance-owner-1',authorization:'Bearer '+process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API},body:JSON.stringify(body)}); const result=await response.json(); console.log(JSON.stringify({status:response.status,body:result})); if(response.status!==200) process.exit(1);`;
        const paused = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", pauseProbe], "pipe");
        assert.equal(paused.status, 0, `could not pause the exact Mandate after its order authorization: ${paused.stderr || paused.stdout}`);
        const pauseResult = JSON.parse(paused.stdout.trim().split(/\r?\n/u).at(-1));
        assert.equal(pauseResult.status, 200, `Mandate pause did not persist: ${JSON.stringify(pauseResult)}`);
        const blockedCommand = { accountId: event.accountId, clientOrderId: `v15-paused-followup-CN_A-${testRunId}`, mandateId: event.mandateId, mandateVersion: event.mandateVersion, namespace: event.namespace, now: event.now, ownerId: event.ownerId, proposalId: event.proposalId, testRunId };
        const blockedProbe = `const body=${JSON.stringify(blockedCommand)}; const response=await fetch('http://trade-execution-service:3005/internal/v1/v13/paper-orders/execute-auto-proposal',{method:'POST',headers:{'content-type':'application/json','x-stockquant-service-id':'platform-api-service',authorization:'Bearer '+process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API},body:JSON.stringify(body)}); const result=await response.json(); console.log(JSON.stringify({status:response.status,body:result}));`;
        const blocked = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", blockedProbe], "pipe");
        assert.equal(blocked.status, 0, `could not submit a new exact-scope order against the paused Mandate: ${blocked.stderr || blocked.stdout}`);
        const blockedResult = JSON.parse(blocked.stdout.trim().split(/\r?\n/u).at(-1));
        assert.equal(blockedResult.status, 403, `new order against the paused Mandate was not rejected: ${JSON.stringify(blockedResult)}`);
        assert.equal(blockedResult.body?.detail?.reasonCode, "MANDATE_INACTIVE", `paused Mandate rejection reason was not exact: ${JSON.stringify(blockedResult)}`);
        faultSequence.push({ event: "active_cn_mandate_paused_after_order_authorized_and_new_order_rejected_before_reservation_or_fakebroker_send", testRunId, marker: event, pauseResult, blockedCommand, blockedResult, at: new Date().toISOString() });
      })();
      pauseMandateTask.catch(() => browser.kill("SIGTERM"));
    }
    if (autoTradeRun && !activeAutoReplayTask && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
      activeAutoReplayTask = (async () => {
        const testRunId = autoTradeRun.testRunId;
        let activeActivity;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect AUTO Temporal activity before injecting active duplicate dispatch");
          activeActivity = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEST_AUTO_ACTIVITY_STARTED testRunId=${testRunId} market=CN_A`));
          if (activeActivity) break;
          await delay(100);
        }
        assert.ok(activeActivity, "the CN AUTO Temporal activity did not start before duplicate dispatch injection");
        assert.ok(!output.includes("scenario=auto-trade CLI/export complete"), "AUTO workflow completed before active duplicate dispatch injection");
        const fixtureBytes = readFileSync("fixtures/v1/v1.5/auto-trade-calendar-2.json");
        const fixture = JSON.parse(fixtureBytes.toString("utf8"));
        const payload = { testRunId, ownerId: "acceptance-owner-1", namespace: `v1-5-auto-trade-${testRunId}`, seed: 20260907, scenarioId: "auto-trade", sessions: fixture.sessions, fixtureVersion: fixture.fixtureVersion, fixtureSha256: createHash("sha256").update(fixtureBytes).digest("hex") };
        const replayProbe = `import { createRequire } from 'node:module';
const require=createRequire('/workspace/services/platform-api-service/package.json'); const {connect,headers}=require('nats'); const nc=await connect({servers:'nats://nats:4222'});
try { const js=nc.jetstream(); const jsm=await nc.jetstreamManager(); const before=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); const payload=${JSON.stringify(payload)}; const h=headers(); h.set('Nats-Msg-Id','active-auto-replay-${project}'); const published=await js.publish('stockquant.v1.5.events',new TextEncoder().encode(JSON.stringify({eventId:'${testRunId}',payload})),{headers:h}); let ackFloor=0; for(let i=0;i<120;i++){const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); ackFloor=info.ack_floor.stream_seq; if(ackFloor>=published.seq)break; if(i===119)throw new Error('active AUTO duplicate dispatch was not acknowledged'); await new Promise(r=>setTimeout(r,250));} console.log(JSON.stringify({sequence:published.seq,ackFloor,beforeAckFloor:before.ack_floor.stream_seq,eventId:'${testRunId}'})); } finally { await nc.drain(); }`;
        const replay = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", replayProbe], "pipe");
        assert.equal(replay.status, 0, `could not publish/acknowledge an active AUTO duplicate dispatch: ${replay.stderr || replay.stdout}`);
        const duplicate = JSON.parse(replay.stdout.trim());
        let alreadyStarted;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
          assert.equal(logs.status, 0, "could not inspect active AUTO duplicate Workflow handling");
          alreadyStarted = logs.stdout.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED") && line.includes(`eventId=${testRunId}`));
          if (alreadyStarted) break;
          await delay(100);
        }
        assert.ok(alreadyStarted, "active duplicate dispatch did not converge on the existing stable Temporal Workflow ID");
        faultSequence.push({ event: "active_auto_workflow_duplicate_dispatch_acked_without_starting_a_second_workflow", testRunId, activityMarker: activeActivity.trim(), sequence: duplicate.sequence, consumerAckFloor: duplicate.ackFloor, duplicateWorkflowMarker: alreadyStarted.trim(), at: new Date().toISOString() });
      })();
      activeAutoReplayTask.catch(() => browser.kill("SIGTERM"));
    }
    const created = output.match(/scenario=normal created testRunId=([0-9a-f-]{36})/u);
    if (created && !outageTask && !backupRestoreMode && !tradeWorkerFailureMode && !autoCancelMode) {
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
        const workerCrash = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", "process.kill(1, 'SIGKILL')"], "pipe");
        assert.equal(workerCrash.status, 0, `Platform API PID 1 crash injection failed: ${workerCrash.stderr || workerCrash.stdout}`);
        let workerReady = false;
        for (let attempt = 0; attempt < 120; attempt += 1) {
          try { if ((await fetch(`http://127.0.0.1:${apiPort}/live`)).ok) { workerReady = true; break; } } catch { /* wait for isolated Compose restart policy to recover Platform API and Temporal Worker */ }
          await delay(250);
        }
        assert.equal(workerReady, true, "Platform API/Temporal Worker did not auto-recover after process termination during the active workflow");
        faultSequence.push({ event: "platform_temporal_worker_auto_restarted_during_workflow_activity", testRunId, activityMarker: activeActivityMarker.trim(), workflowCompleteBeforeRestart: false, restartPolicy: "unless-stopped", at: new Date().toISOString() });
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
    if (!autoCancelMode && output.includes("scenario=normal 120 observations complete") && !faultSequence.some((event) => event.event === completionEvent)) {
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
  if (pauseMandateTask) await pauseMandateTask;
  if (activeAutoReplayTask) await activeAutoReplayTask;
  if (tradeRestartTask) await tradeRestartTask;
  if (tradeFailoverTask) await tradeFailoverTask;
  exitCode = Number(browserStatus);
  if (autoCancelMode && exitCode === 0) {
    const marker = output.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_AUTO_CANCEL_UI_CONFIRMED "));
    const completionMarker = output.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_AUTO_CANCEL_COMPLETED "));
    const replayMarker = output.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_AUTO_CANCEL_REPLAY_CONFIRMED "));
    assert.ok(marker, "Web AUTO cancellation was not observed after Mandate authorization");
    assert.ok(completionMarker, "in-flight AUTO cancellation completion evidence was not emitted");
    assert.ok(replayMarker, "completed-run AUTO cancellation retry evidence was not emitted");
    const event = JSON.parse(marker.slice(marker.indexOf("STOCKQUANT_V15_AUTO_CANCEL_UI_CONFIRMED ") + "STOCKQUANT_V15_AUTO_CANCEL_UI_CONFIRMED ".length));
    assert.equal(event.event, "web_cancel_after_fakebroker_commit_before_trade_response");
    assert.ok(event.commitPending.clientOrderId.endsWith("-session-2"), "cancellation race must be injected after the FakeBroker commits the order");
    assert.equal(event.cancellation?.status, "REQUESTED");
    faultSequence.push({ ...event, at: new Date().toISOString() });
    const completion = JSON.parse(completionMarker.slice(completionMarker.indexOf("STOCKQUANT_V15_AUTO_CANCEL_COMPLETED ") + "STOCKQUANT_V15_AUTO_CANCEL_COMPLETED ".length));
    assert.equal(completion.event, "partial_fill_authoritatively_cancelled_no_later_orders");
    assert.equal(completion.testRunId, event.testRunId);
    assert.equal(completion.cancellation?.completedOrderCount, 1);
    assert.equal(completion.cancellation?.laterSessionOrdersCreated, 0);
    assert.equal(completion.cancellation?.partialFillQuantity, 25);
    assert.equal(completion.cancellation?.remainingQuantityCancelled, 25);
    assert.equal(completion.cancellation?.reservationStatus, "RELEASED");
    assert.equal(completion.order?.status, "CANCELLED");
    faultSequence.push({ ...completion, at: new Date().toISOString() });
    const replay = JSON.parse(replayMarker.slice(replayMarker.indexOf("STOCKQUANT_V15_AUTO_CANCEL_REPLAY_CONFIRMED ") + "STOCKQUANT_V15_AUTO_CANCEL_REPLAY_CONFIRMED ".length));
    assert.equal(replay.event, "completed_run_cancel_retry_returns_original_request");
    assert.equal(replay.testRunId, event.testRunId);
    assert.equal(replay.httpStatus, 202);
    assert.deepEqual(replay.cancellation, { status: "CURRENT_ORDER_PARTIALLY_FILLED_THEN_CANCELLED", requestedAt: event.cancellation.requestedAt, cancelledOrderId: completion.order.order_id, partialFillQuantity: 25, remainingQuantityCancelled: 25, reservationStatus: "RELEASED", completedOrderCount: 1, laterSessionOrdersCreated: 0 });
    faultSequence.push({ ...replay, at: new Date().toISOString() });
  }
  if (exitCode === 0 && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
    const committed = faultSequence.find((event) => event.event === "trade_execution_terminated_after_fakebroker_commit_before_http_response");
    const recovered = faultSequence.find((event) => event.event === "temporal_retry_queried_original_order_after_trade_execution_restart");
    if (!committed || !recovered || committed.testRunId !== recovered.testRunId || committed.marker.clientOrderId !== recovered.marker.clientOrderId) throw new Error("AUTO Trade Execution restart after FakeBroker commit did not recover by querying the same original clientOrderId");
  }
  if (exitCode === 0 && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
    const recoveryRun = auditRecord.testRunIds.find((run) => run.scenario === "recovery");
    assert.ok(recoveryRun, "V1.5 recovery TestRun ID was not captured");
    const tradeLogs = compose(["logs", "--no-color", "trade-execution-service"], "pipe");
    assert.equal(tradeLogs.status, 0, "could not inspect isolated Trade Execution recovery logs");
    const injected = tradeLogs.stdout.split(/\r?\n/u).filter((line) => line.includes(recoveryRun.testRunId) && (line.includes("AUTO_RESPONSE_LOST_AFTER_FAKEBROKER_COMMIT") || line.includes("AUTO_ORIGINAL_ORDER_QUERY_UNAVAILABLE_ONCE")));
    assert.equal(injected.length, 2, `UNKNOWN recovery must record exactly the response-loss and original-query-unavailable events: ${injected.join("\n")}`);
    assert.ok(injected[0].includes("AUTO_RESPONSE_LOST_AFTER_FAKEBROKER_COMMIT") && injected[1].includes("AUTO_ORIGINAL_ORDER_QUERY_UNAVAILABLE_ONCE"), "UNKNOWN recovery fault sequence was not observed in order");
    faultSequence.push({ event: "same_run_unknown_order_recovered_by_original_client_order_query", testRunId: recoveryRun.testRunId, injectedEvents: injected.map((line) => JSON.parse(line.slice(line.indexOf("{")))), at: new Date().toISOString() });
  }
  if (exitCode === 0 && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
    const autoRun = auditRecord.testRunIds.find((run) => run.scenario === "auto-trade");
    assert.ok(autoRun, "V1.5 AUTO TestRun ID was not captured for duplicate-dispatch verification");
    const runResponse = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.5/runs/${autoRun.testRunId}`, { headers: { "x-stockquant-user": "acceptance-owner-1" } });
    assert.equal(runResponse.status, 200, "completed AUTO TestRun was not readable before duplicate dispatch");
    const runBefore = await runResponse.json();
    assert.equal(runBefore.evidence?.temporal, "COMPLETED");
    assert.equal(runBefore.evidence?.businessExecution, "AUTO_TRADE_EXECUTED");
    const replayProbe = `import { createRequire } from 'node:module';
const require = createRequire('/workspace/services/platform-api-service/package.json');
const { connect, headers } = require('nats');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const nc = await connect({ servers: 'nats://nats:4222' });
try {
  const js = nc.jetstream(); const jsm = await nc.jetstreamManager();
  const before = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
  const fixtureBytes = readFileSync('/workspace/fixtures/v1/v1.5/auto-trade-calendar-2.json');
  const fixture = JSON.parse(fixtureBytes.toString('utf8'));
  const testRunId = '${autoRun.testRunId}';
  const payload = { testRunId, ownerId: 'acceptance-owner-1', namespace: 'v1-5-auto-trade-${autoRun.testRunId}', seed: 20260907, scenarioId: 'auto-trade', sessions: fixture.sessions, fixtureVersion: fixture.fixtureVersion, fixtureSha256: createHash('sha256').update(fixtureBytes).digest('hex') };
  const h = headers(); h.set('Nats-Msg-Id', 'completed-auto-replay-${project}');
  const published = await js.publish('stockquant.v1.5.events', new TextEncoder().encode(JSON.stringify({ eventId: testRunId, payload })), { headers: h });
  let ackFloor = 0;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const info = await jsm.consumers.info('SQV15APP', 'stockquant-v15-temporal-dispatch');
    ackFloor = info.ack_floor.stream_seq;
    if (ackFloor >= published.seq) break;
    if (attempt === 119) throw new Error('completed AUTO duplicate dispatch was not acknowledged');
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  console.log(JSON.stringify({ sequence: published.seq, ackFloor, beforeAckFloor: before.ack_floor.stream_seq, eventId: testRunId }));
} finally { await nc.drain(); }`;
    const replay = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", replayProbe], "pipe");
    assert.equal(replay.status, 0, `could not publish/acknowledge the same completed AUTO TestRun dispatch: ${replay.stderr || replay.stdout}`);
    const duplicate = JSON.parse(replay.stdout.trim());
    faultSequence.push({ event: "completed_auto_workflow_dispatch_replayed", testRunId: autoRun.testRunId, sequence: duplicate.sequence, consumerAckFloor: duplicate.ackFloor, at: new Date().toISOString() });
    let alreadyStarted;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const logs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
      assert.equal(logs.status, 0, "could not inspect AUTO duplicate workflow handling");
      alreadyStarted = logs.stdout.split(/\r?\n/u).find((line) => line.includes(`STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED`) && line.includes(`eventId=${autoRun.testRunId}`));
      if (alreadyStarted) break;
      await delay(250);
    }
    assert.ok(alreadyStarted, "duplicate AUTO dispatch did not converge on the existing stable Temporal Workflow ID");
    const initialLedgerVersions = Object.fromEntries(runBefore.evidence.orders.map((item) => [item.market, { ledgerEntryCount: item.reconciliation.portfolio.ledgerEntryCount, ledgerVersion: item.reconciliation.portfolio.ledgerVersion }]));
    const recheckProbe = `const ownerId='acceptance-owner-1'; const runId='${autoRun.testRunId}'; const namespace='v1-5-auto-trade-${autoRun.testRunId}';
const bearer='Bearer '+process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API;
const headers={'authorization':bearer,'x-stockquant-service-id':'platform-api-service','x-stockquant-owner-id':ownerId};
async function get(url, extra={}) { const response=await fetch(url,{headers:{...headers,...extra}}); const body=await response.json(); if(!response.ok) throw new Error('read failed '+response.status+' '+JSON.stringify(body)); return body; }
const summary=await get('http://trade-execution-service:3005/internal/v1/reconciliation/summary?namespace='+encodeURIComponent(namespace));
const accounts={CN_A:'${runBefore.evidence.accountIds.CN_A}',US_EQUITY:'${runBefore.evidence.accountIds.US_EQUITY}'};
const initialLedgers=${JSON.stringify(initialLedgerVersions)};
const expected={CN_A:{currency:'CNY',cash:'8990',security:'600000.SH',quantity:100,consumed:'505.00'},US_EQUITY:{currency:'USD',cash:'9749.9',security:'AAPL',quantity:10,consumed:'125.05'}};
const canonical=(value)=>String(value).replace(/(\\.\\d*?[1-9])0+$|\\.0+$/u,'$1');
const byMarket={};
const budgetRefs=${JSON.stringify(runBefore.evidence.orders.map((item) => ({ market: item.market, sessionSequence: item.sessionSequence, mandateId: item.mandate.mandateId })))};
for(const market of ['CN_A','US_EQUITY']) {
  const account=await get('http://portfolio-risk-service:3001/internal/v1/accounts/'+accounts[market]+'/snapshot',{ 'x-stockquant-owner-id':ownerId });
  const want=expected[market];
  if(account.ownerId!==ownerId||account.testRunId!==runId||account.namespace!==namespace||account.market!==market||account.environmentMode!=='PAPER'||account.brokerMode!=='FAKE'||account.cash.currency!==want.currency||canonical(account.cash.amount)!==want.cash||JSON.stringify(account.positions)!==JSON.stringify([{security:want.security,quantity:want.quantity}])) throw new Error(market+' Portfolio facts changed after duplicate dispatch: '+JSON.stringify(account));
  const budgets=[];
  for(const reference of budgetRefs.filter((item)=>item.market===market)) {
    const budget=await get('http://decision-governance-service:3007/internal/v1/auto-mandates/'+reference.mandateId+'/runs/'+runId+'/versions/1/budget');
    if(budget.ownerId!==ownerId||budget.testRunId!==runId||budget.consumedAmount!==want.consumed||budget.reservedAmount!=='0.00'||budget.releasedAmount!=='0.00'||budget.reservationCount!==1||budget.consumedCount!==1||budget.releasedCount!==0) throw new Error(market+' session '+reference.sessionSequence+' Mandate budget changed after duplicate dispatch: '+JSON.stringify(budget));
    budgets.push({sessionSequence:reference.sessionSequence,...budget});
  }
  if(account.ledgerEntryCount!==initialLedgers[market].ledgerEntryCount||account.ledgerVersion!==initialLedgers[market].ledgerVersion) throw new Error(market+' Portfolio ledger counters changed after duplicate dispatch: '+JSON.stringify(account));
  byMarket[market]={portfolio:{cash:account.cash,positions:account.positions,ledgerEntryCount:account.ledgerEntryCount,ledgerVersion:account.ledgerVersion},budgets};
}
if(summary.namespace!==namespace||summary.order_count!==4||summary.fill_count!==4||summary.unresolved_order_count!==0||summary.pending_outbox_count!==0||summary.externalOnlyOrderCount!==0) throw new Error('FakeBroker facts changed after duplicate dispatch: '+JSON.stringify(summary));
console.log(JSON.stringify({summary,byMarket}));`;
    const businessReads = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", recheckProbe], "pipe");
    assert.equal(businessReads.status, 0, `could not independently re-read business ledgers after duplicate AUTO dispatch: ${businessReads.stderr || businessReads.stdout}`);
    const readback = JSON.parse(businessReads.stdout.trim());
    assert.equal(readback.summary.order_count, 4);
    assert.equal(readback.summary.fill_count, 4);
    for (const item of Object.values(readback.byMarket)) {
      assert.equal(item.budgets.length, 2);
      for (const budget of item.budgets) {
        assert.equal(budget.reservationCount, 1);
        assert.equal(budget.consumedCount, 1);
      }
    }
    faultSequence.push({ event: "duplicate_auto_dispatch_left_budget_orders_fills_portfolio_ledgers_unchanged", testRunId: autoRun.testRunId, summary: readback.summary, byMarket: readback.byMarket, existingWorkflowMarker: alreadyStarted.trim(), at: new Date().toISOString() });
  }
  auditRecord.browserExitCode = exitCode;
  if (exitCode === 0 && !temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode) {
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
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode && (!faultSequence.some((event) => event.event === "malformed_and_wrong_owner_terminated_then_jetstream_redelivered_unacked_duplicate") || !faultSequence.some((event) => event.event === "workflow_completed_after_nats_restore"))) throw new Error("NATS outage, Platform restart, malformed/wrong-owner termination, lost-ACK redelivery and post-recovery workflow completion were not fully observed");
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode && exitCode === 0 && !faultSequence.some((event) => event.event === "temporal_retry_run_completed_and_message_acknowledged")) throw new Error("transient Temporal retry and recovery were not fully observed");
  if (!temporalOutageMode && !networkOutageMode && !databaseRetryMode && !databaseOutageMode && !databaseConnectionDropMode && !multiWorkerMode && !workerFailoverMode && !tradeWorkerFailureMode && !backupRestoreMode && !autoCancelMode && exitCode === 0 && !faultSequence.some((event) => event.event === "original_outbox_message_acknowledged_after_relay_recovery")) throw new Error("original Outbox event was not acknowledged after Relay recovery");
  if (temporalOutageMode && (!faultSequence.some((event) => event.event === "actual_temporal_server_outage_caused_dispatch_nak") || !faultSequence.some((event) => event.event === "same_temporal_server_restarted_and_accepting_connections"))) throw new Error("actual Temporal server outage and restart were not both observed");
  if (networkOutageMode && (!faultSequence.some((event) => event.event === "isolated_platform_network_disconnected_during_run") || !faultSequence.some((event) => event.event === "isolated_platform_network_reconnected_and_api_ready"))) throw new Error("isolated Platform network outage and recovery were not both observed");
  if (tradeDoubleFailureMode && (!faultSequence.some((event) => event.event === "both_trade_execution_instances_terminated_after_fakebroker_commit_before_http_response") || !faultSequence.some((event) => event.event === "both_trade_execution_instances_unavailable_during_fixed_recovery_window") || !faultSequence.some((event) => event.event === "trade_execution_worker_restarted_and_ready_after_double_instance_outage") || !faultSequence.some((event) => event.event === "temporal_retried_same_auto_command_after_double_instance_outage_and_read_original_order"))) throw new Error("both Trade Execution instances were not observed down and recovered from the exact committed AUTO command");
  if (tradeAndDatabaseFailureMode && (!faultSequence.some((event) => event.event === "both_trade_instances_and_postgres_terminated_after_fakebroker_commit_before_http_response") || !faultSequence.some((event) => event.event === "same_postgres_container_and_volume_restarted_and_ready_after_combined_outage") || !faultSequence.some((event) => event.event === "trade_instance_restarted_and_ready_after_combined_outage") || !faultSequence.some((event) => event.event === "temporal_retried_same_auto_command_after_combined_trade_database_outage_and_read_original_order"))) throw new Error("both Trade instances and PostgreSQL were not observed down and recovered from the exact committed AUTO command");
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
    const autoRunId = auditRecord.testRunIds.find((run) => run.scenario === "auto-trade")?.testRunId;
    assert.ok(autoRunId, "AUTO TestRun ID was not captured for paired backup/restore");
    const autoRunResponse = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.5/runs/${autoRunId}`, { headers: { "x-stockquant-user": "acceptance-owner-1" } });
    assert.equal(autoRunResponse.status, 200, "AUTO TestRun was not readable before paired backup");
    const autoRunBefore = await autoRunResponse.json();
    assert.equal(autoRunBefore.evidence?.businessExecution, "AUTO_TRADE_EXECUTED");
    assert.equal(autoRunBefore.evidence?.workflowCompletionReconciliation?.status, "MATCH");
    assert.equal(autoRunBefore.evidence?.orders?.length, 4, "AUTO Run must contain all four CN/US session orders before backup");
    const autoNamespace = `v1-5-auto-trade-${autoRunId}`;
    const autoBusinessProbe = `const ownerId='acceptance-owner-1'; const runId='${autoRunId}'; const namespace='${autoNamespace}';
const bearer='Bearer '+process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API;
const headers={'authorization':bearer,'x-stockquant-service-id':'platform-api-service','x-stockquant-owner-id':ownerId};
async function get(url, extra={}) { const response=await fetch(url,{headers:{...headers,...extra}}); const body=await response.json(); if(!response.ok) throw new Error('read failed '+response.status+' '+JSON.stringify(body)); return body; }
const summary=await get('http://trade-execution-service:3005/internal/v1/reconciliation/summary?namespace='+encodeURIComponent(namespace));
const accounts=${JSON.stringify(autoRunBefore.evidence.accountIds)};
const portfolio={}; const budgets=[];
for(const market of ['CN_A','US_EQUITY']) { const account=await get('http://portfolio-risk-service:3001/internal/v1/accounts/'+accounts[market]+'/snapshot',{'x-stockquant-owner-id':ownerId}); if(account.ownerId!==ownerId||account.testRunId!==runId||account.namespace!==namespace||account.market!==market||account.environmentMode!=='PAPER'||account.brokerMode!=='FAKE') throw new Error('wrong scoped Portfolio state '+JSON.stringify(account)); portfolio[market]=account; }
for(const item of ${JSON.stringify(autoRunBefore.evidence.orders.map((order) => ({ market: order.market, sessionSequence: order.sessionSequence, mandateId: order.mandate.mandateId })))} ) { const budget=await get('http://decision-governance-service:3007/internal/v1/auto-mandates/'+item.mandateId+'/runs/'+runId+'/versions/1/budget'); if(budget.ownerId!==ownerId||budget.testRunId!==runId||budget.reservationCount!==1||budget.consumedCount!==1||budget.releasedCount!==0||budget.reservedAmount!=='0.00'||budget.releasedAmount!=='0.00') throw new Error('wrong scoped AUTO mandate budget '+JSON.stringify(budget)); budgets.push({market:item.market,sessionSequence:item.sessionSequence,...budget}); }
if(summary.namespace!==namespace||summary.order_count!==4||summary.fill_count!==4||summary.unresolved_order_count!==0||summary.pending_outbox_count!==0||summary.externalOnlyOrderCount!==0) throw new Error('unexpected FakeBroker summary '+JSON.stringify(summary));
console.log(JSON.stringify({summary,portfolio,budgets}));`;
    const autoBusinessBeforeResult = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", autoBusinessProbe], "pipe");
    assert.equal(autoBusinessBeforeResult.status, 0, `could not independently read AUTO business state before backup: ${autoBusinessBeforeResult.stderr || autoBusinessBeforeResult.stdout}`);
    const autoBusinessBefore = JSON.parse(autoBusinessBeforeResult.stdout.trim());
    assert.equal(autoBusinessBefore.budgets.length, 4);
    const autoWorkflowId = `v15-auto-trade-${autoRunId}`;
    const autoTemporalBefore = compose(["exec", "-T", "temporal", "temporal", "workflow", "describe", "--workflow-id", autoWorkflowId]);
    assert.equal(autoTemporalBefore.status, 0, `completed AUTO Temporal history was unavailable before backup: ${autoTemporalBefore.stderr || autoTemporalBefore.stdout}`);
    const autoNatsBeforeCode = `import { createRequire } from 'node:module'; const require=createRequire('/workspace/services/platform-api-service/package.json'); const {connect}=require('nats'); const nc=await connect({servers:'nats://nats:4222'}); try { const jsm=await nc.jetstreamManager(); const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); console.log(JSON.stringify({ackFloor:info.ack_floor.stream_seq,delivered:info.delivered.stream_seq})); } finally { await nc.drain(); }`;
    const autoNatsBeforeResult = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", autoNatsBeforeCode], "pipe");
    assert.equal(autoNatsBeforeResult.status, 0, `could not read JetStream consumer state before backup: ${autoNatsBeforeResult.stderr || autoNatsBeforeResult.stdout}`);
    const autoNatsBefore = JSON.parse(autoNatsBeforeResult.stdout.trim());
    const listedVolumes = dockerChecked(["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]).split(/\r?\n/u).filter(Boolean);
    const sourceVolumes = new Map();
    for (const volume of listedVolumes) {
      const info = JSON.parse(dockerChecked(["volume", "inspect", volume]))[0];
      const logical = info.Labels?.["com.docker.compose.volume"];
      if (["v14-integration-postgres", "nats-jetstream", "temporal-dev-state", "research-artifacts-v1"].includes(logical)) sourceVolumes.set(logical, volume);
    }
    const requiredVolumes = ["v14-integration-postgres", "nats-jetstream", "temporal-dev-state", "research-artifacts-v1"];
    assert.deepEqual([...sourceVolumes.keys()].sort(), [...requiredVolumes].sort(), "isolated V1.5 stack did not expose PostgreSQL, JetStream, Temporal, and Artifact persistent volumes");
    const postgresContainer = compose(["ps", "-q", "postgres"], "pipe").stdout.trim();
    assert.ok(postgresContainer, "isolated PostgreSQL container is missing before backup");
    const postgresImage = dockerChecked(["inspect", "--format", "{{.Image}}", postgresContainer]);
    assert.match(postgresImage, /^sha256:[a-f0-9]{64}$/u, "PostgreSQL backup helper must use the exact running image ID");
    const artifactNamespace = `research/v15/${normalRunId}/outputs`;
    const artifactId = "paired-restore-run.log";
    const artifactBytes = Buffer.from(`synthetic paired V1.5 restore artifact for ${normalRunId}\n`);
    const artifactSha256 = createHash("sha256").update(artifactBytes).digest("hex");
    const artifactRelativePath = `${artifactNamespace}/${artifactSha256}/${artifactId}`;
    const artifactSeed = spawnSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--cap-add", "DAC_READ_SEARCH", "--cap-add", "DAC_OVERRIDE", "--cap-add", "CHOWN", "--security-opt", "no-new-privileges", "--mount", `type=volume,src=${sourceVolumes.get("research-artifacts-v1")},dst=/data`, "--entrypoint", "sh", postgresImage, "-ec", `mkdir -p '/data/${artifactNamespace}/${artifactSha256}' && printf '%s' '${artifactBytes.toString("base64")}' | base64 -d > '/data/${artifactRelativePath}' && test "$(sha256sum '/data/${artifactRelativePath}' | cut -d ' ' -f 1)" = '${artifactSha256}'`], { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
    assert.equal(artifactSeed.status, 0, `could not seed a content-addressed Artifact in the isolated volume: ${artifactSeed.stderr || artifactSeed.stdout}`);
    const artifactRefSql = `CREATE TABLE IF NOT EXISTS research_artifact_refs (schema_version TEXT NOT NULL,namespace TEXT NOT NULL,artifact_id TEXT NOT NULL,kind TEXT NOT NULL,sha256 TEXT NOT NULL,status TEXT NOT NULL,source_ref TEXT NOT NULL,expires_at TIMESTAMPTZ,created_at TIMESTAMPTZ NOT NULL DEFAULT now(),updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),PRIMARY KEY(namespace,artifact_id)); INSERT INTO research_artifact_refs(schema_version,namespace,artifact_id,kind,sha256,status,source_ref) VALUES ('v3.1-artifact-ref-v1','${artifactNamespace}','${artifactId}','RUN_LOG','${artifactSha256}','PUBLISHED','v1.5-paired-backup:${normalRunId}')`;
    const artifactRefSeed = compose(["exec", "-T", "postgres", "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "research_automation", "-c", artifactRefSql], "pipe");
    assert.equal(artifactRefSeed.status, 0, `could not seed the contract-shaped published ArtifactRef: ${artifactRefSeed.stderr || artifactRefSeed.stdout}`);

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
    const override = Object.fromEntries(requiredVolumes.map((logical) => [logical, restoreVolumes.get(logical)]));
    writeFileSync(overridePath, `volumes:\n${requiredVolumes.map((logical) => `  ${logical}:\n    name: ${override[logical]}\n`).join("")}`, { mode: 0o600 });
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
    const autoCli = spawnSync("pnpm", ["verify:stage", "--", "--stage", "V1.5", "--run", autoRunId, "--check-only"], { cwd: process.cwd(), env, encoding: "utf8", stdio: "pipe", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
    assert.equal(autoCli.status, 0, `restored completed AUTO check-only should return success while reading its verified facts: ${autoCli.stderr || autoCli.stdout}`);
    assert.ok(`${autoCli.stdout}\n${autoCli.stderr}`.includes(autoRunId), "restored AUTO CLI did not return the requested TestRun ID");
    const restoredAutoRun = parseRunResult(autoCli.stdout);
    assert.equal(restoredAutoRun.status, "COMPLETED", "restored AUTO TestRun did not preserve its completed execution state");
    assert.ok(restoredAutoRun.assertions.length > 0 && restoredAutoRun.assertions.every((assertion) => assertion.status === "PASS"), "restored AUTO TestRun did not preserve all-PASS business assertions");
    assert.equal(autoRunBefore.evidence?.businessExecution, "AUTO_TRADE_EXECUTED");
    assert.equal(autoRunBefore.evidence?.workflowCompletionReconciliation?.status, "MATCH");
    assert.equal(autoRunBefore.evidence?.orders?.length, 4);
    const autoBusinessAfterResult = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", autoBusinessProbe]);
    assert.equal(autoBusinessAfterResult.status, 0, `could not independently read restored AUTO business state: ${autoBusinessAfterResult.stderr || autoBusinessAfterResult.stdout}`);
    const autoBusinessAfter = JSON.parse(autoBusinessAfterResult.stdout.trim());
    assert.deepEqual(autoBusinessAfter, autoBusinessBefore, "restored FakeBroker orders/fills, Portfolio ledgers or Mandate budgets differ from the pre-backup state");
    const restoredAutoTemporal = composeWithFiles(restoreFiles, ["exec", "-T", "temporal", "temporal", "workflow", "describe", "--workflow-id", autoWorkflowId]);
    assert.equal(restoredAutoTemporal.status, 0, `restored AUTO Temporal history could not be read for ${autoWorkflowId}: ${restoredAutoTemporal.stderr || restoredAutoTemporal.stdout}`);
    const autoNatsAfterResult = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", autoNatsBeforeCode]);
    assert.equal(autoNatsAfterResult.status, 0, `restored JetStream state could not be read: ${autoNatsAfterResult.stderr || autoNatsAfterResult.stdout}`);
    const autoNatsAfter = JSON.parse(autoNatsAfterResult.stdout.trim());
    assert.deepEqual(autoNatsAfter, autoNatsBefore, "restored AUTO dispatch acknowledgement state changed before any replay");
    const fixtureBytes = readFileSync("fixtures/v1/v1.5/auto-trade-calendar-2.json");
    const fixture = JSON.parse(fixtureBytes.toString("utf8"));
    const replayPayload = { eventId: autoRunId, payload: { testRunId: autoRunId, ownerId: "acceptance-owner-1", namespace: autoNamespace, seed: 20260907, scenarioId: "auto-trade", sessions: fixture.sessions, fixtureVersion: fixture.fixtureVersion, fixtureSha256: createHash("sha256").update(fixtureBytes).digest("hex") } };
    const duplicateReplayCode = `import { createRequire } from 'node:module'; const require=createRequire('/workspace/services/platform-api-service/package.json'); const {connect,headers}=require('nats'); const nc=await connect({servers:'nats://nats:4222'}); try { const js=nc.jetstream(); const h=headers(); h.set('Nats-Msg-Id','restored-auto-replay-${project}'); const ack=await js.publish('stockquant.v1.5.events',new TextEncoder().encode(JSON.stringify(${JSON.stringify(replayPayload)})),{headers:h}); const jsm=await nc.jetstreamManager(); let info; for(let i=0;i<120;i++){ info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); if(info.ack_floor.stream_seq>=ack.seq) break; await new Promise(r=>setTimeout(r,250)); } if(!info||info.ack_floor.stream_seq<ack.seq) throw new Error('restored duplicate dispatch was not acknowledged'); console.log(JSON.stringify({sequence:ack.seq,ackFloor:info.ack_floor.stream_seq})); } finally { await nc.drain(); }`;
    const duplicateReplay = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", duplicateReplayCode]);
    assert.equal(duplicateReplay.status, 0, `restored AUTO duplicate dispatch did not ACK: ${duplicateReplay.stderr || duplicateReplay.stdout}`);
    let duplicateWorkflowMarker;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const logs = composeWithFiles(restoreFiles, ["logs", "--no-color", "platform-api-service"]);
      assert.equal(logs.status, 0, "could not inspect restored duplicate AUTO workflow handling");
      duplicateWorkflowMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED") && line.includes(`eventId=${autoRunId}`));
      if (duplicateWorkflowMarker) break;
      await delay(250);
    }
    assert.ok(duplicateWorkflowMarker, "restored duplicate AUTO dispatch did not reuse the original stable Temporal Workflow ID");
    const autoBusinessAfterReplayResult = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", autoBusinessProbe]);
    assert.equal(autoBusinessAfterReplayResult.status, 0, `could not read AUTO business state after restored duplicate replay: ${autoBusinessAfterReplayResult.stderr || autoBusinessAfterReplayResult.stdout}`);
    const autoBusinessAfterReplay = JSON.parse(autoBusinessAfterReplayResult.stdout.trim());
    assert.deepEqual(autoBusinessAfterReplay, autoBusinessBefore, "restored duplicate AUTO dispatch changed business ledgers or budget consumption");
    const temporalWorkflowId = `v15-no-trade-${normalRunId}`;
    const temporal = composeWithFiles(restoreFiles, ["exec", "-T", "temporal", "temporal", "workflow", "describe", "--workflow-id", temporalWorkflowId]);
    assert.equal(temporal.status, 0, `restored Temporal history could not be read for ${temporalWorkflowId}: ${temporal.stderr || temporal.stdout}`);
    const natsProbe = `import { createRequire } from 'node:module'; const require=createRequire('/workspace/services/platform-api-service/package.json'); const {connect}=require('nats'); const nc=await connect({servers:'nats://nats:4222'}); try { const jsm=await nc.jetstreamManager(); const info=await jsm.consumers.info('SQV15APP','stockquant-v15-temporal-dispatch'); const result={ackFloor:info.ack_floor.stream_seq,delivered:info.delivered.stream_seq}; console.log(JSON.stringify(result)); if(result.ackFloor<1||result.delivered<1) throw new Error('restored JetStream consumer state is incomplete'); } finally { await nc.drain(); }`;
    const nats = composeWithFiles(restoreFiles, ["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", natsProbe]);
    assert.equal(nats.status, 0, `restored JetStream stream/consumer state could not be read: ${nats.stderr || nats.stdout}`);
    const artifactRefProbe = composeWithFiles(restoreFiles, ["exec", "-T", "postgres", "psql", "-X", "-A", "-t", "-U", "postgres", "-d", "research_automation", "-c", `SELECT json_build_object('namespace',namespace,'artifactId',artifact_id,'sha256',sha256,'status',status,'sourceRef',source_ref)::text FROM research_artifact_refs WHERE namespace='${artifactNamespace}' AND artifact_id='${artifactId}'`]);
    assert.equal(artifactRefProbe.status, 0, `restored ArtifactRef could not be read: ${artifactRefProbe.stderr || artifactRefProbe.stdout}`);
    const restoredArtifactRef = JSON.parse(artifactRefProbe.stdout.trim());
    assert.deepEqual(restoredArtifactRef, { namespace: artifactNamespace, artifactId, sha256: artifactSha256, status: "PUBLISHED", sourceRef: `v1.5-paired-backup:${normalRunId}` });
    const artifactHashProbe = spawnSync("docker", ["run", "--rm", "--network", "none", "--read-only", "--cap-drop", "ALL", "--cap-add", "DAC_READ_SEARCH", "--security-opt", "no-new-privileges", "--mount", `type=volume,src=${restoreVolumes.get("research-artifacts-v1")},dst=/data,readonly`, "--entrypoint", "sh", postgresImage, "-ec", `sha256sum '/data/${artifactRelativePath}'`], { env, encoding: "utf8", stdio: "pipe", maxBuffer: 8 * 1024 * 1024 });
    assert.equal(artifactHashProbe.status, 0, `restored Artifact bytes could not be read: ${artifactHashProbe.stderr || artifactHashProbe.stdout}`);
    const restoredArtifactSha256 = artifactHashProbe.stdout.trim().split(/\s+/u)[0];
    assert.equal(restoredArtifactSha256, artifactSha256, "restored Artifact bytes do not match the preserved ArtifactRef SHA-256");
    const cleanupRestored = composeWithFiles(restoreFiles, ["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
    assert.equal(cleanupRestored.status, 0, `could not remove the isolated restored stack: ${cleanupRestored.stderr || cleanupRestored.stdout}`);
    const remainingRestoreVolumes = spawnSync("docker", ["volume", "ls", "-q"], { encoding: "utf8" }).stdout.split(/\r?\n/u).filter((name) => [...restoreVolumes.values()].includes(name));
    assert.deepEqual(remainingRestoreVolumes, [], "restored test volumes remain after exact project cleanup");
    faultSequence.push({ event: "isolated_v1_postgres_nats_temporal_artifact_volumes_restored_with_auto_business_facts_and_idempotent_resume", testRunId: normalRunId, autoTradeTestRunId: autoRunId, snapshots, restoredRunCheckExitCode: cli.status, restoredRunStatus: restoredRun.status, restoredHoldAssertion: holdAssertion, restoredAutoRunCheckExitCode: autoCli.status, restoredAutoBusinessExecution: autoRunBefore.evidence.businessExecution, restoredAutoOrderCount: autoBusinessAfter.summary.order_count, restoredAutoFillCount: autoBusinessAfter.summary.fill_count, portfolioAccounts: autoBusinessAfter.portfolio, mandateBudgets: autoBusinessAfter.budgets, businessStateUnchangedAfterRestore: true, autoWorkflowId, autoTemporalDescribeExcerpt: restoredAutoTemporal.stdout.slice(0, 1200), restoredJetStreamBefore: autoNatsBefore, restoredJetStreamAfter: autoNatsAfter, duplicateAutoReplay: JSON.parse(duplicateReplay.stdout.trim()), duplicateWorkflowMarker: duplicateWorkflowMarker.trim(), businessStateUnchangedAfterDuplicateReplay: true, temporalWorkflowId, temporalDescribeExcerpt: temporal.stdout.slice(0, 1200), restoredJetStream: JSON.parse(nats.stdout.trim()), artifactRef: restoredArtifactRef, restoredArtifactSha256, artifactBytesAreSynthetic: true, restoredVolumeCleanupVerified: true, at: new Date().toISOString() });
  }
  assert.equal(exitCode, 0, "isolated V1.5 Web/API/CLI/evidence E2E failed");
} catch (error) {
  auditRecord.failureReason = error instanceof Error ? error.message : String(error);
  console.error(auditRecord.failureReason);
  exitCode = 1;
} finally {
  if (started) {
    if (exitCode !== 0) {
      const failureLogs = compose(["logs", "--no-color", "platform-api-service"], "pipe");
      auditRecord.platformApiLogs = failureLogs.stdout || failureLogs.stderr || "platform API logs unavailable";
    }
    if (secondaryWorkerName) spawnSync("docker", ["rm", "--force", secondaryWorkerName], { encoding: "utf8" });
    if (secondaryTradeName) spawnSync("docker", ["rm", "--force", secondaryTradeName], { encoding: "utf8" });
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
  if (preserveRunExports && exitCode === 0) {
    const exportedRuns = join(evidenceRoot, "evidence/local/V1.5");
    const retainedRuns = [];
    if (readdirSync(evidenceRoot, { withFileTypes: true }).some((entry) => entry.isDirectory() && entry.name === "evidence")) {
      const destination = resolve("evidence/local/V1.5");
      mkdirSync(destination, { recursive: true });
      for (const entry of readdirSync(exportedRuns, { withFileTypes: true })) {
        if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/iu.test(entry.name)) continue;
        const target = join(destination, entry.name);
        assert.throws(() => statSync(target), { code: "ENOENT" }, `refusing to overwrite retained evidence ${target}`);
        cpSync(join(exportedRuns, entry.name), target, { recursive: true, errorOnExist: true, force: false });
        retainedRuns.push(entry.name);
      }
    }
    auditRecord.retainedRunExports = retainedRuns;
  }
  rmSync(evidenceRoot, { recursive: true, force: true });
  auditRecord.status = exitCode === 0 ? "PASS" : "FAIL";
  auditRecord.exactProjectResourcesRemoved = resourcesRemoved;
  const runDate = new Date().toISOString().slice(0, 10);
  const auditKind = temporalOutageMode ? "temporal-server-outage" : networkOutageMode ? "network-outage" : databaseRetryMode ? "database-retry" : databaseOutageMode ? "database-outage" : databaseConnectionDropMode ? "database-connection-drop" : tradeAndDatabaseFailureMode ? "trade-database-combined-failure" : tradeDoubleFailureMode ? "trade-double-failure" : tradeFailoverMode ? "trade-worker-failover" : autoCancelMode ? "auto-trade-cancellation" : workerFailoverMode ? "worker-failover" : multiWorkerMode ? "multiworker" : backupRestoreMode ? "paired-backup-restore" : "nats-temporal-dispatch";
  const auditFilename = `${runDate}-v15-${auditKind}-${project}.json`;
  const auditPath = `evidence/audits/${auditFilename}`;
  auditRecord.evidencePath = auditPath;
  const auditContents = `${JSON.stringify(auditRecord, null, 2)}\n`;
  const written = writeUniqueEvidence("evidence/audits", auditFilename, auditContents);
  const auditSha256 = written.sha256;
  console.log(JSON.stringify({ status: exitCode === 0 ? "PASS" : "FAIL", isolatedProject: project, stage: "V1.5", evidencePath: auditPath, evidenceSha256: auditSha256, e2e: exitCode === 0 ? "normal NO_TRADE, isolated auto-trade, rejection and recovery scenarios executed; only assertions recorded in the run are claimed" : "NOT_PASSED", externalSourceCalls: 0, realBrokerCalls: 0, exactProjectResourcesRemoved: resourcesRemoved }));
}

process.exit(exitCode);
