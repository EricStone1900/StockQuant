import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const network = `stockquant-v24-readiness-${suffix}`;
const postgresName = `${network}-pg`;
const apiName = `${network}-api`;
const probeName = `${network}-probe`;
const image = `stockquant-trade-execution:readiness-${suffix}`;
const platform = process.env.STOCKQUANT_TRADE_EXECUTION_CONTAINER_PLATFORM ?? "linux/arm64";
if (platform !== "linux/arm64" && platform !== "linux/amd64") throw new Error("STOCKQUANT_TRADE_EXECUTION_CONTAINER_PLATFORM must be linux/arm64 or linux/amd64");
const platformToken = `container-platform-${randomUUID()}-${randomUUID()}`;
const replayToken = `container-replay-${randomUUID()}-${randomUUID()}`;
const outboundToken = `container-execution-${randomUUID()}-${randomUUID()}`;
let imageBuilt = false;

function docker(args, { quiet = false } = {}) {
  const result = spawnSync("docker", args, { cwd: repositoryRoot, encoding: "utf8", timeout: 240_000, maxBuffer: 8 * 1024 * 1024, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed (${result.status ?? "no exit status"}): ${quiet ? result.stderr?.trim() : "see Docker output above"}`);
  return result.stdout?.trim() ?? "";
}

const probeProgram = String.raw`
const base = "http://trade-execution:3005";
const platformToken = process.env.PROBE_PLATFORM_TOKEN;
const replayToken = process.env.PROBE_REPLAY_TOKEN;
async function get(path, service, token) {
  return fetch(base + path, { headers: { ...(service ? { "x-stockquant-service-id": service } : {}), ...(token ? { authorization: "Bearer " + token } : {}) } });
}
let ready;
for (let i = 0; i < 90; i += 1) {
  try { ready = await fetch(base + "/ready", { signal: AbortSignal.timeout(2_000) }); if (ready.ok) break; } catch {}
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!ready?.ok) throw new Error("Trade Execution container did not become ready");
const anonymous = await get("/internal/v1/v24/paper-readiness?market=CN_A", "platform-api-service");
const wrongBearer = await get("/internal/v1/v24/paper-readiness?market=CN_A", "platform-api-service", replayToken);
const platform = await get("/internal/v1/v24/paper-readiness?market=CN_A", "platform-api-service", platformToken);
const platformBody = await platform.json();
const us = await get("/internal/v1/v24/paper-readiness?market=US_EQUITY", "platform-api-service", platformToken);
const usBody = await us.json();
const wrongRoute = await get("/internal/v1/v24/paper-readiness?market=CN_A", "historical-replay-worker", replayToken);
if (anonymous.status !== 403 || wrongBearer.status !== 403 || platform.status !== 200 || platformBody.status !== "BLOCKED" || platformBody.orderSubmissionEnabled !== false || us.status !== 200 || usBody.status !== "REJECTED" || wrongRoute.status !== 403) throw new Error(JSON.stringify({ anonymous: anonymous.status, wrongBearer: wrongBearer.status, platform: platform.status, platformBody, us: us.status, usBody, wrongRoute: wrongRoute.status }));
console.log(JSON.stringify({ status: "PASS", ready: ready.status, anonymous: anonymous.status, wrongBearer: wrongBearer.status, cn: platform.status + "/" + platformBody.status, us: us.status + "/" + usBody.status, routeScopeDenied: wrongRoute.status, liveTradingEnabled: platformBody.liveTradingEnabled, orderSubmissionEnabled: platformBody.orderSubmissionEnabled }));
`;

try {
  docker(["buildx", "build", "--platform", platform, "--load", "--tag", image, "--file", "services/trade-execution-service/Dockerfile", "."]);
  imageBuilt = true;
  const imageId = docker(["image", "inspect", image, "--format", "{{.Id}} {{.Os}}/{{.Architecture}}"], { quiet: true });
  if (!new RegExp(`^sha256:[a-f0-9]{64} ${platform.replaceAll("/", "\\/")}$`, "u").test(imageId)) throw new Error(`unexpected Trade Execution image platform: ${imageId}`);
  docker(["network", "create", "--internal", network], { quiet: true });
  docker(["run", "--detach", "--name", postgresName, "--network", network, "--network-alias", "postgres", "--tmpfs", "/var/lib/postgresql/data:size=256m", "--tmpfs", "/tmp:size=16m", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--env", "POSTGRES_USER=trade_execution_test", "--env", "POSTGRES_DB=trade_execution_test", "--env", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:16.4-alpine"], { quiet: true });
  let databaseReady = false;
  for (let i = 0; i < 80; i += 1) {
    const check = spawnSync("docker", ["exec", postgresName, "psql", "-U", "trade_execution_test", "-d", "trade_execution_test", "-Atqc", "SELECT 1"], { encoding: "utf8", timeout: 5000 });
    if (check.status === 0 && check.stdout.trim() === "1") { databaseReady = true; break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.equal(databaseReady, true, "isolated PostgreSQL container must become ready");
  docker(["run", "--detach", "--name", apiName, "--network", network, "--network-alias", "trade-execution", "--read-only", "--tmpfs", "/tmp:size=16m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_DATABASE_URL=postgresql://trade_execution_test@postgres:5432/trade_execution_test", "--env", "STOCKQUANT_PORT=3005", "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${platformToken}`, "--env", `STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY=${replayToken}`, "--env", `STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION=${outboundToken}`, "--env", "STOCKQUANT_PORTFOLIO_API_URL=http://127.0.0.1:1", "--env", "STOCKQUANT_GOVERNANCE_URL=http://127.0.0.1:1", image], { quiet: true });
  const probeOutput = docker(["run", "--rm", "--name", probeName, "--network", network, "--read-only", "--tmpfs", "/tmp:size=16m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--env", `PROBE_PLATFORM_TOKEN=${platformToken}`, "--env", `PROBE_REPLAY_TOKEN=${replayToken}`, "--entrypoint", "node", "node:24.1.0-alpine", "-e", probeProgram], { quiet: true });
  const apiLogs = docker(["logs", apiName], { quiet: true });
  if (apiLogs.includes("V2.4 readiness policy contracts are unavailable")) throw new Error("runtime image could not read the V2.4 policy/Mandate fixture files");
  const counts = docker(["exec", postgresName, "psql", "-U", "trade_execution_test", "-d", "trade_execution_test", "-At", "-c", "SELECT (SELECT count(*) FROM fake_broker_orders)||','||(SELECT count(*) FROM fake_broker_fills)||','||(SELECT count(*) FROM fake_broker_order_events)||','||(SELECT count(*) FROM fake_broker_outbox)"], { quiet: true });
  assert.equal(counts, "0,0,0,0", "readiness queries must not add FakeBroker ledger records");
  console.log(JSON.stringify({ image, imageId, targetPlatform: platform, dockerNetwork: "internal-only", serviceUser: "node", readOnlyRoot: true, database: "ephemeral container", ...JSON.parse(probeOutput), fakeBrokerRows: { orders: 0, fills: 0, events: 0, outbox: 0 }, activeServices: "NOT_CONNECTED" }));
} catch (error) {
  for (const name of [apiName, postgresName]) {
    const logs = spawnSync("docker", ["logs", name], { encoding: "utf8", timeout: 15_000 });
    if (logs.stdout?.trim() || logs.stderr?.trim()) console.error(`diagnostic logs (${name}):\n${logs.stdout ?? ""}${logs.stderr ?? ""}`);
  }
  throw error;
} finally {
  for (const name of [probeName, apiName, postgresName]) spawnSync("docker", ["rm", "--force", name], { stdio: "ignore", timeout: 15_000 });
  spawnSync("docker", ["network", "rm", network], { stdio: "ignore", timeout: 15_000 });
  if (imageBuilt) spawnSync("docker", ["image", "rm", "--force", image], { stdio: "ignore", timeout: 15_000 });
}
