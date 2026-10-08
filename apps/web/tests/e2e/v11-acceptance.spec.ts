import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const v13FixtureRoot = resolve(process.cwd(), "../../fixtures/v1/v1.3");
const v13TradeFixture = JSON.parse(readFileSync(resolve(v13FixtureRoot, "trading-loop-scenarios.json"), "utf8"));
const v13TradeFixtureManifest = JSON.parse(readFileSync(resolve(v13FixtureRoot, "manifest.json"), "utf8"));

test.beforeAll(() => {
  const fixturePath = resolve(v13FixtureRoot, "trading-loop-scenarios.json");
  const fixtureHash = createHash("sha256").update(readFileSync(fixturePath)).digest("hex");
  expect(fixtureHash).toBe(v13TradeFixtureManifest.files[0].sha256);
  expect(v13TradeFixture.fixtureId).toBe(v13TradeFixtureManifest.fixtureId);
});

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("V1.3")) await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
});

test.afterEach(async ({ page }, testInfo) => {
  if (!testInfo.title.includes("V1.3")) return;
  const root = resolve(process.cwd(), "../..");
  const captureRunId = process.env.STOCKQUANT_V13_CAPTURE_RUN_ID
    ?? (new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:0").port || `local-${process.pid}`);
  const captureDirectory = resolve(root, `evidence/audits/2026-10-08-v13-browser-captures-${captureRunId}`);
  mkdirSync(captureDirectory, { recursive: true });
  const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 90);
  await page.screenshot({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.png`), fullPage: true, animations: "disabled" });
  await page.context().tracing.stop({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.trace.zip`) });
  const runId = new URL(page.url()).searchParams.get("runId");
  if (!runId) {
    if (testInfo.status === testInfo.expectedStatus) return;
    throw new Error("V1.3 browser test completed without a persisted TestRun URL");
  }
  const exported = spawnSync(process.execPath, ["scripts/evidence-export.mjs", "--stage", "V1.3", "--run", runId], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  expect(exported.status, exported.stderr).toBe(0);
  const result = JSON.parse(exported.stdout) as { outputDirectory?: string; stageId?: string; kind?: string };
  expect(result.stageId).toBe("V1.3");
  expect(result.kind).toBe("TEST_RUN_EVIDENCE");
  expect(result.outputDirectory).toContain(`evidence/local/V1.3/${runId}`);
  console.info(`[V1.3 evidence export] testRunId=${runId} ${exported.stdout.trim()}`);
});

function verifyV11RunWithCli(testRunId: string) {
  console.info(`[V1.1 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.1", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "COMPLETED"');
}

function verifyV12RunWithCli(testRunId: string, expectedStatus: "COMPLETED" | "WAITING") {
  console.info(`[V1.2 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.2", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(expectedStatus === "COMPLETED" ? 0 : 2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain(`"status": "${expectedStatus}"`);
}

function verifyV13RunWithCli(testRunId: string, proposalId?: string, clientOrderId?: string, expectedCash = "8995.0000", expectedReservation = "1005.0000", expectedOrderStatus = "FILLED", expectedReservationStatus = "CAPTURED", expectedCapturedCash = expectedReservation) {
  console.info(`[V1.3 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId, ...(proposalId ? ["--proposal", proposalId] : []), ...(clientOrderId ? ["--client-order", clientOrderId] : []), "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "WAITING"');
  if (proposalId) expect(cli.stdout).toContain(`"proposalId": "${proposalId}"`);
  if (clientOrderId) { expect(cli.stdout).toContain('"clientOrderId":'); expect(cli.stdout).toContain(`"status": "${expectedOrderStatus}"`); expect(cli.stdout).toContain('"status": "MATCH"'); expect(cli.stdout).toContain(`"current_cash": "${expectedCash}"`); expect(cli.stdout).toContain(`"status": "${expectedReservationStatus}"`); expect(cli.stdout).toContain(`"capturedCashAmount": "${expectedCapturedCash}"`); }
}

function verifyV14RunWithCli(testRunId: string) {
  console.info(`[V1.4 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.4", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "COMPLETED"');
}

function verifyV15RunWithCli(testRunId: string, sessionCookie: string) {
  const root = resolve(process.cwd(), "../..");
  const env = { ...process.env, STOCKQUANT_SESSION_COOKIE: sessionCookie };
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.5", "--run", testRunId, "--check-only"], { cwd: root, encoding: "utf8", env, timeout: 30_000 });
  expect(cli.status, cli.stderr).toBe(2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "WAITING"');

  const exported = spawnSync(process.execPath, [resolve(root, "scripts/evidence-export.mjs"), "--stage", "V1.5", "--run", testRunId], {
    cwd: process.env.STOCKQUANT_EVIDENCE_EXPORT_CWD ?? root,
    encoding: "utf8",
    env: { ...env, STOCKQUANT_PLATFORM_API_URL: process.env.STOCKQUANT_PLATFORM_API_URL, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie },
    timeout: 30_000,
  });
  expect(exported.status, exported.stderr).toBe(0);
  const result = JSON.parse(exported.stdout) as { outputDirectory?: string; stageId?: string; kind?: string };
  expect(result.stageId).toBe("V1.5");
  expect(result.kind).toBe("TEST_RUN_EVIDENCE");
  expect(result.outputDirectory).toContain(`evidence/local/V1.5/${testRunId}`);
}

test("V1.1 normal scenario creates an isolated run with backend assertions", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.1");
  await expect(page.getByRole("heading", { name: "V1.1 环境、账户初始化与 Web 验收中心" })).toBeVisible();
  await page.getByRole("button", { name: "准备隔离运行：normal" }).click();
  await expect(page.getByTestId("test-run-id")).not.toHaveText("", { timeout: 10_000 });
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 10_000 });
  await expect(page.getByText("V1.1-ACCOUNT-INIT-001")).toBeVisible();
  await expect(page.getByText("PASS").first()).toBeVisible();
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV11RunWithCli(testRunId!);
});

test("V1.1 rejection scenario persists denial assertions visible to the same-run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.1");
  await page.getByRole("button", { name: "准备隔离运行：rejection" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 10_000 });
  await expect(page.getByText("V1.1-ACCOUNT-AUTHORIZATION-001")).toBeVisible();
  await expect(page.getByText("V1.1-ACCOUNT-CONFLICT-001")).toBeVisible();
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV11RunWithCli(testRunId!);
});

