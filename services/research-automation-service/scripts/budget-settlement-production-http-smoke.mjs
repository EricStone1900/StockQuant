import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const token = randomBytes(48).toString("base64url");
const port = await new Promise((resolvePort, reject) => {
  const server = createNetServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const value = server.address().port;
    server.close((error) => error ? reject(error) : resolvePort(value));
  });
});
const child = spawn(process.execPath, [resolve("dist/bootstrap/main.js")], {
  cwd: process.cwd(),
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    NODE_ENV: "production",
    STOCKQUANT_BIND_HOST: "127.0.0.1",
    STOCKQUANT_PORT: String(port),
    STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH",
    STOCKQUANT_BROKER_MODE: "FAKE",
    STOCKQUANT_LIVE_TRADING_ENABLED: "false",
    STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED",
    STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED: "false",
    STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
let stderr = "";
child.stderr.setEncoding("utf8").on("data", (chunk) => { if (stderr.length < 4000) stderr += chunk; });
const base = `http://127.0.0.1:${port}`;
const headers = { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` };
async function request(path, body) {
  return fetch(`${base}${path}`, { method: body === undefined ? "GET" : "POST", headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(1000) });
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`production-mode service exited before ready: ${stderr}`);
    try { if ((await fetch(`${base}/ready`, { signal: AbortSignal.timeout(500) })).ok) { ready = true; break; } } catch { /* wait for bind */ }
    await delay(100);
  }
  assert.equal(ready, true, `production-mode service did not become ready: ${stderr}`);
  const created = await request("/v1/experiments", {
    fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1,
    budgetCurrency: "USD", budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `prod-settle-${randomUUID()}`,
  });
  assert.equal(created.status, 202);
  const experiment = await created.json();
  const settlement = await request(`/v1/experiments/${experiment.experimentId}/budget/settle`, { spentCents: 0 });
  assert.equal(settlement.status, 404, "production must not accept caller-supplied settlement amounts");
  const budgetResponse = await request(`/v1/experiments/${experiment.experimentId}/budget`);
  assert.equal(budgetResponse.status, 200);
  const budget = await budgetResponse.json();
  assert.equal(budget.status, "RESERVED");
  assert.equal(budget.spentCents, 0);
  console.log(JSON.stringify({ status: "PASS", mode: "production", settlementEndpoint: settlement.status, budgetAfterRejectedSettlement: budget.status, spentCents: budget.spentCents, externalCalls: 0, activeServicesTouched: false }));
} finally {
  child.kill("SIGTERM");
  await Promise.race([new Promise((resolveExit) => child.once("exit", resolveExit)), delay(2000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
