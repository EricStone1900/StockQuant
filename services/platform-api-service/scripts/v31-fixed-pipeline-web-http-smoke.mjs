import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { Client, Pool } from "pg";

const adminUrl = new URL(process.env.STOCKQUANT_V31_WEB_SMOKE_ADMIN_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/postgres");
assert.equal(adminUrl.username, "postgres");
assert.equal(`${adminUrl.hostname}:${adminUrl.port}${adminUrl.pathname}`, "127.0.0.1:5433/postgres", "smoke is restricted to the local PostgreSQL admin endpoint");
const suffix = randomUUID().replaceAll("-", "");
const researchDatabase = `stockquant_v31_web_research_${suffix}`;
const platformDatabase = `stockquant_v31_web_platform_${suffix}`;
const researchUrl = new URL(adminUrl); researchUrl.pathname = `/${researchDatabase}`;
const platformUrl = new URL(adminUrl); platformUrl.pathname = `/${platformDatabase}`;
const tempRoot = await mkdtemp(join(tmpdir(), "stockquant-v31-fixed-web-smoke-"));
const artifactRoot = join(tempRoot, "artifacts"); const managedRoot = join(tempRoot, "managed");
const platformToken = randomBytes(48).toString("base64url"); const runnerToken = randomBytes(48).toString("base64url");
const ownerId = "acceptance-owner-1"; const imageDigest = process.env.STOCKQUANT_RUNNER_IMAGE_DIGEST ?? "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb";
assert.match(imageDigest, /^sha256:[a-f0-9]{64}$/u);
const admin = new Client({ connectionString: adminUrl.toString() }); const platformPool = new Pool({ connectionString: platformUrl.toString() }); const researchPool = new Pool({ connectionString: researchUrl.toString() });
const children = []; let createdResearch = false; let createdPlatform = false; let testRunId; let experimentId; let jobId; let inputNamespace; let outputNamespace; let runnerHost;

function port() { return new Promise((resolvePort, reject) => { const server = createServer(); server.once("error", reject); server.listen(0, "127.0.0.1", () => { const value = server.address().port; server.close((error) => error ? reject(error) : resolvePort(value)); }); }); }
function start(script, cwd, env, args = []) {
  const child = spawn(process.execPath, [script, ...args], { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
  const entry = { child, output: "" }; for (const stream of [child.stdout, child.stderr]) stream.on("data", (chunk) => { if (entry.output.length < 12000) entry.output += chunk.toString().slice(0, 12000 - entry.output.length); });
  children.push(entry); return entry;
}
async function stop(entry) { if (!entry || entry.child.exitCode !== null) return; entry.child.kill("SIGTERM"); await Promise.race([new Promise((resolveExit) => entry.child.once("exit", resolveExit)), delay(3000)]); if (entry.child.exitCode === null) entry.child.kill("SIGKILL"); }
async function waitLive(entry, url) { for (let i = 0; i < 120; i += 1) { if (entry.child.exitCode !== null) throw new Error(`service exited during startup: ${entry.output}`); try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) return; } catch { /* starting */ } await delay(100); } throw new Error(`service did not become live: ${entry.output}`); }
async function request(base, path, { method = "GET", body, user = ownerId } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: { "x-stockquant-user": user, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(10000) });
  const value = await response.json().catch(() => ({ error: "invalid JSON response" })); return { response, value };
}

