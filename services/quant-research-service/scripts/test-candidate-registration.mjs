import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const serviceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(serviceDir, "../..");
const require = createRequire(resolve(root, "services/quant-research-service/package.json"));
const { Client } = require("pg");
const adminUrl = new URL(process.env.QUANT_CANDIDATE_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
if (adminUrl.hostname !== "127.0.0.1" || adminUrl.port !== "5433" || adminUrl.username !== "postgres" || adminUrl.pathname !== "/postgres") throw new Error("candidate registration smoke requires the dedicated local PostgreSQL admin endpoint at 127.0.0.1:5433/postgres");
const databaseName = `quant_candidate_smoke_${randomUUID().replaceAll("-", "")}`;
const databaseUrl = new URL(adminUrl);
databaseUrl.pathname = `/${databaseName}`;
const tokens = { platform: randomBytes(48).toString("base64url"), replay: randomBytes(48).toString("base64url") };
const admin = new Client({ connectionString: adminUrl.toString() });
let created = false;
let child;

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("unable to allocate a loopback port");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  const port = await freePort();
  child = spawn(process.execPath, [resolve(serviceDir, "dist/main.js")], { cwd: serviceDir, env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay, QLIB_WORKER_URL: "http://127.0.0.1:1" }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 4000) output += chunk.toString().slice(0, 4000 - output.length); });
  child.once("error", (error) => { output += `${error.message}\n`; });
  const base = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`quant service exited before ready: ${output}`);
    try { const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) }); if (response.ok) { ready = true; break; } } catch { /* isolated service is starting */ }
    await delay(50);
  }
  assert.equal(ready, true, `quant service did not become ready: ${output}`);
  const candidateId = `candidate-${randomUUID()}`;
  const requestBody = { candidateId, qlibVersion: "0.9.6", algorithm: "deterministic-sma", artifactHash: "e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7", approvedBy: "owner-a" };
  const post = (body, owner = "owner-a") => fetch(`${base}/v1/research/candidates`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}`, "x-stockquant-user": owner }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  const responses = await Promise.all([post(requestBody), post(requestBody)]);
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 201]);
  const bodies = await Promise.all(responses.map((response) => response.json()));
  assert.equal(bodies.filter((body) => body.idempotent === false).length, 1);
  assert.equal(bodies.filter((body) => body.idempotent === true).length, 1);
  const forgedOwner = await post(requestBody, "owner-b");
  assert.equal(forgedOwner.status, 403);
  const changedApprover = await post({ ...requestBody, approvedBy: "owner-b" }, "owner-b");
  assert.equal(changedApprover.status, 409);
  const changedHash = await post({ ...requestBody, artifactHash: "f".repeat(64) });
  assert.equal(changedHash.status, 422);
  const unknownProperty = await post({ ...requestBody, extra: true });
  assert.equal(unknownProperty.status, 422);
  const invalidIdentity = await post({ ...requestBody, candidateId: " " });
  assert.equal(invalidIdentity.status, 422);
  const storedResponse = await fetch(`${base}/v1/research/candidates/${encodeURIComponent(candidateId)}`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` }, signal: AbortSignal.timeout(5000) });
  assert.equal(storedResponse.status, 200);
  const stored = await storedResponse.json();
  assert.deepEqual({ candidateId: stored.candidateId, artifactHash: stored.artifactHash, approvedBy: stored.approvedBy, status: stored.status, activation: stored.activation }, { candidateId, artifactHash: requestBody.artifactHash, approvedBy: "owner-a", status: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" });
  console.log(JSON.stringify({ status: "PASS", database: "random isolated test database", sameRequestConcurrency: "one create + one idempotent replay", changedApprover: "409 without overwrite", mismatchedUser: 403, changedArtifactHash: 422, unknownProperty: 422, invalidCandidateId: 422, activation: "DISABLED_UNTIL_MANDATE" }));
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }
  if (created) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
}
