import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const platformRequire = createRequire(resolve("services/platform-api-service/package.json"));
const { Client, Pool } = platformRequire("pg");
const { Module } = platformRequire("@nestjs/common");
const { NestFactory } = platformRequire("@nestjs/core");

const adminUrl = new URL(process.env.V33_DISPATCH_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
if (adminUrl.hostname !== "127.0.0.1" || adminUrl.username !== "postgres" || adminUrl.pathname !== "/postgres") throw new Error("V3.3 dispatch smoke requires its isolated local PostgreSQL admin URL");
const suffix = randomUUID().replaceAll("-", "");
const researchDatabase = `stockquant_v33_ra_${suffix}`;
const platformDatabase = `stockquant_v33_platform_${suffix}`;
const databaseUrl = (name) => { const url = new URL(adminUrl); url.pathname = `/${name}`; return url.toString(); };
const platformToken = randomBytes(48).toString("base64url");
const runnerToken = randomBytes(48).toString("base64url");
const runnerDigest = process.env.STOCKQUANT_RUNNER_IMAGE_DIGEST ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
if (!/^sha256:[a-f0-9]{64}$/u.test(runnerDigest)) throw new Error("V3.3 dispatch smoke requires an immutable Runner image digest");
const ownerId = `v33-cross-service-${randomUUID()}`;
const artifactRoot = await mkdtemp(join(tmpdir(), "stockquant-v33-dispatch-artifacts-"));
const servicePort = await new Promise((resolvePort, reject) => {
  const server = createNetServer(); server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((error) => error ? reject(error) : resolvePort(port)); });
});
const researchBase = `http://127.0.0.1:${servicePort}`;
const admin = new Client({ connectionString: adminUrl.toString() });
let researchService;
let runnerHost;
let researchOutput = "";
let runnerHostOutput = "";
let researchPool;
let platformPool;
let platformApp;
let createdResearch = false;
let createdPlatform = false;

async function waitForResearch() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (researchService.exitCode !== null) throw new Error(`Research Automation exited before ready: ${researchOutput}`);
    try { if ((await fetch(`${researchBase}/ready`, { signal: AbortSignal.timeout(500) })).ok) return; } catch { /* isolated service is starting */ }
    await delay(50);
  }
  throw new Error(`Research Automation did not become ready: ${researchOutput}`);
}

