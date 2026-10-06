import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const platformToken = randomUUID() + randomUUID();
const runnerToken = randomUUID() + randomUUID();
const testRunId = randomUUID();
const otherTestRunId = randomUUID();
const port = await new Promise((resolvePort, reject) => {
  const server = createNetServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close((error) => error ? reject(error) : resolvePort(value));
  });
});
const base = "http://127.0.0.1:" + port;
const service = spawn(process.execPath, [resolve("dist/bootstrap/main.js")], {
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: "/tmp",
    NODE_ENV: "test",
    STOCKQUANT_BIND_HOST: "127.0.0.1",
    STOCKQUANT_PORT: String(port),
    STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH",
    STOCKQUANT_BROKER_MODE: "FAKE",
    STOCKQUANT_LIVE_TRADING_ENABLED: "false",
    STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED",
    STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
    STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
    STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serviceOutput = "";
for (const stream of [service.stdout, service.stderr]) stream.on("data", (chunk) => {
  if (serviceOutput.length < 8000) serviceOutput += chunk.toString().slice(0, 8000 - serviceOutput.length);
});

async function request(path, { method = "GET", token = platformToken, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(token ? { authorization: "Bearer " + token } : {}),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(3000),
  });
  return { status: response.status, body: await response.json() };
}

async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (service.exitCode !== null) throw new Error("Research Automation exited: " + serviceOutput);
    try { if ((await fetch(base + "/ready", { signal: AbortSignal.timeout(500) })).ok) return; } catch { /* wait for isolated process */ }
    await delay(50);
  }
  throw new Error("Research Automation did not become ready: " + serviceOutput);
}

async function createExperiment({ boundRunId, key, rounds = 1 }) {
  const result = await request("/v1/experiments", {
    method: "POST",
    body: {
      ...(boundRunId ? { testRunId: boundRunId } : {}),
      fixtureId: "v3.3-binding-smoke-fixture",
      modelProfile: "UNSET",
      rounds,
      budgetCurrency: "USD",
      budgetCents: 25,
      environmentMode: "RESEARCH",
      brokerMode: "FAKE",
      idempotencyKey: key,
    },
  });
  assert.equal(result.status, 202, JSON.stringify(result.body));
  assert.equal(result.body.budget.status, "RESERVED");
  return result.body.experimentId;
}

function jobFor(runId, experimentId, roundIndex) {
  const sha = "a".repeat(64);
  return {
    schemaVersion: "v3.1-runner-job-v1",
    testRunId: runId,
    experimentId,
    ...(roundIndex === undefined ? {} : { roundIndex }),
    imageDigest: "sha256:" + "b".repeat(64),
    inputArtifact: "research/" + runId + "/" + experimentId + "/inputs/" + sha,
    outputNamespace: "research/" + runId + "/" + experimentId + "/outputs",
    resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 },
    networkPolicy: { mode: "DENY", allowlist: [] },
  };
}

