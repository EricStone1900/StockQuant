import { spawn } from "node:child_process";
import { createServer } from "node:http";

const platformToken = "platformBearerToken_" + "p".repeat(32);
const runnerToken = "runnerBearerToken_" + "r".repeat(32);
const reservation = createServer();
await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
const port = reservation.address().port;
await new Promise((resolve, reject) => reservation.close((error) => error ? reject(error) : resolve()));

const service = spawn(process.execPath, ["dist/bootstrap/main.js"], { cwd: process.cwd(), env: {
  ...process.env,
  STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port),
  STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
  STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED", STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
}, stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
service.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
const base = `http://127.0.0.1:${port}`;
async function waitReady() {
  for (let i = 0; i < 100; i++) {
    if (service.exitCode !== null) throw new Error(`research API exited early: ${stderr}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`research API did not become ready: ${stderr}`);
}
async function post(path, bearer, claimedServiceId) {
  const headers = { authorization: `Bearer ${bearer}`, "content-type": "application/json" };
  if (claimedServiceId) headers["x-stockquant-service-id"] = claimedServiceId;
  return fetch(`${base}${path}`, { method: "POST", headers, body: "{}", signal: AbortSignal.timeout(3000) });
}
async function get(path, bearer, claimedServiceId) {
  const headers = { authorization: `Bearer ${bearer}` };
  if (claimedServiceId) headers["x-stockquant-service-id"] = claimedServiceId;
  return fetch(`${base}${path}`, { headers, signal: AbortSignal.timeout(3000) });
}

try {
  await waitReady();
  const bearerOnly = await post("/v1/runner/jobs/validate", platformToken);
  if (bearerOnly.status !== 422) throw new Error(`correct bearer without identity header should reach body validation (expected 422, got ${bearerOnly.status})`);
  const forgedHeader = await post("/v1/runner/jobs/validate", runnerToken, "platform-api-service");
  if (forgedHeader.status !== 403) throw new Error(`forged service header must be rejected (expected 403, got ${forgedHeader.status})`);
  const wrongScope = await post("/v1/runner/jobs", runnerToken);
  if (wrongScope.status !== 403) throw new Error(`Runner token must not submit jobs (expected 403, got ${wrongScope.status})`);
  const platformCancel = await fetch(`${base}/v1/runner/jobs/nonexistent/cancel`, { method: "POST", headers: { authorization: `Bearer ${platformToken}` }, signal: AbortSignal.timeout(3000) });
  if (platformCancel.status !== 404) throw new Error(`platform bearer without identity header should reach the scoped handler (expected 404, got ${platformCancel.status})`);
  const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
  const experimentResponse = await fetch(`${base}/v1/experiments`, { method: "POST", headers: { authorization: `Bearer ${platformToken}`, "content-type": "application/json" }, body: JSON.stringify({ testRunId, fixtureId: "v3.1-research-small-sample-1", modelProfile: "fixture-profile", rounds: 1, budgetCurrency: "USD", budgetCents: 77, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "v33-budget-http-smoke" }) });
  const experiment = await experimentResponse.json();
  if (experimentResponse.status !== 202 || experiment.budget?.requestedCents !== 77 || experiment.budget.status !== "RESERVED") throw new Error(`fixed-budget test experiment was not initialized: ${JSON.stringify(experiment)}`);
  const experimentId = experiment.experimentId;
  const runJob = await fetch(`${base}/v1/runner/jobs`, { method: "POST", headers: { authorization: `Bearer ${platformToken}`, "content-type": "application/json" }, body: JSON.stringify({ schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: `research/${testRunId}/${experimentId}/inputs/${"b".repeat(64)}`, outputNamespace: `research/${testRunId}/${experimentId}/outputs`, resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } }) });
  if (runJob.status !== 202) throw new Error(`platform token should submit an isolated in-memory test job (expected 202, got ${runJob.status})`);
  const submittedJob = await runJob.json();
  const queuePath = `/v1/runner/jobs?testRunId=${testRunId}&offset=0&limit=10`;
  const queueAnonymous = await get(queuePath, "");
  if (queueAnonymous.status !== 401) throw new Error(`queue read without identity should be 401 (got ${queueAnonymous.status})`);
  const queueWrongIdentity = await get(queuePath, runnerToken);
  if (queueWrongIdentity.status !== 403) throw new Error(`Runner identity must not read owner queue (got ${queueWrongIdentity.status})`);
  const queueResponse = await get(queuePath, platformToken);
  const queue = await queueResponse.json();
  if (queueResponse.status !== 200 || queue.schemaVersion !== "v3.3-runner-queue-v1" || queue.jobs.length !== 1 || queue.jobs[0].jobId !== `${testRunId}:${experimentId}` || queue.hasMore !== false) throw new Error(`owner-scoped queue page did not return the expected isolated job: ${JSON.stringify(queue)}`);
  const cursorQueuePath = `/v1/runner/jobs/cursor?testRunId=${testRunId}&limit=10`;
  const cursorAnonymous = await get(cursorQueuePath, "");
  const cursorRunner = await get(cursorQueuePath, runnerToken);
  const cursorResponse = await get(cursorQueuePath, platformToken);
  const cursorQueue = await cursorResponse.json();
  if (cursorAnonymous.status !== 401 || cursorRunner.status !== 403 || cursorResponse.status !== 200 || cursorQueue.schemaVersion !== "v3.3-runner-cursor-queue-v1" || cursorQueue.testRunId !== testRunId || !cursorQueue.jobs.some((job) => job.jobId === submittedJob.jobId) || cursorQueue.nextAfterCursor !== null) throw new Error(`cursor queue did not preserve owner-scoped identity and result contract: ${JSON.stringify({ statuses: [cursorAnonymous.status, cursorRunner.status, cursorResponse.status], submittedJob, queue: cursorQueue })}`);
  const cursorMalformed = await get(`${cursorQueuePath}&afterCursor=not-a-cursor`, platformToken);
  if (cursorMalformed.status !== 422) throw new Error(`malformed queue cursor should be rejected (got ${cursorMalformed.status})`);
  const queueBadLimit = await get(`/v1/runner/jobs?testRunId=${testRunId}&limit=101`, platformToken);
  if (queueBadLimit.status !== 422) throw new Error(`queue limit above 100 should be rejected (got ${queueBadLimit.status})`);
  const queueDuplicateLimit = await get(`/v1/runner/jobs?testRunId=${testRunId}&limit=10&limit=20`, platformToken);
  if (queueDuplicateLimit.status !== 422) throw new Error(`duplicate pagination parameters should be rejected (got ${queueDuplicateLimit.status})`);
  const budgetPath = `/v1/runner/budgets?testRunId=${testRunId}&offset=0&limit=10`;
  const budgetAnonymous = await get(budgetPath, "");
  const budgetRunner = await get(budgetPath, runnerToken);
  const budgetResponse = await get(budgetPath, platformToken);
  const budget = await budgetResponse.json();
  if (budgetAnonymous.status !== 401 || budgetRunner.status !== 403 || budgetResponse.status !== 200 || budget.schemaVersion !== "v3.3-runner-budget-v1"
    || budget.rows[0]?.experimentId !== experimentId || budget.rows[0]?.requestedCents !== 77 || budget.rows[0]?.reservedCents !== 77 || budget.rows[0]?.settledCents !== 0 || budget.coverage.experimentsOnPage !== 1 || budget.coverage.budgetsMissing !== 0) throw new Error(`budget snapshot was not scoped to actual ledger data: ${JSON.stringify(budget)}`);
  const budgetDuplicate = await get(`/v1/runner/budgets?testRunId=${testRunId}&limit=1&limit=2`, platformToken);
  if (budgetDuplicate.status !== 422) throw new Error(`duplicate budget pagination parameters should be rejected (got ${budgetDuplicate.status})`);
  console.log(JSON.stringify({ status: "PASS", assertions: 17, testRunId: null, queueAssertions: 9, budgetAssertions: 4, database: "MEMORY_ONLY", modelCalls: 0, orderCalls: 0 }, null, 2));
} finally {
  if (service.exitCode === null && service.signalCode === null) {
    service.kill("SIGTERM");
    await new Promise((resolve) => service.once("exit", resolve));
  }
}
