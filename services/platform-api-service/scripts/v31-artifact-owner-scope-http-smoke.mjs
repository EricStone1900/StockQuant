import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";
import { PgArtifactRefRepository } from "../../research-automation-service/dist/adapters/pg-artifact-ref-repository.js";
import { PgRunnerJobStore } from "../../research-automation-service/dist/adapters/pg-runner-job-store.js";
import { FileArtifactStore } from "../../research-automation-service/dist/adapters/file-artifact-content-store.js";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const repositoryRoot = resolve(serviceRoot, "../..");
const platformUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test";
const researchUrl = process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test";
if (decodeURIComponent(new URL(platformUrl).pathname.slice(1)) !== "platform_api_test") throw new Error("Artifact owner smoke requires the dedicated platform_api_test database");
if (decodeURIComponent(new URL(researchUrl).pathname.slice(1)) !== "research_automation_test") throw new Error("Artifact owner smoke requires the dedicated research_automation_test database");

const baseDir = await mkdtemp(resolve(tmpdir(), "stockquant-artifact-owner-smoke-"));
const artifactRoot = resolve(baseDir, "artifacts");
await mkdir(artifactRoot, { recursive: true });
const testRunId = randomUUID();
const experimentId = randomUUID();
const ownerId = "acceptance-owner-1";
const namespace = `research/${testRunId}/${experimentId}/inputs`;
const content = Buffer.from(JSON.stringify({ source: "V3.1 owner/run read scope", testRunId }));
const sha256 = createHash("sha256").update(content).digest("hex");
const artifactId = sha256;
const ref = { schemaVersion: "v3.1-artifact-ref-v1", artifactId, kind: "INPUT", namespace, sha256, status: "PENDING", sourceRef: "artifact-owner-scope-http-smoke" };
const outputContent = Buffer.from(JSON.stringify({ metric: "fixture-score", score: 0.75, testRunId }));
const outputSha256 = createHash("sha256").update(outputContent).digest("hex");
const outputRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: outputSha256, kind: "OUTPUT", namespace: `research/${testRunId}/${experimentId}/outputs`, sha256: outputSha256, status: "PENDING", sourceRef: "artifact-owner-scope-http-smoke" };
const platformToken = `platform-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const runnerToken = `runner-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const researchToken = `research-${randomUUID()}-${randomUUID()}`.replaceAll("-", "_");
const platformPool = new Pool({ connectionString: platformUrl });
const researchPool = new Pool({ connectionString: researchUrl });
const stageRuns = new PostgresStageRunRepository(platformPool);
const artifactRefs = new PgArtifactRefRepository(researchPool);
const runnerJobs = new PgRunnerJobStore(researchPool);
const artifactStore = new FileArtifactStore(artifactRoot);
let platformRunCreated = false;
let runnerJobCreated = false;
let artifactRefCreated = false;
let exportEvidenceSummary;
let researchChild;
let platformChild;
const services = [];

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