test("V1.1 recovery resumes the same run after restarting only the verified isolated Portfolio container", async ({ page }) => {
  const project = process.env.STOCKQUANT_ISOLATED_V11_PROJECT;
  expect(project, "recovery E2E requires the isolated V1.1 harness").toMatch(/^sq-v11-stage-(?:[a-f0-9]{20}|web)$/u);
  await page.goto("/acceptance/v1/v1.1");
  await page.getByRole("button", { name: "准备隔离运行：recovery" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("WAITING", { timeout: 10_000 });
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);

  const expected = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v11-integration.yml", "ps", "-q", "portfolio-risk-service"], { encoding: "utf8" });
  expect(expected.status, expected.stderr).toBe(0);
  expect(expected.stdout.trim()).not.toBe("");
  const actual = spawnSync("docker", ["compose", "-p", project!, "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "ps", "-q", "portfolio-risk-service"], { encoding: "utf8" });
  expect(actual.status, actual.stderr).toBe(0);
  expect(actual.stdout.trim()).toBe(expected.stdout.trim());
  const restart = spawnSync("docker", ["compose", "-p", project!, "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "restart", "portfolio-risk-service"], { encoding: "utf8" });
  expect(restart.status, restart.stderr).toBe(0);
  await expect.poll(() => {
    const health = spawnSync("docker", ["inspect", "--format", "{{.State.Health.Status}}", expected.stdout.trim()], { encoding: "utf8" });
    return health.status === 0 ? health.stdout.trim() : `inspect failed: ${health.stderr}`;
  }, { timeout: 30_000, message: "isolated Portfolio Risk must pass its ready healthcheck before recovery continues" }).toBe("healthy");

  await page.getByRole("button", { name: "重启后继续核对" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 15_000 });
  await expect(page.getByText("V1.1-RECOVERY-001")).toBeVisible();
  verifyV11RunWithCli(testRunId!);
});

test("V1.2 normal, rejection, and recovery-probe runs are persisted and verified by the same-run CLI", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/acceptance/v1/v1.2");
  await page.getByRole("button", { name: "预览正常 Fixture" }).click();
  await expect(page.getByTestId("normal-preview")).toContainText("v1.2-market-data-1");
  await page.getByRole("button", { name: "预览未来数据拒绝样本" }).click();
  await expect(page.getByTestId("bad-preview")).toContainText("FUTURE_DATA");
  await page.getByRole("button", { name: "读取双市场研究 Fixture" }).click();
  await expect(page.getByTestId("research-fixture-preview")).toContainText("v1.2-market-data-4");
  await expect(page.getByTestId("research-fixture-preview")).toContainText("774");
  await expect(page.getByTestId("research-fixture-preview")).toContainText("13");
  await page.getByRole("button", { name: "运行 Qlib CPU 探针" }).click();
  await expect(page.getByTestId("qlib-probe")).toContainText("READY");
  await page.getByRole("button", { name: "运行 RD-Agent 兼容探针" }).click();
  await expect(page.getByTestId("rdagent-probe")).toContainText("fixed-probe-ok");

  for (const scenario of ["normal", "rejection", "recovery"] as const) {
    await page.getByLabel("V1.2 验收场景").selectOption(scenario);
    await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
    const expectedStatus = "COMPLETED";
    await expect(page.getByTestId("v12-run-status")).toHaveText(expectedStatus, { timeout: 150_000 });
    const runEvidence = page.getByTestId("v12-run-evidence");
    if (scenario === "normal") {
      await expect(runEvidence).toContainText("v1.2-market-data-1");
      await expect(page.getByText("V1.2-DATA-NORMAL-001")).toBeVisible();
      await expect(page.getByText("V1.2-FACTOR-PREVIEW-001")).toBeVisible();
      await expect(runEvidence).toContainText("v1.2-qlib-strategy-artifact-v1");
      await expect(runEvidence).toContainText("temporalValidation");
      const evidence = JSON.parse((await runEvidence.textContent()) ?? "{}");
      const artifact = await page.evaluate(async (url) => {
        const response = await fetch(url);
        const body = await response.json();
        return { ok: response.ok, schemaVersion: body.payload?.schemaVersion, sha256: body.sha256, artifactRef: body.artifactRef, strategyCount: body.payload?.strategies?.length, strategiesHaveReasons: body.payload?.strategies?.every((item: any) => typeof item.reason === "string" && item.reason.length > 0), targetsHaveReasons: body.payload?.strategies?.filter((item: any) => item.mode === "TOPK").every((item: any) => item.targets.every((target: any) => typeof target.reason === "string" && target.reason.length > 0)), predictionCount: body.payload?.predictions?.length, distinctPredictionCount: new Set(body.payload?.predictions?.map((item: any) => item.prediction)).size, markets: [...new Set(body.payload?.predictions?.map((item: any) => item.market))] };
      }, evidence.qlibFit.artifactUrl);
      expect(artifact).toMatchObject({ ok: true, schemaVersion: "v1.2-qlib-strategy-artifact-v1", sha256: evidence.qlibFit.artifactSha256, artifactRef: evidence.qlibFit.artifactRef, strategyCount: 2 });
      expect(artifact.artifactRef).toMatchObject({ schemaVersion: "artifact-ref.v1", artifactId: evidence.qlibFit.artifactId, testRunId: await page.getByTestId("v12-test-run-id").textContent(), kind: "MODEL_PREDICTIONS", sha256: evidence.qlibFit.artifactSha256, status: "PUBLISHED", sourceRef: expect.stringContaining(":v1.2:") });
      expect(artifact.strategiesHaveReasons).toBe(true);
      expect(artifact.targetsHaveReasons).toBe(true);
      expect(artifact.predictionCount).toBe(evidence.qlibFit.testPredictionCount);
      expect(artifact.distinctPredictionCount).toBeGreaterThan(1);
      expect(new Set(artifact.markets)).toEqual(new Set(["CN_A", "US_EQUITY"]));
      const normalRunId = await page.getByTestId("v12-test-run-id").textContent();
      await expect(page).toHaveURL(new RegExp(`[?&]runId=${normalRunId}`));
      await page.reload();
      await expect(page.getByTestId("v12-test-run-id")).toHaveText(normalRunId ?? "");
      await expect(page.getByTestId("v12-run-status")).toHaveText("COMPLETED");
    } else if (scenario === "rejection") {
      await expect(page.getByText("V1.2-DATA-PIT-001")).toBeVisible();
      await expect(runEvidence).toContainText("FUTURE_DATA");
    } else {
      await expect(page.getByText("V1.2-QLIB-PROBE-001")).toBeVisible();
      await expect(runEvidence).toContainText("READY");
    }
    const testRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    verifyV12RunWithCli(testRunId!, expectedStatus);
    const persistedRun = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
      return { ok: response.ok, run: await response.json() };
    }, testRunId!);
    expect(persistedRun.ok).toBe(true);
    console.log(`[V1.2 persisted readback] ${JSON.stringify(persistedRun.run)}`);
  }

  await page.getByLabel("V1.2 验收场景").selectOption("normal");
  await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
  await expect(page.getByTestId("cancel-v12-run")).toBeVisible({ timeout: 20_000 });
  const cancellationRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
  expect(cancellationRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("cancel-v12-run").click();
  await expect(page.getByTestId("v12-run-status")).toHaveText("CANCELLED", { timeout: 30_000 });
  const cancelledEvidence = JSON.parse((await page.getByTestId("v12-run-evidence").textContent()) ?? "{}");
  expect(cancelledEvidence.qlibTask).toMatchObject({ cancelRequested: true, phase: "CANCELLED", artifactPublished: false });
  expect(cancelledEvidence.qlibFit?.artifactId).toBeUndefined();
  await expect(page.getByText("V1.2-QLIB-CANCEL-001")).toBeVisible();
  const cancelCli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.2", "--run", cancellationRunId!, "--check-only"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env });
  expect(cancelCli.status, cancelCli.stderr).toBe(2);
  expect(cancelCli.stdout).toContain(`"testRunId": "${cancellationRunId}"`);
  expect(cancelCli.stdout).toContain('"status": "CANCELLED"');
  const persistedCancelledRun = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
    return { ok: response.ok, run: await response.json() };
  }, cancellationRunId!);
  expect(persistedCancelledRun.ok).toBe(true);
  console.log(`[V1.2 cancellation readback] ${JSON.stringify(persistedCancelledRun.run)}`);

  const isolatedProject = process.env.STOCKQUANT_ISOLATED_V12_PROJECT;
  expect(isolatedProject, "Platform restart recovery requires the isolated V1.2 harness").toMatch(/^sq-v12-e2e-[a-f0-9]{20}$/u);
  await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
  await expect(page.getByTestId("cancel-v12-run")).toBeVisible({ timeout: 20_000 });
  const restartRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
  expect(restartRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v12-run-evidence")).toContainText("FITTING_CN_A", { timeout: 20_000 });
  const platform = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v12-integration.yml", "ps", "-q", "platform-api-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8" });
  expect(platform.status, platform.stderr).toBe(0);
  const platformContainer = platform.stdout.trim();
  expect(platformContainer).not.toBe("");
  const restart = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v12-integration.yml", "restart", "platform-api-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", timeout: 30_000 });
  expect(restart.status, restart.stderr).toBe(0);
  await expect.poll(() => {
    const health = spawnSync("docker", ["inspect", "--format", "{{.State.Health.Status}}", platformContainer], { encoding: "utf8" });
    return health.status === 0 ? health.stdout.trim() : `inspect failed: ${health.stderr}`;
  }, { timeout: 45_000, message: "isolated Platform API must return healthy before its pending TestRun resumes" }).toBe("healthy");
  await page.reload();
  await expect(page.getByTestId("v12-test-run-id")).toHaveText(restartRunId ?? "");
  await expect(page.getByTestId("v12-run-status")).toHaveText("COMPLETED", { timeout: 150_000 });
  const resumedRun = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
    return { ok: response.ok, run: await response.json() };
  }, restartRunId!);
  expect(resumedRun.ok).toBe(true);
  expect(resumedRun.run.status).toBe("COMPLETED");
  expect(resumedRun.run.evidence.qlibTask.resumeCount).toBeGreaterThanOrEqual(1);
  expect(resumedRun.run.evidence.qlibTask.phase).toBe("COMPLETED");
  expect(resumedRun.run.evidence.qlibFit.artifactId).toBeTruthy();
  verifyV12RunWithCli(restartRunId!, "COMPLETED");
  console.log(`[V1.2 Platform restart recovery] ${JSON.stringify({ testRunId: restartRunId, status: resumedRun.run.status, qlibTask: resumedRun.run.evidence.qlibTask, artifactId: resumedRun.run.evidence.qlibFit.artifactId })}`);
});

