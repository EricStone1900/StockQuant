import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const serviceRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const databaseUrl = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test:platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(databaseUrl);
if (decodeURIComponent(parsed.pathname.slice(1)) !== "platform_api_test" || decodeURIComponent(parsed.username) === "platform_api") throw new Error("V2.2 body-limit smoke requires the dedicated platform_api_test database");
const freePort = async () => new Promise((resolvePort, reject) => {
  const server = createNetServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const port = server.address().port; server.close((error) => error ? reject(error) : resolvePort(port)); });
});
const apiPort = await freePort();
const upstreamPort = await freePort();
const apiUrl = `http://127.0.0.1:${apiPort}`;
const received = [];
let child;
let childOutput = "";
const upstream = createHttpServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    received.push({ path: req.url, bytes: Buffer.concat(chunks).byteLength });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ headers: [], totalRows: 1, acceptedRows: 1, errors: [], bars: [] }));
  });
});
await new Promise((resolveListen, reject) => { upstream.once("error", reject); upstream.listen(upstreamPort, "127.0.0.1", resolveListen); });
try {
  child = spawn(process.execPath, [resolve(serviceRoot, "dist/main.js")], {
    cwd: serviceRoot,
    env: {
      PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: process.env.HOME ?? "/tmp", NODE_ENV: "test",
      STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(apiPort), STOCKQUANT_DATABASE_URL: databaseUrl,
      STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LOCAL_DEVELOPMENT_USER: "acceptance-owner-1",
      STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_MARKET_DATA_URL: `http://127.0.0.1:${upstreamPort}`,
      STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1",
      STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1", STOCKQUANT_RESEARCH_AUTOMATION_URL: "http://127.0.0.1:1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = (chunk) => { if (childOutput.length < 8000) childOutput += chunk.toString().slice(0, 8000 - childOutput.length); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`temporary platform API exited before ready: ${childOutput}`);
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* database migration/listener startup */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  if (!ready) throw new Error(`temporary platform API did not become ready: ${childOutput}`);

  const content = `x,${"x".repeat(120_000)}`;
  const body = JSON.stringify({ content, mapping: { securityId: "x", timestamp: "x", open: "x", high: "x", low: "x", close: "x", volume: "x", amount: "x" }, market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY" });
  const endpoint = `${apiUrl}/api/v1/acceptance/v2/v2.2/csv/preview`;
  const anonymous = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body });
  if (anonymous.status !== 401 || received.length !== 0) throw new Error("anonymous CSV preview was not rejected before forwarding");
  const authorized = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" }, body });
  const response = await authorized.json();
  if (authorized.status !== 200 || response.acceptedRows !== 1 || received.length !== 1 || received[0].path !== "/v2/minute/csv/preview" || received[0].bytes < 120_000 || received[0].bytes > 1_000_000) throw new Error(`authenticated large preview was not forwarded intact: ${JSON.stringify({ status: authorized.status, received })}`);
  console.log(JSON.stringify({ status: "PASS", database: "platform_api_test", unauthenticatedStatus: anonymous.status, authorizedStatus: authorized.status, requestBytes: received[0].bytes, upstreamRoute: received[0].path, activeServicesTouched: false }));
} finally {
  if (child && child.exitCode === null) { child.kill("SIGTERM"); await once(child, "close"); }
  await new Promise((resolveClose) => upstream.close(() => resolveClose()));
}
