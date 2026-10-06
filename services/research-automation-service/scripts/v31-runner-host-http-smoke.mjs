import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Pool } from "pg";
import { LocalArtifactContentStore } from "@stockquant/artifact-content-store";

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
const rounds = Number(process.env.STOCKQUANT_RUNNER_HOST_SMOKE_ROUNDS ?? "1");
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 3) throw new Error("STOCKQUANT_RUNNER_HOST_SMOKE_ROUNDS must be an integer from 1 to 3");
const dataRows = Number(process.env.STOCKQUANT_RUNNER_HOST_SMOKE_DATA_ROWS ?? "0");
if (!Number.isSafeInteger(dataRows) || dataRows < 0 || dataRows > 100_000) throw new Error("STOCKQUANT_RUNNER_HOST_SMOKE_DATA_ROWS must be an integer from 0 to 100000");
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

function parseDockerBytes(value) {
  const match = String(value).trim().match(/^([\d.]+)\s*(B|kB|KB|MB|GB|KiB|MiB|GiB)?$/u);
  if (!match) return null;
  const unit = match[2] ?? "B";
  const multipliers = { B: 1, kB: 1000, KB: 1000, MB: 1_000_000, GB: 1_000_000_000, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3 };
  return Math.round(Number(match[1]) * multipliers[unit]);
}

function directoryByteSize(directory) {
  let total = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) total += directoryByteSize(path);
    else if (entry.isFile()) total += statSync(path).size;
  }
  return total;
}

