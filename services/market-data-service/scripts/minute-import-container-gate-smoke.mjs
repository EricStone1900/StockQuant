import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

const adminUrl = "postgresql://postgres@127.0.0.1:5433/postgres";
const suffix = randomUUID().replaceAll("-", "");
const databaseName = `sq_md_container_gate_${suffix}`;
const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${databaseName}`; databaseUrl.username = "market_data_test"; databaseUrl.port = "5432"; databaseUrl.hostname = "postgres";
const imageRef = "stockquant-market-data-cross-process-gate:local";
const root = resolve(new URL("../../..", import.meta.url).pathname);
const admin = new Client({ connectionString: adminUrl });
const appPool = new Client({ connectionString: adminUrl });
const containerNames = [`sq-md-gate-a-${suffix.slice(0, 16)}`, `sq-md-gate-b-${suffix.slice(0, 16)}`];
const containers = [];
let databaseCreated = false;

function docker(args, { timeout = 120_000, stdio = "pipe" } = {}) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", timeout, stdio, maxBuffer: 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed (${result.status}): ${(result.stderr ?? "").slice(0, 2000)}`);
  return result.stdout?.trim() ?? "";
}

async function freePort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolveListen); });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("could not allocate a loopback port");
  await new Promise((resolveClose, reject) => listener.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function startContainer(index, port) {
  const name = containerNames[index];
  docker(["run", "--detach", "--name", name, "--platform", "linux/arm64", "--network", "stockquant-v12_internal", "--memory", "2g", "--cpus", "2", "--pids-limit", "128", "--publish", `127.0.0.1:${port}:3002`,
    "--env", "NODE_ENV=test", "--env", "STOCKQUANT_MINUTE_GATE_TEST_ENABLED=true", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_PORT=3002", "--env", `STOCKQUANT_DATABASE_URL=${databaseUrl.toString()}`,
    "--env", "STOCKQUANT_SCHEDULER_WORKER=0", "--env", "STOCKQUANT_COLLECTION_EXECUTOR=0", "--env", "STOCKQUANT_PROJECT_ROOT=/workspace", imageRef]);
  containers.push(name);
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = docker(["inspect", name, "--format", "{{.State.Running}}"]);
    if (state !== "true") throw new Error(`isolated container ${name} exited during startup`);
    try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) })).ok) return base; } catch { /* startup */ }
    await delay(100);
  }
  throw new Error(`isolated Market Data container ${name} did not become ready`);
}

async function waitForAdvisoryLock(expectedCount) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await appPool.query(`SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=$1) AND classid=340244::oid AND objid=19785::oid AND objsubid=2 AND granted`, [databaseName]);
    if (result.rows[0].count === expectedCount) return;
    await delay(20);
  }
  throw new Error(`expected ${expectedCount} PostgreSQL advisory locks for container gate`);
}

try {
  docker(["build", "--platform", "linux/arm64", "-f", "services/market-data-service/Dockerfile", "-t", imageRef, "."], { timeout: 600_000, stdio: "inherit" });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}" OWNER market_data_test`);
  databaseCreated = true;
  await appPool.connect();
  const baseA = await startContainer(0, await freePort());
  const baseB = await startContainer(1, await freePort());

  const firstRequest = fetch(`${baseA}/__test/minute-import-gate?holdMs=700`, { method: "POST", signal: AbortSignal.timeout(5000) });
  await waitForAdvisoryLock(1);
  const busy = await fetch(`${baseB}/__test/minute-import-gate?holdMs=10`, { method: "POST", signal: AbortSignal.timeout(3000) });
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get("retry-after"), "1");
  assert.equal((await busy.json()).code, "MINUTE_IMPORT_BUSY");
  const completed = await firstRequest;
  assert.equal(completed.status, 200);
  assert.deepEqual(await completed.json(), { status: "RELEASED", holdMs: 700 });
  await waitForAdvisoryLock(0);
  const afterRelease = await fetch(`${baseB}/__test/minute-import-gate?holdMs=10`, { method: "POST", signal: AbortSignal.timeout(3000) });
  assert.equal(afterRelease.status, 200);
  assert.deepEqual(await afterRelease.json(), { status: "RELEASED", holdMs: 10 });
  await waitForAdvisoryLock(0);
  console.log(JSON.stringify({ status: "PASS", platform: "Docker Desktop Linux/arm64", image: docker(["image", "inspect", imageRef, "--format", "{{.Id}}"]), containerCount: 2, memoryLimit: "2g each", sharedDatabase: "random temporary database on existing PostgreSQL server", busyStatus: 429, retryAfter: "1", releaseAllowsNextRequest: true, activeApplicationContainersRestarted: false }));
} finally {
  for (const name of containers) {
    try { docker(["rm", "--force", name]); } catch { /* exact smoke container already gone */ }
  }
  await appPool.end().catch(() => {});
  if (databaseCreated) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end().catch(() => {});
}
