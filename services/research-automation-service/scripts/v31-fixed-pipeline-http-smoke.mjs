import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client, Pool } from "pg";

const adminUrl = new URL(process.env.STOCKQUANT_FIXED_PIPELINE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres", "smoke is restricted to the local PostgreSQL admin endpoint");
assert.equal(adminUrl.username, "postgres");
const databaseName = `stockquant_pipeline_${randomUUID().replaceAll("-", "")}`;
const smokeMode = process.env.STOCKQUANT_V31_PIPELINE_SMOKE_MODE ?? "normal";
assert.ok(["normal", "runner-failure", "runner-timeout", "runner-oom", "runner-network", "runner-cancel"].includes(smokeMode), "pipeline smoke mode must be normal, runner-failure, runner-timeout, runner-oom, runner-network, or runner-cancel");
const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${databaseName}`;
const baseDir = await mkdtemp(join(tmpdir(), "stockquant-v31-fixed-pipeline-"));
const artifactRoot = join(baseDir, "artifacts");
const managedRoot = join(baseDir, "managed");
const platformToken = randomBytes(48).toString("base64url");
const hostToken = randomBytes(48).toString("base64url");
const testRunId = randomUUID();
const imageDigest = process.env.STOCKQUANT_RUNNER_IMAGE_DIGEST ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
assert.match(imageDigest, /^sha256:[a-f0-9]{64}$/u);
const admin = new Client({ connectionString: adminUrl.toString() });
let service; let host; let pool; let created = false; let experimentId; let jobId; let inputNamespace; let outputNamespace;
let inputArtifactId; let outputArtifactId; let hostWorkerId;
let serviceOutput = ""; let hostOutput = "";
const port = await new Promise((resolvePort, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); }); });
const base = `http://127.0.0.1:${port}`;

function capture(child, sink) { for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (sink.value.length < 12000) sink.value += chunk.toString().slice(0, 12000 - sink.value.length); }); }
async function stop(child) { if (!child || child.exitCode !== null) return; child.kill("SIGTERM"); await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]); if (child.exitCode === null) child.kill("SIGKILL"); }
async function request(path, { method = "GET", body, caller = "platform-api-service", token = platformToken } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { "x-stockquant-service-id": caller, authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const value = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} HTTP ${response.status}: ${JSON.stringify(value)}`);
  return value;
}

try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${databaseName}"`); created = true;
  const serviceEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true", STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY", STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: hostToken };
  service = spawn(process.execPath, [resolve("dist/bootstrap/main.js")], { cwd: process.cwd(), env: serviceEnv, stdio: ["ignore", "pipe", "pipe"] });
  const serviceLog = { value: "" }; capture(service, serviceLog);
  pool = new Pool({ connectionString: databaseUrl.toString() });
  for (let i = 0; i < 120; i += 1) { if (service.exitCode !== null) throw new Error(`service exited during startup: ${serviceLog.value}`); try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* booting */ } await delay(100); if (i === 119) throw new Error(`service did not become ready: ${serviceLog.value}`); }

  const experiment = await request("/v1/experiments", { method: "POST", body: { testRunId, fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `p7-5-${randomUUID()}` } });
  experimentId = experiment.experimentId; assert.ok(experimentId); assert.equal(experiment.budget.status, "RESERVED");
  const modelRunId = `fixed-${randomUUID()}`;
  const generated = await request("/v1/model-gateway/fixture-call", { method: "POST", body: { experimentId, modelRunId, requestedCents: 60, scenario: "COMPLETED" } });
  assert.equal(generated.providerMode, "FIXTURE"); assert.equal(generated.modelCalls, "NO_EXTERNAL_CALL"); assert.equal(generated.actualCostCents, 23); assert.match(generated.response.generatedCode, /import qlib/u);
  const testRunIdSafe = testRunId;
  inputNamespace = `research/${testRunIdSafe}/${experimentId}/inputs`; outputNamespace = `research/${testRunIdSafe}/${experimentId}/outputs`;
  // A fixed non-zero Python exit exercises the persisted Runner failure path without changing
  // the model Fixture, invoking external services, or introducing nondeterministic failures.
  const runnerCode = smokeMode === "runner-failure" ? "raise SystemExit(17)\n" : smokeMode === "runner-timeout" ? "import time\ntime.sleep(5)\n" : smokeMode === "runner-oom" ? "blocks = []\nwhile True:\n    blocks.append(bytearray(8 * 1024 * 1024))\n" : smokeMode === "runner-network" ? "import socket\nsocket.create_connection(('192.0.2.1', 443), timeout=1)\n" : smokeMode === "runner-cancel" ? "import time\ntime.sleep(60)\n" : generated.response.generatedCode;
  const source = Buffer.from(runnerCode, "utf8");
  const bundle = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [{ path: "code/main.py", contentBase64: source.toString("base64") }] }));
  inputArtifactId = createHash("sha256").update(bundle).digest("hex");
  await request("/v1/artifacts/publish", { method: "POST", body: { ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: inputArtifactId, kind: "INPUT", namespace: inputNamespace, sha256: inputArtifactId, status: "PENDING", sourceRef: "v3.1-model-response-fixed-v1" }, contentBase64: bundle.toString("base64") } });
  const timeoutSeconds = smokeMode === "runner-timeout" ? 1 : smokeMode === "runner-cancel" ? 90 : 30;
  const memoryMiB = smokeMode === "runner-oom" ? 128 : 512;
  const job = await request("/v1/runner/jobs", { method: "POST", body: { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, imageDigest, inputArtifact: `${inputNamespace}/${inputArtifactId}`, outputNamespace, resources: { cpuMilli: 500, memoryMiB, timeoutSeconds, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } } });
  jobId = job.jobId;
  hostWorkerId = `p7-5-${randomUUID()}`;
  host = spawn(process.execPath, [resolve("dist/runner-host.js")], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED", STOCKQUANT_RUNNER_HOST_API_URL: base, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: hostToken, STOCKQUANT_RUNNER_HOST_WORKER_ID: hostWorkerId, STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: testRunId, STOCKQUANT_RUNNER_IMAGE_REF: imageDigest, STOCKQUANT_RUNNER_MANAGED_ROOT: managedRoot }, stdio: ["ignore", "pipe", "pipe"] });
  const hostLog = { value: "" }; capture(host, hostLog);
  let record;
  if (smokeMode === "runner-cancel") {
    let containerName;
    for (let i = 0; i < 120; i += 1) {
      const result = await pool.query("SELECT status,execution,artifact_refs,fencing_token FROM research_runner_jobs WHERE job_id=$1", [jobId]);
      record = result.rows[0];
      if (record?.fencing_token > 0) {
        containerName = `sqrunner-${createHash("sha256").update(`${jobId}\0${record.fencing_token}`).digest("hex").slice(0, 32)}`;
        const inspected = spawnSync("docker", ["inspect", "--format", "{{.State.Running}}", containerName], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
        if (inspected.status === 0 && inspected.stdout.trim() === "true") break;
      }
      if (host.exitCode !== null) throw new Error(`Runner Host exited before cancellation: ${hostLog.value}`);
      await delay(100);
      if (i === 119) throw new Error("Runner container did not reach Running before cancellation");
    }
    await request(`/v1/runner/jobs/${encodeURIComponent(jobId)}/cancel`, { method: "POST" });
    for (let i = 0; i < 160; i += 1) {
      const result = await pool.query("SELECT status,execution,artifact_refs,fencing_token FROM research_runner_jobs WHERE job_id=$1", [jobId]);
      record = result.rows[0];
      const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
      if (record?.status === "CANCELLED" && inspected.status !== 0) break;
      await delay(250);
      if (i === 159) throw new Error(`Cancelled Runner did not stop and clean up: ${JSON.stringify(record)} ${hostLog.value}`);
    }
    const lateContent = Buffer.from("must-not-publish-after-cancel", "utf8");
    const lateRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: `late-${randomUUID()}`, kind: "OUTPUT", namespace: outputNamespace, sha256: createHash("sha256").update(lateContent).digest("hex"), status: "PENDING", sourceRef: `runner:${jobId}:fence:${record.fencing_token}` };
    const stalePublish = await fetch(`${base}/v1/artifacts/publish`, { method: "POST", headers: { "x-stockquant-service-id": "runner-host", authorization: `Bearer ${hostToken}`, "content-type": "application/json" }, body: JSON.stringify({ jobId, workerId: hostWorkerId, fencingToken: record.fencing_token, ref: lateRef, contentBase64: lateContent.toString("base64") }), signal: AbortSignal.timeout(10000) });
    assert.equal(stalePublish.status, 409, "late output publication after cancellation must return a lease conflict");
    const lateArtifactPath = join(artifactRoot, "research", testRunId, experimentId, "outputs", lateRef.artifactId);
    await assert.rejects(access(lateArtifactPath), { code: "ENOENT" }, "cancelled output must not leave an Artifact file");
    assert.equal((await pool.query("SELECT 1 FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [outputNamespace, lateRef.artifactId])).rowCount, 0);
  } else {
    for (let i = 0; i < 120; i += 1) { if (host.exitCode !== null) throw new Error(`Runner Host exited early: ${hostLog.value}`); const result = await pool.query("SELECT status,execution,artifact_refs,fencing_token FROM research_runner_jobs WHERE job_id=$1", [jobId]); record = result.rows[0]; if (record && ["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED", "CANCELLED"].includes(record.status)) break; await delay(250); }
  }
  if (smokeMode === "runner-failure") {
    assert.equal(record?.status, "FAILED", `Runner failure was not persisted: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.execution?.status, "FAILED"); assert.equal(record.execution?.exitCode, 17);
    assert.deepEqual(record.artifact_refs, [], "failed execution must not publish output artifacts");
  } else if (smokeMode === "runner-timeout") {
    assert.equal(record?.status, "TIMED_OUT", `Runner timeout was not persisted: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.execution?.status, "TIMED_OUT");
    assert.deepEqual(record.artifact_refs, [], "timed-out execution must not publish output artifacts");
    const containerName = `sqrunner-${createHash("sha256").update(`${jobId}\0${record.fencing_token}`).digest("hex").slice(0, 32)}`;
    const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
    assert.notEqual(inspected.status, 0, "timed-out Runner container must be removed before the job is recorded terminal");
  } else if (smokeMode === "runner-oom") {
    assert.equal(record?.status, "FAILED", `OOM-limited Runner must fail terminally: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.execution?.status, "FAILED"); assert.equal(record.execution?.exitCode, 247, "128 MiB OOM-killed container reports SIGKILL as its shell exit code");
    assert.deepEqual(record.artifact_refs, [], "OOM execution must not publish output artifacts");
    const containerName = `sqrunner-${createHash("sha256").update(`${jobId}\0${record.fencing_token}`).digest("hex").slice(0, 32)}`;
    const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
    assert.notEqual(inspected.status, 0, "OOM-failed Runner container must be removed before the job is recorded terminal");
  } else if (smokeMode === "runner-network") {
    assert.equal(record?.status, "FAILED", `network-denied Runner must fail terminally: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.execution?.status, "FAILED"); assert.equal(record.execution?.exitCode, 1, "network DENY must reject the TEST-NET-1 connection");
    assert.deepEqual(record.artifact_refs, [], "network-denied execution must not publish output artifacts");
    const containerName = `sqrunner-${createHash("sha256").update(`${jobId}\0${record.fencing_token}`).digest("hex").slice(0, 32)}`;
    const inspected = spawnSync("docker", ["inspect", containerName], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
    assert.notEqual(inspected.status, 0, "network-denied Runner container must be removed before terminal state");
  } else if (smokeMode === "runner-cancel") {
    assert.equal(record?.status, "CANCELLED", `cancelled Runner must remain terminally cancelled: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.execution, null, "a cancelled attempt must not fabricate an execution result");
    assert.deepEqual(record.artifact_refs, [], "cancelled execution must not publish output artifacts");
  } else {
    assert.equal(record?.status, "COMPLETED", `Runner did not complete: ${JSON.stringify(record)} ${hostLog.value}`);
    assert.equal(record.artifact_refs.length, 1); const outputRef = record.artifact_refs[0]; outputArtifactId = outputRef.artifactId;
    assert.equal(outputRef.kind, "OUTPUT"); assert.equal(outputRef.namespace, outputNamespace); assert.equal(outputRef.status, "PUBLISHED");
    const artifact = await request("/v1/artifacts/read", { method: "POST", body: { namespace: outputNamespace, artifactId: outputArtifactId } });
    const output = Buffer.from(artifact.contentBase64, "base64"); assert.equal(createHash("sha256").update(output).digest("hex"), artifact.ref.sha256); assert.equal(artifact.ref.sha256, outputRef.sha256);
    const metrics = JSON.parse(output.toString("utf8")); assert.equal(metrics.fixtureId, "v3.1-research-small-sample-1"); assert.equal(metrics.bars, 6); assert.equal(metrics.qlibVersion, "0.9.6.99"); assert.equal(metrics.return, 0.12);
  }
  const settlement = await request(`/v1/experiments/${experimentId}/budget/settle`, { method: "POST", body: { spentCents: generated.actualCostCents } }); assert.equal(settlement.status, "SETTLED"); assert.equal(settlement.spentCents, 23);
  const budget = await request(`/v1/experiments/${experimentId}/budget`); assert.equal(budget.status, "SETTLED"); assert.equal(budget.spentCents, 23);
  const assertions = smokeMode === "runner-failure" ? ["experiment created", "fixed model Fixture returned without external call", "input Artifact persisted", "offline Runner exit 17 recorded as FAILED", "failed execution published no output Artifact", "known Fixture cost settled once"] : smokeMode === "runner-timeout" ? ["experiment created", "fixed model Fixture returned without external call", "input Artifact persisted", "one-second Runner timeout recorded as TIMED_OUT", "timed-out container removed", "timed-out execution published no output Artifact", "known Fixture cost settled once"] : smokeMode === "runner-oom" ? ["experiment created", "fixed model Fixture returned without external call", "input Artifact persisted", "128 MiB bounded OOM job failed with exit 247", "OOM-failed container removed", "OOM execution published no output Artifact", "known Fixture cost settled once"] : smokeMode === "runner-network" ? ["experiment created", "fixed model Fixture returned without external call", "input Artifact persisted", "DENY policy rejected TEST-NET-1 connection", "network-denied execution published no output Artifact", "network-denied container removed", "known Fixture cost settled once"] : smokeMode === "runner-cancel" ? ["experiment created", "fixed model Fixture returned without external call", "active Runner Job was cancelled by the platform API", "heartbeat fenced the cancelled worker", "running container removed", "late output publication returned 409 with no file or ArtifactRef", "cancelled execution published no output Artifact", "known Fixture cost settled once"] : ["experiment created", "fixed generated code returned without external model", "input artifact persisted", "offline Runner container completed", "output Artifact hash and metrics verified", "budget settled to fixed response cost"];
  console.log(JSON.stringify({ status: "PASS", mode: smokeMode, testRunId, experimentId, jobId, provider: "FIXTURE", externalCalls: 0, runnerImageDigest: imageDigest, runnerStatus: record.status, outputArtifactId: outputArtifactId ?? null, budget: { status: budget.status, spentCents: budget.spentCents }, assertions }));
} finally {
  await stop(host); await stop(service);
  if (pool && experimentId) {
    await pool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId ?? `${testRunId}:${experimentId}`]);
    await pool.query("DELETE FROM research_artifact_refs WHERE namespace=ANY($1::text[])", [[inputNamespace, outputNamespace].filter(Boolean)]);
    await pool.query("DELETE FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1", [experimentId]);
    await pool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experimentId]);
    const counts = await pool.query("SELECT (SELECT count(*) FROM research_runner_jobs WHERE job_id=$1) AS jobs, (SELECT count(*) FROM research_artifact_refs WHERE namespace=ANY($2::text[])) AS refs, (SELECT count(*) FROM research_experiments WHERE experiment_id=$3) AS experiments", [jobId ?? `${testRunId}:${experimentId}`, [inputNamespace, outputNamespace].filter(Boolean), experimentId]);
    assert.deepEqual(counts.rows[0], { jobs: "0", refs: "0", experiments: "0" }, "exact smoke rows are removed before dropping its temporary database");
    await pool.end(); pool = undefined;
  }
  if (created) { const cleanup = new Client({ connectionString: adminUrl.toString() }); await cleanup.connect(); await cleanup.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`); await cleanup.end(); }
  await admin.end().catch(() => undefined); await rm(baseDir, { recursive: true, force: true });
}