try {
  await waitReady();
  const unboundExperimentId = await createExperiment({ key: "v33-unbound-" + randomUUID() });
  const boundExperimentId = await createExperiment({ boundRunId: testRunId, key: "v33-bound-" + randomUUID() });
  const multiRoundExperimentId = await createExperiment({ boundRunId: testRunId, key: "v33-multi-round-" + randomUUID(), rounds: 3 });
  const cancelledExperimentId = await createExperiment({ boundRunId: testRunId, key: "v33-cancelled-" + randomUUID() });
  const cancelled = await request("/v1/experiments/" + cancelledExperimentId + "/cancel", { method: "POST" });
  assert.equal(cancelled.status, 200);
  const settledBudget = await request("/v1/experiments/" + cancelledExperimentId + "/budget");
  assert.equal(settledBudget.body.status, "SETTLED");

  const anonymous = await request("/v1/runner/jobs", { method: "POST", token: null, body: jobFor(testRunId, boundExperimentId) });
  const runnerHost = await request("/v1/runner/jobs", { method: "POST", token: runnerToken, body: jobFor(testRunId, boundExperimentId) });
  const missing = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, randomUUID()) });
  const crossRun = await request("/v1/runner/jobs", { method: "POST", body: jobFor(otherTestRunId, boundExperimentId) });
  const legacy = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, unboundExperimentId) });
  const nonReserved = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, cancelledExperimentId) });
  const missingRound = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, multiRoundExperimentId) });
  const invalidRound = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, multiRoundExperimentId, 4) });
  assert.equal(anonymous.status, 401);
  assert.equal(runnerHost.status, 403);
  assert.equal(missing.status, 404);
  assert.equal(crossRun.status, 409);
  assert.equal(legacy.status, 409);
  assert.equal(nonReserved.status, 409);
  assert.equal(missingRound.status, 422);
  assert.equal(invalidRound.status, 422);

  const queuePath = "/v1/runner/jobs?testRunId=" + testRunId + "&offset=0&limit=10";
  const emptyQueue = await request(queuePath);
  assert.equal(emptyQueue.status, 200);
  assert.equal(emptyQueue.body.jobs.length, 0, "rejected dispatch attempts must leave the queue empty");

  const accepted = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, boundExperimentId) });
  assert.equal(accepted.status, 202, JSON.stringify(accepted.body));
  assert.equal(accepted.body.status, "QUEUED");
  assert.equal(accepted.body.execution, "NOT_STARTED");
  const queue = await request(queuePath);
  assert.equal(queue.body.jobs.length, 1);
  assert.equal(queue.body.jobs[0].job.experimentId, boundExperimentId);
  assert.equal(queue.body.jobs[0].job.testRunId, testRunId);
  const acceptedRoundOne = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, multiRoundExperimentId, 1) });
  assert.equal(acceptedRoundOne.status, 202, JSON.stringify(acceptedRoundOne.body));
  assert.equal(acceptedRoundOne.body.job.roundIndex, 1);
  const acceptedRoundTwo = await request("/v1/runner/jobs", { method: "POST", body: jobFor(testRunId, multiRoundExperimentId, 2) });
  assert.equal(acceptedRoundTwo.status, 202, JSON.stringify(acceptedRoundTwo.body));
  assert.equal(acceptedRoundTwo.body.job.roundIndex, 2);
  assert.notEqual(acceptedRoundOne.body.jobId, acceptedRoundTwo.body.jobId);
  assert.equal(acceptedRoundOne.body.jobId, `${testRunId}:${multiRoundExperimentId}:round-1`);
  assert.equal(acceptedRoundTwo.body.jobId, `${testRunId}:${multiRoundExperimentId}:round-2`);
  const finalQueue = await request(queuePath);
  assert.equal(finalQueue.body.jobs.length, 3);
  assert.deepEqual(finalQueue.body.jobs.filter((job) => job.job.experimentId === multiRoundExperimentId).map((job) => job.job.roundIndex).sort(), [1, 2]);

  console.log(JSON.stringify({
    status: "PASS",
    testRunId,
    acceptedExperimentId: boundExperimentId,
    rejected: { anonymous: anonymous.status, runnerHost: runnerHost.status, missingExperiment: missing.status, crossTestRun: crossRun.status, legacyUnbound: legacy.status, nonReservedBudget: nonReserved.status, multiRoundWithoutRound: missingRound.status, unallocatedRound: invalidRound.status },
    queueBeforeValidDispatch: emptyQueue.body.jobs.length,
    queueAfterValidDispatch: finalQueue.body.jobs.length,
    acceptedRoundIndices: [acceptedRoundOne.body.job.roundIndex, acceptedRoundTwo.body.job.roundIndex],
    roundJobIds: [acceptedRoundOne.body.jobId, acceptedRoundTwo.body.jobId],
    acceptedStatus: accepted.body.status,
    execution: accepted.body.execution,
    externalCalls: 0,
    executionStarted: false,
    storage: "IN_MEMORY_ISOLATED_PROCESS",
  }));
} finally {
  if (service.exitCode === null) {
    service.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => service.once("exit", resolveExit)), delay(2500)]);
    if (service.exitCode === null) service.kill("SIGKILL");
  }
}
