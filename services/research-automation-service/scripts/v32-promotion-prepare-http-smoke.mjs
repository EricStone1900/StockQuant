import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const serviceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(serviceDir, "../..");
const require = createRequire(resolve(root, "services/research-automation-service/package.json"));
const { Client, Pool } = require("pg");
const { PgV32PromotionSubmissionJournal } = await import("../dist/adapters/pg-v32-promotion-submission-journal.js");
const adminUrl = new URL(process.env.RESEARCH_PROMOTION_PREPARE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5433" || adminUrl.username !== "postgres" || adminUrl.pathname !== "/postgres") throw new Error("Promotion prepare smoke requires dedicated local PostgreSQL admin endpoint 127.0.0.1:5433/postgres");
const databaseName = `research_promotion_prepare_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const platformToken = randomBytes(48).toString("base64url");
const runnerToken = randomBytes(48).toString("base64url");
const researchToken = randomBytes(48).toString("base64url");
const quantValidationToken = randomBytes(48).toString("base64url");
const admin = new Client({ connectionString: adminUrl.toString() });
let created = false;
let child;
let artifactRoot;
let mockServer;
let gateAcceptance = "NOT_RUN";
let quantRequests = 0;

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("unable to allocate loopback port");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const jsonRequest = async (url, body, token, identity) => fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}`, "x-stockquant-service-id": identity }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
const getRequest = async (url, token, identity) => fetch(url, { headers: { authorization: `Bearer ${token}`, "x-stockquant-service-id": identity }, signal: AbortSignal.timeout(5000) });

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const port = await freePort();
  const mockPort = await freePort();
  mockServer = createHttpServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (req.url?.startsWith("/internal/v1/acceptance/v3/v3.1/gate/")) {
      const testRunIdFromPath = decodeURIComponent(req.url.split("/").at(-1));
      const valid = req.headers.authorization === `Bearer ${researchToken}` && req.headers["x-stockquant-service-id"] === "research-automation-service";
      res.writeHead(valid ? 200 : 403, { "content-type": "application/json" });
      res.end(JSON.stringify({ schemaVersion: "v3.1-promotion-gate-v1", testRunId: testRunIdFromPath, stageStatus: "PASS", humanAcceptance: gateAcceptance, evidenceSha256: "a".repeat(64) }));
      return;
    }
    if (req.url === "/v1/promotions" && req.method === "POST") {
      quantRequests += 1;
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const valid = req.headers.authorization === `Bearer ${researchToken}`;
      res.writeHead(valid ? 201 : 403, { "content-type": "application/json" });
      res.end(JSON.stringify({ schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: body.promotionRequestId, testRunId: body.testRunId, status: "AWAITING_INDEPENDENT_VALIDATION", createdAt: new Date().toISOString(), idempotent: false }));
      return;
    }
    res.writeHead(404); res.end();
  });
  await new Promise((resolveListen, reject) => mockServer.once("error", reject).listen(mockPort, "127.0.0.1", resolveListen));
  artifactRoot = await mkdtemp(`${tmpdir()}/stockquant-promotion-prepare-artifacts-`);
  child = spawn(process.execPath, [resolve(serviceDir, "dist/bootstrap/main.js")], { cwd: serviceDir, env: { PATH: process.env.PATH ?? "/usr/bin:/bin", NODE_ENV: "test", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken, STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER: quantValidationToken, STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION: researchToken, STOCKQUANT_PLATFORM_API_URL: `http://127.0.0.1:${mockPort}`, STOCKQUANT_QUANT_RESEARCH_URL: `http://127.0.0.1:${mockPort}` }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 4000) output += chunk.toString().slice(0, 4000 - output.length); });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`research service exited before ready: ${output}`);
    try { const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) }); if (response.ok) { ready = true; break; } } catch { /* isolated service is starting */ }
    await delay(50);
  }
  assert.equal(ready, true, `research service did not become ready: ${output}`);

  const testRunId = randomUUID();
  const experimentResponse = await jsonRequest(`${base}/v1/experiments`, { testRunId, fixtureId: "v32-local-smoke-fixture", modelProfile: "fixture", rounds: 1, budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `prepare-${randomUUID()}` }, platformToken, "platform-api-service");
  assert.equal(experimentResponse.status, 202);
  const experiment = await experimentResponse.json();
  const experimentId = experiment.experimentId;
  const jobId = `${testRunId}:${experimentId}`;
  const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
  const outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
  const dataFiles = [{ path: "data/market.json", bytes: Buffer.from('{"close":[10,11]}') }];
  const inventory = dataFiles.map(({ path, bytes }) => ({ path, sha256: digest(bytes) })).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const dataManifest = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-data-manifest-v1", testRunId, experimentId, dataMode: "FIXTURE", dataVersion: "local-smoke-v1", dataContentSha256: digest(Buffer.from(JSON.stringify(inventory), "utf8")) }));
  const validationPlan = Buffer.from(JSON.stringify({ schemaVersion: "v3.2-validation-plan-v1", testRunId, experimentId, candidateSource: "FIXTURE", dataManifestSha256: digest(dataManifest), candidateOutputPath: "candidate.json", generatedCodeOutputPath: "generated.py", metricsOutputPath: "metrics.json" }));
  const bundleBytes = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [
    { path: "code/main.py", contentBase64: Buffer.from("print('done')").toString("base64") },
    ...dataFiles.map(({ path, bytes }) => ({ path, contentBase64: bytes.toString("base64") })),
    { path: "data/v3.2-data-manifest.json", contentBase64: dataManifest.toString("base64") },
    { path: "data/v3.2-validation-plan.json", contentBase64: validationPlan.toString("base64") },
  ] }));
  const inputHash = digest(bundleBytes);
  const inputRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: inputHash, kind: "INPUT", namespace: inputNamespace, sha256: inputHash, status: "PENDING", sourceRef: "v32-promotion-prepare-http-smoke" };
  const inputPublish = await jsonRequest(`${base}/v1/artifacts/publish`, { ref: inputRef, contentBase64: bundleBytes.toString("base64") }, platformToken, "platform-api-service");
  assert.equal(inputPublish.status, 201);

  const job = { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `${inputNamespace}/${inputHash}`, outputNamespace, resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 60, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
  const submitJob = await jsonRequest(`${base}/v1/runner/jobs`, job, platformToken, "platform-api-service");
  assert.equal(submitJob.status, 202, await submitJob.text());
  const claimResponse = await jsonRequest(`${base}/v1/runner/jobs/claim`, { workerId: "promotion-smoke-runner", testRunId }, runnerToken, "runner-host");
  assert.equal(claimResponse.status, 200);
  const claim = await claimResponse.json();
  assert.equal(claim.jobId, jobId);
  const fencingToken = claim.lease.fencingToken;

  const outputContents = [
    { path: "candidate.json", bytes: Buffer.from('{"candidate":"fixture-sma"}') },
    { path: "generated.py", bytes: Buffer.from("print('fixture strategy')") },
    { path: "metrics.json", bytes: Buffer.from('{"return":0.1}') },
  ];
  const pendingRefs = [];
  for (const { path, bytes } of outputContents) {
    const contentHash = digest(bytes);
    const ref = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: `output-${digest(Buffer.from(`${path}\0${fencingToken}`)).slice(0, 32)}-${contentHash.slice(0, 16)}`, kind: "OUTPUT", namespace: outputNamespace, sha256: contentHash, status: "PENDING", sourceRef: `runner:${jobId}:fence:${fencingToken}` };
    const published = await jsonRequest(`${base}/v1/artifacts/publish`, { jobId, workerId: claim.lease.workerId, fencingToken, ref, contentBase64: bytes.toString("base64") }, runnerToken, "runner-host");
    assert.equal(published.status, 201, await published.text());
    pendingRefs.push(ref);
  }
  const completeResponse = await jsonRequest(`${base}/v1/runner/jobs/${encodeURIComponent(jobId)}/complete`, { workerId: claim.lease.workerId, fencingToken, execution: { status: "COMPLETED", exitCode: 0, signal: null, stdout: "smoke", stderr: "", durationMs: 1 }, artifacts: pendingRefs }, runnerToken, "runner-host");
  assert.equal(completeResponse.status, 200, await completeResponse.text());
  const settle = await jsonRequest(`${base}/v1/experiments/${experimentId}/budget/settle`, { spentCents: 23 }, platformToken, "platform-api-service");
  assert.equal(settle.status, 200);

  const preparedUrl = `${base}/v1/promotions/prepare`;
  assert.equal((await jsonRequest(preparedUrl, { testRunId, experimentId }, runnerToken, "runner-host")).status, 403);
  assert.equal((await jsonRequest(preparedUrl, { testRunId }, platformToken, "platform-api-service")).status, 422);
  assert.equal((await jsonRequest(preparedUrl, { testRunId, experimentId, extra: true }, platformToken, "platform-api-service")).status, 422);
  assert.equal((await jsonRequest(preparedUrl, { testRunId: "not-a-uuid", experimentId }, platformToken, "platform-api-service")).status, 422);
  const firstResponse = await jsonRequest(preparedUrl, { testRunId, experimentId }, platformToken, "platform-api-service");
  const secondResponse = await jsonRequest(preparedUrl, { testRunId, experimentId }, platformToken, "platform-api-service");
  assert.equal(firstResponse.status, 200, JSON.stringify(await firstResponse.clone().json()));
  assert.equal(secondResponse.status, 200, JSON.stringify(await secondResponse.clone().json()));
  const first = await firstResponse.json();
  const second = await secondResponse.json();
  assert.deepEqual(first, second);
  assert.equal(first.status, "READY_FOR_GATE_CHECK");
  assert.equal(first.promotionRequest.experimentId, experimentId);
  assert.equal(first.promotionRequest.testRunId, testRunId);
  assert.equal(first.promotionRequest.candidateSource, "FIXTURE");
  assert.equal(first.promotionRequest.budget.consumedMinor, 23);
  assert.equal("approvedBy" in first.promotionRequest || "registryStatus" in first.promotionRequest, false);
  const submitUrl = `${base}/v1/promotions/submit`;
  assert.equal((await jsonRequest(submitUrl, { testRunId, experimentId }, runnerToken, "runner-host")).status, 403);
  const waitingSubmit = await jsonRequest(submitUrl, { testRunId, experimentId }, platformToken, "platform-api-service");
  assert.equal(waitingSubmit.status, 200);
  assert.equal((await waitingSubmit.json()).status, "WAITING");
  const candidateUrl = `${base}/v1/promotions/${first.promotionRequest.promotionRequestId}/candidate-artifact`;
  assert.equal((await getRequest(candidateUrl, quantValidationToken, "quant-validation-worker")).status, 404, "candidate is unavailable before the accepted V3.1 gate and successful Quant submission");
  assert.equal(quantRequests, 0, "Quant must not be called before the exact V3.1 user acceptance is present");
  gateAcceptance = "ACCEPTED";
  const submitted = await jsonRequest(submitUrl, { testRunId, experimentId }, platformToken, "platform-api-service");
  assert.equal(submitted.status, 201);
  assert.equal((await submitted.json()).status, "SUBMITTED");
  assert.equal(quantRequests, 1);
  assert.equal((await getRequest(candidateUrl, platformToken, "platform-api-service")).status, 403);
  assert.equal((await getRequest(candidateUrl, runnerToken, "runner-host")).status, 403);
  const candidateResponse = await getRequest(candidateUrl, quantValidationToken, "quant-validation-worker");
  assert.equal(candidateResponse.status, 200);
  const candidateBody = await candidateResponse.json();
  assert.equal(candidateBody.schemaVersion, "v3.2-candidate-artifact-result-v1");
  assert.equal(candidateBody.ref.artifactId, first.promotionRequest.candidateArtifact.artifactId);
  assert.equal(digest(Buffer.from(candidateBody.contentBase64, "base64")), first.promotionRequest.candidateArtifact.sha256);
  const replaySubmission = await jsonRequest(submitUrl, { testRunId, experimentId }, platformToken, "platform-api-service");
  assert.equal(replaySubmission.status, 201);
  assert.equal((await replaySubmission.json()).status, "SUBMITTED");
  assert.equal(quantRequests, 1, "durable successful replay must not call Quant again");
  const journalPool = new Pool({ connectionString: databaseUrl.toString() });
  try {
    const journal = new PgV32PromotionSubmissionJournal(journalPool);
    await journal.initialize();
    const unknownRequest = { ...first.promotionRequest, promotionRequestId: randomUUID(), idempotencyKey: `v32-unknown-${randomUUID()}` };
    assert.deepEqual(await journal.begin(unknownRequest, "f".repeat(64)), { action: "SUBMIT" });
    await journal.markUnknown(unknownRequest, "simulated-transport-timeout");
    const restartedJournal = new PgV32PromotionSubmissionJournal(journalPool);
    assert.deepEqual(await restartedJournal.begin(unknownRequest, "f".repeat(64)), { action: "RECONCILE", state: "UNKNOWN" });
    const completedRequest = { ...first.promotionRequest, promotionRequestId: randomUUID(), idempotencyKey: `v32-smoke-${randomUUID()}` };
    assert.deepEqual(await journal.begin(completedRequest, "f".repeat(64)), { action: "SUBMIT" });
    await journal.markSubmitted(completedRequest, { promotionRequestId: completedRequest.promotionRequestId, testRunId, quantStatus: "AWAITING_INDEPENDENT_VALIDATION", idempotent: false });
    assert.deepEqual(await restartedJournal.begin(completedRequest, "f".repeat(64)), { action: "EXISTING_SUBMISSION", state: "SUBMITTED", quantStatus: "AWAITING_INDEPENDENT_VALIDATION" });
  } finally {
    await journalPool.end();
  }
  assert.equal((await fetch(`${base}/live`)).status, 200);
  console.log(JSON.stringify({ status: "PASS", database: "random isolated PostgreSQL", flow: "experiment+settled-budget+content-addressed-input+leased-runner-outputs -> platform-authenticated preparation -> authoritative V3.1 gate -> durable Quant submit journal -> scoped candidate retrieval", gateNotAccepted: "WAITING", quantCallsBeforeAcceptance: 0, quantCallsAfterSyntheticAcceptedGate: 1, successfulReplayQuantCallCount: 1, candidateRetrieval: "dedicated Worker Bearer only; request-bound bytes/hash", stableReplay: true, unknownOutcomeSurvivesRestart: true, submittedReplay: true, registryMutation: "NOT_PERFORMED", humanAcceptance: "SYNTHETIC_GATE_ONLY" }));
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(2000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`).catch(() => undefined);
  if (mockServer) await new Promise((resolveClose) => mockServer.close(() => resolveClose())).catch(() => undefined);
  if (created) await admin.end().catch(() => undefined);
  if (artifactRoot) await rm(artifactRoot, { recursive: true, force: true }).catch(() => undefined);
}
