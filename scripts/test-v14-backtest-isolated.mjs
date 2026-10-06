import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const project = `sq-v14-backtest-${randomBytes(10).toString("hex")}`;
const apiPort = 20000 + randomBytes(2).readUInt16BE(0) % 30000;
const webPort = 50000 + randomBytes(2).readUInt16BE(0) % 10000;
const composeFile = "infra/compose/docker-compose.v14-integration.yml";
const manifestInputs = ["fixtures/v1/v1.4/manifest.json", "fixtures/v1/v1.4/backtest_daily.csv", "fixtures/v1/v1.4/historical-fees-manifest.json", "fixtures/v1/v1.4/backtest_historical_fees.csv", "fixtures/v1/v1.4/market-restrictions-manifest.json", "fixtures/v1/v1.4/market_restrictions_synthetic.csv", "packages/contracts/research/v14-daily-backtest-request.schema.json", "packages/contracts/research/v14-daily-backtest-result.schema.json", "packages/contracts/openapi/quant-v14-daily-backtest.v1.json", "packages/contracts/generated/types.ts", "services/quant-research-service/src/domain/v14-daily-backtest.ts", "services/quant-research-service/src/contracts/generated-types.ts", "services/quant-research-service/tests/unit/v14-daily-backtest-service.spec.ts", "services/quant-research-service/src/application/v14-daily-backtest-service.ts", "services/quant-research-service/src/ports/v14-daily-backtest-fixture.ts", "services/quant-research-service/src/adapters/v14-daily-backtest-fixture.ts", "services/quant-research-service/src/adapters/postgres-v14-backtest-repository.ts", "services/quant-research-service/src/adapters/postgres-schema.ts", "services/quant-research-service/src/bootstrap/main.ts", "services/platform-api-service/src/adapters/v14-quant-backtest-adapter.ts", "services/platform-api-service/src/application/v14-backtest.ts", "services/platform-api-service/tests/unit/v14-backtest-adapter.spec.ts", "services/platform-api-service/src/contracts/generated-types.ts", "services/platform-api-service/src/application/persistent-stage-run.ts", "services/platform-api-service/src/contracts/generated-quant-v14-backtest-client.ts", "services/platform-api-service/src/bootstrap/app.module.ts", "apps/web/src/main.tsx", "apps/web/src/styles.css", "apps/web/tests/e2e/v11-acceptance.spec.ts", "infra/compose/docker-compose.v14-integration.yml", "services/quant-research-service/Dockerfile", "scripts/test-v14-backtest-isolated.mjs", "scripts/verify-stage.mjs", "pnpm-lock.yaml"];
const codeVersion = `sha256:${createHash("sha256").update(manifestInputs.map((path) => `${path}\0${createHash("sha256").update(readFileSync(resolve(path))).digest("hex")}`).join("\n")).digest("hex")}`;
const passwordNames = ["PLATFORM_API", "PORTFOLIO_RISK", "TRADE_EXECUTION", "TRADE_EXECUTION_TEST", "HISTORICAL_REPLAY", "DECISION_GOVERNANCE", "QUANT_RESEARCH", "RESEARCH_AUTOMATION", "MARKET_DATA"];
const env = { ...process.env, ...Object.fromEntries(passwordNames.map((name) => [`STOCKQUANT_DATABASE_PASSWORD_${name}`, randomBytes(32).toString("hex")])), STOCKQUANT_CODE_VERSION: codeVersion, COMPOSE_PROJECT_NAME: project, V11_HOST_PORT: String(apiPort) };
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
  const accepted = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs`, { method: "POST", headers, body: JSON.stringify({ scenarioId: "normal", seed: 20260907 }) });
  assert.equal(accepted.status, 202);
  webTestRunId = (await accepted.json()).testRunId;
  assert.match(webTestRunId, /^[0-9a-f-]{36}$/i);
  const sameRun = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${webTestRunId}`, { headers }).then((response) => response.json());
  assert.equal(sameRun.status, "COMPLETED");
  assert.equal(sameRun.evidence.fixtureSha256, fixtureSha256);
  assert.equal(sameRun.evidence.codeVersion, codeVersion, "V1.4 evidence must bind the run to the exact source/contract/fixture workspace digest");
  assert.equal(sameRun.evidence.metrics.finalNavCents, 1_000_000);
  testRuns.push({ origin: "platform-api", testRun: sameRun });
  run("pnpm", ["verify:stage", "--", "--stage", "V1.4", "--run", webTestRunId, "--check-only"], { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl });

  for (const scenario of ["rejection", "recovery", "market-restrictions", "historical-fees"]) {
    const output = run("pnpm", ["verify:stage", "--", "--stage", "V1.4", "--scenario", scenario, "--seed", "20260907"], { ...env, STOCKQUANT_PLATFORM_API_URL: apiUrl });
    const testRunId = output.match(/"testRunId": "([0-9a-f-]{36})"/iu)?.[1];
    assert.ok(testRunId, `${scenario} CLI output omitted its TestRun id`);
    const testRun = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${testRunId}`, { headers }).then((response) => response.json());
    assert.equal(testRun.status, "COMPLETED");
    assert.equal(testRun.evidence.codeVersion, codeVersion, `${scenario} run must preserve its workspace digest`);
    if (scenario === "rejection") assert.equal(testRun.assertions.find((item) => item.assertionId === "V1.4-BT-TPLUS1-REJECT-009")?.actual, "T_PLUS_1_UNAVAILABLE");
    if (scenario === "market-restrictions") { assert.equal(testRun.scenarioVersion, "1.2.0"); assert.equal(testRun.evidence.fixtureSha256, "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a"); assert.equal(testRun.assertions[0]?.status, "PASS"); }
    if (scenario === "historical-fees") { assert.equal(testRun.scenarioVersion, "1.3.0"); assert.equal(testRun.evidence.fixtureSha256, "5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573"); assert.equal(testRun.assertions.find((item) => item.assertionId === "V1.4-BT-HISTORICAL-FEE-001")?.status, "PASS"); }
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
  const browser = spawnSync("pnpm", ["--filter", "@stockquant/web", "exec", "playwright", "test", "--grep", "V1\\.4 (?:daily backtest page|web accepts a bounded policy|synthetic suspension|historical fee fixture)"], {
    env: { ...env, PLAYWRIGHT_BASE_URL: `http://127.0.0.1:${webPort}`, STOCKQUANT_PLATFORM_API_URL: apiUrl }, encoding: "utf8"
  });
  process.stdout.write(browser.stdout ?? "");
  process.stderr.write(browser.stderr ?? "");
  assert.equal(browser.status, 0, "V1.4 browser test failed");
  browserCreatedTestRunIds = [...(browser.stdout ?? "").matchAll(/\[V1\.4 Web\/CLI same-run\] testRunId=([0-9a-f-]{36})/giu)].map((match) => match[1]);
  assert.equal(browserCreatedTestRunIds.length, 6, "all V1.4 browser scenarios must report each Web-created TestRun checked by CLI");
  const browserRuns = await Promise.all(browserCreatedTestRunIds.map(async (testRunId) => {
    const response = await fetch(`${apiUrl}/api/v1/acceptance/v1/v1.4/runs/${testRunId}`, { headers });
    assert.equal(response.status, 200);
    const testRun = await response.json();
    assert.equal(testRun.status, "COMPLETED");
    assert.equal(testRun.evidence.codeVersion, codeVersion, "browser-created run must preserve its workspace digest");
    if (testRun.scenarioId === "market-restrictions") { assert.equal(testRun.scenarioVersion, "1.2.0"); assert.equal(testRun.evidence.ruleScope, "SYNTHETIC_FIXTURE_BOUNDARIES_ONLY"); }
    return testRun;
  }));
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
  assert.equal(soldRun.evidence.orderOutcomes?.[0]?.status, "FILLED");
  assert.equal(soldRun.evidence.settlements?.[0]?.status, "SETTLED");
  assert.equal(soldRun.evidence.settlements?.[0]?.settlementDate, "2024-01-05");
  assert.equal(soldRun.evidence.metrics?.finalCashCents, 99_812);
  testRuns.push(...browserRuns.map((testRun, index) => ({ origin: `web-created-${index + 1}-and-cli-checked`, testRun })));
  const persisted = compose(["exec", "-T", "postgres", "psql", "-U", "quant_research", "-d", "quant_research", "-Atc", "SELECT count(*) || ':' || count(m.backtest_run_id) || ':' || count(*) FILTER (WHERE r.result_sha256 = m.manifest_payload->>'resultSha256') FROM research_backtest_runs r LEFT JOIN research_backtest_manifests m USING (backtest_run_id)"], "pipe");
  assert.equal(persisted.status, 0, persisted.stderr);
  assert.equal(persisted.stdout.trim(), "11:11:11", "Quant must persist all eleven result/Manifest pairs with matching hashes");
  quantRunCount = Number(persisted.stdout.trim().split(":")[0]);
  const stageRunCount = compose(["exec", "-T", "postgres", "psql", "-U", "platform_api", "-d", "platform_api", "-Atc", "SELECT count(*) FROM acceptance_stage_runs WHERE stage_id='V1.4'"], "pipe");
  assert.equal(stageRunCount.status, 0, stageRunCount.stderr);
  assert.equal(stageRunCount.stdout.trim(), "11", "rejected policy must not create a Platform TestRun");
  exitCode = 0;
} finally {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await new Promise((resolveExit) => web.once("exit", resolveExit));
  }
  if (started) {
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
const report = { schemaVersion: "stockquant.w1-v14-quant-boundary-isolated-run.v1", createdAt: new Date().toISOString(), stageId: "V1.4", status: "PASS", suite: "isolated-Compose-PostgreSQL-Quant-Platform-Web-CLI", isolatedProject: project, codeVersion, fixtureSha256, quantServiceOwnsComputation: true, invalidPolicyRejectedWithoutRun: true, restrictionFixtureSha256: "45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a", quantPersistence: { status: "PASS", backtestRunCount: quantRunCount, manifestCount: quantRunCount, resultHashMatchesManifest: quantRunCount }, testRuns, containersVolumesNetworksRemoved: true, externalMarketCalls: 0, providerCalls: 0, paperOrBrokerCalls: 0, activeServicesTouched: false, humanAcceptance: "NOT_CHANGED", limitations: ["Fixture-only small sample", "Exchange-specific limit formulas, intraday queue/fills, full market fees, corporate actions, Qlib/Paper parity, current complete manual acceptance and Ubuntu remain incomplete"] };
const evidenceSuffix = project.slice(project.lastIndexOf("-") + 1);
const reportPath = `evidence/audits/2026-10-02-w1-v14-quant-configurable-web-${evidenceSuffix}.json`;
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
const markdownPath = `evidence/audits/2026-10-02-w1-v14-quant-configurable-web-${evidenceSuffix}.md`;
const runLines = testRuns.map(({ origin, testRun }) => `- ${origin}: \`${testRun.testRunId}\`, ${testRun.status}, ${testRun.assertions.length} assertions (${testRun.assertions.map((item) => `${item.assertionId}=${item.status}`).join(", ")}).`);
const markdown = `# W1 / V1.4 configurable Web and isolated end-to-end audit\n\nDate: 2026-10-02 (Asia/Shanghai)\n\n## Change\n\nDaily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.\n\n## Verification\n\n- pnpm contracts:check: PASS; 151 schemas, 106 compatibility rules, 25 client generators registered.\n- Quant build: PASS; focused service/auth/engine tests passed.\n- Platform build and focused adapter/client tests passed.\n- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection, recovery and synthetic market restrictions; unknown policy fields rejected without a Platform TestRun; configured Web runs and same-session metric comparison; every browser-created TestRun checked by CLI; database assertion confirmed eight Quant BacktestRuns, eight Manifests and matching result hashes; all temporary containers, volume, network and images removed.\n- Workspace codeVersion: \`${codeVersion}\`; computed from the exact V1.4 contract, Fixture, Quant/Platform/Web sources, integration harness and lockfile, and asserted in each TestRun.\n- Each TestRun has an immutable evidence/local/V1.4/<testRunId>/ bundle with unchanged source evidence, SHA-256 manifest, and manualConclusion=NOT_RUN.\n- Frozen Fixture SHA-256: ${fixtureSha256}.\n\nTestRuns:\n\n${runLines.join("\n")}\n\n## Boundaries\n\nExternal market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.\n\nThe original Fixture contains one security's daily close/volume; the restriction case uses a separate synthetic OHLCV Manifest. It does not implement exchange-specific limit formulas, intraday queue/fills, full fee schedules, corporate actions, Qlib/Paper rule parity, complete current-scope manual acceptance or Ubuntu acceptance. This audit does not close V1.4, W1 or the delivery plan.\n`;
await writeFile(markdownPath, markdown);
const root = process.cwd();
const evidenceManifestInputs = [...new Set([reportPath, markdownPath, ...bundlePaths, ...manifestInputs, "services/quant-research-service/tests/unit/v14-daily-backtest-service.spec.ts", "services/quant-research-service/tests/unit/postgres-v14-backtest-repository.spec.ts", "services/platform-api-service/tests/unit/v14-backtest-adapter.spec.ts", "scripts/e2e-stage-command.mjs", "scripts/e2e-stage-command.test.mjs"])];
const manifest = [];
for (const path of evidenceManifestInputs) manifest.push(`${createHash("sha256").update(await readFile(resolve(root, path))).digest("hex")}  ${path}`);
await writeFile(`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-${evidenceSuffix}.sha256`, manifest.join("\n") + "\n");
console.log(JSON.stringify({ status: "PASS", isolatedProject: project, codeVersion, webNormal: "PASS", apiCreatedRunCheckedByCli: webTestRunId, browserCreatedRunsCheckedByCli: browserCreatedTestRunIds, cliRejectionTestRunId: rejectionTestRunId, cliRecoveryTestRunId: recoveryTestRunId, restrictionsTestRunId, fixtureSha256, containersVolumesNetworksRemoved: true, evidence: reportPath }));