for (const scenario of ["normal", "rejection", "recovery"] as const) {
  test(`V1.3 ${scenario} persists an owner-scoped proposal and same-run CLI remains truthful`, async ({ page }) => {
    await page.goto("/acceptance/v1/v1.3");
    await expect(page.getByRole("heading", { name: "V1.3 治理、风控与模拟券商交易链路" })).toBeVisible();
    await expect(page.getByTestId("v13-fixture-version")).toContainText(`${v13TradeFixture.fixtureId} · ${v13TradeFixture.fixtureVersion}`);
    await expect(page.getByTestId("v13-business-boundary")).toContainText("AUTO_POLICY须先人工激活");
    await page.selectOption("[aria-label='验收场景']", scenario);
    await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
    await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
    await expect(page.getByTestId("v13-run-status")).toHaveText("WAITING");
    const evidence = page.getByTestId("v13-evidence");
    await expect(evidence).toContainText('"evidenceScope": "PLATFORM_WAITING_DECLARATION"');
    await expect(evidence).toContainText('"businessExecution": "NOT_RUN"');
    const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
    await expect(page.getByTestId("v13-account-id")).toContainText(scenario === "normal" || scenario === "rejection" || scenario === "recovery" ? "CNY" : "USD");
    await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
    await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
    const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
    expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
    if (scenario === "normal") {
      await page.getByRole("button", { name: "人工批准", exact: true }).click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
      await page.getByTestId("v13-execute-proposal").click();
      await expect(page.getByTestId("v13-order")).toContainText("FILLED");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.quantity} × ${v13TradeFixture.markets.CN_A.order.price} · fee ${v13TradeFixture.markets.CN_A.order.fee}`);
      await expect(page.getByTestId("v13-account-id")).toContainText("8995");
      await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
      await expect(page.getByTestId("v13-positions")).toContainText("100");
      await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.expectedCash} ${v13TradeFixture.markets.CN_A.currency}`);
    } else if (scenario === "rejection") {
      await page.getByRole("button", { name: "人工拒绝" }).click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("REJECTED_MANUAL");
    } else {
      const proposal = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}`);
      const stored = await proposal.json();
      await page.getByRole("button", { name: "追加提案修订版本" }).click();
      await expect(page.getByTestId("v13-proposal-version")).toContainText("2 /");
      const revised = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}`);
      const revisedProposal = await revised.json();
      expect(revisedProposal.proposalVersion).toBe(2);
      expect(revisedProposal.contentHash).not.toBe(stored.contentHash);
      expect(revisedProposal.status).toBe("MANUAL_APPROVAL_PENDING");
      const stale = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/approve`, { data: { expectedVersion: stored.proposalVersion, expectedContentHash: stored.contentHash, reason: "stale version recovery" } });
      expect(stale.status()).toBe(409);
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
    }
    verifyV13RunWithCli(testRunId!, proposalId!, scenario === "normal" ? `v13-${proposalId}` : undefined);
    await page.reload();
    await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
    await expect(page.getByTestId("v13-proposal-id")).toHaveText(proposalId!);
    await expect(page.getByTestId("v13-proposal-status")).toHaveText(scenario === "normal" ? "APPROVED_MANUAL" : scenario === "rejection" ? "REJECTED_MANUAL" : "MANUAL_APPROVAL_PENDING");
    if (scenario === "normal") {
      await expect(page.getByTestId("v13-account-id")).toContainText("8995");
      await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
      await expect(page.getByTestId("v13-order")).toContainText("FILLED");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.expectedCash} ${v13TradeFixture.markets.CN_A.currency}`);
      await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
      verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`);
    }
  });
}

test("V1.3 L02 independent USD account executes and reconciles its frozen US Fixture", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("USD");
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.US_EQUITY.order.quantity} × ${v13TradeFixture.markets.US_EQUITY.order.price} · fee ${v13TradeFixture.markets.US_EQUITY.order.fee}`);
  await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.US_EQUITY.order.expectedCash} ${v13TradeFixture.markets.US_EQUITY.currency}`);
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-account-id")).toContainText("9749.95");
  await expect(page.getByTestId("v13-positions")).toContainText("AAPL");
  await expect(page.getByTestId("v13-positions")).toContainText("10");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "9749.9500", "250.0500");
});

test("V1.3 L08 corrects a fill fee through the formal Web route and posts the ledger adjustment idempotently", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  const order = await page.evaluate(async ({ id, proposal }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`);
    return response.json();
  }, { id: testRunId!, proposal: proposalId! });
  const fillId = order.fill.externalFillId as string;
  expect(fillId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-correct-fill-fee").click();
  await expect(page.getByTestId("v13-fee-correction")).toContainText('"replayed": false');
  const correction = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}/fills/${fillId}/fee-corrections`, { data: { revision: 1, previousFee: "5.0000", correctedFee: "6.0000" } });
  expect(correction.status()).toBe(202);
  expect((await correction.json()).replayed).toBe(true);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`);
    return (await response.json()).account.cash.amount;
  }, { timeout: 15_000 }).toBe("8994.0000");
  await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
  const finalOrder = await page.evaluate(async ({ id, proposal }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`);
    return response.json();
  }, { id: testRunId!, proposal: proposalId! });
  expect(finalOrder.fill.fee).toBe("6.0000");
  expect(finalOrder.reconciliation.status).toBe("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "8994.0000", "1006.0000");
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-account-id")).toContainText("8994");
  console.info(`[V1.3 L08 fee correction] ${JSON.stringify({ testRunId, proposalId, externalFillId: fillId, originalFee: "5.0000", correctedFee: finalOrder.fill.fee, portfolioCash: "8994.0000", replayStatus: correction.status() })}`);
});

test("V1.3 L08 retries a fee-correction Outbox after one injected Portfolio delivery failure", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await page.getByTestId("v13-correct-fill-fee").click();
  const clientOrderId = `v13-${proposalId}`;
  const readOrder = async () => page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  await expect.poll(async () => {
    const order = await readOrder();
    return { fee: order.fill.fee, outboxStatus: order.feeCorrectionOutbox?.status, attempts: order.feeCorrectionOutbox?.attempts, reconciliation: order.reconciliation.status };
  }, { timeout: 20_000, intervals: [250, 500, 1000] }).toEqual({ fee: "6.0000", outboxStatus: "DELIVERED", attempts: 2, reconciliation: "MATCH" });
  const finalOrder = await readOrder();
  expect(finalOrder.independentAssets.current_cash).toBe("8994.0000");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.cash.amount).toBe("8994.0000");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8994.0000", "1005.0000", "FILLED", "CAPTURED", "1006.0000");
  console.info(`[V1.3 L08 fee-correction recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["Portfolio fee-correction delivery rejected once", "persistent Outbox retried and delivered"], attempts: finalOrder.feeCorrectionOutbox.attempts, outboxStatus: finalOrder.feeCorrectionOutbox.status, reconciliation: finalOrder.reconciliation.status })}`);
});

test("V1.3 L08 applies a partial fill, accepted cancellation and fee correction through Web and same-Run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-l08-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("40 × 10.0000 · fee 1.0000");
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  await page.getByTestId("v13-l08-cancel-partial-fill").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"status":"HELD"');
  await expect(page.getByTestId("v13-order")).toContainText("CANCELLED");
  await page.getByTestId("v13-correct-fill-fee").click();
  await expect(page.getByTestId("v13-fee-correction")).toContainText('"replayed": false');
  const fillId = await page.evaluate(async ({ id, proposal }) => (await (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`)).json()).fill.externalFillId, { id: testRunId!, proposal: proposalId! });
  const correctionReplay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}/fills/${fillId}/fee-corrections`, { data: { revision: 1, previousFee: "1.0000", correctedFee: "6.0000" } });
  expect(correctionReplay.status()).toBe(202);
  expect((await correctionReplay.json()).replayed).toBe(true);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`);
    return (await response.json()).account.cash.amount;
  }, { timeout: 15_000 }).toBe("9594.0000");
  const finalOrder = await page.evaluate(async ({ id, proposal }) => (await (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`)).json()), { id: testRunId!, proposal: proposalId! });
  expect(finalOrder.order.status).toBe("CANCELLED");
  expect(finalOrder.fill.quantity).toBe(40);
  expect(finalOrder.fill.fee).toBe("6.0000");
  expect(finalOrder.reconciliation.status).toBe("MATCH");
  expect(finalOrder.independentAssets.current_cash).toBe("9594.0000");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "9594.0000", "406.0000", "CANCELLED", "RELEASED", "406.0000");
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  console.info(`[V1.3 L08 partial-fill cancellation] ${JSON.stringify({ testRunId, proposalId, quantity: 40, cancelledRemainder: 60, correctedFee: "6.0000", fakeBrokerCash: finalOrder.independentAssets.current_cash })}`);
});

test("V1.3 L07 keeps a cancel reservation through Trade restart until the sequenced result arrives", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-2-replay").click();
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  const clientOrderId = `v13-${proposalId}`;
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  expect(tradeUrl).toBeTruthy();
  const cancelRequest = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`);
  expect(cancelRequest.status()).toBe(202);
  const pendingCancel = await cancelRequest.json();
  expect(pendingCancel.status).toBe("CANCEL_REQUESTED");
  expect(pendingCancel.reservation.status).toBe("HELD");
  const restart = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000 });
  expect(restart.status, restart.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { ready = true; break; } } catch { /* wait for isolated Trade Execution restart */ }
    await new Promise((resolveReady) => setTimeout(resolveReady, 250));
  }
  expect(ready, "Trade Execution must become ready with the cancellation still unresolved").toBe(true);
  const afterRestart = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(afterRestart.order.status).toBe("CANCEL_REQUESTED");
  const pendingAccount = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`).then((response) => response.json());
  expect(pendingAccount.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", capturedCashAmount: "1505.0000" }));
  const cancelResult = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results/3`);
  expect(cancelResult.status()).toBe(200);
  expect((await cancelResult.json()).order.order.status).toBe("CANCELLED");
  const facts = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence)).toEqual([1, 2]);
  expect(facts.fills.reduce((sum: number, fill: { quantity: number }) => sum + fill.quantity, 0)).toBe(150);
  expect(facts.order.status).toBe("CANCELLED");
  expect(facts.reconciliation.status).toBe("MATCH");
  expect(facts.independentAssets.current_cash).toBe("8495.0000");
  expect(facts.independentAssets.positions).toEqual([{ security: "600000.SH", quantity: 150 }]);
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8495.0000", "2005.0000", "CANCELLED", "RELEASED", "1505.0000");
  console.info(`[V1.3 L07 cancellation restart recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=2 buffered and seq=1 applied", "cancel request persisted", "Trade Execution restarted with reservation HELD", "seq=3 accepted cancel result applied"], deliveredFillSequences: facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence), filledQuantity: 150, releasedRemainder: 50, reservation: account.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId)?.status })}`);
});