function readRunnerTelemetry(name) {
  const options = { encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" }, timeout: 5000 };
  const inspect = spawnSync("docker", ["inspect", "--format", "{{json .HostConfig}}", name], options);
  const stats = spawnSync("docker", ["stats", "--no-stream", "--format", "{{json .}}", name], options);
  if (inspect.status !== 0 || stats.status !== 0) return null;
  try {
    const host = JSON.parse(inspect.stdout.trim());
    const sample = JSON.parse(stats.stdout.trim());
    const memory = String(sample.MemUsage ?? "").split("/").map(parseDockerBytes);
    const io = String(sample.BlockIO ?? "").split("/").map(parseDockerBytes);
    const cpuPercent = Number.parseFloat(String(sample.CPUPerc ?? "").replace("%", ""));
    const pids = Number.parseInt(String(sample.PIDs ?? ""), 10);
    return {
      observedAt: new Date().toISOString(),
      cpuPercent: Number.isFinite(cpuPercent) ? cpuPercent : null,
      memoryUsageBytes: memory.length === 2 ? memory[0] : null,
      memoryLimitBytes: memory.length === 2 ? memory[1] : null,
      blockReadBytes: io.length === 2 ? io[0] : null,
      blockWriteBytes: io.length === 2 ? io[1] : null,
      pids: Number.isSafeInteger(pids) ? pids : null,
      configuredMemoryBytes: Number(host.Memory) || null,
      configuredNanoCpus: Number(host.NanoCpus) || null,
      configuredCpuQuota: Number(host.CpuQuota) || null,
      configuredCpuPeriod: Number(host.CpuPeriod) || null,
      configuredPidsLimit: Number(host.PidsLimit) || null,
    };
  } catch { return null; }
}

let jobCreated = false;
let inputPublished = false;
let experimentCreated = false;
try {
  await waitForReady();
  const createdExperiment = await post("/v1/experiments", "platform-api-service", {
    testRunId, fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds,
    budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE",
    idempotencyKey: `runner-host-http-smoke-${randomUUID()}`,
  });
  experimentId = createdExperiment.experimentId;
  experimentCreated = true;
  // This smoke explicitly submits roundIndex: 1, so poll/cleanup must use the
  // round-scoped durable identity used by RunnerJobCoordinator.
  jobId = `${testRunId}:${experimentId}:round-1`;
  inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
  outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
  const checkpoint = `checkpoint_path=Path('/run/input/checkpoint.json')\nprior=json.loads(checkpoint_path.read_text()) if checkpoint_path.exists() else None\nsequence=(prior['sequence']+1) if prior else 1\ncursor=(prior['state']['cursor']) if prior else 0\ncheckpoint={'schemaVersion':'v3.3-research-checkpoint-v1','testRunId':'${testRunId}','roundIndex':1,'sequence':sequence,'state':{'cursor':cursor+1}}\ncheckpoint_tmp=Path('/run/output/checkpoint.json.tmp')\ncheckpoint_tmp.write_text(json.dumps(checkpoint,sort_keys=True))\ncheckpoint_tmp.replace('/run/output/checkpoint.json')\ntime.sleep(11)\n`;
  const script = dataRows === 0
    ? rounds === 1
      ? `import json,time\nfrom pathlib import Path\n${checkpoint}Path('/run/output/result.json').write_text(json.dumps({'hostHttpDockerSmoke':True},sort_keys=True))\nprint('host-http-docker-smoke')\n`
      : `import json,time\nfrom pathlib import Path\n${checkpoint}for number in range(1, ${rounds + 1}):\n Path(f'/run/output/round-{number}.json').write_text(json.dumps({'round':number,'fixtureReplay':True},sort_keys=True))\nPath('/run/output/result.json').write_text(json.dumps({'hostHttpDockerSmoke':True,'rounds':${rounds}},sort_keys=True))\nprint('host-http-docker-smoke-rounds-${rounds}')\n`
    : `import json,time\nfrom pathlib import Path\n${checkpoint}rows=0\nchecksum=0\nwith open('/run/input/data/rows.jsonl',encoding='utf-8') as source:\n for line in source:\n  item=json.loads(line)\n  rows += 1\n  checksum += item['value']\nfor number in range(1, ${rounds + 1}):\n Path(f'/run/output/round-{number}.json').write_text(json.dumps({'round':number,'fixtureReplay':True,'rows':rows,'checksum':checksum},sort_keys=True))\nPath('/run/output/result.json').write_text(json.dumps({'hostHttpDockerSmoke':True,'rounds':${rounds},'rows':rows,'checksum':checksum},sort_keys=True))\nprint('host-http-docker-smoke-rounds-${rounds}-rows-${dataRows}')\n`;
  const inputFiles = [{ path: "code/main.py", contentBase64: Buffer.from(script).toString("base64") }];
  let fixtureDataBytes = 0;
  let expectedChecksum = 0;
  if (dataRows > 0) {
    const content = Array.from({ length: dataRows }, (_, index) => {
      expectedChecksum += index % 97;
      return JSON.stringify({ index, value: index % 97 });
    }).join("\n") + "\n";
    const bytes = Buffer.from(content);
    fixtureDataBytes = bytes.byteLength;
    inputFiles.push({ path: "data/rows.jsonl", contentBase64: bytes.toString("base64") });
  }
  const bundle = Buffer.from(JSON.stringify({
    schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py",
    files: inputFiles,
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
    schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, roundIndex: 1, imageDigest,
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
  let latestCheckpoint = null;
  let firstCheckpointSequence = null;
  const resourceSamples = [];
  let nextResourceSampleAt = 0;
  let runnerHostConfig = null;
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
        const checkpointRow = await pool.query("SELECT checkpoint_sequence FROM research_checkpoints WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=1 ORDER BY checkpoint_sequence DESC LIMIT 1", [testRunId, experimentId]);
        const checkpointSequence = Number(checkpointRow.rows[0]?.checkpoint_sequence ?? 0);
        if (containerRunning(firstContainerName) && checkpointSequence === 1) { firstCheckpointSequence = checkpointSequence; break; }
      }
      await delay(500);
    }
    if (!firstContainerName || !firstLeaseExpiry || firstCheckpointSequence !== 1) throw new Error(`first Host did not persist checkpoint sequence 1 before lease takeover: ${hostOutput}`);
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
        if (secondContainerName && containerRunning(secondContainerName) && Date.now() >= nextResourceSampleAt) {
          const sample = readRunnerTelemetry(secondContainerName);
          if (sample) {
            resourceSamples.push(sample);
            if (runnerHostConfig === null) runnerHostConfig = {
              memoryBytes: sample.configuredMemoryBytes,
              nanoCpus: sample.configuredNanoCpus,
              cpuQuota: sample.configuredCpuQuota,
              cpuPeriod: sample.configuredCpuPeriod,
              pidsLimit: sample.configuredPidsLimit,
            };
          }
          nextResourceSampleAt = Date.now() + 1000;
        }
      }
      if (row && ["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"].includes(row.status)) { record = row; break; }
      await delay(250);
    }
  if (!record) throw new Error(`recovery Runner Host did not complete within 60 seconds: ${hostOutput}`);
    if (record.status !== "COMPLETED") throw new Error(`standalone Runner Host job status was ${record.status}: ${JSON.stringify(record.execution)}`);
    if (!heartbeatObserved) throw new Error("standalone Runner Host lease expiry did not advance during execution");
  if (Number(record.fencing_token) !== 2 || !oldContainerRemoved) throw new Error("expired lease takeover did not advance the fence and remove the prior container");
  const latestCheckpointResult = await pool.query("SELECT checkpoint_sequence,state,state_sha256 FROM research_checkpoints WHERE test_run_id=$1 AND experiment_id=$2 AND round_index=1 ORDER BY checkpoint_sequence DESC LIMIT 1", [testRunId, experimentId]);
  latestCheckpoint = latestCheckpointResult.rows[0];
  if (Number(latestCheckpoint?.checkpoint_sequence) !== 2 || Number(latestCheckpoint.state?.cursor) !== 2 || !/^[a-f0-9]{64}$/u.test(latestCheckpoint.state_sha256 ?? "")) throw new Error("reclaimed Runner Host did not restore checkpoint sequence 1 and persist sequence 2");
  if (!Array.isArray(record.artifact_refs) || record.artifact_refs.length !== rounds + 1 || record.artifact_refs.some((ref) => ref.status !== "PUBLISHED" || ref.namespace !== outputNamespace)) throw new Error("completed job does not contain all exact published OUTPUT artifacts");
  if (process.env.STOCKQUANT_RUNNER_SMOKE_REQUIRE_RESOURCE_METRICS === "true" && (!resourceSamples.length || !runnerHostConfig)) throw new Error("Runner resource metrics were required but Docker stats/limits were unavailable");
  } finally {
    if (hostProcess.exitCode === null) { hostProcess.kill("SIGTERM"); await new Promise((resolveChild) => hostProcess.once("close", resolveChild)); }
  }
  const contentStore = new LocalArtifactContentStore(artifactRoot);
  const publishedEntries = await Promise.all(record.artifact_refs.map(async (ref) => {
    const content = Buffer.from(await contentStore.read({ namespace: ref.namespace, artifactId: ref.artifactId, sha256: ref.sha256 }));
    if (createHash("sha256").update(content).digest("hex") !== ref.sha256) throw new Error("published OUTPUT bytes do not match the reference hash");
    const value = JSON.parse(content.toString("utf8"));
    return [value.round === undefined ? "result.json" : `round-${value.round}.json`, value];
  }));
  const published = new Map(publishedEntries);
  const artifactContentBytes = (await Promise.all(record.artifact_refs.map((ref) => contentStore.size({ namespace: ref.namespace, artifactId: ref.artifactId, sha256: ref.sha256 })))).reduce((sum, size) => sum + size, 0);
  const runnerManagedDiskBytes = directoryByteSize(managedRoot);
  if (dataRows > 0) {
    assert.deepEqual(published.get("result.json"), { hostHttpDockerSmoke: true, rounds, rows: dataRows, checksum: expectedChecksum }, "multi-row aggregate result mismatch");
    for (let number = 1; number <= rounds; number += 1) assert.deepEqual(published.get(`round-${number}.json`), { round: number, fixtureReplay: true, rows: dataRows, checksum: expectedChecksum }, `round ${number} data result mismatch`);
  } else if (rounds === 1) {
    assert.deepEqual(published.get("result.json"), { hostHttpDockerSmoke: true }, "single-round published result changed");
  } else {
    assert.deepEqual(published.get("result.json"), { hostHttpDockerSmoke: true, rounds }, "multi-round aggregate result mismatch");
    for (let number = 1; number <= rounds; number += 1) assert.deepEqual(published.get(`round-${number}.json`), { round: number, fixtureReplay: true }, `round ${number} published result mismatch`);
  }

  const outputRef = record.artifact_refs[0];
  const staleResponse = await fetch(`http://127.0.0.1:${port}/v1/artifacts/publish`, {
    method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "runner-host", authorization: `Bearer ${hostToken}` },
    body: JSON.stringify({ jobId, workerId: "runner-http-smoke", fencingToken: 1, ref: outputRef, contentBase64: Buffer.from("{\"normal\":true}").toString("base64") }),
  });
  if (staleResponse.ok) throw new Error("Runner Host was able to publish after lease completion");
  console.log(JSON.stringify({ status: "PASS", testRunId, jobId, experimentRounds: rounds, checkpointRecovery: { firstHostPersistedSequence: firstCheckpointSequence, reclaimedHostPersistedSequence: Number(latestCheckpoint.checkpoint_sequence), restoredState: { cursor: Number(latestCheckpoint.state.cursor) }, stateSha256: latestCheckpoint.state_sha256 }, dataset: { rows: dataRows, inputBytes: fixtureDataBytes, checksum: dataRows > 0 ? expectedChecksum : null }, executionScope: "deterministic fixture computation only; no model provider call", simulatedHostKill: "SIGKILL", expiredLeaseTakeover: true, fencingToken: Number(record.fencing_token), heartbeatObserved, priorContainerRemoved: true, executionDurationMs: record.execution?.durationMs ?? null, runnerResources: { declared: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 }, configured: runnerHostConfig, samples: resourceSamples, peakMemoryUsageBytes: resourceSamples.length ? Math.max(...resourceSamples.map((sample) => sample.memoryUsageBytes ?? 0)) : null, peakCpuPercent: resourceSamples.length ? Math.max(...resourceSamples.map((sample) => sample.cpuPercent ?? 0)) : null, peakPids: resourceSamples.length ? Math.max(...resourceSamples.map((sample) => sample.pids ?? 0)) : null }, storage: { runnerManagedDiskBytes, publishedArtifactContentBytes: artifactContentBytes }, publishedArtifacts: record.artifact_refs.map((ref) => ({ artifactId: ref.artifactId, sha256: ref.sha256 })), stalePublishHttpStatus: staleResponse.status }));
} finally {
  if (child.exitCode === null) { child.kill("SIGTERM"); await new Promise((resolveChild) => child.once("close", resolveChild)); }
  if (jobCreated) await pool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId]);
  if (inputPublished) {
    await pool.query("DELETE FROM research_artifact_refs WHERE namespace=ANY($1::text[])", [[inputNamespace, outputNamespace]]);
    const cleanup = await pool.query("SELECT (SELECT count(*) FROM research_runner_jobs WHERE job_id=$1) AS jobs, (SELECT count(*) FROM research_artifact_refs WHERE namespace=ANY($2::text[])) AS refs", [jobId, [inputNamespace, outputNamespace]]);
    if (Number(cleanup.rows[0].jobs) !== 0 || Number(cleanup.rows[0].refs) !== 0) throw new Error("isolated Runner HTTP smoke database cleanup did not remove its exact rows");
  }
  if (experimentCreated) {
    await pool.query("DELETE FROM research_checkpoints WHERE experiment_id=$1", [experimentId]);
    await pool.query("DELETE FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1", [experimentId]);
    await pool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experimentId]);
    const cleanup = await pool.query("SELECT (SELECT count(*) FROM research_checkpoints WHERE experiment_id=$1) AS checkpoints, (SELECT count(*) FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1::text) AS budgets, (SELECT count(*) FROM research_experiments WHERE experiment_id=$2::uuid) AS experiments", [experimentId, experimentId]);
    if (Number(cleanup.rows[0].checkpoints) !== 0 || Number(cleanup.rows[0].budgets) !== 0 || Number(cleanup.rows[0].experiments) !== 0) throw new Error("isolated Runner HTTP smoke did not remove its exact checkpoint, experiment and budget rows");
  }
  await pool.end();
  rmSync(baseDir, { recursive: true, force: true });
}
