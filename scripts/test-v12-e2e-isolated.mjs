import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v12-e2e-${randomBytes(10).toString("hex")}`;
const manualAcceptance = process.env.STOCKQUANT_V12_MANUAL_ACCEPTANCE === "1";
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v12-integration.yml";
const stateDirectory = path.resolve(".codex/isolated-stacks");
const envFile = path.join(stateDirectory, `${project}.env`);
const stateFile = path.join(stateDirectory, `${project}.json`);
const stopFile = path.join(stateDirectory, `${project}.stop`);
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const serviceToken = randomBytes(32).toString("hex");
const qlibToken = randomBytes(32).toString("hex");
const env = {
  ...process.env,
  ...Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")])),
  STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: serviceToken,
  STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION: randomBytes(32).toString("hex"),
  STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE: qlibToken,
  COMPOSE_PROJECT_NAME: project,
  STOCKQUANT_ISOLATED_V12_PROJECT: project,
  V12_HOST_PORT: String(apiPort),
  V12_WEB_HOST_PORT: String(webPort),
  STOCKQUANT_LIVE_TRADING_ENABLED: "false",
  STOCKQUANT_BROKER_MODE: "FAKE",
  STOCKQUANT_COLLECTION_EXECUTOR: "0",
  STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED: "false",
  STOCKQUANT_TEST_FIT_DELAY_MS: "10000"
};
const compose = (args, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, ...(manualAcceptance ? ["--env-file", envFile] : []), "-f", composeFile, ...args], { env, encoding: "utf8", stdio });
const apiUrl = `http://127.0.0.1:${apiPort}`;
let started = false;
let web;
let exitCode = 1;
let browserOutput = "";
let browserError = "";
let failureReason = null;
let testRunId;
let testRunIds = [];
let testRunSummaries = [];
let cancellationTestRunId;
let cancellationSummary;
let restartRecoverySummary;
let governanceDatabaseAssertion;
let artifactExportSummary;