test("V1.4 daily backtest page shows report evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await expect(page.getByRole("heading", { name: "V1.4 日线历史回测与可核对报告" })).toBeVisible();
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("DAILY_BAR");
  await expect(page.getByRole("cell", { name: "V1.4-BT-NEXT-BAR-001", exact: true })).toBeVisible();
  const sellabilityRows = page.getByTestId("v14-position-availability").locator("tbody tr");
  await expect(sellabilityRows).toHaveCount(3);
  await expect(sellabilityRows.nth(0)).toContainText("2024-01-03");
  await expect(sellabilityRows.nth(0)).toContainText("0");
  await expect(sellabilityRows.nth(1)).toContainText("2024-01-04");
  await expect(sellabilityRows.nth(1)).toContainText("100");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const exported = await page.evaluate(async (id) => {
    const runResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}`);
    const run = await runResponse.json();
    const ref = run.artifactRefs?.[0];
    if (!ref) return { runOk: runResponse.ok, ref };
    const reportResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}/artifacts/${ref.artifactId}`);
    const report = await reportResponse.json();
    const foreignResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}/artifacts/${ref.artifactId}`, { credentials: "omit", headers: { "x-stockquant-user": "other-owner" } });
    return { runOk: runResponse.ok, reportOk: reportResponse.ok, foreignStatus: foreignResponse.status, ref, returnedRef: report.artifactRef, reportRunId: report.content?.testRunId, reportStatus: report.content?.status, assertionCount: report.content?.assertions?.length };
  }, testRunId!);
  expect(exported).toMatchObject({ runOk: true, reportOk: true, foreignStatus: 403, ref: { schemaVersion: "artifact-ref.v1", testRunId, ownerId: "acceptance-owner-1", kind: "BACKTEST_REPORT", sha256: exported.ref.sha256, status: "PUBLISHED" }, returnedRef: exported.ref, reportRunId: testRunId, reportStatus: "COMPLETED" });
  expect(exported.ref.artifactId).toBe(exported.ref.sha256);
  expect(exported.assertionCount).toBeGreaterThan(0);
  verifyV14RunWithCli(testRunId!);

  await page.getByLabel("目标股数").fill("100000");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  const buyOutcome = page.getByTestId("v14-order-outcomes").locator("tbody tr").filter({ hasText: "BUY" });
  await expect(buyOutcome).toHaveCount(1);
  await expect(buyOutcome).toContainText("100000");
  await expect(buyOutcome).toContainText("989");
  await expect(buyOutcome).toContainText("PARTIALLY_FILLED");
  await expect(buyOutcome).toContainText("INSUFFICIENT_CASH");
  await expect(page.getByRole("row", { name: /部分成交订单/u })).toContainText("1");
  const partialTestRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(partialTestRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(partialTestRunId!);
});

test("V1.4 synthetic suspension and locked-limit scenario is readable and same-run CLI verifiable", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("market-restrictions");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("SYNTHETIC_FIXTURE_BOUNDARIES_ONLY");
  await expect(page.getByTestId("v14-evidence")).toContainText("LOCKED_AT_UPPER_LIMIT");
  await expect(page.getByTestId("v14-evidence")).toContainText("LOCKED_AT_LOWER_LIMIT");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
});

test("V1.4 historical fee fixture uses the pre-cut date schedule", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("historical-fees");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("v1.4-historical-fees-1");
  await expect(page.getByTestId("v14-evidence")).toContainText("2023-08-25");
  await expect(page.getByTestId("v14-evidence")).toContainText("stampDutyCents");
  await expect(page.getByRole("cell", { name: "V1.4-BT-HISTORICAL-FEE-001", exact: true })).toBeVisible();
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
});

test("V1.4 RAW corporate actions preserve hand-checked NAV and ignore duplicate event delivery", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("corporate-actions");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  const testRunId = await page.getByTestId("v14-test-run-id").textContent();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v14-evidence")).toContainText("v1.4-corporate-actions-1");
  await expect(page.getByRole("cell", { name: "V1.4-BT-CORPORATE-ACTION-RAW-001", exact: true })).toBeVisible();
  await expect(page.getByTestId("v14-corporate-actions")).toContainText("CA-SPLIT-2-FOR-1");
  await expect(page.getByTestId("v14-corporate-actions")).toContainText("CA-DIVIDEND-10-CENTS");
  await expect(page.getByTestId("v14-corporate-action-replays")).toContainText("忽略：1 次");
  await expect(page.getByTestId("v14-nav")).toContainText("200000");
  await verifyV14RunWithCli(testRunId!);
});

test("V1.4 web accepts a bounded policy and compares persisted runs", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("初始现金（分）").fill("102000");
  await page.getByLabel("目标股数").fill("100");
  await page.getByLabel("参与率（基点）").fill("100");
  await page.getByLabel("不利滑点（基点）").fill("100");
  await page.getByLabel("固定费用（分）").fill("500");
  await page.getByLabel("卖出信号日").fill("2024-01-03");
  await page.getByLabel("卖出执行日").fill("2024-01-04");
  await page.getByLabel("卖出数量").fill("99");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-trades")).toContainText("99");
  await expect(page.getByTestId("v14-final-cash")).toHaveText("99812 分");
  await expect(page.getByTestId("v14-trades")).toContainText("SELL");
  await expect(page.getByTestId("v14-settlements")).toContainText("2024-01-05");
  await expect(page.getByTestId("v14-cash-ledger")).toContainText("99391");
  await expect(page.getByTestId("v14-evidence")).toContainText('"initialCashCents": 102000');
  await expect(page.getByTestId("v14-evidence")).toContainText('"slippageBasisPoints": 100');
  const firstRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(firstRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(firstRunId!);

  await page.getByLabel("目标股数").fill("50");
  await page.getByLabel("卖出数量").fill("50");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-comparison-title")).toBeVisible();
  await expect(page.getByTestId("v14-comparison")).toContainText("99");
  await expect(page.getByTestId("v14-comparison")).toContainText("50");
  const secondRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(secondRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(secondRunId!);

  await page.getByLabel("初始现金（分）").fill("1000000");
  await page.getByLabel("目标股数").fill("100");
  await page.getByLabel("参与率（基点）").fill("100");
  await page.getByLabel("不利滑点（基点）").fill("0");
  await page.getByLabel("费用模型").selectOption("cn-a");
  await page.getByLabel("卖出数量").fill("100");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-trades")).toContainText("511");
  await expect(page.getByTestId("v14-trades")).toContainText("562");
  await expect(page.getByTestId("v14-trades")).toContainText("51");
  const feeRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(feeRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(feeRunId!);
});

test("V1.5 NO_TRADE workflow reads 60 sessions per market while automatic trading and recovery remain WAITING", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/acceptance/v1/v1.5");
  await expect(page.getByRole("heading", { name: "V1.5 无人调度、故障恢复与 V1 验收" })).toBeVisible();
  let previousRunId: string | null = null;
  const runIds = new Set<string>();
  for (const scenario of ["normal", "rejection", "recovery"]) {
    const startedAt = Date.now();
    console.info(`[V1.5 E2E] scenario=${scenario} begin`);
    await expect(page.getByLabel("调度场景")).toBeVisible({ timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} selector visible`);
    const priorRunLocator = page.getByTestId("v15-test-run-id");
    if (await priorRunLocator.count()) previousRunId = (await priorRunLocator.textContent())?.trim() ?? previousRunId;
    console.info(`[V1.5 E2E] scenario=${scenario} priorRun=${previousRunId ?? "none"}`);
    await page.selectOption("[aria-label='调度场景']", scenario, { timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} selected`);
    await page.getByRole("button", { name: "准备 V1.5 场景" }).click({ timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} submit dispatched`);
    await expect.poll(async () => (await page.getByTestId("v15-test-run-id").textContent())?.trim() ?? "", { timeout: 15_000 }).not.toBe(previousRunId);
    await expect(page.getByTestId("v15-run-status")).toHaveText("WAITING");
    const runId = (await page.getByTestId("v15-test-run-id").textContent())?.trim();
    console.info(`[V1.5 E2E] scenario=${scenario} created testRunId=${runId} elapsedMs=${Date.now() - startedAt}`);
    expect(runId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(runIds.has(runId!)).toBe(false);
    runIds.add(runId!);
    previousRunId = runId!;
    const cookie = (await page.context().cookies()).find((item) => item.name === "sq_session")?.value;
    expect(cookie).toMatch(/^[a-f0-9]{64}$/u);
    if (scenario === "normal") {
      await expect.poll(async () => page.evaluate(async (id) => {
        try {
          const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) return 0;
          const value = await response.json();
          return value.evidence?.localSessions?.authoritativeObservations ?? 0;
        } catch {
          return 0;
        }
      }, runId!), { timeout: 300_000 }).toBe(120);
      console.info(`[V1.5 E2E] scenario=normal 120 observations complete elapsedMs=${Date.now() - startedAt}`);
      await expect(page.getByTestId("v15-temporal-status")).toHaveText("COMPLETED");
      const evidence = JSON.parse((await page.getByTestId("v15-evidence").textContent()) ?? "{}");
      expect(evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", temporal: "COMPLETED", localSessions: { CN_A: 60, US_EQUITY: 60, authoritativeObservations: 120 }, orders: "ZERO_AUTHORITATIVE_FAKEBROKER_ORDERS", fills: "ZERO_AUTHORITATIVE_FAKEBROKER_FILLS", automaticTrading: "NOT_RUN", backupRestore: "NOT_RUN" });
      const rows = (await page.getByRole("row").allTextContents()).slice(1);
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.includes("V1.5-HOLD-002"))).toContain("PASS");
      expect(rows.find((row) => row.includes("V1.5-SYS-SCHEDULE-001"))).toContain("WAITING");
      expect(JSON.stringify(evidence)).not.toContain("BACKUP_RESTORE");
    } else {
      const evidence = JSON.parse((await page.getByTestId("v15-evidence").textContent()) ?? "{}");
      expect(evidence).toMatchObject({ workflow: "NOT_CONNECTED", orders: "NOT_CREATED", fills: "NOT_CREATED", portfolioLedgerFacts: "NOT_CREATED", temporal: "NOT_RUN", backupRestore: "NOT_RUN" });
    }
    console.info(`[V1.5 E2E] scenario=${scenario} starting same-run CLI/export elapsedMs=${Date.now() - startedAt}`);
    verifyV15RunWithCli(runId!, "sq_session=" + cookie);
    console.info(`[V1.5 E2E] scenario=${scenario} CLI/export complete elapsedMs=${Date.now() - startedAt}`);
  }
});

