import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Client } from "pg";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve("../..");
const serviceRoot = process.cwd();
const quantRoot = resolve(root, "services/quant-research-service");
const webRoot = resolve(root, "apps/web");
const suffix = randomUUID().replaceAll("-", "");
function collectSourceFiles(directory) {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return collectSourceFiles(path);
    return /\.(?:ts|tsx|css)$/u.test(entry.name) ? [path] : [];
  });
}
const workspaceInputs = [
  ...collectSourceFiles("services/platform-api-service/src"),
  ...collectSourceFiles("services/quant-research-service/src"),
  ...collectSourceFiles("apps/web/src"),
  ...collectSourceFiles("services/platform-api-service/tests/unit"),
  "packages/artifact-content-store/index.mjs",
  "packages/artifact-content-store/index.test.mjs",
  "services/platform-api-service/scripts/v23-qlib-fixture-testrun-http-smoke.mjs",
  "services/quant-research-service/qlib-worker.py",
  "services/quant-research-service/qlib-worker.Dockerfile",
  "services/quant-research-service/qlib-worker-requirements.lock",
  "services/quant-research-service/qlib-worker-build-tools.lock",
  "fixtures/v2/v2.3/qlib-fit/manifest.json",
  "fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json",
  "packages/contracts/research/qlib-fit-fixture-request.schema.json",
  "packages/contracts/research/qlib-fit-fixture-result.schema.json",
  "packages/contracts/openapi/quant-qlib.v1.json",
  "pnpm-lock.yaml",
].sort();
const codeVersion = `sha256:${createHash("sha256").update(workspaceInputs.map(path => `${path}\0${createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex")}`).join("\n")).digest("hex")}`;
const postgresNetwork = `sq-v23-qlib-network-${suffix}`;
const postgresContainer = `sq-v23-qlib-postgres-${suffix}`;
const platformDatabase = `sq_v23_qlib_platform_${suffix}`;
const quantDatabase = `sq_v23_qlib_quant_${suffix}`;
const postgresImage = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const children = [];
const image = `stockquant-qlib-v23-smoke:${suffix}`;
const container = `stockquant-qlib-v23-${suffix}`;
const artifactRoot = mkdtempSync(join(tmpdir(), `stockquant-qlib-v23-content-${suffix}-`));
let platformCreated = false; let quantCreated = false; let adminConnected = false; let imageCreated = false; let containerCreated = false; let postgresCreated = false; let networkCreated = false; let browser;
let admin; let platformDb; let adminUrl; let platformUrl; let quantUrl;
const owner = "acceptance-owner-1";
const platformToken = randomBytes(48).toString("base64url");
const replayToken = randomBytes(48).toString("base64url");
const workerToken = randomBytes(48).toString("base64url");
let platform; let quant; let web; let testRunId;

function port() {
  return new Promise((resolvePort, reject) => {
    const server = createServer(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close(error => error ? reject(error) : resolvePort(value)); });
  });
}
function start(command, args, cwd, env) {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const entry = { child, output: "" };
  for (const stream of [child.stdout, child.stderr]) stream.on("data", chunk => { if (entry.output.length < 8000) entry.output += chunk.toString().slice(0, 8000 - entry.output.length); });
  children.push(entry); return entry;
}
async function waitLive(entry, url) {
  for (let index = 0; index < 180; index += 1) {
    if (entry.child.exitCode !== null) throw new Error(`service exited before ready at ${url}: ${entry.output}`);
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch { /* service is starting */ }
    await delay(100);
  }
  throw new Error(`service did not become ready at ${url}: ${entry.output}`);
}
async function stop(entry) {
  if (!entry || entry.child.exitCode !== null) return;
  entry.child.kill("SIGTERM");
  await Promise.race([new Promise(done => entry.child.once("exit", done)), delay(3000)]);
  if (entry.child.exitCode === null) entry.child.kill("SIGKILL");
}
function docker(args, options = {}) { return spawnSync("docker", args, { cwd: root, encoding: "utf8", ...options }); }