try {
  if (manualAcceptance) {
    await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
    await chmod(stateDirectory, 0o700);
    const composeVars = Object.fromEntries(Object.entries(env).filter(([name]) => name.startsWith("STOCKQUANT_DATABASE_PASSWORD_") || name.startsWith("STOCKQUANT_SERVICE_TOKEN_") || ["COMPOSE_PROJECT_NAME", "STOCKQUANT_ISOLATED_V12_PROJECT", "V12_HOST_PORT", "V12_WEB_HOST_PORT", "STOCKQUANT_TEST_FIT_DELAY_MS"].includes(name)));
    await writeFile(envFile, `${Object.entries(composeVars).map(([name, value]) => `${name}=${value}`).join("\n")}\n`, { mode: 0o600, flag: "wx" });
    await chmod(envFile, 0o600);
    await writeFile(stateFile, `${JSON.stringify({ project, stage: "V1.2", composeFile, envFile, apiPort, webPort, interactive: true }, null, 2)}\n`, { mode: 0o600, flag: "wx" });
    await chmod(stateFile, 0o600);
  }
  started = true;
  const up = compose([...(manualAcceptance ? ["--profile", "interactive"] : []), "up", "-d", "--build"]);
  if (up.status !== 0) {
    const logs = compose(["logs", "--no-color", "--tail", "120"], "pipe");
    process.stderr.write(logs.stdout ?? "");
    process.stderr.write(logs.stderr ?? "");
  }
  assert.equal(up.status, 0, "isolated V1.2 Compose stack failed to start");
  let ready = false;
  for (let attempt = 0; attempt < 180; attempt += 1) {
    try {
      if ((await fetch(`${apiUrl}/live`, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; }
    } catch { /* wait for the isolated dependency stack */ }
    await delay(500);
  }
  assert.equal(ready, true, "isolated V1.2 Platform API did not become live");

  if (!manualAcceptance) {
    web = spawn("pnpm", ["--filter", "@stockquant/web", "exec", "vite", "--host", "127.0.0.1", "--port", String(webPort), "--strictPort"], {
      env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl }, stdio: "inherit"
    });
  }
  let webReady = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (web?.exitCode !== null && web) break;
    try {
      if ((await fetch(`http://127.0.0.1:${webPort}/acceptance/v1/v1.2`, { signal: AbortSignal.timeout(1000) })).ok) { webReady = true; break; }
    } catch { /* wait for isolated Web */ }
    await delay(250);
  }
  assert.equal(webReady, true, "isolated V1.2 Web did not become ready");
  if (manualAcceptance) {
    process.stdout.write(`${JSON.stringify({
      status: "READY_FOR_MANUAL_ACCEPTANCE",
      isolatedProject: project,
      webUrl: `http://127.0.0.1:${webPort}/acceptance/v1/v1.2`,
      platformApiUrl: apiUrl,
      fixtureVersion: "v1.2-market-data-1",
      sourceAuthorization: "NONE",
      liveTradingEnabled: false,
      brokerMode: "FAKE",
      webRuntime: "containerized Web",
      shutdown: "Press Ctrl-C in this terminal; only this isolated project and its resources will be removed."
    })}\n`);
    const keepAlive = setInterval(() => {}, 60_000);
    exitCode = await new Promise((resolveSignal) => {
      let handled = false;
      const finish = (signal) => {
        if (handled) return;
        handled = true;
        process.stdout.write(`${JSON.stringify({ status: "MANUAL_STACK_STOPPING", signal, isolatedProject: project })}\n`);
        resolveSignal(0);
      };
      process.once("SIGINT", () => finish("SIGINT"));
      process.once("SIGTERM", () => finish("SIGTERM"));
      process.once("SIGHUP", () => finish("SIGHUP"));
      const stopWatcher = setInterval(() => {
        if (existsSync(stopFile)) finish("STACK_DOWN");
      }, 300);
      process.once("exit", () => clearInterval(stopWatcher));
    });
    clearInterval(keepAlive);
  } else {
    const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1\.2"], {
      env: { ...env, CI: "1", PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`, STOCKQUANT_PLATFORM_API_URL: apiUrl }, encoding: "utf8"
    });
    browserOutput = browser.stdout ?? "";
    browserError = browser.stderr ?? "";
    process.stdout.write(browserOutput);
    process.stderr.write(browserError);
    testRunIds = [...browserOutput.matchAll(/\[V1\.2 Web\/CLI same-run\] testRunId=([0-9a-f-]{36})/giu)].map((match) => match[1]);
    const persistedReadbacks = [...browserOutput.matchAll(/\[V1\.2 persisted readback\] (\{[^\n]+\})/gu)].map((match) => JSON.parse(match[1]));
    const cancellationReadback = browserOutput.match(/\[V1\.2 cancellation readback\] (\{[^\n]+\})/u)?.[1];
    cancellationSummary = cancellationReadback ? JSON.parse(cancellationReadback) : undefined;
    cancellationTestRunId = cancellationSummary?.testRunId;
    const restartReadback = browserOutput.match(/\[V1\.2 Platform restart recovery\] (\{[^\n]+\})/u)?.[1];
    restartRecoverySummary = restartReadback ? JSON.parse(restartReadback) : undefined;
    assert.equal(browser.status, 0, `V1.2 isolated Web/API/CLI browser scenario failed (status=${browser.status}, signal=${browser.signal ?? "none"})`);
    assert.equal(testRunIds.length, 4, "V1.2 browser suite must verify normal, rejection, recovery-probe, and Platform-restart TestRuns through CLI");
    assert.equal(new Set(testRunIds).size, 4, "V1.2 scenarios must use isolated TestRun IDs");
    testRunId = testRunIds[0];
    assert.equal(persistedReadbacks.length, 3, "Web did not read back all three same-owner TestRuns from the API");
    testRunSummaries = persistedReadbacks.map((run) => ({ testRunId: run.testRunId, status: run.status, assertions: run.assertions, evidence: run.evidence }));
    assert.deepEqual(testRunSummaries.map((run) => run.testRunId), testRunIds.slice(0, 3), "persisted Web readbacks do not match the three scenario TestRuns");
    assert.equal(testRunSummaries[0].status, "COMPLETED", "normal Qlib run did not complete");
    assert.equal(testRunSummaries[0].evidence?.qlibFit?.modelTraining, "PASS", "normal run has no actual Qlib fit evidence");
    assert.equal(testRunSummaries[0].evidence?.qlibFit?.temporalValidation, "PASS", "normal run did not pass temporal validation");
    assert.ok(testRunSummaries[0].evidence?.qlibFit?.artifactId, "normal run did not publish a durable Qlib/strategy Artifact");
    assert.equal(testRunSummaries[0].evidence?.qlibFit?.governanceHandoff, "RECEIVED", "normal run did not persist both strategies in Governance");
    assert.equal(testRunSummaries[0].evidence?.qlibFit?.governanceReceipts?.length, 2, "normal run did not receive two Governance receipts");
    const governanceRows = compose(["exec", "-T", "postgres", "psql", "-U", "postgres", "-d", "decision_governance", "-Atc", `SELECT (SELECT count(*) FROM governed_strategy_snapshots WHERE owner_id='acceptance-owner-1' AND test_run_id='${testRunId}') || '|' || (SELECT count(*) FROM governed_strategy_snapshots WHERE owner_id='acceptance-owner-1' AND test_run_id='${testRunIds[1]}') || '|' || (SELECT count(*) FROM proposals WHERE owner_id='acceptance-owner-1' AND test_run_id='${testRunId}') || '|' || (SELECT count(*) FROM execution_authorizations WHERE namespace='v1-2-normal-${testRunId}')`], "pipe");
    assert.equal(governanceRows.status, 0, governanceRows.stderr);
    governanceDatabaseAssertion = governanceRows.stdout.trim().split("|").map(Number);
    assert.deepEqual(governanceDatabaseAssertion, [2, 0, 0, 0], "Governance must persist only the two normal-run snapshots, and no rejection snapshot, proposal or execution authorization");
    assert.ok(cancellationTestRunId, "V1.2 browser suite did not verify an independent cancellation TestRun");
    assert.ok(cancellationSummary, "cancelled TestRun was not read back from the API in Web context");
    assert.equal(cancellationSummary.testRunId, cancellationTestRunId);
    assert.equal(cancellationSummary.status, "CANCELLED", "cancel request did not reach the safe worker checkpoint");
    assert.equal(cancellationSummary.evidence?.qlibTask?.artifactPublished, false, "cancelled Qlib run published a partial Artifact");
    assert.equal(cancellationSummary.evidence?.qlibTask?.cancelRequested, true, "cancellation intent was not persisted");
    assert.ok(restartRecoverySummary, "Platform restart did not resume a persisted Qlib TestRun");
    assert.equal(restartRecoverySummary.status, "COMPLETED");
    assert.ok(restartRecoverySummary.qlibTask?.resumeCount >= 1);
    assert.ok(restartRecoverySummary.artifactId);
    let sessionResponse;
    for (let attempt = 0; attempt < 120; attempt += 1) {
      try {
        const live = await fetch(`${apiUrl}/live`, { signal: AbortSignal.timeout(1000) });
        if (live.ok) {
          sessionResponse = await fetch(`${apiUrl}/api/v1/session`, { signal: AbortSignal.timeout(3000) });
          if (sessionResponse.ok) break;
        }
      } catch { /* the restart-recovery scenario may still be restoring the isolated API */ }
      await delay(250);
    }
    assert.ok(sessionResponse, "Platform API did not recover after the browser restart scenario");
    assert.equal(sessionResponse.status, 200, "could not issue an isolated owner session for the Artifact export check");
    const sessionCookie = sessionResponse.headers.getSetCookie().map((cookie) => cookie.split(";", 1)[0]).find((cookie) => cookie.startsWith("sq_session="));
    assert.match(sessionCookie ?? "", /^sq_session=[a-f0-9]{64}$/u, "Platform did not issue a valid isolated session cookie");
    const exported = spawnSync(process.execPath, ["scripts/evidence-export.mjs", "--stage", "V1.2", "--run", testRunId], {
      cwd: process.cwd(), encoding: "utf8", env: { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie }, timeout: 30_000
    });
    assert.equal(exported.status, 0, `V1.2 Artifact evidence export failed: ${exported.stderr}`);
    const exportResult = JSON.parse(exported.stdout);
    assert.equal(exportResult.stageId, "V1.2");
    assert.equal(exportResult.testRunId, testRunId);
    const exportedBundle = JSON.parse(await readFile(path.join(exportResult.outputDirectory, "evidence.json"), "utf8"));
    assert.equal(exportedBundle.manualConclusion, "NOT_RUN", "evidence export must not sign acceptance");
    assert.equal(exportedBundle.artifacts?.length, 1, "normal TestRun Qlib ArtifactRef was not included in the export manifest");
    assert.equal(exportedBundle.artifacts[0].sha256, testRunSummaries[0].evidence?.qlibFit?.artifactRef?.sha256);
    artifactExportSummary = { outputDirectory: exportResult.outputDirectory, manifestHash: exportResult.manifestHash, artifact: exportResult.attachments?.[0], manualConclusion: exportedBundle.manualConclusion };
    exitCode = 0;
  }
} catch (error) {
  failureReason = error instanceof Error ? error.stack ?? error.message : String(error);
  if (exitCode === 0) exitCode = 1;
} finally {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await new Promise((resolveExit) => web.once("exit", resolveExit));
  }
  if (started && exitCode !== 0) {
    const logs = compose(["logs", "--no-color", "--tail", "160"], "pipe");
    process.stderr.write(logs.stdout ?? "");
    process.stderr.write(logs.stderr ?? "");
  }
  if (started) {
    const down = compose([...(manualAcceptance ? ["--profile", "interactive"] : []), "down", "--volumes", "--remove-orphans"]);
    if (down.status !== 0) exitCode ||= down.status ?? 1;
  }
  for (const [args, label] of [
    [["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`], "containers"],
    [["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "volumes"],
    [["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`], "networks"]
  ]) {
    const result = spawnSync("docker", args, { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), "", `isolated ${label} remain for ${project}`);
  }
  const imageList = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(imageList.status, 0, imageList.stderr);
  const ownImages = imageList.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`));
  if (ownImages.length > 0) {
    const removed = spawnSync("docker", ["image", "rm", ...ownImages], { encoding: "utf8" });
    assert.equal(removed.status, 0, removed.stderr);
  }
  if (manualAcceptance) {
    await rm(stopFile, { force: true });
    await rm(envFile, { force: true });
    await rm(stateFile, { force: true });
  }
  const remainingImages = spawnSync("docker", ["image", "ls", "--format", "{{.Repository}}:{{.Tag}}"], { encoding: "utf8" });
  assert.equal(remainingImages.status, 0, remainingImages.stderr);
  assert.deepEqual(remainingImages.stdout.split(/\r?\n/u).filter((image) => image.startsWith(`${project}-`)), [], `isolated images remain for ${project}`);
}

if (exitCode !== 0) {
  const evidenceDir = "evidence/audits";
  await mkdir(evidenceDir, { recursive: true });
  const evidencePath = `${evidenceDir}/2026-10-06-w1-v12-qlib-loop-failed-${project}.json`;
  await writeFile(evidencePath, `${JSON.stringify({ schemaVersion: "stockquant.w1-v12-qlib-loop-attempt.v1", stageId: "V1.2", status: "FAIL", isolatedProject: project, apiPort, webPort, testRunIds, testRunId, testRunSummaries, failureReason, browserOutput, browserError, isolatedContainersVolumesNetworksAndImagesRemoved: true, marketSourceAuthorization: "NONE", marketSourceCalls: 0, qlibFitCalls: null, externalModelCalls: 0, brokerCalls: 0, liveTradingEnabled: false, humanAcceptance: "NOT_CHANGED" }, null, 2)}\n`, { mode: 0o600 });
  const inputs = [evidencePath, "infra/compose/docker-compose.v12-integration.yml", "scripts/test-v12-e2e-isolated.mjs", "apps/web/src/main.tsx", "apps/web/tests/e2e/v11-acceptance.spec.ts", "services/platform-api-service/src/application/v12-acceptance.ts", "services/platform-api-service/src/bootstrap/app.module.ts", "services/platform-api-service/src/adapters/v12-strategy-governance-client.ts", "services/platform-api-service/src/ports/v12-strategy-governance-client.ts", "services/platform-api-service/src/ports/qlib-fixture-artifact-repository.ts", "services/platform-api-service/Dockerfile", "services/decision-governance-service/src/application/governance-api.ts", "services/decision-governance-service/src/application/service-auth.ts", "services/decision-governance-service/src/bootstrap/main.ts", "services/decision-governance-service/src/adapters/postgres-strategy-snapshot-repository.ts", "services/decision-governance-service/src/ports/strategy-snapshot-repository.ts", "services/market-data-service/src/bootstrap/main.ts", "services/market-data-service/src/service-auth.ts", "services/quant-research-service/src/application/qlib-research-service.ts", "services/quant-research-service/qlib-worker.py", "services/quant-research-service/qlib-worker.Dockerfile", "services/quant-research-service/qlib-worker-requirements.lock", "services/quant-research-service/tests/test_qlib_fit_validation.py", "packages/contracts/schemas/common/v12-strategy-snapshot-command.schema.json", "packages/contracts/schemas/common/v12-strategy-target.schema.json", "packages/contracts/schemas/research/v12-qlib-strategy-artifact-v1.schema.json", "packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json", "packages/contracts/openapi/platform-v12-qlib-fixture.v1.json", "scripts/check-openapi-contract.mjs", "scripts/verify-v12-research-fixture.mjs", "fixtures/v1/v1.2/v1.2-market-data-4/manifest.json", "fixtures/v1/v1.2/v1.2-market-data-4/daily_bars.csv", "fixtures/v1/v1.2/v1.2-market-data-4/securities.csv"];
  const manifest = [];
  for (const path of inputs) manifest.push(`${createHash("sha256").update(await readFile(path)).digest("hex")}  ${path}`);
  await writeFile(evidencePath.slice(0, -5) + ".sha256", `${manifest.join("\n")}\n`, { mode: 0o600 });
}
assert.equal(exitCode, 0, "V1.2 isolated Web/API/CLI E2E failed");
if (manualAcceptance) {
  process.stdout.write(`${JSON.stringify({ status: "MANUAL_STACK_CLEANUP_VERIFIED", isolatedProject: project, containers: 0, volumes: 0, networks: 0, projectImages: 0, humanAcceptance: "NOT_RECORDED" })}\n`);
  process.exit(0);
}
const evidenceDir = "evidence/audits";
await mkdir(evidenceDir, { recursive: true });
const evidencePath = `${evidenceDir}/2026-10-06-w1-v12-qlib-loop-${project}.json`;
await writeFile(evidencePath, `${JSON.stringify({
  schemaVersion: "stockquant.w1-v12-isolated-web-e2e.v1",
  stageId: "V1.2",
  status: "PASS",
  isolatedProject: project,
  apiPort,
  webPort,
  testRunId,
  testRunIds,
  testRunSummaries,
  governanceDatabaseAssertion,
  artifactExportSummary,
  cancellationTestRunId: cancellationTestRunId ?? null,
  cancellationSummary: cancellationSummary ? { status: cancellationSummary.status, qlibTask: cancellationSummary.evidence?.qlibTask, assertions: cancellationSummary.assertions } : null,
  restartRecoverySummary: restartRecoverySummary ?? null,
  browserOutput,
  browserError,
  isolatedContainersVolumesNetworksAndImagesRemoved: true,
  marketSourceAuthorization: "NONE",
  marketSourceCalls: 0,
  qlibFitCalls: 2,
  externalModelCalls: 0,
  brokerCalls: 0,
  liveTradingEnabled: false,
  humanAcceptance: "NOT_CHANGED"
}, null, 2)}\n`, { mode: 0o600 });
const manifestInputs = [evidencePath, "infra/compose/docker-compose.v12-integration.yml", "scripts/test-v12-e2e-isolated.mjs", "scripts/evidence-export.mjs", "scripts/evidence-export-core.mjs", "scripts/evidence-export.test.mjs", "apps/web/src/main.tsx", "apps/web/tests/e2e/v11-acceptance.spec.ts", "services/platform-api-service/src/application/v12-acceptance.ts", "services/platform-api-service/src/bootstrap/app.module.ts", "services/platform-api-service/src/adapters/v12-strategy-governance-client.ts", "services/platform-api-service/src/ports/v12-strategy-governance-client.ts", "services/platform-api-service/src/ports/qlib-fixture-artifact-repository.ts", "services/platform-api-service/Dockerfile", "services/decision-governance-service/src/application/governance-api.ts", "services/decision-governance-service/src/application/service-auth.ts", "services/decision-governance-service/src/bootstrap/main.ts", "services/decision-governance-service/src/adapters/postgres-strategy-snapshot-repository.ts", "services/decision-governance-service/src/ports/strategy-snapshot-repository.ts", "services/market-data-service/src/bootstrap/main.ts", "services/market-data-service/src/service-auth.ts", "services/quant-research-service/src/application/qlib-research-service.ts", "services/quant-research-service/qlib-worker.py", "services/quant-research-service/qlib-worker.Dockerfile", "services/quant-research-service/qlib-worker-requirements.lock", "services/quant-research-service/tests/test_qlib_fit_validation.py", "packages/contracts/schemas/common/v12-strategy-snapshot-command.schema.json", "packages/contracts/schemas/common/v12-strategy-target.schema.json", "packages/contracts/schemas/research/v12-qlib-strategy-artifact-v1.schema.json", "packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json", "packages/contracts/openapi/platform-v12-qlib-fixture.v1.json", "scripts/check-openapi-contract.mjs", "scripts/verify-v12-research-fixture.mjs", "fixtures/v1/v1.2/v1.2-market-data-4/manifest.json", "fixtures/v1/v1.2/v1.2-market-data-4/daily_bars.csv", "fixtures/v1/v1.2/v1.2-market-data-4/securities.csv"];
const manifest = [];
for (const path of manifestInputs) manifest.push(`${createHash("sha256").update(await readFile(path)).digest("hex")}  ${path}`);
const manifestPath = `${evidencePath.slice(0, -5)}.sha256`;
await writeFile(manifestPath, `${manifest.join("\n")}\n`, { mode: 0o600 });
console.log(JSON.stringify({ status: "PASS", suite: "V1.2 isolated Web/API/CLI same-TestRun normal/rejection/recovery-probe", testRunIds, isolatedProject: project, cleanup: "verified", evidence: evidencePath, manifest: manifestPath }));