try {
  await admin.connect(); await admin.query(`CREATE DATABASE "${researchDatabase}"`); createdResearch = true; await admin.query(`CREATE DATABASE "${platformDatabase}"`); createdPlatform = true;
  const researchPort = await port(); const platformPort = await port(); const webPort = await port();
  const researchBase = `http://127.0.0.1:${researchPort}`; const platformBase = `http://127.0.0.1:${platformPort}`; const webBase = `http://127.0.0.1:${webPort}`;
  const repoRoot = resolve("../.."); const platformRoot = process.cwd();
  const baseEnv = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" };
  const research = start(resolve(repoRoot, "services/research-automation-service/dist/bootstrap/main.js"), repoRoot, {
    ...baseEnv, NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(researchPort), STOCKQUANT_DATABASE_URL: researchUrl.toString(),
    STOCKQUANT_RESEARCH_ARTIFACT_ROOT: artifactRoot, STOCKQUANT_ENVIRONMENT_MODE: "RESEARCH", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_LIVE_TRADING_ENABLED: "false",
    STOCKQUANT_RUNNER_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_MODE: "NOT_CONFIGURED", STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE: "true", STOCKQUANT_RESEARCH_OUTBOUND_POLICY: "DENY",
    STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken, STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken,
  });
  await waitLive(research, `${researchBase}/ready`);
  const platform = start(resolve(platformRoot, "dist/main.js"), platformRoot, {
    ...baseEnv, NODE_ENV: "test", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(platformPort), STOCKQUANT_DATABASE_URL: platformUrl.toString(),
    STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId,
    STOCKQUANT_V31_FIXED_PIPELINE_TEST: "true", STOCKQUANT_RESEARCH_AUTOMATION_URL: researchBase, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
    STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1", STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1",
  });
  await waitLive(platform, `${platformBase}/live`);
  const web = start(resolve(repoRoot, "apps/web/node_modules/vite/bin/vite.js"), resolve(repoRoot, "apps/web"), { ...baseEnv, STOCKQUANT_PLATFORM_API_URL: platformBase }, ["--host", "127.0.0.1", "--port", String(webPort), "--strictPort"]);
  await waitLive(web, `${webBase}/acceptance/v3/v3.1`);
  const requireFromWeb = createRequire(resolve(repoRoot, "apps/web/package.json"));
  const { chromium } = requireFromWeb("@playwright/test");
  const browser = await chromium.launch({ headless: true });
  const browserContext = await browser.newContext();
  let page = await browserContext.newPage();
  try {
    await page.goto(`${webBase}/acceptance/v3/v3.1`);
    await page.getByRole("button", { name: "查看 V3.1 准备状态" }).click();
    await page.getByTestId("v31-fixed-pipeline-available").waitFor({ state: "visible", timeout: 10_000 });
    await page.getByTestId("v31-run-fixed-pipeline").click();
    try {
      await page.getByTestId("v31-test-run-id").waitFor({ state: "visible", timeout: 10_000 });
    } catch (error) {
      const alert = await page.getByRole("alert").textContent().catch(() => "no visible page error");
      throw new Error(`fixed-pipeline start did not create a visible TestRun; page=${alert}; Platform=${platform.output}; Research Automation=${research.output}`, { cause: error });
    }
    testRunId = (await page.getByTestId("v31-test-run-id").textContent())?.trim(); assert.ok(testRunId);
    await page.close();
    runnerHost = start(resolve(repoRoot, "services/research-automation-service/dist/runner-host.js"), repoRoot, {
      ...baseEnv, NODE_ENV: "test", STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED", STOCKQUANT_RUNNER_HOST_API_URL: researchBase,
      STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: runnerToken, STOCKQUANT_RUNNER_HOST_WORKER_ID: `web-smoke-${suffix.slice(0, 24)}`,
      STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: testRunId, STOCKQUANT_RUNNER_IMAGE_REF: imageDigest, STOCKQUANT_RUNNER_MANAGED_ROOT: managedRoot,
    });
    page = await browserContext.newPage();
    await page.goto(`${webBase}/acceptance/v3/v3.1`);
    await page.getByTestId("v31-test-run-id").waitFor({ state: "visible", timeout: 10_000 });
    assert.equal((await page.getByTestId("v31-test-run-id").textContent())?.trim(), testRunId, "closing and reopening the page resumes the same owner-scoped TestRun");
    let terminal = false;
    for (let i = 0; i < 120; i += 1) {
      if (runnerHost.child.exitCode !== null) throw new Error(`Runner Host exited early: ${runnerHost.output}`);
      const current = (await page.getByTestId("v31-run-status").textContent())?.trim();
      if (["COMPLETED", "FAILED"].includes(current ?? "")) { terminal = true; break; }
      await page.getByTestId("v31-refresh").click(); await delay(250);
    }
    assert.equal(terminal, true, `browser did not observe terminal Runner status: ${runnerHost.output}`);
    assert.equal(await page.getByTestId("v31-run-status").textContent(), "COMPLETED");
    await page.getByTestId("v31-read-output-artifact").click();
    await page.getByTestId("v31-output-metrics").waitFor({ state: "visible" });
    assert.match(await page.getByTestId("v31-output-metrics").innerText(), /"bars": 6/u);
    assert.match(await page.getByTestId("v31-model-provider").innerText(), /FIXTURE \/ NO_EXTERNAL_CALL/u);
    assert.match(await page.getByTestId("v31-budget-state").innerText(), /23 cents \/ SETTLED/u);
  } finally { await browser.close(); }
  const latestRun = await request(platformBase, `/api/v1/acceptance/v3/v3.1/runs/${testRunId}`); assert.equal(latestRun.response.status, 200);
  const completedRun = latestRun.value;
  experimentId = completedRun.evidence.experiment.experimentId; jobId = completedRun.evidence.orchestration.runnerJob.jobId;
  inputNamespace = `research/${testRunId}/${experimentId}/inputs`; outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
  assert.equal(completedRun.evidence.orchestration.modelCall.providerMode, "FIXTURE"); assert.equal(completedRun.evidence.orchestration.modelCall.modelCalls, "NO_EXTERNAL_CALL");
  assert.equal(completedRun.evidence.orchestration.budget.status, "SETTLED"); assert.equal(completedRun.evidence.orchestration.budget.spentCents, 23);
  assert.equal(completedRun.status, "COMPLETED", JSON.stringify(completedRun.assertions));
  const runner = completedRun.evidence.orchestration.runnerJob; assert.equal(runner.status, "COMPLETED"); assert.equal(runner.artifacts.length, 1);
  const outputRef = runner.artifacts[0]; assert.equal(outputRef.kind, "OUTPUT"); assert.equal(outputRef.namespace, outputNamespace);
  const artifact = await request(platformBase, `/api/v1/acceptance/v3/v3.1/runs/${testRunId}/artifacts/${encodeURIComponent(outputRef.artifactId)}`);
  assert.equal(artifact.response.status, 200); const bytes = Buffer.from(artifact.value.contentBase64, "base64");
  assert.equal(createHash("sha256").update(bytes).digest("hex"), outputRef.sha256); assert.equal(artifact.value.ref.sha256, outputRef.sha256);
  const metrics = JSON.parse(bytes.toString("utf8")); assert.equal(metrics.fixtureId, "v3.1-research-small-sample-1"); assert.equal(metrics.bars, 6); assert.equal(metrics.qlibVersion, "0.9.6.99"); assert.equal(metrics.return, 0.12);
  const foreignOwner = await request(platformBase, `/api/v1/acceptance/v3/v3.1/runs/${testRunId}`, { user: "another-owner" }); assert.equal(foreignOwner.response.status, 403);
  await stop(runnerHost); await stop(web);
  await stop(platform);
  const productionPlatform = start(resolve(platformRoot, "dist/main.js"), platformRoot, {
    ...baseEnv, NODE_ENV: "production", STOCKQUANT_BIND_HOST: "127.0.0.1", STOCKQUANT_PORT: String(platformPort), STOCKQUANT_DATABASE_URL: platformUrl.toString(),
    STOCKQUANT_LIVE_TRADING_ENABLED: "false", STOCKQUANT_BROKER_MODE: "FAKE", STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED: "true", STOCKQUANT_LOCAL_DEVELOPMENT_USER: ownerId,
    STOCKQUANT_V31_FIXED_PIPELINE_TEST: "true", STOCKQUANT_RESEARCH_AUTOMATION_URL: researchBase, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: platformToken,
    STOCKQUANT_PORTFOLIO_API_URL: "http://127.0.0.1:1", STOCKQUANT_TRADE_EXECUTION_URL: "http://127.0.0.1:1", STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL: "http://127.0.0.1:1",
  });
  await waitLive(productionPlatform, `${platformBase}/live`);
  const productionPreview = await request(platformBase, "/api/v1/acceptance/v3/v3.1/preview"); assert.equal(productionPreview.value.fixedPipelineAvailable, false);
  const productionAttempt = await request(platformBase, "/api/v1/acceptance/v3/v3.1/runs", { method: "POST", body: { scenarioId: "fixed-pipeline", seed: 20260907 } }); assert.equal(productionAttempt.response.status, 403);
  console.log(JSON.stringify({ status: "PASS", testRunId, experimentId, jobId, ownerId, browserToPlatformToResearchToRunner: true, provider: "FIXTURE", externalModelCalls: 0, runner: runner.status, budgetCents: 23, outputArtifactId: outputRef.artifactId, outputSha256: outputRef.sha256, metrics, ownerBoundary: foreignOwner.response.status, productionGate: { preview: productionPreview.value.fixedPipelineAvailable, fixedScenarioHttpStatus: productionAttempt.response.status }, runnerImageDigest: imageDigest }));
} finally {
  for (const entry of [...children].reverse()) await stop(entry);
  if (testRunId) await platformPool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
  if (jobId) await researchPool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId]);
  if (inputNamespace || outputNamespace) await researchPool.query("DELETE FROM research_artifact_refs WHERE namespace=ANY($1::text[])", [[inputNamespace, outputNamespace].filter(Boolean)]);
  if (experimentId) await researchPool.query("DELETE FROM research_budget_allocations WHERE stage_id='V3.1' AND experiment_id=$1", [experimentId]);
  if (experimentId) await researchPool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experimentId]);
  if (createdResearch) {
    const leftovers = await researchPool.query("SELECT (SELECT count(*) FROM research_runner_jobs WHERE job_id=$1) AS jobs, (SELECT count(*) FROM research_artifact_refs WHERE namespace=ANY($2::text[])) AS refs, (SELECT count(*) FROM research_experiments WHERE experiment_id=$3) AS experiments", [jobId ?? null, [inputNamespace, outputNamespace].filter(Boolean), experimentId ?? null]);
    assert.deepEqual(leftovers.rows[0], { jobs: "0", refs: "0", experiments: "0" }, "exact research test rows were removed");
  }
  if (testRunId) { const leftovers = await platformPool.query("SELECT count(*) FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]); assert.equal(Number(leftovers.rows[0].count), 0, "exact platform TestRun row was removed"); }
  await Promise.all([platformPool.end(), researchPool.end()]);
  const cleanupAdmin = new Client({ connectionString: adminUrl.toString() }); await cleanupAdmin.connect();
  if (createdPlatform) await cleanupAdmin.query(`DROP DATABASE "${platformDatabase}" WITH (FORCE)`);
  if (createdResearch) await cleanupAdmin.query(`DROP DATABASE "${researchDatabase}" WITH (FORCE)`);
  await cleanupAdmin.end(); await admin.end().catch(() => undefined); await rm(tempRoot, { recursive: true, force: true });
}