test("V2.1 source, live news and 101-security rejection are visible in Web acceptance", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.1");
  await expect(page.getByRole("heading", { name: "V2.1 免费行情、新闻聚合与在线股票池" })).toBeVisible();
  await page.getByRole("button", { name: "检查来源能力" }).click();
  await expect(page.getByTestId("v21-evidence")).toContainText("tencent-quote");
  await page.getByRole("button", { name: "抓取实时新闻" }).click();
  await expect(page.getByTestId("v21-evidence")).toContainText("eastmoney-news");
  await page.getByRole("button", { name: "提交101只并验证拒绝" }).click();
  await expect(page.getByRole("alert")).toContainText("WATCHLIST_LIMIT");
});

test("V2.2 minute import page shows preview and quality rejection", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.2");
  await expect(page.getByRole("heading", { name: "V2.2 历史分钟数据导入与校验" })).toBeVisible();
  await page.getByRole("button", { name: "预览分钟数据" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("v2.2-minute-bars-1");
  await page.getByRole("button", { name: "运行质量拒绝" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("OHLC_INVALID");
});

test("V2.3 replay page shows deterministic matching and recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.3");
  await expect(page.getByRole("heading", { name: "V2.3 日频决策、分钟撮合与历史事件回放" })).toBeVisible();
  await page.getByRole("button", { name: "预览回放数据" }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText("v2.3-replay-bars-1");
  await page.getByRole("button", { name: "运行检查点恢复" }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText("V2.3-RECOVERY-001");
  await expect(page.getByTestId("v23-evidence")).toContainText('"status": "PASS"');
  await page.getByRole("button", { name: "查询状态" }).click();
  await expect(page.getByTestId("v23-worker-status")).toContainText("COMPLETED");
  // Lifecycle controls are wired to the real platform/worker endpoints. A completed
  // run must reject every non-terminal transition instead of silently mutating state.
  for (const action of ["暂停", "恢复", "取消"]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("invalid replay status transition");
  }
});

test("V2.3 long replay pauses and resumes from a committed checkpoint", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.3");
  await page.getByRole("button", { name: "启动可暂停长回放", exact: true }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText('"status": "RUNNING"', { timeout: 10_000 });
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.getByTestId("v23-worker-status")).toContainText('"status": "PAUSED"', { timeout: 10_000 });
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.getByRole("button", { name: "查询状态", exact: true }).click();
    if (await page.getByTestId("v23-worker-status").textContent().then((text) => text?.includes('"status": "COMPLETED"'))) break;
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("v23-worker-status")).toContainText('"status": "COMPLETED"', { timeout: 10_000 });
});

test("V2.4 continuous paper page reports strict observation qualification as WAITING", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174099";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observation-summary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ countedDays: 0, recordedCountedDays: 10, unverifiedCountedDays: 10, targetDays: 20, remainingDays: 20, status: "WAITING" }) }));
  const evidence = { testRunId, stageId: "V2.4", scenarioId: "rejection", status: "WAITING", dataMode: "NOT_CONNECTED", executionPolicy: "PREPARATION_ONLY", executionGate: { status: "BLOCKED" }, mandate: { status: "PREPARATION_ONLY" }, source: { status: "NOT_RUN" }, orders: [], fills: [], reconciliation: { status: "NOT_RUN" }, assertions: [{ assertionId: "V2.4-REJECTION-CHAIN-001", status: "WAITING", expected: "real isolated execution chain", actual: "NOT_RUN" }] };
  await page.route("**/api/v1/acceptance/v2/v2.4/runs", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, testRunId, status: "WAITING" }) });
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evidence) });
  });
  await page.route(`**/api/v1/acceptance/v2/v2.4/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evidence) }));
  await page.goto("/acceptance/v2/v2.4");
  await expect(page.getByRole("heading", { name: "V2.4 真实时钟下持续模拟交易" })).toBeVisible();
  await expect(page.getByTestId("v24-mode")).toContainText("NOT_CONNECTED");
  await page.getByRole("button", { name: "查看日终观察进度" }).click();
  const observedDaysText = await page.getByTestId("v24-observed-days").textContent();
  expect(observedDaysText).toMatch(/^\d+\/20$/u);
  const countedDays = Number(observedDaysText?.split("/")[0]);
  await expect(page.getByTestId("v24-remaining-days")).toHaveText(String(Math.max(0, 20 - countedDays)));
  await expect(page.getByTestId("v24-recorded-observed-days")).toHaveText("10/20");
  await expect(page.getByTestId("v24-unverified-observed-days")).toHaveText("10");
  await expect(page.getByTestId("v24-observation-status")).toHaveText(countedDays >= 20 ? "PASS" : "WAITING");
  await expect(page.getByTestId("v24-mode")).toContainText("LIVE关闭");
});

test("V2.4 observation history displays preserved prior evidence revisions", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174000";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observations", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ observationDate: "2026-09-24", testRunId, reconciliationStatus: "PASS", errors: ["late quality error"] }])
  }));
  await page.route(`**/api/v1/acceptance/v2/v2.4/runs/${testRunId}/revisions`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      testRunId,
      revisions: [{ revisionId: "1", testRunId, stageId: "V2.4", priorStatus: "COMPLETED", priorAssertions: [{ assertionId: "V2.4-OBSERVATION-DAY", status: "PASS" }], priorEvidence: { observationCounted: true, marker: "original-completion" }, priorCreatedAt: "2026-09-24T16:00:00.000Z", priorCompletedAt: "2026-09-24T16:01:00.000Z", reason: "OBSERVATION_EVENT_ERRORS", recordedAt: "2026-09-25T00:00:00.000Z" }]
    })
  }));

  await page.goto("/acceptance/v2/v2.4");
  await page.getByRole("button", { name: "查看观察记录" }).click();
  await page.getByRole("button", { name: "查看 2026-09-24 修订历史" }).click();
  await expect(page.getByRole("region", { name: "观察证据修订历史" })).toContainText("COMPLETED");
  await expect(page.getByRole("region", { name: "观察证据修订历史" })).toContainText("original-completion");
});

test("V2.5 data scale page shows regression and recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.5");
  await expect(page.getByRole("heading", { name: "V2.5 历史数据扩容与 V2 验收" })).toBeVisible();
  await page.getByRole("button", { name: "运行扩容与模型验证" }).click();
  await expect(page.getByTestId("v25-evidence")).toContainText("V2.5-REGRESSION-002");
  await page.getByRole("button", { name: "运行任务恢复" }).click();
  await expect(page.getByTestId("v25-evidence")).toContainText("V2.5-RECOVERY-001");
});

test("V1.3 L04 AUTO_POLICY activates an exact Mandate, executes one FakeBroker order and survives refresh", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PENDING");
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(mandateId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  await expect(page.getByTestId("v13-order")).toContainText("8995.0000 CNY");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-account-id")).toContainText("8995");
  await expect(page.getByTestId("v13-positions")).toContainText("100");
  const clientOrderId = `v13-auto-${proposalId}`;
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`;
  const outsider = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin });
  const wrongOwner = await outsider.request.get(orderPath, { headers: { "x-stockquant-user": "v13-unrelated-owner" } });
  await outsider.close();
  const wrongRun = await page.evaluate(async ({ proposalId, clientOrderId }) => (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${crypto.randomUUID()}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`)).status, { proposalId: proposalId!, clientOrderId });
  const forbiddenReads = { wrongOwner: wrongOwner.status(), wrongRun };
  expect(forbiddenReads).toEqual({ wrongOwner: 403, wrongRun: 404 });
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  await expect(page.getByTestId("v13-account-id")).toContainText("8995");
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  await expect(page.getByTestId("v13-order")).toContainText("8995.0000 CNY");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  await page.getByTestId("v13-pause-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PAUSED");
  console.info(`[V1.3 AUTO_POLICY FakeBroker loop] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, cash: "8995.0000 CNY", reservation: "1005.0000", status: "MATCH", crossOwnerOrderRead: forbiddenReads.wrongOwner, crossRunOrderRead: forbiddenReads.wrongRun })}`);
});

test("V1.3 L04 AUTO_POLICY HOLD leaves FakeBroker, Portfolio cash and order count unchanged", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  await expect(page.getByTestId("v13-test-run-id")).toBeVisible();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("10000");
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByRole("button", { name: "创建AUTO_POLICY HOLD建议" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-auto-decision")).toHaveText("HOLD");
  await expect(page.getByTestId("v13-order")).toContainText("NONE");
  await expect(page.getByTestId("v13-account-id")).toContainText("10000");
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  verifyV13RunWithCli(testRunId!, proposalId!);
});

test("V1.3 L04 AUTO_POLICY rejects the third fee-inclusive order without another FakeBroker order", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const runEvidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  const additional = await page.evaluate(async ({ testRunId, accountId, runClockNow }) => {
    const create = async () => {
      const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: `v13-third-order-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: new Date(Date.parse(runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] }) });
      return { status: response.status, body: await response.json() };
    };
    return [await create(), await create()];
  }, { testRunId: testRunId!, accountId: accountId!, runClockNow: runEvidence.runClockNow });
  expect(additional.map((item) => item.status)).toEqual([201, 201]);
  const second = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: additional[0].body.proposalId, mandateId: mandateId! });
  expect(second.status).toBe(202);
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: additional[1].body.proposalId, mandateId: mandateId! });
  expect(rejected.status).toBe(409);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("7990.0000");
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: additional[1].body.proposalId });
  expect(missingOrderStatus).toBe(404);
  console.info(`[V1.3 AUTO_POLICY order cap] ${JSON.stringify({ testRunId, mandateId, acceptedOrders: 2, rejectedStatus: rejected.status, rejectedOrderLookup: missingOrderStatus, cash: account.account.cash.amount })}`);
});

