import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { V14_MANIFEST_INPUTS } from "./v14-code-version-inputs.mjs";

const project = `sq-v14-backtest-${randomBytes(10).toString("hex")}`;
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v14-integration.yml";
const manifestInputs = V14_MANIFEST_INPUTS;
const codeVersion = `sha256:${createHash("sha256").update(manifestInputs.map((path) => `${path}\0${createHash("sha256").update(readFileSync(resolve(path))).digest("hex")}`).join("\n")).digest("hex")}`;
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const env = { ...process.env, ...Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")])), STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD: randomBytes(32).toString("hex"), STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: randomBytes(32).toString("hex"), STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: randomBytes(32).toString("hex"), STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex"), STOCKQUANT_CODE_VERSION: codeVersion, COMPOSE_PROJECT_NAME: project, V11_HOST_PORT: String(apiPort), V14_WEB_HOST_PORT: String(webPort) };
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
const apiUrl = `http://127.0.0.1:${apiPort}`;
let started = false;
let web;
let exitCode = 1;
let webTestRunId;
let browserCreatedTestRunIds = [];
let rejectionTestRunId;
let recoveryTestRunId;
let restrictionsTestRunId;
const testRuns = [];
const fixtureSha256 = "88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef";
let quantRunCount = 0;
let quantRetryIdempotent = false;
let quantRetryConflictRejected = false;
let artifactExportSummary;
async function waitForTestRun(id, headers, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${id}`, { headers, signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const run = await response.json();
        if (["COMPLETED", "FAILED", "CANCELLED"].includes(run.status)) return run;
      }
    } catch { /* the isolated Platform may be between process termination and startup */ }
    await delay(100);
  }
  throw new Error(`V1.4 TestRun ${id} did not finish before timeout`);
}

function run(command, args, runEnv = env) {
  const result = spawnSync(command, args, { env: runEnv, encoding: "utf8" });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0 && started) {
    const logs = compose(["logs", "--no-color", "--tail", "120"], "pipe");
    process.stderr.write(logs.stdout ?? "");
    process.stderr.write(logs.stderr ?? "");
  }
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed`);
  return result.stdout ?? "";
}

