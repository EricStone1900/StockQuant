import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const image = process.env.STOCKQUANT_MARKET_DATA_GATE_IMAGE ?? "stockquant-market-data:source-gates-20261001";
const postgresImage = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const networkName = `sq-source-gate-${suffix}`;
const postgresName = `sq-source-gate-pg-${suffix}`;
const databasePassword = randomBytes(24).toString("hex");
function docker(args, options = {}) {
  const result = spawnSync("docker", args, { encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 120_000, ...options });
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed (${result.status}): ${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

const containerProgram = String.raw`
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
const token = process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API;
const server = spawn("node", ["services/market-data-service/dist/main.js"], { stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
server.stderr.setEncoding("utf8").on("data", chunk => { stderr += chunk; });
const base = "http://127.0.0.1:3002";
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (server.exitCode !== null) throw new Error("Market Data exited before ready: " + stderr);
    try { const response = await fetch(base + "/ready"); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "Market Data did not become ready: " + stderr);
  const readinessResponse = await fetch(base + "/ready");
  const readiness = await readinessResponse.json();
  assert.equal(readiness.liveQuoteMode, "NOT_AUTHORIZED");
  assert.equal(readiness.collectionSourceAuthorization, "NOT_AUTHORIZED");
  assert.equal(readiness.collectionPersistence, "POSTGRES");
  assert.equal(readiness.collectionSchedulerWorker, "ENABLED");
  assert.equal(readiness.collectionExecutor, "DISABLED");

  const headers = { authorization: "Bearer " + token };
  const quote = await fetch(base + "/v2/quote/preview", { headers });
  const quoteBody = await quote.json();
  assert.equal(quote.status, 403);
  assert.equal(quoteBody.code, "SOURCE_NOT_AUTHORIZED");
  const news = await fetch(base + "/v2/news/live", { headers });
  const newsBody = await news.json();
  assert.equal(news.status, 403);
  assert.equal(newsBody.code, "SOURCE_NOT_AUTHORIZED");
  const sourceSmoke = await fetch(base + "/v2/sources/smoke", { headers });
  const sourceSmokeBody = await sourceSmoke.json();
  assert.equal(sourceSmoke.status, 403);
  assert.equal(sourceSmokeBody.externalRequests, 0);

  const adapter = spawn("python3", ["-m", "market_data_adapter.cli"], { stdio: ["pipe", "pipe", "pipe"] });
  let adapterStdout = "";
  let adapterStderr = "";
  adapter.stdout.setEncoding("utf8").on("data", chunk => { adapterStdout += chunk; });
  adapter.stderr.setEncoding("utf8").on("data", chunk => { adapterStderr += chunk; });
  adapter.stdin.end(JSON.stringify({ securityIds: ["600000.SH"], startDate: "2026-09-30", endDate: "2026-09-30", sources: ["sina"] }));
  const [adapterCode] = await once(adapter, "close");
  const adapterBody = JSON.parse(adapterStdout);
  assert.equal(adapterCode, 1);
  assert.equal(adapterBody.code, "SOURCE_NOT_AUTHORIZED", adapterStderr);
  console.log(JSON.stringify({ status: "PASS", image: process.env.STOCKQUANT_GATE_IMAGE, postgresImage: process.env.STOCKQUANT_POSTGRES_IMAGE, network: "internal-only", readiness: { liveQuoteMode: readiness.liveQuoteMode, collectionSourceAuthorization: readiness.collectionSourceAuthorization, collectionPersistence: readiness.collectionPersistence, collectionSchedulerWorker: readiness.collectionSchedulerWorker, collectionExecutor: readiness.collectionExecutor }, routes: { quote: quote.status, news: news.status, sourceSmoke: sourceSmoke.status, sourceSmokeExternalRequests: sourceSmokeBody.externalRequests }, pythonAdapter: { exitCode: adapterCode, result: adapterBody.code }, activeServices: "NOT_CONNECTED" }));
} finally {
  server.kill("SIGTERM");
  await once(server, "exit").catch(() => undefined);
}
`;
const token = "isolated-market-data-source-gates-smoke-token-20261001";
const childEnvironment = [
  "STOCKQUANT_BIND_HOST=127.0.0.1",
  "STOCKQUANT_PORT=3002",
  `STOCKQUANT_DATABASE_URL=postgresql://market_data:${databasePassword}@postgres:5432/market_data`,
  `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${token}`,
  "STOCKQUANT_COLLECTION_EXECUTOR=1",
  "STOCKQUANT_SCHEDULER_WORKER=1",
  "STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED=false",
  "STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED=false",
  "STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED=false",
  "STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED=false",
  "STOCKQUANT_GATE_IMAGE=" + image,
  "STOCKQUANT_POSTGRES_IMAGE=" + postgresImage,
];
try {
  docker(["network", "create", "--internal", networkName]);
  const network = JSON.parse(docker(["network", "inspect", networkName]))[0];
  assert.equal(network.Internal, true, "Docker network must be internal with no external routing");
  docker([
    "run", "--detach", "--rm", "--name", postgresName, "--network", networkName, "--network-alias", "postgres",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=256m",
    "--env", "POSTGRES_USER=market_data", "--env", `POSTGRES_PASSWORD=${databasePassword}`, "--env", "POSTGRES_DB=market_data",
    postgresImage,
  ]);
  let postgresReady = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const check = spawnSync("docker", ["exec", postgresName, "pg_isready", "-U", "market_data", "-d", "market_data"], { encoding: "utf8", timeout: 5000 });
    if (check.status === 0) { postgresReady = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(postgresReady, true, "isolated PostgreSQL failed to become ready");
  const result = docker([
    "run", "--rm", "--network", networkName, "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
    ...childEnvironment.flatMap((value) => ["--env", value]),
    image, "node", "--input-type=module", "-e", containerProgram,
  ]);
  process.stdout.write(result + "\n");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  const containerCleanup = spawnSync("docker", ["rm", "--force", postgresName], { encoding: "utf8", timeout: 10_000 });
  const networkCleanup = spawnSync("docker", ["network", "rm", networkName], { encoding: "utf8", timeout: 10_000 });
  if (containerCleanup.status !== 0 || networkCleanup.status !== 0) {
    process.stderr.write(`temporary Docker cleanup failed: ${containerCleanup.stderr || ""} ${networkCleanup.stderr || ""}\n`);
    process.exitCode = 1;
  } else {
    const remainingContainer = spawnSync("docker", ["ps", "-aq", "--filter", `name=^/${postgresName}$`], { encoding: "utf8", timeout: 10_000 });
    const remainingNetwork = spawnSync("docker", ["network", "ls", "-q", "--filter", `name=^${networkName}$`], { encoding: "utf8", timeout: 10_000 });
    if (remainingContainer.stdout.trim() || remainingNetwork.stdout.trim()) {
      process.stderr.write("temporary Docker resources remain after cleanup\n");
      process.exitCode = 1;
    }
  }
}
