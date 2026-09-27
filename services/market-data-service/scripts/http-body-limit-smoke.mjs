import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function freePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("unable to allocate a loopback port");
  await new Promise((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

const port = await freePort();
const serviceDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const child = spawn(process.execPath, [resolve(serviceDir, "dist/main.js")], {
  cwd: serviceDir,
  env: { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_PORT: String(port), STOCKQUANT_BIND_HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"]
});
let output = "";
child.once("error", (error) => { output += `${error.message}\n`; });
for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (output.length < 4000) output += chunk.toString().slice(0, 4000 - output.length); });
const base = `http://127.0.0.1:${port}`;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`market-data-service exited before listening: ${output}`);
    try {
      const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* wait for the isolated process */ }
    await delay(50);
  }
  assert.equal(ready, true, `market-data-service did not become ready: ${output}`);
  const oversized = JSON.stringify({ securities: ["x".repeat(1_000_001)] });
  const response = await fetch(`${base}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: oversized, signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { code: "REQUEST_BODY_TOO_LARGE", message: "request body exceeds 1000000 bytes" });
  console.log(JSON.stringify({ status: "PASS", byteLimit: 1_000_000, responseStatus: response.status, isolatedProcess: true }));
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(3000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
