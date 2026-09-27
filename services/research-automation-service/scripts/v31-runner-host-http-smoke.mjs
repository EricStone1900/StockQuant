import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";

const databaseUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
if (databaseName !== "research_automation_test") throw new Error("Runner Host HTTP smoke requires the dedicated research_automation_test database");
const baseDir = mkdtempSync(join(tmpdir(), "stockquant-runner-http-smoke-"));
const artifactRoot = join(baseDir, "artifacts");
const managedRoot = join(baseDir, "managed");
mkdirSync(artifactRoot, { recursive: true }); mkdirSync(managedRoot, { recursive: true });
const pool = new Pool({ connectionString: databaseUrl });
const platformToken = `platform-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const hostToken = `runner-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const testRunId = randomUUID();
let experimentId = null;
let jobId = null;
let inputNamespace = null;
let outputNamespace = null;
const tokenFor = (id) => id === "runner-host" ? hostToken : platformToken;
const portProbe = await import("node:net").then(({ createServer }) => new Promise((resolvePort, reject) => {
  const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const address = server.address(); server.close((error) => error ? reject(error) : resolvePort(address.port)); });
}));
const port = Number(portProbe);
const serviceEnv = {
  PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test",
  STOCKQUANT_PORT: String(port), STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_DATABASE_URL: databaseUrl,
  STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH",
  STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
  STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY", STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
  STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: hostToken,
};
const child = spawn(process.execPath, [resolve("dist/bootstrap/main.js")], { cwd: process.cwd(), env: serviceEnv, stdio: ["ignore", "pipe", "pipe"] });
let serviceOutput = "";
child.stdout.on("data", (chunk) => { if (serviceOutput.length < 16_000) serviceOutput += chunk.toString().slice(0, 16_000 - serviceOutput.length); });
child.stderr.on("data", (chunk) => { if (serviceOutput.length < 16_000) serviceOutput += chunk.toString().slice(0, 16_000 - serviceOutput.length); });

async function waitForReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`isolated research service exited during startup: ${serviceOutput}`);
    try { if ((await fetch(`http://127.0.0.1:${port}/ready`)).ok) return; } catch { /* service is still starting */ }
    await delay(100);
  }
  throw new Error(`isolated research service did not become ready: ${serviceOutput}`);
}

async function post(path, serviceId, body) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": serviceId, authorization: `Bearer ${tokenFor(serviceId)}` }, body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(value)}`);
  return value;
}