try {
  started = true;
  assert.equal(compose(["up", "-d", "--build"]).status, 0, "isolated V1.4 stack failed to start");
  let ready = false;
  for (let i = 0; i < 120; i += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* isolated startup */ }
    await delay(250);
  }
  assert.equal(ready, true, "isolated Platform API did not become live");

  const invalidPolicy = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" }, body: JSON.stringify({ scenarioId: "normal", policy: { initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500, unknown: true } }) });
  assert.equal(invalidPolicy.status, 422, "unknown execution-policy fields must be rejected before creating a TestRun");

  const headers = { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1" };
  const quantCountBeforeCancellation = Number(compose(["exec", "-T", "postgres", "psql", "-U", "quant_research", "-d", "quant_research", "-Atc", "SELECT count(*) FROM research_backtest_runs"], "pipe").stdout.trim());
  const cancelAccepted = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers, body: JSON.stringify({ scenarioId: "recovery", seed: 20260907 }) }).then((response) => response.json());
  assert.equal((await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${cancelAccepted.testRunId}/cancel`, { method: "POST", headers, body: "{}" })).status, 202);
  const cancelledRun = await waitForTestRun(cancelAccepted.testRunId, headers);
  assert.equal(cancelledRun.status, "CANCELLED");
  assert.equal(cancelledRun.evidence.v14Task.phase, "CANCELLED");
  testRuns.push({ origin: "cancelled-before-Quant", testRun: cancelledRun });
  const quantCountAfterCancellation = Number(compose(["exec", "-T", "postgres", "psql", "-U", "quant_research", "-d", "quant_research", "-Atc", "SELECT count(*) FROM research_backtest_runs"], "pipe").stdout.trim());
  assert.equal(quantCountAfterCancellation, quantCountBeforeCancellation, "pre-execution cancellation must not create a Quant report");

  const recoveryAccepted = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers, body: JSON.stringify({ scenarioId: "recovery", seed: 20260907 }) }).then((response) => response.json());
  await delay(250);
  const beforeRestart = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${recoveryAccepted.testRunId}`, { headers }).then((response) => response.json());
  assert.equal(beforeRestart.status, "RUNNING");
  assert.equal(beforeRestart.evidence.v14Task.phase, "RUNNING_QUANT");
  assert.equal(compose(["kill", "platform-api-service"]).status, 0, "Platform API process termination failed during the active V1.4 task");
  assert.equal(compose(["up", "-d", "platform-api-service"]).status, 0, "Platform API did not start after the active-task crash probe");
  ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* restarting Platform */ }
    await delay(250);
  }
  assert.equal(ready, true, "Platform API did not recover after the V1.4 restart probe");
  const resumedRun = await waitForTestRun(recoveryAccepted.testRunId, headers);
  assert.equal(resumedRun.status, "COMPLETED");
  assert.ok(resumedRun.evidence.v14Task.resumeCount >= 1, "restart recovery must be recorded on the original TestRun");
  assert.equal(resumedRun.evidence.v14Task.quantBacktestRunId, recoveryAccepted.testRunId);
  testRuns.push({ origin: "platform-restart-recovery", testRun: resumedRun });

  const postQuantRecovery = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers, body: JSON.stringify({ scenarioId: "recovery", seed: 20260907 }) }).then((response) => response.json());
  let quantReportPersisted = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const query = compose(["exec", "-T", "postgres", "psql", "-U", "quant_research", "-d", "quant_research", "-Atc", `SELECT count(*) FROM research_backtest_runs WHERE backtest_run_id='${postQuantRecovery.testRunId}'`], "pipe");
    assert.equal(query.status, 0, query.stderr);
    if (query.stdout.trim() === "1") { quantReportPersisted = true; break; }
    await delay(100);
  }
  assert.equal(quantReportPersisted, true, "Quant must persist the report before the Platform crash probe");
  const unfinishedAfterQuant = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${postQuantRecovery.testRunId}`, { headers }).then((response) => response.json());
  assert.equal(unfinishedAfterQuant.status, "RUNNING", "Platform must not publish before the persisted Quant response is finalized");
  assert.equal(compose(["kill", "platform-api-service"]).status, 0, "Platform termination failed after Quant report persistence");
  assert.equal(compose(["up", "-d", "platform-api-service"]).status, 0, "Platform did not restart after the post-Quant persistence crash");
  ready = false;
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* restarting Platform */ }
    await delay(250);
  }
  assert.equal(ready, true, "Platform API did not recover after the post-Quant persistence crash");
  const postQuantResumedRun = await waitForTestRun(postQuantRecovery.testRunId, headers);
  assert.equal(postQuantResumedRun.status, "COMPLETED");
  assert.ok(postQuantResumedRun.evidence.v14Task.resumeCount >= 1);
  assert.equal(postQuantResumedRun.evidence.v14Task.quantBacktestRunId, postQuantRecovery.testRunId);
  testRuns.push({ origin: "platform-post-Quant-crash-recovery", testRun: postQuantResumedRun });
  const retryPolicy = { initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500 };
  const quantRetry = async (policy) => {
    const body = JSON.stringify({ scenarioId: "recovery", seed: 20260907, policy, testRunId: recoveryAccepted.testRunId });
    const source = `const response=await fetch('http://quant-research-service:3003/v1/research/backtests/daily-fixture',{method:'POST',headers:{authorization:${JSON.stringify(`Bearer ${env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`)},'x-stockquant-service-id':'platform-api-service','content-type':'application/json'},body:${JSON.stringify(body)}}); console.log(JSON.stringify({status:response.status,body:await response.json()}));`;
    const result = compose(["exec", "-T", "platform-api-service", "node", "--input-type=module", "-e", source], "pipe");
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim());
  };
  const duplicateQuantResult = await quantRetry(retryPolicy);
  assert.equal(duplicateQuantResult.status, 200);
  assert.equal(duplicateQuantResult.body.testRunId, recoveryAccepted.testRunId);
  quantRetryIdempotent = true;
  const conflictingQuantResult = await quantRetry({ ...retryPolicy, targetQuantity: 99 });
  assert.equal(conflictingQuantResult.status, 409);
  quantRetryConflictRejected = true;

  const accepted = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers, body: JSON.stringify({ scenarioId: "normal", seed: 20260907 }) });
  assert.equal(accepted.status, 202);
  webTestRunId = (await accepted.json()).testRunId;
  assert.match(webTestRunId, /^[0-9a-f-]{36}$/i);
  const sameRun = await waitForTestRun(webTestRunId, headers);
  assert.equal(sameRun.status, "COMPLETED");
  assert.equal(sameRun.evidence.fixtureSha256, fixtureSha256);
  assert.equal(sameRun.evidence.codeVersion, codeVersion, "V1.4 evidence must bind the run to the exact source/contract/fixture workspace digest");
  assert.equal(sameRun.evidence.metrics.finalNavCents, 1_000_000);
  testRuns.push({ origin: "platform-api", testRun: sameRun });
  run("pnpm", ["verify:stage", "--", "--stage", "V1.4", "--run", webTestRunId, "--check-only"], { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl });

  for (const scenario of ["rejection", "recovery", "market-restrictions", "historical-fees", "corporate-actions"]) {
    const output = run("pnpm", ["verify:stage", "--", "--stage", "V1.4", "--scenario", scenario, "--seed", "20260907"], { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl });
    const testRunId = output.match(/"testRunId": "([0-9a-f-]{36})"/iu)?.[1];
    assert.ok(testRunId, `${scenario} CLI output omitted its TestRun id`);
    const testRun = await waitForTestRun(testRunId, headers);
    assert.equal(testRun.status, "COMPLETED");
    assert.equal(testRun.evidence.codeVersion, codeVersion, `${scenario} run must preserve its workspace digest`);
    if (scenario === "rejection") assert.equal(testRun.assertions.find((item) => item.assertionId === "V1.4-BT-TPLUS1-REJECT-009")?.actual, "T_PLUS_1_UNAVAILABLE");
    if (scenario === "market-restrictions") { assert.equal(testRun.scenarioVersion, "1.2.0"); assert.equal(testRun.evidence.fixtureSha256, "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a"); assert.equal(testRun.assertions[0]?.status, "PASS"); }
    if (scenario === "historical-fees") { assert.equal(testRun.scenarioVersion, "1.3.0"); assert.equal(testRun.evidence.fixtureSha256, "5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573"); assert.equal(testRun.assertions.find((item) => item.assertionId === "V1.4-BT-HISTORICAL-FEE-001")?.status, "PASS"); }
    if (scenario === "corporate-actions") { assert.equal(testRun.scenarioVersion, "1.4.0"); assert.equal(testRun.evidence.fixtureSha256, "914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc"); assert.equal(testRun.evidence.priceBasis, "RAW"); assert.ok(testRun.assertions.every((item) => item.status === "PASS")); }
    testRuns.push({ origin: `cli-${scenario}`, testRun });
    if (scenario === "rejection") rejectionTestRunId = testRunId;
    else if (scenario === "recovery") recoveryTestRunId = testRunId;
    else if (scenario === "market-restrictions") restrictionsTestRunId = testRunId;
  }

  web = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], { env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl }, stdio: "inherit" });
  let webReady = false;
  for (let i = 0; i < 120; i += 1) {
    if (web.exitCode !== null) break;
    try { if ((await fetch(`http://127.0.0.1:${webPort}/acceptance/v1/v1.4`)).ok) { webReady = true; break; } } catch { /* isolated Vite startup */ }
    await delay(250);
  }
  assert.equal(webReady, true, "isolated V1.4 Web did not become ready");
  const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1\\.4 (?:daily backtest page|web accepts a bounded policy|synthetic suspension|historical fee fixture|RAW corporate actions)"], {
    env: { ...env, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`, STOCKQUANT_PLATFORM_API_URL: apiUrl }, encoding: "utf8"
  });
  process.stdout.write(browser.stdout ?? "");
  process.stderr.write(browser.stderr ?? "");
  assert.equal(browser.status, 0, "V1.4 browser test failed");
  browserCreatedTestRunIds = [...(browser.stdout ?? "").matchAll(/\[V1\.4 Web\/CLI same-run\] testRunId=([0-9a-f-]{36})/giu)].map((match) => match[1]);
  assert.equal(browserCreatedTestRunIds.length, 8, "all V1.4 browser scenarios must report each Web-created TestRun checked by CLI");
  const browserRuns = [];
  for (const testRunId of browserCreatedTestRunIds) {
    const testRun = await waitForTestRun(testRunId, headers);
    assert.equal(testRun.status, "COMPLETED");
    assert.equal(testRun.evidence.codeVersion, codeVersion, "browser-created run must preserve its workspace digest");
    if (testRun.scenarioId === "market-restrictions") { assert.equal(testRun.scenarioVersion, "1.2.0"); assert.equal(testRun.evidence.ruleScope, "SYNTHETIC_FIXTURE_BOUNDARIES_ONLY"); }
    if (testRun.scenarioId === "corporate-actions") { assert.equal(testRun.scenarioVersion, "1.4.0"); assert.equal(testRun.evidence.priceBasis, "RAW"); assert.equal(testRun.assertions.length, 3); }
    browserRuns.push(testRun);
  }
  assert.ok(browserRuns.some((run) => run.evidence.executionPolicy?.initialCashCents === 102_000 && run.evidence.executionPolicy?.slippageBasisPoints === 100), "the configured browser run did not persist its policy in Quant evidence");
  assert.ok(browserRuns.some((run) => run.evidence.executionPolicy?.targetQuantity === 50), "the comparison run did not persist the changed target quantity");
  const feeScheduleRun = browserRuns.find((run) => run.evidence.executionPolicy?.marketFeeSchedule?.scheduleId === "CN_A_CASH_EQUITY_2023_08_28");
  assert.ok(feeScheduleRun, "the Web fee schedule run did not persist its market fee policy");
  assert.deepEqual(feeScheduleRun.evidence.trades.map(({ side, feeBreakdown }) => ({ side, feeBreakdown })), [
    { side: "BUY", feeBreakdown: { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 0, totalCents: 511 } },
    { side: "SELL", feeBreakdown: { commissionCents: 500, transferFeeCents: 11, stampDutyCents: 51, totalCents: 562 } }
  ]);
  const soldRun = browserRuns.find((run) => run.evidence.trades?.some((trade) => trade.side === "SELL" && trade.executionDate === "2024-01-04"));
  assert.ok(soldRun, "the Web policy did not create a real SELL fill in the Quant result");
  assert.equal(soldRun.evidence.orderOutcomes?.find((outcome) => outcome.side === "SELL")?.status, "FILLED");
  assert.equal(soldRun.evidence.settlements?.[0]?.status, "SETTLED");
  assert.equal(soldRun.evidence.settlements?.[0]?.settlementDate, "2024-01-05");
  assert.equal(soldRun.evidence.metrics?.finalCashCents, 99_812);
  testRuns.push(...browserRuns.map((testRun, index) => ({ origin: `web-created-${index + 1}-and-cli-checked`, testRun })));
  const sessionResponse = await fetch(`${apiUrl}/api/v1/session`);
  assert.equal(sessionResponse.status, 200, "could not issue an isolated owner session for the V1.4 report export check");
  const sessionCookie = sessionResponse.headers.getSetCookie().map((cookie) => cookie.split(";", 1)[0]).find((cookie) => cookie.startsWith("sq_session="));
  assert.match(sessionCookie ?? "", /^sq_session=[a-f0-9]{64}$/u);
  const exportRoot = await mkdtemp(resolve(tmpdir(), "stockquant-v14-export-"));
  try {
    const exported = spawnSync(process.execPath, [resolve("scripts/evidence-export.mjs"), "--stage", "V1.4", "--run", webTestRunId], {
      cwd: exportRoot, encoding: "utf8", env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie }, timeout: 30_000
    });
    assert.equal(exported.status, 0, `V1.4 report evidence export failed: ${exported.stderr}`);
    const exportResult = JSON.parse(exported.stdout);
    const exportedEvidence = JSON.parse(await readFile(resolve(exportResult.outputDirectory, "evidence.json"), "utf8"));
    assert.equal(exportedEvidence.manualConclusion, "NOT_RUN");
    assert.equal(exportedEvidence.artifacts?.length, 1, "V1.4 report ref was not included in the exported bundle");
    const reportFile = exportResult.attachments.find(({ filename }) => filename.startsWith(`v14-report-${webTestRunId}-`));
    assert.ok(reportFile, "V1.4 export omitted its durable report bytes");
    const reportBytes = await readFile(resolve(exportResult.outputDirectory, reportFile.filename));
    assert.equal(createHash("sha256").update(reportBytes).digest("hex"), exportedEvidence.artifacts[0].sha256);
    artifactExportSummary = { testRunId: webTestRunId, manifestHash: exportResult.manifestHash, reportFilename: reportFile.filename, reportSha256: exportedEvidence.artifacts[0].sha256, manualConclusion: exportedEvidence.manualConclusion };
  } finally {
    await rm(exportRoot, { recursive: true, force: true });
  }
  const persisted = compose(["exec", "-T", "postgres", "psql", "-U", "quant_research", "-d", "quant_research", "-Atc", "SELECT count(*) || ':' || count(m.backtest_run_id) || ':' || count(*) FILTER (WHERE r.result_sha256 = m.manifest_payload->>'resultSha256') FROM research_backtest_runs r LEFT JOIN research_backtest_manifests m USING (backtest_run_id)"], "pipe");
  assert.equal(persisted.status, 0, persisted.stderr);
  assert.equal(persisted.stdout.trim(), "16:16:16", "Quant must persist all sixteen result/Manifest pairs with matching hashes; pre-execution cancellation creates none");
  quantRunCount = Number(persisted.stdout.trim().split(":")[0]);
  const stageRunCount = compose(["exec", "-T", "postgres", "psql", "-U", "platform_api", "-d", "platform_api", "-Atc", "SELECT count(*) FROM acceptance_stage_runs WHERE stage_id='V1.4'"], "pipe");
  assert.equal(stageRunCount.status, 0, stageRunCount.stderr);
  assert.equal(stageRunCount.stdout.trim(), "17", "rejected policy must not create a Platform TestRun");
  exitCode = 0;
} finally {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await new Promise((resolveExit) => web.once("exit", resolveExit));
  }
  if (started) {
    if (exitCode !== 0) {
      const logs = compose(["logs", "--no-color", "--tail", "160"], "pipe");
      process.stderr.write(logs.stdout ?? "");
      process.stderr.write(logs.stderr ?? "");
    }
    const down = compose(["down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) exitCode ||= down.status ?? 1;
  }
  for (const [args, label] of [[ ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], "containers" ], [["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "volumes"], [["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "networks"]]) {
    const result = spawnSync("docker", args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "", `isolated ${label} remain for ${project}`);
  }
  const imageList = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(imageList.status, 0, imageList.stderr);
  const ownImages = imageList.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`) && ["-platform-api-service:latest", "-portfolio-risk-service:latest", "-quant-research-service:latest"].some((suffix) => image.endsWith(suffix)));
  if (ownImages.length > 0) {
    const removed = spawnSync("docker", ["image", "rm", ...ownImages], { encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
  }
  const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(remainingImages.status, 0, remainingImages.stderr);
  assert.deepEqual(remainingImages.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`)), [], `isolated images remain for ${project}`);
}
assert.equal(exitCode, 0, "V1.4 isolated acceptance failed");
const report = { schemaVersion: "stockquant.w1-v14-quant-boundary-isolated-run.v1", createdAt: new Date().toISOString(), stageId: "V1.4", status: "PASS", suite: "isolated-Compose-PostgreSQL-Quant-Platform-Web-CLI", isolatedProject: project, codeVersion, fixtureSha256, quantServiceOwnsComputation: true, invalidPolicyRejectedWithoutRun: true, quantRetryIdempotent, quantRetryConflictRejected, cancellationBeforeQuantVerified: true, platformCrashBeforeQuantRecoveryVerified: true, platformCrashAfterQuantPersistenceRecoveryVerified: true, artifactExportSummary, restrictionFixtureSha256: "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a", corporateActionFixtureSha256: "914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc", quantPersistence: { status: "PASS", backtestRunCount: quantRunCount, manifestCount: quantRunCount, resultHashMatchesManifest: quantRunCount }, testRuns, containersVolumesNetworksRemoved: true, externalMarketCalls: 0, providerCalls: 0, paperOrBrokerCalls: 0, activeServicesTouched: false, humanAcceptance: "NOT_CHANGED", limitations: ["Fixture-only small sample", "Exchange-specific limit formulas, intraday queue/fills, full market fees, Qlib/Paper parity, complete independent failure coverage, current complete manual acceptance and Ubuntu remain incomplete"] };
const evidenceSuffix = project.slice(project.lastIndexOf("-") + 1);
const reportPath = `evidence/audits/2026-10-07-v14-durable-tasks-${evidenceSuffix}.json`;
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
const sourceReportSha256 = createHash("sha256").update(readFileSync(resolve(reportPath))).digest("hex");
await mkdir(resolve("evidence/local/V1.4"), { recursive: true });
const bundlePaths = [];
for (const { testRun } of testRuns) {
  const bundleDirectory = `evidence/local/V1.4/${testRun.testRunId}`;
  if (existsSync(resolve(bundleDirectory))) throw new Error(`refusing to overwrite existing V1.4 evidence bundle ${testRun.testRunId}`);
  await mkdir(resolve(bundleDirectory), { recursive: false });
  const sourceEvidencePath = resolve(bundleDirectory, "source-evidence.json");
  const evidencePath = resolve(bundleDirectory, "evidence.json");
  const sourceBytes = Buffer.from(JSON.stringify(testRun, null, 2) + "\n");
  const evidence = {
    evidenceVersion: "stockquant.acceptance.run-export.v2",
    stageId: "V1.4",
    testRunId: testRun.testRunId,
    mode: { environmentMode: testRun.evidence.environmentMode, dataMode: "FIXTURE", brokerMode: testRun.evidence.brokerMode },
    run: testRun,
    assertions: testRun.assertions,
    manualConclusion: "NOT_RUN",
    sourceExport: {
      path: reportPath,
      sha256: sourceReportSha256,
      format: "w1-v14-quant-boundary-isolated-run.embedded-testrun.v1",
      recoveryMethod: "Exported without field changes from the exact TestRun in this hash-bound isolated API/Web/CLI audit; no cleaned database was queried."
    }
  };
  const evidenceBytes = Buffer.from(JSON.stringify(evidence, null, 2) + "\n");
  await writeFile(sourceEvidencePath, sourceBytes, { flag: "wx" });
  await writeFile(evidencePath, evidenceBytes, { flag: "wx" });
  const bundleManifest = [
    `${createHash("sha256").update(evidenceBytes).digest("hex")}  evidence.json`,
    `${createHash("sha256").update(sourceBytes).digest("hex")}  source-evidence.json`
  ].join("\n") + "\n";
  await writeFile(resolve(bundleDirectory, "manifest.sha256"), bundleManifest, { flag: "wx" });
  bundlePaths.push(`${bundleDirectory}/evidence.json`, `${bundleDirectory}/source-evidence.json`, `${bundleDirectory}/manifest.sha256`);
}
const markdownPath = `evidence/audits/2026-10-07-v14-durable-tasks-${evidenceSuffix}.md`;
const runLines = testRuns.map(({ origin, testRun }) => `- ${origin}: \`${testRun.testRunId}\`, ${testRun.status}, ${testRun.assertions.length} assertions (${testRun.assertions.map((item) => `${item.assertionId}=${item.status}`).join(", ")}).`);
const markdown = `# V1.4 durable task, cancellation, restart recovery, Web and CLI audit\n\nDate: 2026-10-07 (Asia/Shanghai)\n\n## Change\n\nPlatform now persists V1.4 TestRun metadata before asynchronous Quant dispatch. Quant accepts that stable TestRun UUID as its BacktestRun/Manifest identity and returns the exact prior report on an identical retry; an input mismatch returns 409. Platform restart scans RUNNING tasks and resumes under a per-TestRun PostgreSQL advisory lock. Cancellation is durable and suppresses report publication when requested before Quant dispatch. Web and CLI poll the same persisted TestRun through a terminal state.\n\n## Verification\n\n- Contract generation/check: PASS; the Quant request contract carries optional testRunId, and response identity remains bound to request scenario/seed.\n- Platform and Quant TypeScript checks: PASS; Platform persistent-task unit tests and Quant backtest service tests: PASS.\n- pnpm test:integration:v14-backtest: PASS against fresh isolated PostgreSQL, Quant, Platform and Playwright Web. Two recovery tasks were interrupted with forced Platform process termination: one while RUNNING before Quant dispatch, and one after Quant durably persisted its BacktestRun/Manifest but before Platform finalized the TestRun. Both completed after startup recovery with the original TestRun UUID; the post-Quant retry returned the existing Quant report without a duplicate row. A separate cancellation completed as CANCELLED before Quant dispatch and created no BacktestRun. Identical Quant retry returned the prior report; same ID with a changed policy returned 409.\n- Normal/rejection/recovery/market restrictions/historical fees/corporate actions, eight browser-created runs and same-run CLI checks passed. Quant persisted ${quantRunCount} BacktestRun/Manifest pairs with matching result hashes; Platform persisted 17 V1.4 TestRuns. Unknown policy fields were rejected before TestRun creation.\n- Workspace codeVersion: \`${codeVersion}\`. Each exported run has an immutable evidence/local/V1.4/<testRunId>/ bundle with a SHA-256 manifest and manualConclusion=NOT_RUN. Random Compose containers, volume, network and images were removed.\n\nTestRuns:\n\n${runLines.join("\n")}\n\n## Boundaries\n\nExternal market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.\n\nThe small deterministic fixtures do not establish full exchange rules, calendar coverage, complete fee/tax policy, Qlib/Paper parity, user sign-off or Ubuntu acceptance. V1.4 and the full V1 plan remain open.\n`;
await writeFile(markdownPath, markdown);
const root = process.cwd();
const evidenceManifestInputs = [...new Set([reportPath, markdownPath, ...bundlePaths, ...manifestInputs, "scripts/evidence-export.mjs", "scripts/evidence-export-core.mjs", "scripts/evidence-export.test.mjs", "services/quant-research-service/tests/unit/v14-daily-backtest-service.spec.ts", "services/quant-research-service/tests/unit/postgres-v14-backtest-repository.spec.ts", "services/platform-api-service/tests/unit/v14-backtest-adapter.spec.ts", "scripts/e2e-stage-command.mjs", "scripts/e2e-stage-command.test.mjs"])];
const manifest = [];
for (const path of evidenceManifestInputs) manifest.push(`${createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")}  ${path}`);
await writeFile(`evidence/audits/2026-10-07-v14-durable-tasks-${evidenceSuffix}.sha256`, manifest.join("\n") + "\n");
console.log(JSON.stringify({ status: "PASS", isolatedProject: project, codeVersion, webNormal: "PASS", apiCreatedRunCheckedByCli: webTestRunId, browserCreatedRunsCheckedByCli: browserCreatedTestRunIds, cliRejectionTestRunId: rejectionTestRunId, cliRecoveryTestRunId: recoveryTestRunId, restrictionsTestRunId, fixtureSha256, containersVolumesNetworksRemoved: true, evidence: reportPath }));
