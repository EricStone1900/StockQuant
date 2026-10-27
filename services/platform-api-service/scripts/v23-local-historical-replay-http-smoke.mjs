import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "pg";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve("../..");
const platformRoot = process.cwd();
const suffix = randomUUID().replaceAll("-", "");
const network = `sq-v23-history-net-${suffix}`;
const postgresContainer = `sq-v23-history-pg-${suffix}`;
const qlibContainer = `sq-v23-history-qlib-${suffix}`;
const postgresImage = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const qlibImage = process.env.STOCKQUANT_V23_QLIB_IMAGE ?? "stockquant-v12-qlib-worker:latest";
const owner = "acceptance-owner-1";
const decisionRef = "evidence/audits/2026-10-24-v22-c3-historical-research-decision.json";
const dataVersion = "baostock-c3-context-2024-01-02-2024-01-08-v1";
const services = [];
const createdDatabases = [];
let admin;
let browser;
let postgresCreated = false;
let qlibCreated = false;
let networkCreated = false;
let artifactRoot;

const token = () => randomBytes(48).toString("base64url");
const tokens = { platform: token(), replay: token(), trade: token(), worker: token() };

function docker(args, options = {}) { return spawnSync("docker", args, { cwd: root, encoding: "utf8", ...options }); }
function port() { return new Promise((resolvePort, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(error => error ? reject(error) : resolvePort(value)); }); }); }
function start(cwd, entry, env, args = []) { const child = spawn(process.execPath, [entry, ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"] }); const service = { child, output: "" }; for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { if (service.output.length < 12000) service.output += chunk.toString().slice(0, 12000 - service.output.length); }); services.push(service); return service; }
async function waitReady(service, url) { for (let index = 0; index < 180; index += 1) { if (service.child.exitCode !== null) throw new Error(`service exited before ready at ${url}: ${service.output}`); try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* bounded startup wait */ } await delay(100); } throw new Error(`service did not become ready at ${url}: ${service.output}`); }
async function stop(service) { if (!service || service.child.exitCode !== null) return; service.child.kill("SIGTERM"); await Promise.race([new Promise(done => service.child.once("exit", done)), delay(3000)]); if (service.child.exitCode === null) service.child.kill("SIGKILL"); }
async function post(url, body, cookie = true) { const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie: `sq_session=${owner}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) }); const value = await response.json().catch(() => ({})); assert.ok(response.ok, `${url} returned ${response.status}: ${JSON.stringify(value)}`); return value; }
function rawRows() { return ["07-minute-sh_600000.json", "08-minute-sh_600004.json", "09-minute-sh_600006.json"].flatMap((file) => JSON.parse(readFileSync(resolve(root, "data/local/baostock-c3-context-2024-01-02-2024-01-08-v1", file), "utf8")).rows); }
function minuteCsv() { const rows = rawRows(); assert.equal(rows.length, 720); return ["securityId,timestamp,open,high,low,close,volume,amount", ...rows.map(row => `${row.code.slice(3)}.SH,${row.time},${row.open},${row.high},${row.low},${row.close},${row.volume},${row.amount}`)].join("\n"); }

try {
  assert.equal(docker(["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.enable_ip_masquerade=false", network]).status, 0, "isolated Docker network creation failed"); networkCreated = true;
  const password = token();
  const runPostgres = docker(["run", "--detach", "--name", postgresContainer, "--network", network, "--publish", "127.0.0.1::5432", "--memory", "768m", "--cpus", "1", "--pids-limit", "128", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,size=512m", "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m", "-e", `POSTGRES_PASSWORD=${password}`, postgresImage]);
  assert.equal(runPostgres.status, 0, runPostgres.stderr || runPostgres.stdout); postgresCreated = true;
  let postgresPort;
  for (let index = 0; index < 120; index += 1) { const mapped = docker(["port", postgresContainer, "5432/tcp"]); if (mapped.status === 0 && mapped.stdout.trim()) { postgresPort = mapped.stdout.trim().split("\n")[0].split(":").at(-1); break; } await delay(100); }
  assert.ok(postgresPort); const adminUrl = `postgresql://postgres:${encodeURIComponent(password)}@127.0.0.1:${postgresPort}/postgres`;
  let adminConnected = false;
  for (let index = 0; index < 120; index += 1) {
    const candidate = new Client({ connectionString: adminUrl });
    try { await candidate.connect(); admin = candidate; adminConnected = true; break; }
    catch { await candidate.end().catch(() => {}); await delay(100); }
  }
  assert.ok(adminConnected, "isolated PostgreSQL did not become ready");
  const db = {}; for (const key of ["platform", "market", "portfolio", "trade", "governance", "quant", "replay"]) { const name = `sq_v23_history_${key}_${suffix}`; await admin.query(`CREATE DATABASE "${name}"`); createdDatabases.push(name); db[key] = new URL(adminUrl); db[key].pathname = `/${name}`; }

  const runQlib = docker(["run", "--detach", "--name", qlibContainer, "--network", network, "--publish", "127.0.0.1::3004", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m", "--memory", "2g", "--cpus", "1", "--pids-limit", "128", "-e", "HOME=/tmp", "-e", `STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE=${tokens.worker}`, qlibImage]);
  assert.equal(runQlib.status, 0, runQlib.stderr || runQlib.stdout); qlibCreated = true;
  let qlibBase;
  for (let index = 0; index < 120; index += 1) { const mapped = docker(["port", qlibContainer, "3004/tcp"]); if (mapped.status === 0 && mapped.stdout.trim()) { qlibBase = `http://${mapped.stdout.trim().split("\n")[0]}`; break; } await delay(100); }
  assert.ok(qlibBase); for (let index = 0; index < 180; index += 1) { try { if ((await fetch(`${qlibBase}/probe`, { headers: { "x-stockquant-service-id": "quant-research-service", authorization: `Bearer ${tokens.worker}` } })).ok) break; } catch { /* starting */ } await delay(100); }

  const base = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0", STOCKQUANT_V24_AUTO_START: "false", STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: tokens.platform, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: tokens.replay, STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: tokens.trade };
  const urls = {}; for (const key of ["governance", "portfolio", "trade", "quant", "market", "replay", "platform", "web"]) { const value = await port(); urls[key] = `http://127.0.0.1:${value}`; urls[`${key}Port`] = String(value); }
  const governance = start(resolve(root, "services/decision-governance-service"), resolve(root, "services/decision-governance-service/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.governancePort, STOCKQUANT_DATABASE_URL: db.governance.toString() }); await waitReady(governance, `${urls.governance}/ready`);
  const portfolio = start(resolve(root, "services/portfolio-risk-service"), resolve(root, "services/portfolio-risk-service/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.portfolioPort, STOCKQUANT_DATABASE_URL: db.portfolio.toString(), STOCKQUANT_SERVICE_TOKEN_TEST_HARNESS: token() }); await waitReady(portfolio, `${urls.portfolio}/ready`);
  const trade = start(resolve(root, "services/trade-execution-service"), resolve(root, "services/trade-execution-service/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.tradePort, STOCKQUANT_DATABASE_URL: db.trade.toString(), STOCKQUANT_PORTFOLIO_API_URL: urls.portfolio, STOCKQUANT_GOVERNANCE_URL: urls.governance }); await waitReady(trade, `${urls.trade}/ready`);
  const quant = start(resolve(root, "services/quant-research-service"), resolve(root, "services/quant-research-service/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.quantPort, STOCKQUANT_DATABASE_URL: db.quant.toString(), QLIB_WORKER_URL: qlibBase, STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE: tokens.worker }); await waitReady(quant, `${urls.quant}/ready`);
  const market = start(resolve(root, "services/market-data-service"), resolve(root, "services/market-data-service/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.marketPort, STOCKQUANT_DATABASE_URL: db.market.toString(), STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF: decisionRef, STOCKQUANT_MARKET_RESEARCH_DATA_VERSION: dataVersion, STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS: "baostock" }); await waitReady(market, `${urls.market}/ready`);
  const replay = start(resolve(root, "services/historical-replay-worker"), resolve(root, "services/historical-replay-worker/dist/main.js"), { ...base, STOCKQUANT_PORT: urls.replayPort, STOCKQUANT_DATABASE_URL: db.replay.toString(), STOCKQUANT_PORTFOLIO_API_URL: urls.portfolio, STOCKQUANT_TRADE_EXECUTION_URL: urls.trade, STOCKQUANT_GOVERNANCE_URL: urls.governance, STOCKQUANT_QUANT_RESEARCH_URL: urls.quant }); await waitReady(replay, `${urls.replay}/ready`);
  artifactRoot = mkdtempSync(join(tmpdir(), "stockquant-v23-history-artifacts-"));
  const platform = start(platformRoot, resolve(platformRoot, "dist/main.js"), { ...base, STOCKQUANT_PORT: urls.platformPort, STOCKQUANT_DATABASE_URL: db.platform.toString(), STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner, STOCKQUANT_MARKET_DATA_URL: urls.market, STOCKQUANT_PORTFOLIO_API_URL: urls.portfolio, STOCKQUANT_TRADE_EXECUTION_URL: urls.trade, STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: urls.replay, STOCKQUANT_QUANT_RESEARCH_URL: urls.quant, STOCKQUANT_GOVERNANCE_URL: urls.governance, STOCKQUANT_ARTIFACT_CONTENT_ROOT: artifactRoot }); await waitReady(platform, `${urls.platform}/ready`);

  const validFrom = "2024-01-02T00:00:00+08:00"; const validTo = "2024-01-08T23:59:59+08:00";
  const securities = ["600000.SH", "600004.SH", "600006.SH"].map(securityId => ({ securityId, validFrom, validTo }));
  const contexts = [
    ["SECURITY_UNIVERSE", "baostock-c3-security-universe-v1", { securities, assurance: "PARTIAL_SOURCE_SAMPLE_OWNER_ATTESTATION", limitations: ["Only the bounded three-security local sample is covered."] }],
    ["MARKET_RULE_SET", "baostock-c3-cn-a-rules-v1", { market: "CN_A", sessions: [{ start: "09:30", end: "11:30" }, { start: "13:00", end: "15:00" }], assurance: "PARTIAL_SOURCE_SAMPLE_OWNER_ATTESTATION", limitations: ["No claim of independently verified historical suspension or price-limit facts."] }],
    ["CORPORATE_ACTIONS", "baostock-c3-corporate-actions-v1", { securities, actions: [], actionCoverage: securities.map(item => ({ ...item, status: "UNKNOWN" })), assurance: "PARTIAL_SOURCE_SAMPLE_OWNER_ATTESTATION", limitations: ["An empty actions list is not a claim that no action occurred; the fact remains UNKNOWN."] }],
  ];
  for (const [kind, version, content] of contexts) await post(`${urls.platform}/api/v1/acceptance/v2/v2.3/historical-context/versions`, { kind, version, content, validFrom, validTo, sourceReference: `${decisionRef}; data/local/baostock-c3-context-2024-01-02-2024-01-08-v1/manifest.json` });
  const imported = await post(`${urls.platform}/api/v1/acceptance/v2/v2.2/csv/import`, { content: minuteCsv(), mapping: { securityId: "securityId", timestamp: "timestamp", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" }, provenance: { sourceName: "baostock", sourceReference: "data/local/baostock-c3-context-2024-01-02-2024-01-08-v1/manifest.json", licenseStatement: `Local bounded learning use approved by ${decisionRef}`, licenseVerification: "OPERATOR_CONFIRMED", acquiredAt: "2026-10-22T05:22:50.467Z" }, historicalContext: { securityUniverseVersion: contexts[0][1], marketRuleSetVersion: contexts[1][1], corporateActionVersion: contexts[2][1] }, market: "CN_A", frequency: "5m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_END", volumeUnit: "SHARES", amountUnit: "CNY" });
  assert.equal(imported.status, "PUBLISHED"); assert.equal(imported.accepted, 720);
  const readiness = await fetch(`${urls.market}/v2/minute/imports/${encodeURIComponent(imported.version)}/replay-readiness`, { headers: { "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${tokens.platform}` } }); const readinessBody = await readiness.json(); assert.equal(readiness.status, 200, JSON.stringify(readinessBody)); assert.equal(readinessBody.status, "READY");

  const web = start(resolve(root, "apps/web"), resolve(root, "apps/web/node_modules/vite/bin/vite.js"), { ...base, STOCKQUANT_PLATFORM_API_URL: urls.platform }, ["--host", "127.0.0.1", "--port", urls.webPort]); await waitReady(web, `${urls.web}/acceptance/v2/v2.3`);
  const requireFromWeb = createRequire(resolve(root, "apps/web/package.json")); const { chromium } = requireFromWeb("@playwright/test");
  browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); await page.context().addCookies([{ name: "sq_session", value: owner, url: urls.web }]); await page.goto(`${urls.web}/acceptance/v2/v2.3`); await page.getByLabel("分钟导入版本").fill(imported.version); await page.getByRole("button", { name: "校验并回放导入数据" }).click(); await page.waitForFunction(() => document.querySelector("[data-testid='v23-evidence']")?.textContent?.includes('"COMPLETED"'), null, { timeout: 120000 }); const run = JSON.parse(await page.getByTestId("v23-evidence").innerText()).run;
  assert.equal(run.status, "COMPLETED"); assert.equal(run.evidence.dataMode, "USER_ARCHIVE"); assert.equal(run.assertions.find(item => item.assertionId === "V2.3-IMPORTED-MINUTE-001")?.status, "PASS"); assert.equal(run.evidence.replaySample.consumedBars, 120);
  const cli = spawnSync(process.execPath, [resolve(root, "scripts/verify-stage.mjs"), "--stage", "V2.3", "--run", run.testRunId, "--check-only"], { cwd: root, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: urls.platform, STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${owner}` }, encoding: "utf8" }); assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  const evidence = spawnSync(process.execPath, [resolve(root, "scripts/evidence-export.mjs"), "--stage", "V2.3", "--run", run.testRunId], { cwd: root, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: urls.platform, STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${owner}` }, encoding: "utf8" }); assert.equal(evidence.status, 0, evidence.stderr || evidence.stdout); const exported = JSON.parse(evidence.stdout);
  console.log(JSON.stringify({ status: "PASS", stage: "V2.3", testRunId: run.testRunId, dataVersion: imported.version, sourceDataset: dataVersion, acceptedBars: imported.accepted, replayBars: run.evidence.replaySample.consumedBars, readiness: readinessBody.status, dataMode: run.evidence.dataMode, brokerMode: "FAKE", providerRequests: 0, cliCheckOnly: cli.status, evidenceExport: exported, limitations: "Historical context is structural owner attestation; corporate actions, suspensions, and rule facts remain partial/UNKNOWN." }));
} finally {
  if (browser) await browser.close().catch(() => {}); await Promise.all(services.reverse().map(stop)); if (admin) { for (const name of createdDatabases.reverse()) await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`).catch(() => {}); await admin.end().catch(() => {}); } if (qlibCreated) docker(["rm", "--force", qlibContainer]); if (postgresCreated) docker(["rm", "--force", postgresContainer]); if (networkCreated) docker(["network", "rm", network]); if (artifactRoot) rmSync(artifactRoot, { recursive: true, force: true });
}
