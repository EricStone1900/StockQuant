import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client } from "pg";

const suffix = randomUUID().replaceAll("-", "").slice(0, 16);
const network = `sq-md-parquet-net-${suffix}`;
const databaseContainer = `sq-md-parquet-pg-${suffix}`;
const appContainer = `sq-md-parquet-app-${suffix}`;
const peerAppContainer = `sq-md-parquet-peer-${suffix}`;
const image = `stockquant-market-data-parquet-capacity:${suffix}`;
const root = resolve(new URL("../../..", import.meta.url).pathname);
let networkCreated = false; let databaseStarted = false; let imageBuilt = false;

function command(name, args, options = {}) {
  const result = spawnSync(name, args, { cwd: root, encoding: "utf8", timeout: options.timeout ?? 30_000, maxBuffer: 4 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${name} ${args[0]} failed (${result.status}): ${(result.stderr ?? "").slice(0, 3000)}`);
  return result.stdout?.trim() ?? "";
}

async function freePort() {
  const listener = createServer();
  await new Promise((resolveListen, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolveListen); });
  const address = listener.address();
  if (!address || typeof address === "string") throw new Error("could not allocate a local PostgreSQL port");
  await new Promise((resolveClose, reject) => listener.close((error) => error ? reject(error) : resolveClose()));
  return address.port;
}

try {
  const hostPort = await freePort();
  command("docker", ["build", "--platform", "linux/arm64", "-f", "services/market-data-service/Dockerfile", "-t", image, "."], { timeout: 600_000, stdio: "inherit" });
  imageBuilt = true;
  command("docker", ["network", "create", network]); networkCreated = true;
  command("docker", ["run", "--detach", "--name", databaseContainer, "--platform", "linux/arm64", "--network", network, "--network-alias", "parquet-test-postgres", "--publish", `127.0.0.1:${hostPort}:5432`, "--env", "POSTGRES_USER=postgres", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16.9-alpine"]);
  databaseStarted = true;

  const adminUrl = `postgresql://postgres@127.0.0.1:${hostPort}/postgres`;
  let admin;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      admin = new Client({ connectionString: adminUrl });
      try { await admin.connect(); ready = true; break; } catch { await admin.end().catch(() => undefined); await delay(250); }
    }
    assert.ok(ready, "temporary PostgreSQL container becomes ready");
    await admin.query("CREATE ROLE market_data_test LOGIN");
  } finally { await admin?.end().catch(() => undefined); }

  const smoke = command(process.execPath, ["services/market-data-service/scripts/minute-parquet-capacity-http-smoke.mjs"], {
    timeout: 600_000,
    env: {
      ...process.env,
      STOCKQUANT_TEST_ADMIN_DATABASE_URL: adminUrl,
      STOCKQUANT_TEST_TARGET_DATABASE_HOST: "parquet-test-postgres",
      STOCKQUANT_TEST_TARGET_DATABASE_PORT: "5432",
      STOCKQUANT_PARQUET_CAPACITY_IMAGE: image,
      STOCKQUANT_PARQUET_CAPACITY_NETWORK: network,
      STOCKQUANT_PARQUET_CAPACITY_CONTAINER_NAME: appContainer,
      STOCKQUANT_PARQUET_CAPACITY_PEER_CONTAINER_NAME: peerAppContainer,
      STOCKQUANT_PARQUET_CAPACITY_GENERATOR: resolve(root, "services/market-data-service/scripts/generate-parquet-capacity-fixture.py"),
      STOCKQUANT_PARQUET_GENERATOR_PYTHON: resolve(root, "services/market-data-adapter/.venv/bin/python"),
    },
  });
  const report = JSON.parse(smoke);
  assert.equal(report.status, "PASS");
  assert.equal(report.environment.platform, "Docker Linux/arm64");
  assert.equal(report.fixture.rows, 100_000);
  assert.equal(report.http.publishedRows, 100_000);
  assert.equal(report.http.queryPageSize, 1_000);
  assert.equal(report.http.queryPageCount, 100);
  assert.equal(report.http.queriedRows, 100_000);
  assert.equal(report.http.uniqueQueriedBars, 100_000);
  assert.equal(report.http.filteredQueryRows, 40);
  assert.equal(report.http.filteredQueryPages, 2);
  assert.equal(report.http.corruptUploadCancelled, "CANCELLED");
  assert.equal(report.http.crossInstanceCount, 2);
  assert.equal(report.http.crossInstancePreviewBusy, true);
  assert.equal(report.http.crossInstanceFinalizeBusy, true);
  assert.equal(report.resourceUsage.peakServiceRssKiB > 0, true);
  assert.equal(report.externalCalls + report.modelCalls + report.brokerCalls, 0);
  const imageId = command("docker", ["image", "inspect", image, "--format", "{{.Id}}"]);
  console.log(JSON.stringify({ status: "PASS", image, imageId, isolatedNetwork: network, isolatedPostgresContainer: databaseContainer, report }, null, 2));
} finally {
  try { command("docker", ["rm", "--force", peerAppContainer]); } catch { /* exact peer test container may already be removed */ }
  try { command("docker", ["rm", "--force", appContainer]); } catch { /* exact smoke app container may already be removed */ }
  try { command("docker", ["rm", "--force", databaseContainer]); } catch { if (databaseStarted) throw new Error(`failed to remove isolated PostgreSQL container ${databaseContainer}`); }
  if (networkCreated) command("docker", ["network", "rm", network]);
  if (imageBuilt) command("docker", ["image", "rm", image]);
}