test("V1.3 L04 paused Mandate rejects a new AUTO_POLICY order without side effects", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  await page.getByTestId("v13-pause-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PAUSED");
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId! });
  expect(rejected).toBe(403);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("10000.0000");
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId! });
  expect(missingOrderStatus).toBe(404);
});

test("V1.3 L05 rejects cross-currency and out-of-scope AUTO_POLICY commands without creating orders or Portfolio resources", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const currencyMismatch = await page.evaluate(async ({ testRunId, accountId, runClockNow }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: `v13-cross-currency-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "US_EQUITY", currency: "USD", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: new Date(Date.parse(runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "AAPL", side: "BUY", quantity: 10 }] }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, accountId: accountId!, runClockNow: evidence.runClockNow });
  expect(currencyMismatch.status).toBe(403);
  const mandate = await page.evaluate(async ({ testRunId, accountId, now }) => {
    const mandateId = crypto.randomUUID();
    const create = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/auto-mandates`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["000001.SZ"], maxOrderAmount: "1005.00", maxTotalAmount: "2010.00", maxOrderCount: 2, validFrom: now, expiresAt: new Date(Date.parse(now) + 4 * 60 * 60 * 1000).toISOString(), reason: "L04 out-of-scope security rejection" }) });
    const body = await create.json();
    if (!create.ok) return { createStatus: create.status, createBody: body };
    const activate = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/auto-mandates/${mandateId}/activate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateVersion: body.mandateVersion, contentHash: body.contentHash, reason: "activate exact out-of-scope test mandate" }) });
    return { createStatus: create.status, createBody: body, activateStatus: activate.status, activateBody: await activate.json(), mandateId };
  }, { testRunId: testRunId!, accountId: accountId!, now: evidence.runClockNow });
  expect(mandate.createStatus).toBe(201);
  expect(mandate.activateStatus).toBe(201);
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-out-of-scope-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandate.mandateId! });
  expect(rejected.status).toBe(403);
  verifyV13RunWithCli(testRunId!, proposalId!);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("10000.0000");
  expect(account.account.reservations).toEqual([]);
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-out-of-scope-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId! });
  expect(missingOrderStatus).toBe(404);
  console.info(`[V1.3 L05 currency and mandate scope] ${JSON.stringify({ testRunId, currencyMismatchStatus: currencyMismatch.status, mandateId: mandate.mandateId, proposalId, scopeRejectionStatus: rejected.status, mandateScope: mandate.createBody.securityScope, proposalSecurity: "600000.SH", accountCash: account.account.cash.amount, reservations: account.account.reservations.length, orderLookup: missingOrderStatus })}`);
});

test("V1.3 L05 rejects a same-day CN sale of shares bought in this TestRun before FakeBroker submission", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  const buyProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  const sellCreated = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: { idempotencyKey: `v13-l05-same-day-sell-${testRunId}`, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "sell-leg", securityId: "600000.SH", side: "SELL", quantity: 100 }] } });
  expect(sellCreated.status()).toBe(201);
  const sellProposal = await sellCreated.json();
  const approved = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/approve`, { data: { expectedVersion: sellProposal.proposalVersion, expectedContentHash: sellProposal.contentHash, reason: "exercise same-day CN sell settlement rejection" } });
  expect(approved.status()).toBe(201);
  const clientOrderId = `v13-l05-sell-${sellProposal.proposalId}`;
  const submitted = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/execution/submit`, { data: { clientOrderId } });
  expect(submitted.status()).toBe(409);
  expect(JSON.stringify(await submitted.json())).toContain("T_PLUS_ONE_UNSETTLED_QUANTITY");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.cash.amount).toBe("8995.0000");
  expect(account.account.positions).toEqual([{ security: "600000.SH", quantity: 100 }]);
  expect(account.account.reservations).toHaveLength(1);
  expect(account.account.reservations[0].status).toBe("CAPTURED");
  const missingOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  expect(missingOrder.status()).toBe(404);
  verifyV13RunWithCli(testRunId!, sellProposal.proposalId);
  console.info(`[V1.3 L05 CN T+1] ${JSON.stringify({ testRunId, buyProposalId, rejectedSellProposalId: sellProposal.proposalId, decision: "T_PLUS_ONE_UNSETTLED_QUANTITY", cash: account.account.cash.amount, position: account.account.positions[0], reservations: account.account.reservations.length, fakeBrokerOrderLookup: missingOrder.status() })}`);
});

