import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { marketDataSmokeAuthEnv, marketDataSmokeAuthHeaders } from "./minute-upload-test-auth.mjs";

assert.ok(process.env.MARKET_DATA_DATABASE_URL, "isolated PostgreSQL URL is required");
let port;
let base;
let child;
let output = "";

function capture(processHandle) {
  for (const stream of [processHandle.stdout, processHandle.stderr]) stream.on("data", (chunk) => { if (output.length < 8000) output += chunk.toString().slice(0, 8000 - output.length); });
}

async function start({ executor = false } = {}) {
  const env = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: "/tmp",
    STOCKQUANT_PROJECT_ROOT: resolve("../.."),
    STOCKQUANT_BIND_HOST: "127.0.0.1",
    STOCKQUANT_PORT: String(port),
    STOCKQUANT_DATABASE_URL: process.env.MARKET_DATA_DATABASE_URL,
    STOCKQUANT_SCHEDULER_WORKER: "0",
    STOCKQUANT_COLLECTION_EXECUTOR: "0",
    STOCKQUANT_ARTIFACT_TASK_EXECUTOR: executor ? "1" : "0",
    ...marketDataSmokeAuthEnv,
  };
  child = spawn(process.execPath, [resolve("dist/main.js")], { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
  capture(child);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Market Data exited before ready: ${output}`);
    try { if ((await fetch(`${base}/ready`)).ok) return; } catch { /* wait for bind */ }
    await delay(100);
  }
  throw new Error(`Market Data did not start: ${output}`);
}

async function stop() {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveClose) => child.once("close", resolveClose)), delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
  child = undefined;
}

async function request(path, { method = "GET", authenticated = true } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: authenticated ? marketDataSmokeAuthHeaders : {},
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, body: await response.json() };
}

try {
  const listener = createServer();
  port = await new Promise((resolvePort, reject) => {
    listener.once("error", reject);
    listener.listen(0, "127.0.0.1", () => {
      const value = listener.address().port;
      listener.close((error) => error ? reject(error) : resolvePort(value));
    });
  });
  base = `http://127.0.0.1:${port}`;
  await start();

  assert.equal((await request("/v1/artifacts/tasks", { method: "POST", authenticated: false })).status, 401);
  const created = await request("/v1/artifacts/tasks", { method: "POST" });
  assert.equal(created.status, 202);
  assert.equal(created.body.status, "QUEUED");
  assert.equal(typeof created.body.taskId, "string");
  const taskId = created.body.taskId;
  assert.ok(taskId.length > 0);

  const found = await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}`);
  assert.equal(found.status, 200);
  assert.deepEqual(found.body, created.body);

  assert.equal((await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST", authenticated: false })).status, 401);
  const cancelled = await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "CANCELLED");
  assert.equal((await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" })).body.status, "CANCELLED");

  await stop();
  output = "";
  await start();
  const afterRestart = await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}`);
  assert.equal(afterRestart.status, 200);
  assert.deepEqual(afterRestart.body, cancelled.body);
  assert.equal((await request(`/v1/artifacts/tasks/${encodeURIComponent(taskId)}/artifact`)).status, 404, "cancelled tasks must not publish bytes");
  assert.equal((await request("/v1/artifacts/tasks/not-a-real-task")).status, 404);

  const publishTaskResponse = await request("/v1/artifacts/tasks", { method: "POST" });
  assert.equal(publishTaskResponse.status, 202);
  const publishTaskId = publishTaskResponse.body.taskId;
  await stop();
  output = "";
  await start({ executor: true });
  let completed;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    completed = await request(`/v1/artifacts/tasks/${encodeURIComponent(publishTaskId)}`);
    if (["COMPLETED", "FAILED"].includes(completed.body.status)) break;
    await delay(100);
  }
  assert.equal(completed.status, 200);
  assert.equal(completed.body.status, "COMPLETED", JSON.stringify(completed.body));
  const artifact = await request(`/v1/artifacts/tasks/${encodeURIComponent(publishTaskId)}/artifact`);
  assert.equal(artifact.status, 200);
  const bytes = Buffer.from(artifact.body.contentBase64, "base64");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.body.sha256);
  const fixtureBytes = await readFile(resolve("../../fixtures/v1/v1.2/cn_daily.csv"));
  assert.deepEqual(bytes, fixtureBytes, "the immutable artifact must be the frozen source Fixture bytes");
  await stop();
  output = "";
  await start();
  assert.equal((await request(`/v1/artifacts/tasks/${encodeURIComponent(publishTaskId)}`)).body.status, "COMPLETED");
  assert.equal((await request(`/v1/artifacts/tasks/${encodeURIComponent(publishTaskId)}/artifact`)).body.sha256, artifact.body.sha256);
  console.log(JSON.stringify({ status: "PASS", cancelledTaskId: taskId, publishedTaskId: publishTaskId, create: 202, read: 200, queuedCancellation: "CANCELLED", cancelRepeated: "CANCELLED", cancelledArtifactAbsent: true, processRestartPersistence: true, executorRecoveryAfterRestart: "COMPLETED", immutableFixtureBytes: true, artifactSha256: artifact.body.sha256, anonymousCreate: 401, anonymousCancel: 401, missingTask: 404, externalRequests: 0 }));
} finally {
  await stop();
}
