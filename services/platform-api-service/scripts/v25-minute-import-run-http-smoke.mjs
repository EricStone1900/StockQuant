import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { Client } from "pg";
import { setTimeout as delay } from "node:timers/promises";

const adminUrl = new URL(process.env.STOCKQUANT_V25_MINUTE_IMPORT_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(adminUrl.username, "postgres"); assert.equal(adminUrl.hostname, "127.0.0.1"); assert.equal(adminUrl.pathname, "/postgres");
const isolatedContainer = process.env.STOCKQUANT_ISOLATED_PG_CONTAINER;
if (isolatedContainer) {
  assert.match(isolatedContainer, /^sq-test-postgres-[a-f0-9]+$/u);
  const inspected = spawnSync("docker", ["inspect", isolatedContainer], { encoding: "utf8", timeout: 5_000 }); assert.equal(inspected.status, 0);
  const container = JSON.parse(inspected.stdout)[0]; const binding = container.NetworkSettings?.Ports?.["5432/tcp"]?.[0];
  assert.equal(container.Name, `/${isolatedContainer}`); assert.equal(container.Config?.Image, container.Image); assert.match(container.Image ?? "", /^sha256:[a-f0-9]{64}$/u); assert.match(container.HostConfig?.NetworkMode ?? "", /^sq-test-net-[a-f0-9]+$/u); assert.equal(binding?.HostIp, "127.0.0.1"); assert.equal(adminUrl.port, binding?.HostPort);
} else assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres");

const suffix = randomUUID().replaceAll("-", ""); const platformDbName = `sq_v25_import_platform_${suffix}`; const marketDbName = `sq_v25_import_market_${suffix}`;
const platformUrl = new URL(adminUrl); platformUrl.pathname = `/${platformDbName}`; const marketUrl = new URL(adminUrl); marketUrl.pathname = `/${marketDbName}`;
const admin = new Client({ connectionString: adminUrl.toString() }); const platformDb = new Client({ connectionString: platformUrl.toString() }); const marketDb = new Client({ connectionString: marketUrl.toString() });
const children = []; let platformCreated = false; let marketCreated = false; let browser; let importedVersion; let testRunId; let evidenceExport;
function port() { return new Promise((resolvePort, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); }); }); }
function start(script, cwd, env, args = []) { const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"] }); const entry = { child, output: "" }; for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (entry.output.length < 5000) entry.output += chunk.toString().slice(0, 5000 - entry.output.length); }); children.push(entry); return entry; }
async function waitLive(entry, url) { for (let attempt = 0; attempt < 120; attempt += 1) { if (entry.child.exitCode !== null) throw new Error(`service exited: ${entry.output}`); try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* service is starting */ } await delay(100); } throw new Error(`service did not become ready: ${entry.output}`); }
async function stop(entry) { if (!entry || entry.child.exitCode !== null) return; entry.child.kill("SIGTERM"); await Promise.race([new Promise((done) => entry.child.once("exit", done)), delay(3000)]); if (entry.child.exitCode === null) entry.child.kill("SIGKILL"); }