test("V1.3 L05 rejects an otherwise authorized order when Portfolio cash is insufficient and preserves zero-side-effect facts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const runPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}`;
  const post = async (path: string, body: unknown) => page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { path, body });
  let finalProposalId = "";
  let finalClientOrderId = "";
  const successfulOrderIds: string[] = [];
  for (let mandateIndex = 0; mandateIndex < 5; mandateIndex += 1) {
    const mandateId = crypto.randomUUID();
    const created = await post(`${runPath}/auto-mandates`, { mandateId, accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxTotalAmount: "2010.00", maxOrderCount: 2, validFrom: evidence.runClockNow, expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), reason: `L05 cash-depletion Mandate ${mandateIndex + 1}` });
    expect(created.status).toBe(201);
    const activated = await post(`${runPath}/auto-mandates/${mandateId}/activate`, { mandateVersion: 1, contentHash: created.body.contentHash, reason: "activate exact bounded two-order Mandate" });
    expect(activated.status).toBe(201);
    for (let orderIndex = 0; orderIndex < 2; orderIndex += 1) {
      const proposal = await post(`${runPath}/proposals`, { idempotencyKey: `v13-l05-cash-${mandateIndex}-${orderIndex}-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] });
      expect(proposal.status).toBe(201);
      const proposalId = proposal.body.proposalId as string;
      const clientOrderId = `v13-l05-cash-${mandateIndex}-${orderIndex}-${proposalId}`;
      const execution = await post(`${runPath}/proposals/${proposalId}/auto-execution/submit`, { mandateId, mandateVersion: 1, clientOrderId });
      finalProposalId = proposalId;
      finalClientOrderId = clientOrderId;
      if (mandateIndex === 4 && orderIndex === 1) {
        expect(execution.status).toBe(409);
        expect(JSON.stringify(execution.body)).toContain("Portfolio resource reservation failed");
        const replay = await post(`${runPath}/proposals/${proposalId}/auto-execution/submit`, { mandateId, mandateVersion: 1, clientOrderId });
        expect(replay.status).toBe(403);
        expect(JSON.stringify(replay.body)).toContain("AUTO_POLICY Mandate rejected this Proposal");
      } else {
        expect(execution.status).toBe(202);
        expect(execution.body.order.status).toBe("FILLED");
        successfulOrderIds.push(execution.body.order.order_id);
      }
    }
    const paused = await post(`${runPath}/auto-mandates/${mandateId}/pause`, { mandateVersion: 1, reason: "close bounded L05 depletion Mandate" });
    expect(paused.status).toBe(201);
  }
  expect(successfulOrderIds).toHaveLength(9);
  expect(new Set(successfulOrderIds).size).toBe(9);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("955.0000");
  expect(account.account.reservations).toHaveLength(9);
  expect(account.account.reservations.every((reservation: any) => reservation.status === "CAPTURED")).toBe(true);
  const missingOrder = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: finalProposalId, clientOrderId: finalClientOrderId });
  expect(missingOrder).toBe(404);
  verifyV13RunWithCli(testRunId!, finalProposalId);
  console.info(`[V1.3 L05 insufficient cash] ${JSON.stringify({ testRunId, successfulFakeBrokerOrders: successfulOrderIds.length, rejectedProposalId: finalProposalId, rejectedClientOrderId: finalClientOrderId, finalCash: account.account.cash.amount, capturedReservations: account.account.reservations.length, rejectedOrderLookup: missingOrder })}`);
});

test("V1.3 L09 persists and displays an independent external-order discrepancy without mutating the Portfolio ledger", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("10000.0000");
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：0");
  await page.getByTestId("v13-observe-external-order").click();
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：1");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText("EXTERNAL_ORDER_MISSING_LOCALLY");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText(`fixture:${testRunId}:independent-external-order`);
  const reconciliation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/reconciliation`);
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(reconciliation.status).toBe(200);
  expect(reconciliation.body.order_count).toBe(0);
  expect(reconciliation.body.fill_count).toBe(0);
  expect(reconciliation.body.pending_outbox_count).toBe(0);
  expect(reconciliation.body.externalOnlyOrderCount).toBe(1);
  const replay = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/external-orders/observe`, { method: "POST", body: "{}" });
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(replay.status).toBe(201);
  expect(replay.body.observation.replayed).toBe(true);
  expect(replay.body.reconciliation.externalOnlyOrderCount).toBe(1);
  const account = await page.evaluate(async (id) => {
    const accountId = new URL(window.location.href).searchParams.get("accountId");
    const response = await fetch(`/api/v1/accounts/${accountId}`);
    return (await response.json()).account;
  }, testRunId!);
  expect(account.cash.amount).toBe("10000.0000");
  expect(account.positions).toEqual([]);
  expect(account.reservations).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：1");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText(`fixture:${testRunId}:independent-external-order`);
  verifyV13RunWithCli(testRunId!, proposalId!);
  console.info(`[V1.3 L09 external FakeBroker discrepancy] ${JSON.stringify({ testRunId, externalOnlyOrderCount: reconciliation.body.externalOnlyOrderCount, orderCount: reconciliation.body.order_count, fillCount: reconciliation.body.fill_count, cash: account.cash.amount, discrepancy: reconciliation.body.discrepancies[0] })}`);
});

test("V1.3 L10 revokes the server session and rejects both the browser cookie and a replayed token", async ({ page, context, request }) => {
  test.setTimeout(45_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);

  const beforeInvalidation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}`);
    return response.status;
  }, testRunId!);
  expect(beforeInvalidation).toBe(200);

  const sessionToken = (await context.cookies()).find((cookie) => cookie.name === "sq_session")?.value;
  expect(sessionToken).toMatch(/^[a-f0-9]{64}$/u);
  const logout = await page.evaluate(async () => {
    const response = await fetch("/api/v1/session/logout", { method: "POST" });
    return response.status;
  });
  expect(logout).toBe(204);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  expect(project).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "platform-api-service"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000,
  });
  expect(restarted.status, restarted.stderr).toBe(0);
  const apiUrl = process.env.STOCKQUANT_PLATFORM_API_URL;
  expect(apiUrl).toBeTruthy();
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* wait for isolated Platform restart */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  expect(ready).toBe(true);
  const replayedToken = await request.get(`${process.env.STOCKQUANT_PLATFORM_API_URL}/api/v1/acceptance/v1/v1.3/runs/${testRunId}`, {
    headers: { cookie: `sq_session=${sessionToken}` },
  });
  expect(replayedToken.status()).toBe(401);

  const afterInvalidation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}`);
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(afterInvalidation.status).toBe(401);
  expect(afterInvalidation.body.message).toContain("local session");
  console.info(`[V1.3 L10 browser session invalidation] ${JSON.stringify({ testRunId, beforeInvalidation, logout, platformRestarted: ready, replayedToken: replayedToken.status(), afterInvalidation: afterInvalidation.status })}`);
});

test("V1.3 L06 recovers an AUTO_POLICY order after committed response loss and a temporary original-order query failure", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const clientOrderId = `v13-fault-unknown-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  console.info(`[V1.3 L06 first attempt] ${JSON.stringify(lostResponse)}`);
  expect(lostResponse.status).toBe(503);
  expect(JSON.stringify(lostResponse.body)).toContain("V1.3 AUTO Trade Execution failed (503)");
  const firstPending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(firstPending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "1005.0000" }));
  const unavailableRead = await submit();
  console.info(`[V1.3 L06 second attempt] ${JSON.stringify(unavailableRead)}`);
  expect(unavailableRead.status).toBe(503);
  const secondPending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(secondPending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "1005.0000" }));
  const recovered = await submit();
  console.info(`[V1.3 L06 recovery attempt] ${JSON.stringify(recovered)}`);
  expect(recovered.status).toBe(202);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation.unresolved_order_count).toBe(0);
  expect(recovered.body.reconciliation.pending_outbox_count).toBe(0);
  expect(recovered.body.reconciliation.discrepancies).toEqual([]);
  const order = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, clientOrderId });
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.fill.quantity).toBe(100);
  expect(order.body.reconciliation.status).toBe("MATCH");
  expect(order.body.reconciliation.discrepancies).toEqual([]);
  expect(order.body.independentAssets.current_cash).toBe("8995.0000");
  const settled = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "1005.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  console.info(`[V1.3 L06 UNKNOWN recovery] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, injectedEvents: ["response lost after FakeBroker commit", "original order read unavailable once"], observedStatuses: [lostResponse.status, unavailableRead.status, recovered.status], orderId: order.body.order.order_id, fillId: order.body.fill.externalFillId, reconciliation: order.body.reconciliation })}`);
});