function startProcess(scriptPath, cwd, env) {
  const child = spawn(process.execPath, [scriptPath], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const capture = (chunk) => { if (output.length < 12_000) output += chunk.toString().slice(0, 12_000 - output.length); };
  child.stdout.on("data", capture);
  child.stderr.on("data", capture);
  const entry = { child, get output() { return output; } };
  services.push(entry);
  return entry;
}

async function waitLive(entry, url) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (entry.child.exitCode !== null) throw new Error(`temporary service exited early: ${entry.output}`);
    try { if ((await fetch(`${url}/live`)).ok) return; } catch { /* listener is starting */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  throw new Error(`temporary service did not become live: ${entry.output}`);
}

async function stopServices() {
  for (const entry of [...services].reverse()) {
    if (entry.child.exitCode === null) {
      entry.child.kill("SIGTERM");
      await new Promise((resolveClose) => entry.child.once("close", resolveClose));
    }
  }
}

try {
  await stageRuns.migrate();
  await artifactRefs.initialize();
  await runnerJobs.initialize();

  const researchPort = await freePort();
  const platformPort = await freePort();
  const researchBaseUrl = `http://127.0.0.1:${researchPort}`;
  const platformBaseUrl = `http://127.0.0.1:${platformPort}`;
  researchChild = startProcess(resolve(repositoryRoot, "services/research-automation-service/dist/bootstrap/main.js"), repositoryRoot, {
    PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", NODE_ENV: "test",
    STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(researchPort), STOCKQUANT_DATABASE_URL: researchUrl,
    STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE",
    STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
    STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY", STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
    STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: researchToken,
  });
  await waitLive(researchChild, researchBaseUrl);

  artifactRefCreated = true;
  const publishedRef = await artifactStore.publish(ref, content);
  const publishedOutputRef = await artifactStore.publish(outputRef, outputContent);
  await artifactRefs.save(publishedRef);
  await artifactRefs.save(publishedOutputRef);
  const artifactPathSegments = [artifactRoot, ...namespace.split("/"), sha256, artifactId];
  for (let index = 0; index < artifactPathSegments.length - 1; index += 1) {
    const currentPath = resolve(...artifactPathSegments.slice(0, index + 1));
    const info = await lstat(currentPath);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`locally published Artifact parent is unsafe at ${currentPath}`);
  }
  const researchArtifactRead = await fetch(`http://127.0.0.1:${researchPort}/v1/artifacts/read`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${platformToken}` },
    body: JSON.stringify({ namespace, artifactId }),
  });
  if (!researchArtifactRead.ok) throw new Error(`Research direct Artifact read failed for ${artifactRoot}: HTTP ${researchArtifactRead.status} ${await researchArtifactRead.text()}\n${researchChild.output}`);
  const job = {
    schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId,
    imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `${namespace}/${artifactId}`,
    outputNamespace: outputRef.namespace,
    resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 60, pidsLimit: 32 },
    networkPolicy: { mode: "DENY", allowlist: [] },
  };
  const jobId = `${testRunId}:${experimentId}`;
  const runnerRecord = await runnerJobs.save({ jobId, job, status: "COMPLETED", submittedAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), execution: null, artifacts: [publishedOutputRef], attempt: 1, retryOf: null, lease: null });
  runnerJobCreated = true;
  await stageRuns.save({
    testRunId, stageId: "V3.1", scenarioId: "normal", scenarioVersion: "1.0.0", ownerId,
    status: "COMPLETED", seed: 20260907, assertions: [{ assertionId: "V3.1-REAL-MODEL-001", status: "PASS" }, { assertionId: "V3.1-RUNNER-001", status: "PASS" }],
    evidence: { environmentMode: "RESEARCH", brokerMode: "FAKE", experiment: { experimentId }, modelCall: { providerMode: "LIVE", modelRunId: `synthetic-${testRunId}`, responseSha256: "c".repeat(64), actualCostCents: 23 }, orchestration: { inputRef: publishedRef, inputArtifact: `${namespace}/${artifactId}`, runnerJob: runnerRecord } },
    namespace: `v3-1-normal-${testRunId}`,
  });
  platformRunCreated = true;

  platformChild = startProcess(resolve(serviceRoot, "dist/main.js"), serviceRoot, {
    PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp",
    STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(platformPort), STOCKQUANT_DATABASE_URL: platformUrl,
    STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true",
    STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId, STOCKQUANT_RESEARCH_AUTOMATION_URL: researchBaseUrl,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
    STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: researchToken,
    STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1",
    STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1",
  });
  await waitLive(platformChild, platformBaseUrl);

  const artifactUrl = `${platformBaseUrl}/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/${artifactId}`;
  const authorized = await fetch(artifactUrl, { headers: { "x-stockquant-user": ownerId } });
  const authorizedBody = await authorized.json();
  if (!authorized.ok || authorizedBody.ref?.namespace !== namespace || Buffer.from(authorizedBody.contentBase64 ?? "", "base64").compare(content) !== 0) throw new Error(`owner-scoped Artifact read failed: HTTP ${authorized.status} ${JSON.stringify(authorizedBody)}`);

  const session = await fetch(`${platformBaseUrl}/api/v1/session`);
  const sessionCookie = session.headers.get("set-cookie")?.split(";")[0];
  if (!session.ok || sessionCookie !== `sq_session=${ownerId}`) throw new Error("Platform local owner session was unavailable for evidence export");
  const exportDirectory = resolve(baseDir, "evidence-export");
  await mkdir(exportDirectory, { recursive: true });
  const exportProcess = spawn(process.execPath, [resolve(repositoryRoot, "scripts/evidence-export.mjs"), "--stage", "V3.1", "--run", testRunId], {
    cwd: exportDirectory,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", STOCKQUANT_PLATFORM_API_URL: platformBaseUrl, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let exportStdout = ""; let exportStderr = "";
  exportProcess.stdout.setEncoding("utf8").on("data", (chunk) => { exportStdout += chunk; });
  exportProcess.stderr.setEncoding("utf8").on("data", (chunk) => { exportStderr += chunk; });
  const exportStatus = await new Promise((resolveClose, reject) => { exportProcess.once("error", reject); exportProcess.once("close", resolveClose); });
  if (exportStatus !== 0) throw new Error(`owner-scoped V3.1 evidence export failed: ${exportStderr || exportStdout}`);
  const exportedArtifact = await readFile(resolve(exportDirectory, `evidence/local/V3.1/${testRunId}/v31-input-${sha256}.bin`));
  const exportedOutputArtifact = await readFile(resolve(exportDirectory, `evidence/local/V3.1/${testRunId}/v31-output-${outputSha256}.bin`));
  const exportedManifest = await readFile(resolve(exportDirectory, `evidence/local/V3.1/${testRunId}/manifest.sha256`), "utf8");
  if (exportedArtifact.compare(content) !== 0 || exportedOutputArtifact.compare(outputContent) !== 0 || !exportedManifest.includes(`${sha256}  v31-input-${sha256}.bin`) || !exportedManifest.includes(`${outputSha256}  v31-output-${outputSha256}.bin`)) throw new Error("V3.1 TestRun evidence export did not preserve the exact owner-scoped Artifact bytes and manifest hash");
  exportEvidenceSummary = { testRunId, inputArtifactSha256: sha256, outputArtifactSha256: outputSha256, manifestSha256: createHash("sha256").update(exportedManifest).digest("hex"), exactBytesVerified: true };

  const missingIdentity = await fetch(artifactUrl);
  if (missingIdentity.status !== 401) throw new Error(`missing session should return 401, got ${missingIdentity.status}`);
  const foreignOwner = await fetch(artifactUrl, { headers: { "x-stockquant-user": "other-owner" } });
  if (foreignOwner.status !== 403) throw new Error(`foreign owner should return 403, got ${foreignOwner.status}`);
  const unlisted = await fetch(`${platformBaseUrl}/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/unlisted`, { headers: { "x-stockquant-user": ownerId } });
  if (unlisted.status !== 404) throw new Error(`unlisted Artifact should return 404, got ${unlisted.status}`);

  const gateUrl = `${platformBaseUrl}/internal/v1/acceptance/v3/v3.1/gate/${testRunId}`;
  const gateAnonymous = await fetch(gateUrl);
  if (gateAnonymous.status !== 401) throw new Error(`anonymous gate read should return 401, got ${gateAnonymous.status}`);
  const gateWrongToken = await fetch(gateUrl, { headers: { authorization: `Bearer ${platformToken}`, "x-stockquant-service-id": "research-automation-service" } });
  if (gateWrongToken.status !== 403) throw new Error(`wrong service token should return 403, got ${gateWrongToken.status}`);
  const gateHeaders = { authorization: `Bearer ${researchToken}`, "x-stockquant-service-id": "research-automation-service" };
  const gateBefore = await fetch(gateUrl, { headers: gateHeaders });
  const gateBeforeBody = await gateBefore.json();
  if (gateBefore.status !== 200 || gateBeforeBody.stageStatus !== "PASS" || gateBeforeBody.humanAcceptance !== "NOT_RUN") throw new Error(`eligible synthetic run gate is unexpected: ${JSON.stringify(gateBeforeBody)}`);
  const ownerGateUrl = `${platformBaseUrl}/api/v1/acceptance/v3/v3.1/runs/${testRunId}/promotion-gate`;
  const ownerGateBefore = await fetch(ownerGateUrl, { headers: { "x-stockquant-user": ownerId } });
  const ownerGateBeforeBody = await ownerGateBefore.json();
  if (ownerGateBefore.status !== 200 || ownerGateBeforeBody.humanAcceptance !== "NOT_RUN") throw new Error(`owner gate read failed closed: HTTP ${ownerGateBefore.status} ${JSON.stringify(ownerGateBeforeBody)}`);
  const acceptanceUrl = `${platformBaseUrl}/api/v1/acceptance/v3/v3.1/runs/${testRunId}/acceptance`;
  const acceptanceBody = { confirmation: "ACCEPT_EXACT_V31_RUN", note: "HTTP contract smoke only" };
  const noUser = await fetch(acceptanceUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(acceptanceBody) });
  if (noUser.status !== 401) throw new Error(`anonymous user acceptance should return 401, got ${noUser.status}`);
  const accepted = await fetch(acceptanceUrl, { method: "POST", headers: { "x-stockquant-user": ownerId, "content-type": "application/json" }, body: JSON.stringify(acceptanceBody) });
  const acceptedBody = await accepted.json();
  if (accepted.status !== 201 || acceptedBody.status !== "ACCEPTED") throw new Error(`exact-run acceptance failed: HTTP ${accepted.status} ${JSON.stringify(acceptedBody)}`);
  const replay = await fetch(acceptanceUrl, { method: "POST", headers: { "x-stockquant-user": ownerId, "content-type": "application/json" }, body: JSON.stringify(acceptanceBody) });
  if (replay.status !== 201 || (await replay.json()).acceptedAt !== acceptedBody.acceptedAt) throw new Error("identical acceptance replay was not idempotent");
  const changedNote = await fetch(acceptanceUrl, { method: "POST", headers: { "x-stockquant-user": ownerId, "content-type": "application/json" }, body: JSON.stringify({ ...acceptanceBody, note: "changed smoke acceptance" }) });
  if (changedNote.status !== 409) throw new Error(`changed acceptance should be immutable, got ${changedNote.status}`);
  const gateAfter = await fetch(gateUrl, { headers: gateHeaders });
  const gateAfterBody = await gateAfter.json();
  const ownerGateAfter = await fetch(ownerGateUrl, { headers: { "x-stockquant-user": ownerId } });
  const ownerGateAfterBody = await ownerGateAfter.json();
  if (gateAfter.status !== 200 || gateAfterBody.humanAcceptance !== "ACCEPTED" || ownerGateAfter.status !== 200 || ownerGateAfterBody.humanAcceptance !== "ACCEPTED") throw new Error(`accepted gate was not persisted: ${JSON.stringify({ service: gateAfterBody, owner: ownerGateAfterBody })}`);
  const platformSubmit = await fetch(`${platformBaseUrl}/api/v1/acceptance/v3/v3.2/runs/${testRunId}/promotion-submission`, { method: "POST", headers: { "x-stockquant-user": ownerId, "content-type": "application/json" }, body: JSON.stringify({ confirmation: "SUBMIT_V32_PROMOTION_REQUEST" }) });
  const platformSubmitBody = await platformSubmit.json();
  if (platformSubmit.status !== 202 || platformSubmitBody.status !== "WAITING" || platformSubmitBody.humanAcceptance !== "NOT_CHANGED") throw new Error(`Platform user submission proxy failed closed: HTTP ${platformSubmit.status} ${JSON.stringify(platformSubmitBody)}`);

  console.log(JSON.stringify({ status: "PASS", testRunId, ownerId, artifactId, evidenceExport: exportEvidenceSummary, authorizedRead: authorized.status, missingIdentity: missingIdentity.status, foreignOwner: foreignOwner.status, unlistedArtifact: unlisted.status, gateAnonymous: gateAnonymous.status, gateWrongToken: gateWrongToken.status, ownerGateBefore: ownerGateBeforeBody.humanAcceptance, serviceGateBefore: gateBeforeBody.humanAcceptance, syntheticAcceptance: acceptedBody.status, identicalReplay: replay.status, changedNote: changedNote.status, ownerGateAfter: ownerGateAfterBody.humanAcceptance, serviceGateAfter: gateAfterBody.humanAcceptance, platformUserSubmit: platformSubmitBody.status, userAcceptanceChangedBySubmit: platformSubmitBody.humanAcceptance, acceptanceIsSyntheticTestData: true, activeServicesTouched: false }));
} finally {
  await stopServices();
  await platformPool.query("DELETE FROM v31_acceptance_records WHERE test_run_id=$1", [testRunId]);
  if (platformRunCreated) await platformPool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
  if (runnerJobCreated) await researchPool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [`${testRunId}:${experimentId}`]);
  if (artifactRefCreated) await researchPool.query("DELETE FROM research_artifact_refs WHERE (namespace=$1 AND artifact_id=$2 AND source_ref=$3) OR (namespace=$4 AND artifact_id=$5 AND source_ref=$3)", [namespace, artifactId, ref.sourceRef, outputRef.namespace, outputRef.artifactId]);
  const [runs, jobs, refs, outputRefs] = await Promise.all([
    platformPool.query("SELECT count(*)::int AS count FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]),
    researchPool.query("SELECT count(*)::int AS count FROM research_runner_jobs WHERE job_id=$1", [`${testRunId}:${experimentId}`]),
    researchPool.query("SELECT count(*)::int AS count FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, artifactId]),
    researchPool.query("SELECT count(*)::int AS count FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [outputRef.namespace, outputRef.artifactId]),
  ]);
  if (Number(runs.rows[0].count) || Number(jobs.rows[0].count) || Number(refs.rows[0].count) || Number(outputRefs.rows[0].count)) throw new Error("Artifact owner-scope smoke exact database cleanup failed");
  await Promise.all([platformPool.end(), researchPool.end()]);
  await rm(baseDir, { recursive: true, force: true });
}
