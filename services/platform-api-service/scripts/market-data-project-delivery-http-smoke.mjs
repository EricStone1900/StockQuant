import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";
import { GeneratedMarketDataProjectDeliveryClient, MarketDataProjectDeliveryHttpError } from "../dist/contracts/generated-market-data-project-delivery-client.js";

const { Pool } = pg;
const connectionString = process.env.MARKET_DATA_TEST_DATABASE_URL;
if (!connectionString) throw new Error("MARKET_DATA_TEST_DATABASE_URL must point to an isolated test database");
const databaseUrl = new URL(connectionString);
if (databaseUrl.pathname === "/market_data" || databaseUrl.username === "market_data") throw new Error("refusing to run project-delivery smoke against the formal market_data database");
const projectId = "dc06-http-smoke-" + randomUUID();
const projectToken = randomUUID() + randomUUID();
const port = await new Promise((resolvePort, reject) => {
  const server = createNetServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => {
    const selected = server.address().port; server.close((error) => error ? reject(error) : resolvePort(selected));
  });
});
const baseUrl = `http://127.0.0.1:${port}`;
const repoRoot = resolve(process.cwd(), "../..");
const service = spawn(process.execPath, [resolve(repoRoot, "services/market-data-service/dist/main.js")], {
  cwd: resolve(repoRoot, "services/market-data-service"),
  env: {
    PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp",
    STOCKQUANT_PROJECT_ROOT: repoRoot, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(port),
    STOCKQUANT_DATABASE_URL: connectionString, STOCKQUANT_PROJECT_TOKENS: JSON.stringify({ [projectId]: { token: projectToken, scopes: ["DATA_READ", "DATA_EXPORT"] } }),
    STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0",
  }, stdio: ["ignore", "ignore", "pipe"],
});
let serviceOutput = "";
service.stderr.setEncoding("utf8").on("data", (chunk) => { if (serviceOutput.length < 5000) serviceOutput += chunk.slice(0, 5000 - serviceOutput.length); });
const pool = new Pool({ connectionString });

async function waitReady() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (service.exitCode !== null) throw new Error("Market Data exited before listening: " + serviceOutput);
    try { if ((await fetch(baseUrl + "/live", { signal: AbortSignal.timeout(300) })).ok) return; } catch { /* wait for isolated service */ }
    await delay(50);
  }
  throw new Error("Market Data did not become live: " + serviceOutput);
}

async function stopService() {
  if (service.exitCode === null) {
    service.kill("SIGTERM");
    await Promise.race([new Promise((resolveExit) => service.once("exit", resolveExit)), delay(2000)]);
    if (service.exitCode === null) service.kill("SIGKILL");
  }
}

try {
  await waitReady();
  const client = new GeneratedMarketDataProjectDeliveryClient(baseUrl, projectId, projectToken);
  const rawItems = [{ symbol: "600000.SH", close: 10.2, token: "must-be-redacted" }, { symbol: "000001.SZ", close: 11.3 }];
  const page = await client.pageProjectData({ projectId, dataVersion: "dc06-http-smoke-v1", items: rawItems, pageSize: 1 });
  assert.deepEqual(page.items, rawItems.slice(0, 1));
  assert.equal(page.nextCursor, "1");
  const exported = await client.exportProjectData({ projectId, dataVersion: "dc06-http-smoke-v1", items: rawItems });
  const expectedItems = [{ symbol: "600000.SH", close: 10.2 }, { symbol: "000001.SZ", close: 11.3 }];
  assert.deepEqual(exported.items, expectedItems);
  assert.equal(exported.rowCount, 2);
  assert.equal(exported.sha256, createHash("sha256").update(JSON.stringify(expectedItems)).digest("hex"));

  const forgedCredential = new GeneratedMarketDataProjectDeliveryClient(baseUrl, projectId, undefined);
  await assert.rejects(forgedCredential.pageProjectData({ projectId, dataVersion: "dc06-http-smoke-v1", items: rawItems }), (error) => error instanceof MarketDataProjectDeliveryHttpError && error.status === 401);
  const crossProject = await client.pageProjectData({ projectId: "another-project", dataVersion: "dc06-http-smoke-v1", items: rawItems }).catch((error) => error);
  assert.ok(crossProject instanceof MarketDataProjectDeliveryHttpError);
  assert.equal(crossProject.status, 403);

  console.log(JSON.stringify({ status: "PASS", projectId, operations: { page: 200, export: 200, missingCredential: 401, crossProject: 403 }, pageSize: page.items.length, nextCursor: page.nextCursor, exportedRows: exported.rowCount, exportSha256: exported.sha256, scope: "isolated Market Data HTTP + PostgreSQL project-token enforcement; no external source requests" }));
} finally {
  await stopService();
  await pool.query("DELETE FROM market_data_project_queue_metrics WHERE project_id=$1", [projectId]).catch(() => undefined);
  await pool.query("DELETE FROM market_data_projects WHERE project_id=$1", [projectId]).catch(() => undefined);
  await pool.end();
}