try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${platformDbName}"`); platformCreated = true; await admin.query(`CREATE DATABASE "${marketDbName}"`); marketCreated = true; await platformDb.connect(); await marketDb.connect();
  const platformRoot = resolve(process.cwd()); const repoRoot = resolve(platformRoot, "../.."); const marketRoot = resolve(repoRoot, "services/market-data-service"); const owner = "acceptance-owner-1"; const token = `v25-import-${randomUUID()}-${randomUUID()}`; const baseEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test" };
  const marketPort = await port(); const platformPort = await port(); const webPort = await port(); const marketBase = `http://127.0.0.1:${marketPort}`; const platformBase = `http://127.0.0.1:${platformPort}`; const webBase = `http://127.0.0.1:${webPort}`;
  const market = start(resolve(marketRoot, "dist/main.js"), marketRoot, { ...baseEnv, STOCKQUANT_PROJECT_ROOT: repoRoot, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(marketPort), STOCKQUANT_DATABASE_URL: marketUrl.toString(), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token, STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0" });
  await waitLive(market, `${marketBase}/ready`);
  const platform = start(resolve(platformRoot, "dist/main.js"), platformRoot, { ...baseEnv, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(platformPort), STOCKQUANT_DATABASE_URL: platformUrl.toString(), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: token, STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner, STOCKQUANT_MARKET_DATA_URL: marketBase, STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1", STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1" });
  await waitLive(platform, `${platformBase}/live`);

  const importedResponse = await fetch(`${platformBase}/api/v1/acceptance/v2/v2.2/import`, { method: "POST", headers: { cookie: `sq_session=${owner}`, "content-type": "application/json" }, body: JSON.stringify({ fixture: "normal" }) });
  assert.equal(importedResponse.status, 201); const imported = await importedResponse.json(); assert.equal(imported.status, "PUBLISHED"); assert.ok(imported.accepted > 0); importedVersion = imported.version;
  const persisted = await marketDb.query("SELECT import_id,version,status,accepted,source_sha256 FROM market_data_minute_imports WHERE version=$1", [importedVersion]); assert.equal(persisted.rowCount, 1); assert.equal(persisted.rows[0].status, "PUBLISHED");
  const persistedRows = await marketDb.query("SELECT count(*)::int AS count FROM market_data_minute_import_bars_by_day WHERE version=$1", [importedVersion]); assert.equal(persistedRows.rows[0].count, imported.accepted);

  const web = start(resolve(repoRoot, "apps/web/node_modules/vite/bin/vite.js"), resolve(repoRoot, "apps/web"), { ...baseEnv, STOCKQUANT_PLATFORM_API_URL: platformBase }, ["--host", "127.0.0.1", "--port", String(webPort), "--strictPort"]);
  await waitLive(web, `${webBase}/acceptance/v2/v2.5`);
  console.log(JSON.stringify({ webUrl: `${webBase}/acceptance/v2/v2.5`, platformApiUrl: platformBase, marketDataUrl: marketBase, ownerIdentity: owner }));
  const requireFromWeb = createRequire(resolve(repoRoot, "apps/web/package.json")); const { chromium } = requireFromWeb("@playwright/test"); browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
  await page.goto(`${webBase}/acceptance/v2/v2.5`); await page.getByLabel("V2.5分钟导入版本").fill(importedVersion); await page.getByRole("button", { name: "核验持久导入并创建TestRun" }).click();
  await page.waitForFunction(() => { try { return JSON.parse(document.querySelector('[data-testid="v25-evidence"]')?.textContent ?? "{}").status === "COMPLETED"; } catch { return false; } }, null, { timeout: 15000 });
  const webRun = JSON.parse(await page.getByTestId("v25-evidence").innerText()); testRunId = webRun.testRunId; assert.ok(testRunId); assert.equal(webRun.evidence.evidenceMode, "PERSISTED_MARKET_DATA_IMPORT_QUERY"); assert.equal(webRun.evidence.import.dataVersion, importedVersion); assert.equal(webRun.evidence.import.sha256, persisted.rows[0].source_sha256); assert.equal(webRun.evidence.persistedQuery.rows, Math.min(100, imported.accepted)); assert.ok(webRun.assertions.every((item) => item.status === "PASS"));
  const dbRun = await platformDb.query("SELECT stage_id,scenario_id,status,evidence FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]); assert.equal(dbRun.rowCount, 1); assert.deepEqual([dbRun.rows[0].stage_id, dbRun.rows[0].scenario_id, dbRun.rows[0].status], ["V2.5", "minute-import-query", "COMPLETED"]); assert.equal(dbRun.rows[0].evidence.import.dataVersion, importedVersion);
  const ownerRead = await fetch(`${platformBase}/api/v1/acceptance/v2/v2.5/runs/${testRunId}`, { headers: { cookie: `sq_session=${owner}` } }); assert.equal(ownerRead.status, 200); const runRead = await ownerRead.json(); assert.equal(runRead.evidence.persistedQuery.rows, webRun.evidence.persistedQuery.rows);
  const foreignRead = await fetch(`${platformBase}/api/v1/acceptance/v2/v2.5/runs/${testRunId}`, { headers: { cookie: "sq_session=another-user" } }); assert.equal(foreignRead.status, 403);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V2.5", "--run", testRunId, "--check-only"], { cwd: repoRoot, encoding: "utf8", timeout: 15000, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: platformBase, STOCKQUANT_SESSION_COOKIE: `sq_session=${owner}` } }); assert.equal(cli.status, 0, cli.stderr || cli.stdout); assert.match(cli.stdout, /"checkOnly": true/u); assert.match(cli.stdout, new RegExp(testRunId));
  const evidence = spawnSync(process.execPath, [resolve(repoRoot, "scripts/evidence-export.mjs"), "--stage", "V2.5", "--run", testRunId], { cwd: repoRoot, encoding: "utf8", timeout: 15000, env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: platformBase, STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${owner}` } }); assert.equal(evidence.status, 0, evidence.stderr || evidence.stdout); evidenceExport = JSON.parse(evidence.stdout); assert.equal(evidenceExport.stageId, "V2.5"); assert.equal(evidenceExport.testRunId, testRunId); assert.match(evidenceExport.manifestHash, /^[0-9a-f]{64}$/u);
  const exportedEvidence = JSON.parse(await readFile(join(evidenceExport.outputDirectory, "evidence.json"), "utf8")); assert.equal(exportedEvidence.testRunId, testRunId); assert.ok(exportedEvidence.humanAcceptance === undefined || exportedEvidence.humanAcceptance === "NOT_RUN"); assert.equal(evidenceExport.kind, "TEST_RUN_EVIDENCE");
  const exportedManifest = await readFile(join(evidenceExport.outputDirectory, "manifest.sha256"), "utf8"); assert.match(exportedManifest, new RegExp(evidenceExport.manifestHash));
  console.log(JSON.stringify({ stageId: "V2.5", testRunId, dataVersion: importedVersion, importId: persisted.rows[0].import_id, importedRows: imported.accepted, persistedQueryRows: webRun.evidence.persistedQuery.rows, pageAssertions: webRun.assertions.map((item) => ({ id: item.assertionId, status: item.status })), sameRunCliExitCode: cli.status, evidenceExportExitCode: evidence.status, evidenceExportManifestHash: evidenceExport.manifestHash, evidenceExportHumanAcceptance: exportedEvidence.humanAcceptance, foreignOwnerStatus: foreignRead.status, persistedPlatformRunRows: dbRun.rowCount }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? `${error.message}\n${children.map((entry) => entry.output).join("\n")}` : error); process.exitCode = 1;
} finally {
  await browser?.close().catch(() => undefined);
  for (const entry of [...children].reverse()) await stop(entry);
  await platformDb.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]).catch(() => undefined);
  if (platformDb._connected) await platformDb.end().catch(() => undefined);
  if (marketDb._connected) await marketDb.end().catch(() => undefined);
  if (platformCreated || marketCreated) {
    const cleanup = new Client({ connectionString: adminUrl.toString() }); await cleanup.connect();
    if (platformCreated) await cleanup.query(`DROP DATABASE "${platformDbName}" WITH (FORCE)`);
    if (marketCreated) await cleanup.query(`DROP DATABASE "${marketDbName}" WITH (FORCE)`);
    const leftovers = await cleanup.query("SELECT datname FROM pg_database WHERE datname=ANY($1::text[])", [[platformDbName, marketDbName]]); assert.equal(leftovers.rowCount, 0); await cleanup.end();
  }
  await admin.end().catch(() => undefined);
}