let jobCreated = false;
let inputPublished = false;
let experimentCreated = false;
try {
  await waitForReady();
  const createdExperiment = await post("/v1/experiments", "platform-api-service", {
    testRunId, fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1,
    budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE",
    idempotencyKey: `runner-host-http-smoke-${randomUUID()}`,
  });
  experimentId = createdExperiment.experimentId;
  experimentCreated = true;
  jobId = `${testRunId}:${experimentId}`;
  inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
  outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
  const bundle = Buffer.from(JSON.stringify({
    schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py",
    files: [{ path: "code/main.py", contentBase64: Buffer.from("import time\ntime.sleep(11)\nfrom pathlib import Path\nPath('/run/output/result.json').write_text('{\\\"hostHttpDockerSmoke\\\":true}')\nprint('host-http-docker-smoke')\n").toString("base64") }],
  }));
  const inputHash = createHash("sha256").update(bundle).digest("hex");
  const imageDigest = process.env.STOCKQUANT_RUNNER_IMAGE_DIGEST ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
  if (!/^sha256:[a-f0-9]{64}$/u.test(imageDigest)) throw new Error("smoke Runner image digest must be immutable");
  await post("/v1/artifacts/publish", "platform-api-service", {
    ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: inputHash, kind: "INPUT", namespace: inputNamespace, sha256: inputHash, status: "PENDING", sourceRef: "runner-host-http-smoke" },
    contentBase64: bundle.toString("base64"),
  });
  inputPublished = true;
  await post("/v1/runner/jobs", "platform-api-service", {
    schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, imageDigest,
    inputArtifact: `${inputNamespace}/${inputHash}`, outputNamespace,
    resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 },
    networkPolicy: { mode: "DENY", allowlist: [] },
  });
  jobCreated = true;

  const makeRunnerHostEnv = (workerId) => ({
    PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test",
    STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED", STOCKQUANT_RUNNER_HOST_API_URL: `http://127.0.0.1:${port}`,
    STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: hostToken, STOCKQUANT_RUNNER_HOST_WORKER_ID: workerId,
    STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: testRunId, STOCKQUANT_RUNNER_IMAGE_REF: imageDigest,
    STOCKQUANT_RUNNER_MANAGED_ROOT: managedRoot,
  });
  const spawnHost = (workerId) => spawn(process.execPath, [resolve("dist/runner-host.js")], { cwd: process.cwd(), env: makeRunnerHostEnv(workerId), stdio: ["ignore", "pipe", "pipe"] });
  const containerRunning = (name) => {
    const result = spawnSync("docker", ["inspect", "--format", "{{.State.Running}}", name], { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 });
    return result.status === 0 && result.stdout.trim() === "true";
  };
  let hostProcess = spawnHost("runner-http-smoke-1");
  let hostOutput = "";
  const captureHost = (processHandle) => {
    processHandle.stdout.on("data", (chunk) => { if (hostOutput.length < 16_000) hostOutput += chunk.toString().slice(0, 16_000 - hostOutput.length); });
    processHandle.stderr.on("data", (chunk) => { if (hostOutput.length < 16_000) hostOutput += chunk.toString().slice(0, 16_000 - hostOutput.length); });
  };
  captureHost(hostProcess);
  let initialLeaseExpiry = null;
  let heartbeatObserved = false;
  let record = null;
  try {
    let firstContainerName = null;
    let firstLeaseExpiry = null;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (hostProcess.exitCode !== null) throw new Error(`standalone Runner Host exited early: ${hostOutput}`);
      const result = await pool.query("SELECT status,lease_expires_at,fencing_token FROM research_runner_jobs WHERE job_id=$1", [jobId]);
      const row = result.rows[0];
      if (row?.status === "RUNNING" && Number(row.fencing_token) === 1 && row.lease_expires_at) {
        firstLeaseExpiry = new Date(row.lease_expires_at).getTime();
        firstContainerName = `sqrunner-${createHash("sha256").update(`${jobId}\0${row.fencing_token}`).digest("hex").slice(0, 32)}`;
        if (containerRunning(firstContainerName)) break;
      }
      await delay(500);
    }
    if (!firstContainerName || !firstLeaseExpiry) throw new Error(`first Host did not start its Runner container: ${hostOutput}`);
    hostProcess.kill("SIGKILL");
    await new Promise((resolveChild) => hostProcess.once("close", resolveChild));
    if (!containerRunning(firstContainerName)) throw new Error("Runner container did not survive the simulated abrupt Host process death");
    await delay(Math.max(0, firstLeaseExpiry - Date.now() + 100));

    hostProcess = spawnHost("runner-http-smoke-2");
    captureHost(hostProcess);
    let secondContainerName = null;
    let oldContainerRemoved = false;
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (hostProcess.exitCode !== null) throw new Error(`recovery Runner Host exited early: ${hostOutput}`);
      const result = await pool.query("SELECT status,lease_expires_at,fencing_token,execution,artifact_refs FROM research_runner_jobs WHERE job_id=$1", [jobId]);
      const row = result.rows[0];
      if (Number(row?.fencing_token) === 2 && row.lease_expires_at) {
        const expiry = new Date(row.lease_expires_at).getTime();
        if (initialLeaseExpiry === null) initialLeaseExpiry = expiry;
        else if (expiry > initialLeaseExpiry) heartbeatObserved = true;
        secondContainerName ??= `sqrunner-${createHash("sha256").update(`${jobId}\0${row.fencing_token}`).digest("hex").slice(0, 32)}`;
        if (!containerRunning(firstContainerName)) oldContainerRemoved = true;
      }
      if (row && ["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"].includes(row.status)) { record = row; break; }
      await delay(250);
    }
    if (!record) throw new Error(`recovery Runner Host did not complete within 60 seconds: ${hostOutput}`);
    if (record.status !== "COMPLETED") throw new Error(`standalone Runner Host job status was ${record.status}: ${JSON.stringify(record.execution)}`);
    if (!heartbeatObserved) throw new Error("standalone Runner Host lease expiry did not advance during execution");
    if (Number(record.fencing_token) !== 2 || !oldContainerRemoved) throw new Error("expired lease takeover did not advance the fence and remove the prior container");
    if (!Array.isArray(record.artifact_refs) || record.artifact_refs.length !== 1 || record.artifact_refs[0].status !== "PUBLISHED" || record.artifact_refs[0].namespace !== outputNamespace) throw new Error("completed job does not contain its exact published OUTPUT artifact");
  } finally {
    if (hostProcess.exitCode === null) { hostProcess.kill("SIGTERM"); await new Promise((resolveChild) => hostProcess.once("close", resolveChild)); }
  }
  const outputRef = record.artifact_refs[0];
  const publishedPath = join(artifactRoot, "research", outputNamespace.replace(/^research\//u, ""), outputRef.artifactId);
  const publishedContent = readFileSync(publishedPath);
  if (createHash("sha256").update(publishedContent).digest("hex") !== outputRef.sha256 || publishedContent.toString("utf8") !== "{\"hostHttpDockerSmoke\":true}") throw new Error("published OUTPUT bytes do not match the Runner-produced file and reference hash");

  const staleResponse = await fetch(`http://127.0.0.1:${port}/v1/artifacts/publish`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "runner-host", authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ jobId, workerId: "runner-http-smoke", fencingToken: 1, ref: outputRef, contentBase64: Buffer.from("{\"normal\":true}").toString("base64") }),
  });
  if (staleResponse.ok) throw new Error("Runner Host was able to publish after lease completion");
  console.log(JSON.stringify({ status: "PASS", testRunId, jobId, simulatedHostKill: "SIGKILL", expiredLeaseTakeover: true, fencingToken: Number(record.fencing_token), heartbeatObserved, priorContainerRemoved: true, publishedArtifact: outputRef.artifactId, outputSha256: outputRef.sha256, stalePublishHttpStatus: staleResponse.status }));
} finally {
  if (child.exitCode === null) { child.kill("SIGTERM"); await new Promise((resolveChild) => child.once("close", resolveChild)); }
  if (jobCreated) await pool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId]);
  if (inputPublished) {
    await pool.query("DELETE FROM research_artifact_refs WHERE namespace=ANY($1::text[])", [[inputNamespace, outputNamespace]]);
    const cleanup = await pool.query("SELECT (SELECT count(*) FROM research_runner_jobs WHERE job_id=$1) AS jobs, (SELECT count(*) FROM research_artifact_refs WHERE namespace=ANY($2::text[])) AS refs", [jobId, [inputNamespace, outputNamespace]]);
    if (Number(cleanup.rows[0].jobs) !== 0 || Number(cleanup.rows[0].refs) !== 0) throw new Error("isolated Runner HTTP smoke database cleanup did not remove its exact rows");
  }
  if (experimentCreated) {
    await pool.query("DELETE FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1", [experimentId]);
    await pool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experimentId]);
    const cleanup = await pool.query("SELECT (SELECT count(*) FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1::text) AS budgets, (SELECT count(*) FROM research_experiments WHERE experiment_id=$2::uuid) AS experiments", [experimentId, experimentId]);
    if (Number(cleanup.rows[0].budgets) !== 0 || Number(cleanup.rows[0].experiments) !== 0) throw new Error("isolated Runner HTTP smoke did not remove its exact experiment and budget rows");
  }
  await pool.end();
  rmSync(baseDir, { recursive: true, force: true });
}
