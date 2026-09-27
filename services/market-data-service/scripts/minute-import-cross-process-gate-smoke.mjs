import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

const adminUrl = "postgresql://postgres@127.0.0.1:5433/postgres";
const suffix = randomUUID().replaceAll("-", "");
const databaseName = `sq_md_gate_${suffix}`;
const databaseUrl = new URL(adminUrl); databaseUrl.pathname = `/${databaseName}`; databaseUrl.username = "market_data_test";
const admin = new Client({ connectionString: adminUrl });
const inspect = new Client({ connectionString: databaseUrl.toString() });
const root = resolve(new URL("../../..", import.meta.url).pathname);
const serviceDir = resolve(root, "services/market-data-service");
const processes = [];
let databaseCreated = false;

async function freePort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolveListen); });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("could not allocate a loopback port");
  await new Promise((resolveClose, reject) => listener.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

async function startService(port) {
  const child = spawn(process.execPath, [resolve(serviceDir, "dist/main.js")], {
    cwd: serviceDir,
    env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_MINUTE_GATE_TEST_ENABLED: "true", STOCKQUANT_PROJECT_ROOT: root, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port), STOCKQUANT_DATABASE_URL: databaseUrl.toString(), STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 5000) output += chunk.toString().slice(0, 5000 - output.length); });
  processes.push(child);
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`market-data service exited early: ${output}`);
    try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) })).ok) return { child, base, output: () => output }; } catch { /* startup */ }
    await delay(100);
  }
  throw new Error(`market-data service did not become ready: ${output}`);
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function waitForAdvisoryLock(expectedCount) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await inspect.query(`SELECT count(*)::int AS count FROM pg_locks WHERE locktype='advisory' AND database=(SELECT oid FROM pg_database WHERE datname=$1) AND classid=340244::oid AND objid=19785::oid AND objsubid=2 AND granted`, [databaseName]);
    if (result.rows[0].count === expectedCount) return;
    await delay(20);
  }
  throw new Error(`expected ${expectedCount} PostgreSQL advisory locks for minute import gate`);
}

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE "${databaseName}" OWNER market_data_test`);
  databaseCreated = true;
  await inspect.connect();
  const first = await startService(await freePort());
  const second = await startService(await freePort());

  const firstRequest = fetch(`${first.base}/__test/minute-import-gate?holdMs=700`, { method: "POST", signal: AbortSignal.timeout(5000) });
  await waitForAdvisoryLock(1);
  const secondResponse = await fetch(`${second.base}/__test/minute-import-gate?holdMs=10`, { method: "POST", signal: AbortSignal.timeout(3000) });
  assert.equal(secondResponse.status, 429);
  assert.equal(secondResponse.headers.get("retry-after"), "1");
  assert.equal((await secondResponse.json()).code, "MINUTE_IMPORT_BUSY");
  const firstResponse = await firstRequest;
  assert.equal(firstResponse.status, 200, first.output());
  assert.deepEqual(await firstResponse.json(), { status: "RELEASED", holdMs: 700 });
  await waitForAdvisoryLock(0);

  const releasedResponse = await fetch(`${second.base}/__test/minute-import-gate?holdMs=10`, { method: "POST", signal: AbortSignal.timeout(3000) });
  assert.equal(releasedResponse.status, 200);
  assert.deepEqual(await releasedResponse.json(), { status: "RELEASED", holdMs: 10 });
  await waitForAdvisoryLock(0);

  const abortController = new AbortController();
  const abortedRequest = fetch(`${first.base}/__test/minute-import-gate?holdMs=350`, { method: "POST", signal: abortController.signal }).catch((error) => error);
  await waitForAdvisoryLock(1);
  abortController.abort();
  assert.equal((await abortedRequest).name, "AbortError");
  await waitForAdvisoryLock(0);
  const afterAbort = await fetch(`${second.base}/__test/minute-import-gate?holdMs=10`, { method: "POST", signal: AbortSignal.timeout(3000) });
  assert.equal(afterAbort.status, 200);
  assert.deepEqual(await afterAbort.json(), { status: "RELEASED", holdMs: 10 });
  console.log(JSON.stringify({ status: "PASS", serviceProcesses: 2, sharedDatabase: "random isolated PostgreSQL database", concurrentRequest: "429 MINUTE_IMPORT_BUSY + Retry-After: 1", responseCompletionReleasesLock: true, clientDisconnectReleasesLock: true, activeServiceTouched: false }));
} finally {
  for (const child of processes) await stop(child);
  await inspect.end().catch(() => {});
  if (databaseCreated) await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await admin.end();
}