try {
  const network = docker(["network", "create", "--driver", "bridge", "--opt", "com.docker.network.bridge.enable_ip_masquerade=false", postgresNetwork]);
  assert.equal(network.status, 0, network.stderr || network.stdout); networkCreated = true;
  const networkState = docker(["network", "inspect", postgresNetwork, "--format", "{{json .}}"]);
  assert.equal(networkState.status, 0, networkState.stderr || networkState.stdout);
  const networkConfig = JSON.parse(networkState.stdout);
  assert.equal(networkConfig.Driver, "bridge"); assert.equal(networkConfig.Internal, false);
  assert.equal(networkConfig.Options?.["com.docker.network.bridge.enable_ip_masquerade"], "false", "test PostgreSQL bridge must not expose container egress through NAT");
  const postgresPassword = randomBytes(36).toString("base64url");
  const postgres = docker(["run", "--detach", "--name", postgresContainer, "--network", postgresNetwork, "--publish", "127.0.0.1::5432", "--memory", "768m", "--cpus", "1", "--pids-limit", "128", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,size=512m", "--tmpfs", "/tmp:rw,noexec,nosuid,size=128m", "-e", `POSTGRES_PASSWORD=${postgresPassword}`, postgresImage]);
  assert.equal(postgres.status, 0, postgres.stderr || postgres.stdout); postgresCreated = true;
  let postgresHostPort;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const mapped = docker(["port", postgresContainer, "5432/tcp"]);
    if (mapped.status === 0 && mapped.stdout.trim()) { postgresHostPort = mapped.stdout.trim().split("\n")[0].split(":").at(-1); break; }
    await delay(100);
  }
  assert.ok(postgresHostPort && /^\d+$/u.test(postgresHostPort), "isolated PostgreSQL must publish a loopback-only ephemeral port");
  adminUrl = new URL(`postgresql://postgres:${encodeURIComponent(postgresPassword)}@127.0.0.1:${postgresHostPort}/postgres`);
  platformUrl = new URL(adminUrl); platformUrl.pathname = `/${platformDatabase}`;
  quantUrl = new URL(adminUrl); quantUrl.pathname = `/${quantDatabase}`;
  admin = new Client({ connectionString: adminUrl.toString() });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try { await admin.connect(); adminConnected = true; break; }
    catch { await delay(250); admin = new Client({ connectionString: adminUrl.toString() }); }
  }
  assert.ok(adminConnected, "isolated PostgreSQL must become ready");
  await admin.query(`CREATE DATABASE "${platformDatabase}"`); platformCreated = true;
  await admin.query(`CREATE DATABASE "${quantDatabase}"`); quantCreated = true;
  platformDb = new Client({ connectionString: platformUrl.toString() });
  await platformDb.connect();

  const qlibDir = resolve(root, "services/quant-research-service");
  const dockerBuild = docker(["build", "--platform", "linux/amd64", "--tag", image, "--file", resolve(qlibDir, "qlib-worker.Dockerfile"), qlibDir], { stdio: "inherit" });
  assert.equal(dockerBuild.status, 0, dockerBuild.stderr || dockerBuild.stdout); imageCreated = true;
  const dockerRun = docker(["run", "--detach", "--name", container, "--platform", "linux/amd64", "--publish", "127.0.0.1::3004", "--memory", "2g", "--cpus", "1", "--pids-limit", "128", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m", "-e", "HOME=/tmp", "-e", `STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE=${workerToken}`, image]);
  assert.equal(dockerRun.status, 0, dockerRun.stderr || dockerRun.stdout); containerCreated = true;
  let workerBase;
  for (let index = 0; index < 120; index += 1) {
    const mapped = docker(["port", container, "3004/tcp"]);
    if (mapped.status === 0 && mapped.stdout.trim()) { workerBase = `http://${mapped.stdout.trim().split("\n")[0]}`; break; }
    await delay(100);
  }
  assert.ok(workerBase, "Qlib Worker container must publish only a loopback host port");
  let workerReady = false;
  for (let index = 0; index < 180; index += 1) {
    try {
      const response = await fetch(`${workerBase}/probe`, { headers: { authorization: `Bearer ${workerToken}`, "x-stockquant-service-id": "quant-research-service" }, signal: AbortSignal.timeout(1000) });
      if (response.ok) { workerReady = true; break; }
    } catch { /* container is starting */ }
    await delay(100);
  }
  assert.ok(workerReady, "Qlib Worker must become ready behind its service identity");

  const baseEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp", NODE_ENV: "test", STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_V24_AUTO_START: "false", STOCKQUANT_SCHEDULER_WORKER: "0", STOCKQUANT_COLLECTION_EXECUTOR: "0" };
  const quantPort = await port(); const quantBase = `http://127.0.0.1:${quantPort}`;
  quant = start(process.execPath, [resolve(quantRoot, "dist/main.js")], quantRoot, {
    ...baseEnv, STOCKQUANT_PORT: String(quantPort), STOCKQUANT_DATABASE_URL: quantUrl.toString(), QLIB_WORKER_URL: workerBase,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: replayToken,
    STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE: workerToken,
  });
  await waitLive(quant, `${quantBase}/ready`);

  const platformPort = await port(); const platformBase = `http://127.0.0.1:${platformPort}`;
  platform = start(process.execPath, [resolve(serviceRoot, "dist/main.js")], serviceRoot, {
    ...baseEnv, STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(platformPort), STOCKQUANT_DATABASE_URL: platformUrl.toString(), STOCKQUANT_CODE_VERSION: codeVersion,
    STOCKQUANT_ARTIFACT_CONTENT_ROOT: artifactRoot,
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_LOCAL_DEVELOPMENT_USER: owner,
    STOCKQUANT_QUANT_RESEARCH_URL: quantBase, STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1",
    STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1", STOCKQUANT_MARKET_DATA_URL: "http://127.0.0.1:1", STOCKQUANT_RESEARCH_AUTOMATION_URL: "http://127.0.0.1:1",
  });
  await waitLive(platform, `${platformBase}/live`);

  const webPort = await port(); const webBase = `http://127.0.0.1:${webPort}`;
  web = start(process.execPath, [resolve(webRoot, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", String(webPort)], webRoot, { ...baseEnv, STOCKQUANT_PLATFORM_API_URL: platformBase });
  await waitLive(web, webBase);

  const require = createRequire(resolve(webRoot, "package.json"));
  const { chromium } = require("@playwright/test");
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies([{ name: "sq_session", value: owner, url: webBase }]);
  const page = await context.newPage();
  await page.goto(`${webBase}/acceptance/v2/v2.3`);
  await page.getByRole("button", { name: "运行合成 Fixture Qlib TestRun" }).click();
  await page.waitForFunction(() => document.querySelector("[data-testid=\"v23-qlib-fixture-evidence\"]")?.textContent?.includes('"status": "COMPLETED"'), null, { timeout: 120_000 });
  const run = JSON.parse(await page.getByTestId("v23-qlib-fixture-evidence").innerText());
  testRunId = run.testRunId;
  assert.equal(run.stageId, "V2.3"); assert.equal(run.scenarioId, "qlib-fixture"); assert.equal(run.ownerId, owner); assert.equal(run.assertions[0].status, "PASS");
  assert.match(run.evidence.crossService.research.modelSha256, /^[a-f0-9]{64}$/u);
  assert.match(run.evidence.crossService.research.testPredictionsSha256, /^[a-f0-9]{64}$/u);
  assert.equal(run.evidence.crossService.research.status, "COMPLETED"); assert.equal(run.evidence.crossService.research.adapter, "qlib");
  assert.equal(run.evidence.crossService.research.dataMode, "FIXTURE"); assert.equal(run.evidence.crossService.research.modelTraining, "PASS");
  assert.equal(run.evidence.crossService.research.qlibVersion, "0.9.6"); assert.equal(run.evidence.crossService.research.lightgbmVersion, "4.7.0");
  assert.equal(run.evidence.crossService.research.temporalValidation, "PASS"); assert.equal(run.evidence.crossService.research.testPredictionCount, 24);
  assert.equal(run.evidence.crossService.research.testPredictionsFinite, true);
  assert.equal(run.evidence.crossService.research.modelValidation, "NOT_RUN"); assert.equal(run.evidence.crossService.research.durableArtifactStatus, "PERSISTED");
  assert.equal(run.evidence.codeVersion, codeVersion, "TestRun must bind to the exact Platform/Quant/Web/Worker/Fixture/shared-Artifact workspace digest");
  const artifactRef = run.evidence.crossService.research.artifactRef;
  assert.match(artifactRef.artifactId, /^[a-f0-9]{64}$/u); assert.equal(artifactRef.sha256, artifactRef.artifactId);
  const contentFile = join(artifactRoot, "research", testRunId, "qlib-fixture", artifactRef.sha256, artifactRef.artifactId);
  const contentBefore = await readFile(contentFile);
  assert.equal(createHash("sha256").update(contentBefore).digest("hex"), artifactRef.sha256);
  const artifactPath = `/api/v1/acceptance/v2/v2.3/runs/${testRunId}/artifacts/${artifactRef.artifactId}`;
  const artifactRead = await fetch(`${platformBase}${artifactPath}`, { headers: { cookie: `sq_session=${owner}` } });
  assert.equal(artifactRead.status, 200);
  const artifactBody = await artifactRead.json();
  assert.equal(artifactBody.sha256, artifactRef.sha256); assert.equal(artifactBody.payload.predictions.length, 24);
  assert.equal(Buffer.from(artifactBody.payload.modelBase64, "base64").length > 0, true);
  const foreignArtifact = await fetch(`${platformBase}${artifactPath}`, { headers: { cookie: "sq_session=another-user" } });
  assert.equal(foreignArtifact.status, 403);
  assert.equal(run.evidence.crossService.research.profitabilityClaim, "NOT_MADE");
  const ownerRead = await fetch(`${platformBase}/api/v1/acceptance/v2/v2.3/runs/${testRunId}`, { headers: { cookie: `sq_session=${owner}` } });
  assert.equal(ownerRead.status, 200); assert.equal((await ownerRead.json()).testRunId, testRunId);
  const foreignRead = await fetch(`${platformBase}/api/v1/acceptance/v2/v2.3/runs/${testRunId}`, { headers: { cookie: "sq_session=another-user" } });
  assert.equal(foreignRead.status, 403);

  const before = await platformDb.query("SELECT status, assertions, evidence FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
  const artifactBefore = await platformDb.query("SELECT artifact_id,sha256,payload FROM qlib_fixture_artifacts WHERE test_run_id=$1", [testRunId]);
  assert.equal(artifactBefore.rowCount, 1); assert.equal(artifactBefore.rows[0].artifact_id.trim(), artifactRef.artifactId);
  assert.equal(before.rowCount, 1); assert.equal(before.rows[0].status, "COMPLETED");
  const cli = spawnSync(process.execPath, [resolve(root, "scripts/verify-stage.mjs"), "--stage", "V2.3", "--run", testRunId, "--check-only"], { cwd: root, env: { ...baseEnv, STOCKQUANT_PLATFORM_API_URL: platformBase }, encoding: "utf8" });
  assert.equal(cli.status, 0, cli.stderr || cli.stdout);
  assert.match(cli.stdout, new RegExp(`"testRunId":\\s*"${testRunId}"`));
  const after = await platformDb.query("SELECT status, assertions, evidence FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
  const artifactAfter = await platformDb.query("SELECT artifact_id,sha256,payload FROM qlib_fixture_artifacts WHERE test_run_id=$1", [testRunId]);
  assert.deepEqual(after.rows, before.rows, "CLI check-only must not mutate the TestRun");
  assert.deepEqual(artifactAfter.rows, artifactBefore.rows, "CLI check-only must not mutate durable artifact storage");
  const evidenceExport = spawnSync(process.execPath, [resolve(root, "scripts/evidence-export.mjs"), "--stage", "V2.3", "--run", testRunId], { cwd: root, env: { ...baseEnv, STOCKQUANT_PLATFORM_API_URL: platformBase, STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${owner}` }, encoding: "utf8" });
  assert.equal(evidenceExport.status, 0, evidenceExport.stderr || evidenceExport.stdout);
  const exportEvidence = JSON.parse(evidenceExport.stdout);
  assert.equal(exportEvidence.stageId, "V2.3"); assert.equal(exportEvidence.kind, "TEST_RUN_EVIDENCE"); assert.ok(/^[a-f0-9]{64}$/u.test(exportEvidence.manifestHash));
  const exportedArtifact = JSON.parse(await readFile(resolve(root, exportEvidence.outputDirectory, "qlib-fixture-artifact.json"), "utf8"));
  assert.equal(exportedArtifact.testRunId, testRunId); assert.equal(exportedArtifact.ownerId, owner); assert.equal(exportedArtifact.sha256, artifactRef.sha256);
  assert.equal(exportedArtifact.artifactId, artifactRef.artifactId); assert.equal(exportedArtifact.payload.predictions.length, 24);
  const exportManifest = await readFile(resolve(root, exportEvidence.outputDirectory, "manifest.sha256"), "utf8");
  assert.equal(createHash("sha256").update(exportManifest).digest("hex"), exportEvidence.manifestHash);
  assert.equal(exportManifest.trim().split("\n").length, 2, "export manifest covers both TestRun JSON and durable model/prediction Artifact");
  const finalRead = await platformDb.query("SELECT status, assertions, evidence FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
  assert.deepEqual(finalRead.rows, before.rows, "CLI check-only and evidence export must not mutate the TestRun");
  assert.deepEqual((await platformDb.query("SELECT artifact_id,sha256,payload FROM qlib_fixture_artifacts WHERE test_run_id=$1", [testRunId])).rows, artifactBefore.rows, "evidence export must not mutate the artifact");
  assert.deepEqual(await readFile(contentFile), contentBefore, "CLI check-only and evidence export must not mutate shared content bytes");
  console.log(JSON.stringify({ status: "PASS", stage: "V2.3", testRunId, codeVersion, workspaceInputs: workspaceInputs.length, path: "Web -> Platform -> Quant Research -> Qlib Worker -> shared immutable content volume + Platform PostgreSQL reference", qlibVersion: run.evidence.crossService.research.qlibVersion, lightgbmVersion: run.evidence.crossService.research.lightgbmVersion, predictionCount: run.evidence.crossService.research.testPredictionCount, independentValidation: "NOT_RUN", durableArtifact: "SHARED_CONTENT_AND_OWNER_SCOPED_REFERENCE", artifactSha256: artifactRef.sha256, artifactRead: 200, foreignArtifact: 403, dataMode: "FIXTURE", externalSources: 0, brokerMode: "FAKE", foreignOwner: 403, cliCheckOnly: cli.status, cliMutation: "NONE", evidenceExport: { outputDirectory: exportEvidence.outputDirectory, manifestHash: exportEvidence.manifestHash, attachment: "qlib-fixture-artifact.json", manifestEntries: 2 }, isolatedDatabases: [platformDatabase, quantDatabase], runtime: "linux/amd64 Qlib Worker emulated on Apple Silicon" }));
} finally {
  if (browser) await browser.close();
  await Promise.all([stop(web), stop(platform), stop(quant)]);
  await platformDb?.end().catch(() => {});
  if (adminConnected) {
    if (platformCreated) await admin.query(`DROP DATABASE IF EXISTS "${platformDatabase}" WITH (FORCE)`);
    if (quantCreated) await admin.query(`DROP DATABASE IF EXISTS "${quantDatabase}" WITH (FORCE)`);
  }
  await admin?.end().catch(() => {});
  if (containerCreated) docker(["rm", "--force", container]);
  if (imageCreated) docker(["image", "rm", "--force", image]);
  if (postgresCreated) docker(["rm", "--force", postgresContainer]);
  if (networkCreated) docker(["network", "rm", postgresNetwork]);
  rmSync(artifactRoot, { recursive: true, force: true });
  console.log(JSON.stringify({ cleanup: "PASS", isolatedPostgresRemoved: postgresCreated, isolatedPostgresNetworkRemoved: networkCreated, platformDatabaseDropped: platformCreated, quantDatabaseDropped: quantCreated, temporaryQlibContainerRemoved: containerCreated, temporaryQlibImageRemoved: imageCreated, sharedContentDirectoryRemoved: true }));
}
