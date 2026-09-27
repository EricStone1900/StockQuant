import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

const port = await freePort();
const env = {
  ...process.env,
  STOCKQUANT_PORT: String(port),
  STOCKQUANT_BIND_HOST: "127.0.0.1",
  STOCKQUANT_SCHEDULER_WORKER: "0",
  STOCKQUANT_COLLECTION_EXECUTOR: "0",
};
delete env.STOCKQUANT_DATABASE_URL;

const child = spawn(process.execPath, ["dist/main.js"], { env, stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
const base = `http://127.0.0.1:${port}`;

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`isolated server exited: ${stderr}`);
    try {
      const response = await fetch(`${base}/ready`, { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch { /* wait for local server startup */ }
    await delay(100);
  }
  assert.equal(ready, true, `isolated Market Data process did not listen: ${stderr}`);

  for (const [date, expected] of [["2026-09-28", "TRADING"], ["2026-09-27", "CLOSED"], ["2027-01-04", "UNKNOWN"]]) {
    const response = await fetch(`${base}/v2/calendar/cn-a-share/${date}`);
    const body = await response.json();
    assert.equal(response.status, 200, `${date} response status`);
    assert.equal(body.status, expected, `${date} calendar status`);
  }

  const invalid = await fetch(`${base}/v2/calendar/cn-a-share/2026-99-99`);
  assert.equal(invalid.status, 400);
  assert.deepEqual(await invalid.json(), { code: "INVALID_DATE" });
  console.log(JSON.stringify({ status: "PASS", cases: 4, databaseConfigured: false, schedulerEnabled: false, executorEnabled: false }));
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await once(child, "exit");
  }
}