async function requestPlatform(path, body, expectedStatus = 201) {
  const response = await fetch(`http://127.0.0.1:${platformApp.getHttpServer().address().port}${path}`, {
    method: "POST", headers: { cookie: `sq_session=${ownerId}`, "content-type": "application/json" },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json();
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

async function exportV33Run(testRunId) {
  const apiUrl = `http://127.0.0.1:${platformApp.getHttpServer().address().port}`;
  const child = spawn(process.execPath, [resolve("scripts/evidence-export.mjs"), "--stage", "V3.3", "--run", testRunId], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp",
      STOCKQUANT_PLATFORM_API_URL: apiUrl,
      STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${ownerId}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  let timeout;
  const exit = await Promise.race([
    new Promise((resolveExit, reject) => {
      child.once("error", reject);
      child.once("close", (code, signal) => resolveExit({ code, signal }));
    }),
    new Promise((_, reject) => { timeout = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`V3.3 evidence export timed out for ${testRunId}`)); }, 30000); }),
  ]).finally(() => clearTimeout(timeout));
  assert.equal(exit.code, 0, `V3.3 evidence export failed for ${testRunId}: ${stderr || stdout}`);
  const result = JSON.parse(stdout);
  assert.equal(result.stageId, "V3.3");
  assert.equal(result.kind, "V3.3_BUSINESS_TEST_RUN");
  assert.ok(result.outputDirectory.endsWith(`/evidence/local/V3.3/${testRunId}`));
  return result;
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${researchDatabase}"`); createdResearch = true;
  await admin.query(`CREATE DATABASE "${platformDatabase}"`); createdPlatform = true;
  researchPool = new Pool({ connectionString: databaseUrl(researchDatabase) });
  platformPool = new Pool({ connectionString: databaseUrl(platformDatabase) });

  researchService = spawn(process.execPath, [resolve("services/research-automation-service/dist/bootstrap/main.js")], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test",
      STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(servicePort), STOCKQUANT_DATABASE_URL: databaseUrl(researchDatabase),
      STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE",
      STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
      STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true", STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
      STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
      STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [researchService.stdout, researchService.stderr]) stream.on("data", (chunk) => { if (researchOutput.length < 12000) researchOutput += chunk.toString().slice(0, 12000 - researchOutput.length); });
  await waitForResearch();

  process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER = ownerId;
  process.env.STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST = runnerDigest;
  const [{ V33AcceptanceController, PlatformContainer }, { PostgresStageRunRepository }] = await Promise.all([
    import("../services/platform-api-service/dist/bootstrap/app.module.js"),
    import("../services/platform-api-service/dist/adapters/postgres-stage-run-repository.js"),
  ]);
  const stageRuns = new PostgresStageRunRepository(platformPool);
  await stageRuns.migrate();
  const platformContainer = {
    stageRuns, researchAutomationUrl: researchBase, portfolioToken: platformToken,
    schedulerClock: { now: () => new Date("2026-10-06T00:00:00.000Z") },
    scheduler: { status: () => ({ status: "STOPPED", samplingIntervalMinutes: 30, lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" }) },
    v24Observation: { observationSummary: async () => ({ targetDays: 20, countedDays: 8, recordedCountedDays: 8, unverifiedCountedDays: 0, remainingDays: 12, status: "WAITING", dates: [] }) },
  };
  class DispatchSmokeModule {}
  Module({ controllers: [V33AcceptanceController], providers: [{ provide: PlatformContainer, useValue: platformContainer }] })(DispatchSmokeModule);
  platformApp = await NestFactory.create(DispatchSmokeModule, { logger: false });
  await platformApp.listen(0, "127.0.0.1");

  const created = await requestPlatform("/api/v1/acceptance/v3/v3.3/runs", { scenarioId: "normal", seed: 20260907 }, 202);
  const runId = created.testRunId;
  assert.match(runId, /^[0-9a-f-]{36}$/u);
  assert.equal(created.status, "WAITING");
  const reserved = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${runId}/experiment`, {
    schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT",
  });
  assert.equal(reserved.status, "WAITING");
  assert.equal(reserved.experiment.testRunId, runId);
  assert.equal(reserved.experiment.rounds, 2);
  assert.equal(reserved.experiment.budget.status, "RESERVED");
  const dispatched = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${runId}/dispatch`, {
    schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER",
  });
  assert.equal(dispatched.testRunId, runId);
  assert.equal(dispatched.status, "RUNNING");
  assert.equal(dispatched.workflowStep, "RUNNER_JOBS_QUEUED");
  assert.equal(dispatched.runnerJobsCreated, 2);
  assert.equal(dispatched.externalModelCalls, 0);
  assert.deepEqual(dispatched.rounds.map((row) => row.roundIndex), [1, 2]);

  const jobs = await researchPool.query("SELECT job_id,job,status FROM research_runner_jobs WHERE job->>'testRunId'=$1 ORDER BY job->>'roundIndex'", [runId]);
  assert.equal(jobs.rowCount, 2);
  assert.deepEqual(jobs.rows.map((row) => row.status), ["QUEUED", "QUEUED"]);
  assert.deepEqual(jobs.rows.map((row) => Number(row.job.roundIndex)), [1, 2]);
  assert.ok(jobs.rows.every((row) => row.job.networkPolicy.mode === "DENY" && row.job.imageDigest === runnerDigest));
  const modelCalls = await researchPool.query("SELECT status,requested_cents,reserved_cents,spent_cents,round_index FROM research_model_call_budgets WHERE model_run_id LIKE $1 ORDER BY round_index", [`${runId}.round-%`]);
  assert.deepEqual(modelCalls.rows, [
    { status: "SETTLED", requested_cents: 40, reserved_cents: 40, spent_cents: 23, round_index: 1 },
    { status: "SETTLED", requested_cents: 40, reserved_cents: 40, spent_cents: 23, round_index: 2 },
  ]);
  const artifacts = await researchPool.query("SELECT kind,status,sha256,namespace FROM research_artifact_refs WHERE namespace LIKE $1 ORDER BY namespace", [`research/${runId}/%/inputs`]);
  assert.equal(artifacts.rowCount, 1, "identical generated inputs should deduplicate to one immutable content-addressed artifact");
  assert.ok(artifacts.rows.every((row) => row.kind === "INPUT" && row.status === "PUBLISHED"));
  assert.equal(new Set(dispatched.rounds.map((row) => row.inputArtifact)).size, 1);

  const managedRoot = await mkdtemp(join(tmpdir(), "stockquant-v33-runner-managed-"));
  const runnerWorkerId = `v33-cross-service-${randomUUID()}`;
  runnerHost = spawn(process.execPath, [resolve("services/research-automation-service/dist/runner-host.js")], {
    cwd: process.cwd(),
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test",
      STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED", STOCKQUANT_RUNNER_HOST_API_URL: researchBase,
      STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken, STOCKQUANT_RUNNER_HOST_WORKER_ID: runnerWorkerId,
      STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: runId, STOCKQUANT_RUNNER_IMAGE_REF: runnerDigest,
      STOCKQUANT_RUNNER_MANAGED_ROOT: managedRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [runnerHost.stdout, runnerHost.stderr]) stream.on("data", (chunk) => { if (runnerHostOutput.length < 12000) runnerHostOutput += chunk.toString().slice(0, 12000 - runnerHostOutput.length); });
  try {
    let completedJobs;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (runnerHost.exitCode !== null) throw new Error(`isolated Runner Host exited early: ${runnerHostOutput}`);
      completedJobs = await researchPool.query("SELECT job_id,job,status,execution,artifact_refs FROM research_runner_jobs WHERE job->>'testRunId'=$1 ORDER BY job->>'roundIndex'", [runId]);
      if (completedJobs.rowCount === 2 && completedJobs.rows.every((row) => row.status === "COMPLETED")) break;
      if (completedJobs.rows.some((row) => ["FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED", "CANCELLED"].includes(row.status))) throw new Error(`isolated Runner Host job failed: ${JSON.stringify(completedJobs.rows)}; ${runnerHostOutput}`);
      await delay(250);
    }
    assert.ok(completedJobs?.rows.every((row) => row.status === "COMPLETED"), `isolated Runner Host did not complete both rounds: ${runnerHostOutput}`);
    assert.ok(completedJobs.rows.every((row) => row.execution?.status === "COMPLETED" && row.execution?.exitCode === 0));
    assert.ok(completedJobs.rows.every((row) => row.artifact_refs?.length === 1 && row.artifact_refs[0].status === "PUBLISHED"));
  } finally {
    if (runnerHost.exitCode === null) {
      runnerHost.kill("SIGTERM");
      await Promise.race([new Promise((resolveExit) => runnerHost.once("close", resolveExit)), delay(3000)]);
      if (runnerHost.exitCode === null) runnerHost.kill("SIGKILL");
    }
    await rm(managedRoot, { recursive: true, force: true });
  }
  const reconciled = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${runId}/reconcile`, {
    schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS",
  });
  assert.equal(reconciled.workflowStep, "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED");
  assert.equal(reconciled.completedRounds, 2);
  assert.equal(reconciled.experimentSettlement, "VERIFIED_FIXTURE_LEDGER");
  assert.deepEqual(reconciled.settlement, { experimentId: reserved.experiment.experimentId, requestedCents: 80, settledCents: 46, modelCallCount: 2, rounds: [{ roundIndex: 1, allocatedCents: 40, settledCents: 23 }, { roundIndex: 2, allocatedCents: 40, settledCents: 23 }] });
  assert.equal(reconciled.businessValidation, "NOT_RUN");
  assert.equal(reconciled.humanAcceptance, "NOT_RUN");
  assert.ok(reconciled.rounds.every((round) => round.artifacts.length === 1 && round.artifacts[0].byteLength > 0));
  const normalVerified = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${runId}/verify-normal`, {
    schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS",
  });
  assert.equal(normalVerified.assertion.id, "V3.3_NORMAL_RESULTS_001");
  assert.equal(normalVerified.assertion.status, "PASS");
  assert.equal(normalVerified.evidence.result, "PASS");
  assert.equal(normalVerified.evidence.outputs.length, 2);
  assert.ok(normalVerified.evidence.outputs.every((output) => output.valid && output.metrics.fixtureId === "v3.1-research-small-sample-1"));
  const normalExport = await exportV33Run(runId);
  assert.equal(normalExport.attachments.length, 2);

  const histories = await stageRuns.listRunHistory(runId, ownerId);
  const persisted = await stageRuns.find(runId, ownerId);
  assert.ok(histories.length >= 6);
  assert.equal(persisted.status, "RUNNING");
  assert.equal(persisted.evidence.workflowStep, "NORMAL_ASSERTION_VERIFIED");
  assert.equal(persisted.evidence.runnerJobsCreated, 2);
  assert.equal(persisted.evidence.completedRounds.length, 2);
  assert.equal(persisted.evidence.experimentSettlement, "VERIFIED_FIXTURE_LEDGER");
  assert.equal(persisted.evidence.businessValidation, "PASS");
  const settledBudget = await researchPool.query("SELECT requested_cents,reserved_cents,spent_cents,status FROM research_budget_allocations WHERE experiment_id=$1", [reserved.experiment.experimentId]);
  assert.deepEqual(settledBudget.rows, [{ requested_cents: 80, reserved_cents: 80, spent_cents: 46, status: "SETTLED" }]);
  assert.equal(persisted.status, "RUNNING");

  const recoveryCreated = await requestPlatform("/api/v1/acceptance/v3/v3.3/runs", { scenarioId: "recovery", seed: 20260907 }, 202);
  const recoveryRunId = recoveryCreated.testRunId;
  const recoveryReserved = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${recoveryRunId}/experiment`, { schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" });
  const recoveryDispatched = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${recoveryRunId}/dispatch`, { schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" });
  assert.equal(recoveryDispatched.runnerJobsCreated, 2);
  const recoveryManagedRoot = await mkdtemp(join(tmpdir(), "stockquant-v33-runner-recovery-managed-"));
  const recoveryJobId = recoveryDispatched.rounds.find((row) => row.roundIndex === 1).jobId;
  const recoveryHostOutput = { value: "" };
  const spawnRecoveryHost = (workerId) => {
    const host = spawn(process.execPath, [resolve("services/research-automation-service/dist/runner-host.js")], {
      cwd: process.cwd(),
      env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED", STOCKQUANT_RUNNER_HOST_API_URL: researchBase, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken, STOCKQUANT_RUNNER_HOST_WORKER_ID: workerId, STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: recoveryRunId, STOCKQUANT_RUNNER_IMAGE_REF: runnerDigest, STOCKQUANT_RUNNER_MANAGED_ROOT: recoveryManagedRoot },
      stdio: ["ignore", "pipe", "pipe"],
    });
    for (const stream of [host.stdout, host.stderr]) stream.on("data", (chunk) => { if (recoveryHostOutput.value.length < 12000) recoveryHostOutput.value += chunk.toString().slice(0, 12000 - recoveryHostOutput.value.length); });
    return host;
  };
  const dockerContainerRunning = (name) => {
    const result = spawnSync("docker", ["inspect", "--format", "{{.State.Running}}", name], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
    return result.status === 0 && result.stdout.trim() === "true";
  };
  let firstRecoveryHost;
  let secondRecoveryHost;
  let recoveryFaultSequence;
  let recoveryCheckpoints = [];
  let recoveryFence = null;
  try {
    firstRecoveryHost = spawnRecoveryHost(`v33-recovery-first-${randomUUID()}`);
    let firstExpiry = 0;
    const firstContainerName = `sqrunner-${createHash("sha256").update(`${recoveryJobId}\0${1}`).digest("hex").slice(0, 32)}`;
    let firstCheckpoint;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (firstRecoveryHost.exitCode !== null) throw new Error(`first recovery Runner Host exited early: ${recoveryHostOutput.value}`);
      const job = await researchPool.query("SELECT status,lease_expires_at,fencing_token FROM research_runner_jobs WHERE job_id=$1", [recoveryJobId]);
      const checkpoint = await researchPool.query("SELECT checkpoint_sequence,state,state_sha256 FROM research_checkpoints WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=1 ORDER BY checkpoint_sequence DESC LIMIT 1", [recoveryRunId, recoveryReserved.experiment.experimentId]);
      if (job.rows[0]?.status === "RUNNING" && Number(job.rows[0].fencing_token) === 1 && Number(checkpoint.rows[0]?.checkpoint_sequence) === 1 && dockerContainerRunning(firstContainerName)) {
        firstExpiry = Date.parse(job.rows[0].lease_expires_at);
        firstCheckpoint = checkpoint.rows[0];
        break;
      }
      await delay(250);
    }
    assert.equal(Number(firstCheckpoint?.checkpoint_sequence), 1, `round 1 checkpoint did not commit before fault injection: ${recoveryHostOutput.value}`);
    assert.match(firstCheckpoint.state_sha256, /^[a-f0-9]{64}$/u);
    firstRecoveryHost.kill("SIGKILL");
    await new Promise((resolveClose) => firstRecoveryHost.once("close", resolveClose));
    assert.ok(dockerContainerRunning(firstContainerName), "isolated container must survive abrupt Runner Host death until the successor fences it");
    const leaseAfterKill = await researchPool.query("SELECT status,lease_expires_at,fencing_token FROM research_runner_jobs WHERE job_id=$1", [recoveryJobId]);
    assert.equal(leaseAfterKill.rows[0]?.status, "RUNNING");
    assert.equal(Number(leaseAfterKill.rows[0]?.fencing_token), 1);
    firstExpiry = Date.parse(leaseAfterKill.rows[0].lease_expires_at);
    assert.ok(Number.isFinite(firstExpiry) && firstExpiry > Date.now());
    const expiredAt = new Date(firstExpiry).toISOString();
    await delay(Math.max(0, firstExpiry - Date.now() + 100));
    secondRecoveryHost = spawnRecoveryHost(`v33-recovery-successor-${randomUUID()}`);
    let recoveredJobsRows;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (secondRecoveryHost.exitCode !== null) throw new Error(`successor recovery Runner Host exited early: ${recoveryHostOutput.value}`);
      const recoveryJobs = await researchPool.query("SELECT job_id,job->>'roundIndex' AS round_index,status,lease_expires_at,fencing_token,execution,artifact_refs FROM research_runner_jobs WHERE job->>'testRunId'=$1 ORDER BY (job->>'roundIndex')::integer", [recoveryRunId]);
      const roundOne = recoveryJobs.rows.find((row) => Number(row.round_index) === 1);
      if (["FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED", "CANCELLED"].includes(roundOne?.status)) throw new Error(`recovery Runner Job failed: ${JSON.stringify(roundOne)}; ${recoveryHostOutput.value}`);
      if (recoveryJobs.rows.some((row) => ["FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED", "CANCELLED"].includes(row.status))) throw new Error(`a recovery TestRun round failed: ${JSON.stringify(recoveryJobs.rows)}; ${recoveryHostOutput.value}`);
      if (roundOne?.status === "COMPLETED" && recoveryJobs.rows.length === 2 && recoveryJobs.rows.every((row) => row.status === "COMPLETED")) { recoveredJobsRows = recoveryJobs.rows; break; }
      await delay(250);
    }
    const recoveredJob = recoveredJobsRows?.find((row) => Number(row.round_index) === 1);
    assert.equal(recoveredJob?.status, "COMPLETED", `successor did not finish recovery Job: ${recoveryHostOutput.value}`);
    assert.equal(Number(recoveredJob.fencing_token), 2);
    recoveryFence = Number(recoveredJob.fencing_token);
    assert.equal(recoveredJob.execution?.exitCode, 0);
    assert.equal(recoveredJob.artifact_refs.length, 1);
    assert.equal(recoveredJob.artifact_refs[0].status, "PUBLISHED");
    const recoveryOutputResponse = await fetch(`${researchBase}/v1/artifacts/read`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${platformToken}` }, body: JSON.stringify({ namespace: recoveredJob.artifact_refs[0].namespace, artifactId: recoveredJob.artifact_refs[0].artifactId }) });
    assert.equal(recoveryOutputResponse.status, 200);
    const recoveryOutput = await recoveryOutputResponse.json();
    const recoveryMetrics = JSON.parse(Buffer.from(recoveryOutput.contentBase64, "base64").toString("utf8"));
    assert.deepEqual(recoveryMetrics.recovery, { resumedFromSequence: 1, checkpointSequence: 2, cursor: 2 }, `round 1 did not execute from the exact persisted checkpoint: ${JSON.stringify(recoveryMetrics)}`);
    const checkpoints = await researchPool.query("SELECT checkpoint_sequence,state,state_sha256 FROM research_checkpoints WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=1 ORDER BY checkpoint_sequence", [recoveryRunId, recoveryReserved.experiment.experimentId]);
    recoveryCheckpoints = checkpoints.rows.map((row) => ({ sequence: Number(row.checkpoint_sequence), state: row.state, sha256: row.state_sha256 }));
    assert.deepEqual(checkpoints.rows.map((row) => Number(row.checkpoint_sequence)), [1, 2]);
    assert.deepEqual(checkpoints.rows.map((row) => Number(row.state.cursor)), [1, 2]);
    assert.ok(checkpoints.rows.every((row) => /^[a-f0-9]{64}$/u.test(row.state_sha256)));
    const stalePublish = await fetch(`${researchBase}/v1/artifacts/publish`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "runner-host", authorization: `Bearer ${runnerToken}` }, body: JSON.stringify({ jobId: recoveryJobId, workerId: "v33-recovery-stale-fence", fencingToken: 1, ref: recoveredJob.artifact_refs[0], contentBase64: Buffer.from("{\"stale\":true}").toString("base64") }) });
    assert.equal(stalePublish.status, 409, "stale fence must not publish after lease takeover");
    recoveryFaultSequence = [
      { sequence: 1, event: "ROUND_1_CHECKPOINT_COMMITTED", checkpointSequence: 1, stateSha256: firstCheckpoint.state_sha256 },
      { sequence: 2, event: "RUNNER_HOST_SIGKILL", fence: 1 },
      { sequence: 3, event: "LEASE_EXPIRED", expiredAt },
      { sequence: 4, event: "LEASE_TAKEOVER", fence: 2 },
      { sequence: 5, event: "RESUME_FROM_CHECKPOINT", checkpointSequence: 1, resumedStateSha256: firstCheckpoint.state_sha256 },
    ];
  } finally {
    for (const host of [firstRecoveryHost, secondRecoveryHost]) if (host && host.exitCode === null) {
      host.kill("SIGTERM");
      await Promise.race([new Promise((resolveClose) => host.once("close", resolveClose)), delay(3000)]);
      if (host.exitCode === null) host.kill("SIGKILL");
    }
    await rm(recoveryManagedRoot, { recursive: true, force: true });
  }
  const recoveryReconciled = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${recoveryRunId}/reconcile`, { schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" });
  assert.equal(recoveryReconciled.testRunId, recoveryRunId);
  assert.equal(recoveryReconciled.completedRounds, 2);
  assert.equal(recoveryReconciled.experimentSettlement, "VERIFIED_FIXTURE_LEDGER");
  const recoveryVerified = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${recoveryRunId}/verify-recovery`, { schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" });
  assert.equal(recoveryVerified.testRunId, recoveryRunId);
  assert.equal(recoveryVerified.assertion.status, "PASS");
  assert.deepEqual(recoveryVerified.evidence.durableSequence.map((row) => row.sequence), [1, 2]);
  const recoveryStageRun = await stageRuns.find(recoveryRunId, ownerId);
  assert.equal(recoveryStageRun.evidence.workflowStep, "RECOVERY_ASSERTION_VERIFIED");
  assert.equal(recoveryStageRun.evidence.businessValidation, "PASS");
  const recoveryExport = await exportV33Run(recoveryRunId);
  assert.equal(recoveryExport.attachments.length, 2);

  const rejectionCreated = await requestPlatform("/api/v1/acceptance/v3/v3.3/runs", { scenarioId: "rejection", seed: 20260907 }, 202);
  const rejectionRunId = rejectionCreated.testRunId;
  assert.equal(rejectionCreated.evidence.testRunBudget.budgetCents, 50);
  const rejectionResult = await requestPlatform(`/api/v1/acceptance/v3/v3.3/runs/${rejectionRunId}/verify-rejection`, {
    schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION",
  });
  assert.equal(rejectionResult.assertion.status, "PASS");
  assert.equal(rejectionResult.evidence.rejection.status, "REJECTED_AS_EXPECTED");
  assert.equal(rejectionResult.evidence.noExperiment, true);
  assert.equal(rejectionResult.evidence.noModelCalls, true);
  assert.equal(rejectionResult.evidence.noRunnerJobs, true);
  const rejectionPersisted = await stageRuns.find(rejectionRunId, ownerId);
  assert.equal(rejectionPersisted.status, "RUNNING");
  assert.equal(rejectionPersisted.evidence.workflowStep, "REJECTION_ASSERTION_VERIFIED");
  assert.equal(rejectionPersisted.evidence.businessValidation, "PASS");
  const rejectionExport = await exportV33Run(rejectionRunId);
  assert.equal(rejectionExport.attachments.length, 0);
  assert.ok((await stageRuns.listRunHistory(rejectionRunId, ownerId)).length >= 2);
  const rejectionDbFacts = await Promise.all([
    researchPool.query("SELECT count(*)::integer AS count FROM research_budget_allocations WHERE test_run_id=$1", [rejectionRunId]),
    researchPool.query("SELECT count(*)::integer AS count FROM research_model_call_budgets m JOIN research_experiments e ON e.experiment_id::text=m.experiment_id WHERE e.test_run_id=$1", [rejectionRunId]),
    researchPool.query("SELECT count(*)::integer AS count FROM research_runner_jobs WHERE job->>'testRunId'=$1", [rejectionRunId]),
  ]);
  assert.equal(rejectionDbFacts[0].rows[0].count, 0);
  assert.equal(rejectionDbFacts[1].rows[0].count, 0);
  assert.equal(rejectionDbFacts[2].rows[0].count, 0);

  console.log(JSON.stringify({ status: "PASS", scope: "Platform HTTP -> Research Automation HTTP -> isolated PostgreSQL V3.3 budget rejection with no allocation/model-call/Runner-job side effects; plus same-TestRun normal and recovery two-round Runner container execution, SIGKILL/lease takeover/checkpoint resume/fencing assertions, owner-scoped durable normal-output and checkpoint-recovery assertions, output SHA/frozen-metrics verification, authoritative 46-cent ledger settlement, and independently exported normal/recovery/rejection evidence bundles", testRunId: runId, experimentId: reserved.experiment.experimentId, jobIds: jobs.rows.map((row) => row.job_id), modelCalls: modelCalls.rows, inputArtifactCount: artifacts.rowCount, completedRounds: reconciled.completedRounds, runnerExecution: "SAME_TEST_RUN_ISOLATED_CONTAINER", runnerImageDigest: runnerDigest, verifiedMetrics: reconciled.rounds.map((row) => ({ roundIndex: row.roundIndex, metrics: row.artifacts[0].metrics })), normalAssertion: normalVerified.assertion, normalEvidenceExport: normalExport, normalBusinessValidation: persisted.evidence.businessValidation, experimentBudget: settledBudget.rows[0], stageRunHistoryEntries: (await stageRuns.listRunHistory(runId, ownerId)).length, recoveryTestRunId: recoveryRunId, recoveryEvidenceExport: recoveryExport, recoveryFaultSequence, recoveryCheckpoints, recoveryReconcileStatus: recoveryStageRun.evidence.businessValidation, recoveryAssertion: recoveryVerified.assertion, recoveryRunnerJobId: recoveryJobId, recoveryFence, staleFencePublishHttpStatus: 409, rejectionTestRunId: rejectionRunId, rejectionEvidenceExport: rejectionExport, rejectionAssertion: rejectionResult.assertion, rejectionNoSideEffects: rejectionResult.evidence, rejectionDbFacts: rejectionDbFacts.map((result) => result.rows[0].count), externalProviderCalls: 0, activeServices: "NOT_CONNECTED", normalRecoveryBusinessValidation: "NORMAL_OUTPUT_AND_LEDGER_ASSERTION_PASS; RECOVERY_CHECKPOINT_ASSERTION_PASS; REJECTION_ASSERTION_PASS", experimentSettlement: "VERIFIED_FIXTURE_LEDGER; NOT_PROVIDER_INVOICE_RECONCILIATION", humanAcceptance: "NOT_RUN" }));
} catch (error) {
  throw error;
} finally {
  if (runnerHost && runnerHost.exitCode === null) runnerHost.kill("SIGKILL");
  await platformApp?.close().catch(() => {});
  await platformPool?.end().catch(() => {});
  if (researchService && researchService.exitCode === null) {
    researchService.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => researchService.once("exit", resolveExit)), delay(5000)]);
    if (researchService.exitCode === null) researchService.kill("SIGKILL");
  }
  await researchPool?.end().catch(() => {});
  if (createdPlatform) await admin.query(`DROP DATABASE IF EXISTS "${platformDatabase}" WITH (FORCE)`).catch(() => {});
  if (createdResearch) await admin.query(`DROP DATABASE IF EXISTS "${researchDatabase}" WITH (FORCE)`).catch(() => {});
  await admin.end().catch(() => {});
  await rm(artifactRoot, { recursive: true, force: true });
}