test("V1.3 L06 recovers the same AUTO_POLICY order after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project, "the isolated V1.3 Compose project must be provided by its runner").toBeTruthy();
  expect(tradeUrl, "the isolated Trade loopback URL must be provided by its runner").toBeTruthy();
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const clientOrderId = `v13-fault-restart-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  expect(lostResponse.status).toBe(503);
  const pending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(pending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "1005.0000" }));

  const root = resolve(process.cwd(), "../..");
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: root, encoding: "utf8", env: process.env });
  expect(restarted.status, restarted.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${tradeUrl}/ready`); if (response.ok) { ready = true; break; } } catch { /* wait for the exact isolated Trade container */ }
    await new Promise((resolveReady) => setTimeout(resolveReady, 250));
  }
  expect(ready, "Trade Execution must become ready after the isolated restart").toBe(true);
  const recovered = await submit();
  expect(recovered.status).toBe(202);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation.unresolved_order_count).toBe(0);
  expect(recovered.body.reconciliation.pending_outbox_count).toBe(0);
  expect(recovered.body.reconciliation.discrepancies).toEqual([]);

  const order = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, clientOrderId });
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.fill.quantity).toBe(100);
  expect(order.body.reconciliation.status).toBe("MATCH");
  expect(order.body.independentAssets.current_cash).toBe("8995.0000");
  const settled = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "1005.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  console.info(`[V1.3 L06 Trade restart recovery] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, injectedEvents: ["FakeBroker committed order/fill", "HTTP response lost", "Trade Execution container restarted", "same clientOrderId queried and settled"], orderId: order.body.order.order_id, fillId: order.body.fill.externalFillId, reconciliation: order.body.reconciliation })}`);
});

test("V1.3 L07 Web resumes a buffered out-of-order Fill after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");
  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"buffered":true');
  await page.getByTestId("v13-sequence-2-replay-10").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"replayed":true');
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");
  const isolatedProject = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  expect(isolatedProject).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  const restart = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000,
  });
  expect(restart.status, restart.stderr).toBe(0);
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(tradeUrl).toBeTruthy();
  let tradeReady = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { tradeReady = true; break; } } catch { /* wait for isolated Trade Execution restart */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  expect(tradeReady, "isolated Trade Execution must become ready after restart").toBe(true);
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-order")).toContainText("8495.0000 CNY");
  await expect(page.getByTestId("v13-positions")).toContainText("150");
  const clientOrderId = `v13-${proposalId}`;
  const order = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  const result = await order.json();
  expect(order.status()).toBe(200);
  expect(result.order.status).toBe("PARTIALLY_FILLED");
  expect(result.fills.map((fill: { quantity: number; brokerSequence: number }) => [fill.brokerSequence, fill.quantity])).toEqual([[1, 100], [2, 50]]);
  expect(result.independentAssets.current_cash).toBe("8495.0000");
  expect(result.reconciliation.status).toBe("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8495.0000", "500.0000", "PARTIALLY_FILLED", "HELD", "1505.0000");
  console.info(`[V1.3 L07 Web/CLI restart recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=2 cumulative 150 buffered", "duplicate seq=2 replayed 10 times", "Trade Execution restarted", "seq=1 cumulative 100 delivered and buffered seq=2 causally applied"], fills: result.fills, cash: result.independentAssets.current_cash, reconciliation: result.reconciliation.status })}`);
});

test("V1.3 persisted calendar advancement unlocks a T+1 sell and keeps same-session rejection side-effect free", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const initialEvidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const buyProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  const afterBuy = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterBuy.account.cash.amount).toBe("8995.0000");
  expect(afterBuy.account.positions).toEqual([{ security: "600000.SH", quantity: 100 }]);

  const makeSell = async (key: string, expectedClock: string) => page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: {
    idempotencyKey: key, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1",
    operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: new Date(Date.parse(expectedClock) + 4 * 60 * 60 * 1000).toISOString(),
    legs: [{ legId: "sell-leg", securityId: "600000.SH", side: "SELL", quantity: 100 }]
  } });
  const sameDayResponse = await makeSell(`v13-tplus1-same-day-${testRunId}`, initialEvidence.runClockNow);
  expect(sameDayResponse.status()).toBe(201);
  const sameDayProposal = await sameDayResponse.json();
  const approveSameDay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/approve`, { data: { expectedVersion: sameDayProposal.proposalVersion, expectedContentHash: sameDayProposal.contentHash, reason: "verify same-session T+1 rule" } });
  expect(approveSameDay.status()).toBe(201);
  const sameDayOrderId = `v13-tplus1-${sameDayProposal.proposalId}`;
  const sameDayResult = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/execution/submit`, { data: { clientOrderId: sameDayOrderId } });
  expect(sameDayResult.status()).toBe(409);
  expect(JSON.stringify(await sameDayResult.json())).toContain("T_PLUS_ONE_UNSETTLED_QUANTITY");
  expect((await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/orders/${encodeURIComponent(sameDayOrderId)}`)).status()).toBe(404);

  const advanceResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`));
  await page.getByTestId("v13-advance-session").click();
  const advanceResponse = await advanceResponsePromise;
  expect(advanceResponse.status()).toBe(200);
  const advanceBody = await advanceResponse.json();
  expect(advanceBody.run.evidence.runClockNow).toBe("2026-09-29T09:31:00+08:00");
  console.info(`[V1.3 clock advance response] ${JSON.stringify({ testRunId, status: advanceResponse.status(), runClockNow: advanceBody.run.evidence.runClockNow, event: advanceBody.event })}`);
  await expect(page.getByTestId("v13-run-clock")).toHaveText("2026-09-29T01:31:00.000Z");
  await expect(page.getByTestId("v13-calendar-version")).toHaveText("sse-cn-a-share-2026-1");
  await expect(page.getByTestId("v13-session-advance-count")).toHaveText("1");
  const advances = JSON.parse((await page.getByTestId("v13-session-advance-history").textContent()) ?? "[]");
  expect(advances).toHaveLength(1);
  expect(advances[0]).toMatchObject({ sequence: 1, calendarVersion: "sse-cn-a-share-2026-1", fromClock: "2026-09-28T01:31:00.000Z", toClock: "2026-09-29T01:31:00.000Z" });
  const replay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`, { data: { accountId, expectedClock: initialEvidence.runClockNow } });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).replayed).toBe(true);

  const sellResponse = await makeSell(`v13-tplus1-next-session-${testRunId}`, "2026-09-29T09:31:00+08:00");
  expect(sellResponse.status()).toBe(201);
  const sellProposal = await sellResponse.json();
  const approveSell = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/approve`, { data: { expectedVersion: sellProposal.proposalVersion, expectedContentHash: sellProposal.contentHash, reason: "approve next-session T+1 sell" } });
  expect(approveSell.status()).toBe(201);
  const clientOrderId = `v13-next-session-sell-${sellProposal.proposalId}`;
  const submitted = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/execution/submit`, { data: { clientOrderId } });
  expect(submitted.status()).toBe(202);
  const executed = await submitted.json();
  if (executed.order.status !== "FILLED") {
    const diagnostic = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then((response) => response.json());
    throw new Error(`V1.3 T+1 SELL did not post its Portfolio outbox: ${JSON.stringify({ executed, diagnostic })}`);
  }
  expect(executed.fill).toMatchObject({ quantity: 100, price: "10.00", fee: "5.00" });
  expect(Date.parse(executed.fill.effectiveAt)).toBe(Date.parse("2026-09-29T01:31:00.000Z"));
  expect(executed.reconciliation.discrepancies).toEqual([]);
  expect(executed.reconciliation.unresolved_order_count).toBe(0);
  expect(executed.reconciliation.pending_outbox_count).toBe(0);
  expect(executed.reconciliation.externalOnlyOrderCount).toBe(0);
  const afterSell = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterSell.account.cash.amount).toBe("9990.0000");
  expect(afterSell.account.positions).toEqual([]);
  expect(afterSell.account.reservations.at(-1).status).toBe("CAPTURED");
  const persistedOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then((response) => response.json());
  expect(persistedOrder.orderSide).toBe("SELL");
  expect(persistedOrder.independentAssets.current_cash).toBe("9990.0000");
  expect(persistedOrder.independentAssets.positions).toEqual([]);
  expect(persistedOrder.reconciliation.discrepancies).toEqual([]);
  expect(persistedOrder.reconciliation.portfolio.cash.amount).toBe("9990.0000");
  expect(persistedOrder.reconciliation.portfolio.positions).toEqual([]);
  expect(persistedOrder.reconciliation.fakeBroker.currentCash).toBe("9990.0000");
  expect(persistedOrder.reconciliation.fakeBroker.positions).toEqual([]);
  expect(persistedOrder.independentAssets.current_cash).toBe(afterSell.account.cash.amount);
  expect(persistedOrder.independentAssets.positions).toEqual(afterSell.account.positions.map((position: { security: string; quantity: number }) => ({ security: position.security, quantity: position.quantity })));
  verifyV13RunWithCli(testRunId!, sellProposal.proposalId, clientOrderId, "9990.0000", "0.0000", "FILLED", "CAPTURED", "0.0000");
  console.info(`[V1.3 P3 T+1 sell loop] ${JSON.stringify({ testRunId, buyProposalId, rejectedSameDayProposalId: sameDayProposal.proposalId, sellProposalId: sellProposal.proposalId, clientOrderId, calendarVersion: advances[0].calendarVersion, toClock: advances[0].toClock, cash: afterSell.account.cash.amount, discrepancies: persistedOrder.reconciliation.discrepancies })}`);
});
