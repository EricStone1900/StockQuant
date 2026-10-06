import { expect, test } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

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

function verifyV12RunWithCli(testRunId: string) {
  console.info(`[V1.2 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.2", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "COMPLETED"');
}

function verifyV13RunWithCli(testRunId: string) {
  console.info(`[V1.3 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "WAITING"');
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
  await page.goto("/acceptance/v1/v1.2");
  await page.getByRole("button", { name: "预览正常 Fixture" }).click();
  await expect(page.getByTestId("normal-preview")).toContainText("v1.2-market-data-1");
  await page.getByRole("button", { name: "预览未来数据拒绝样本" }).click();
  await expect(page.getByTestId("bad-preview")).toContainText("FUTURE_DATA");
  await page.getByRole("button", { name: "运行 Qlib CPU 探针" }).click();
  await expect(page.getByTestId("qlib-probe")).toContainText("READY");
  await page.getByRole("button", { name: "运行 RD-Agent 兼容探针" }).click();
  await expect(page.getByTestId("rdagent-probe")).toContainText("fixed-probe-ok");

  for (const scenario of ["normal", "rejection", "recovery"] as const) {
    await page.getByLabel("V1.2 验收场景").selectOption(scenario);
    await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
    await expect(page.getByTestId("v12-run-status")).toHaveText("COMPLETED", { timeout: 15_000 });
    const runEvidence = page.getByTestId("v12-run-evidence");
    if (scenario === "normal") {
      await expect(runEvidence).toContainText("v1.2-market-data-1");
      await expect(page.getByText("V1.2-DATA-NORMAL-001")).toBeVisible();
    } else if (scenario === "rejection") {
      await expect(page.getByText("V1.2-DATA-PIT-001")).toBeVisible();
      await expect(runEvidence).toContainText("FUTURE_DATA");
    } else {
      await expect(page.getByText("V1.2-QLIB-PROBE-001")).toBeVisible();
      await expect(runEvidence).toContainText("READY");
    }
    const testRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    verifyV12RunWithCli(testRunId!);
  }
});

for (const scenario of ["normal", "rejection", "recovery"] as const) {
  test(`V1.3 ${scenario} scenario is Web-visible and same-run CLI verifiable`, async ({ page }) => {
    await page.goto("/acceptance/v1/v1.3");
    await expect(page.getByRole("heading", { name: "V1.3 治理、风控与模拟券商交易链路" })).toBeVisible();
    await expect(page.getByTestId("v13-business-boundary")).toContainText("不会创建账户、订单、成交或账本记录");
    await page.selectOption("[aria-label='验收场景']", scenario);
    await page.getByRole("button", { name: "检查 V1.3 场景准备状态" }).click();
    await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
    await expect(page.getByTestId("v13-run-status")).toHaveText("WAITING");
    const evidence = page.getByTestId("v13-evidence");
    await expect(evidence).toContainText('"evidenceScope": "PLATFORM_SYNTHETIC_ONLY"');
    await expect(evidence).toContainText('"businessExecution": "NOT_RUN"');
    await expect(evidence).toContainText('"businessServicesCalled": []');
    if (scenario === "normal") {
      await expect(page.getByText("V1.3-EXE-FULL-FILL-001")).toBeVisible();
    } else if (scenario === "rejection") {
      await expect(page.getByText("V1.3-GOV-REJECT-001")).toBeVisible();
    } else {
      await expect(page.getByText("V1.3-LEDGER-IDEMPOTENCY-001")).toBeVisible();
    }
    const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    verifyV13RunWithCli(testRunId!);
  });
}

test("V1.4 daily backtest page shows report evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await expect(page.getByRole("heading", { name: "V1.4 日线历史回测与可核对报告" })).toBeVisible();
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("DAILY_BAR");
  await expect(page.getByText("V1.4-BT-NEXT-BAR-001")).toBeVisible();
  const sellabilityRows = page.getByTestId("v14-position-availability").locator("tbody tr");
  await expect(sellabilityRows).toHaveCount(3);
  await expect(sellabilityRows.nth(0)).toContainText("2024-01-03");
  await expect(sellabilityRows.nth(0)).toContainText("0");
  await expect(sellabilityRows.nth(1)).toContainText("2024-01-04");
  await expect(sellabilityRows.nth(1)).toContainText("100");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
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
  await expect(page.getByText("V1.4-BT-HISTORICAL-FEE-001")).toBeVisible();
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
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

test("V1.5 orchestration page shows recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.5");
  await expect(page.getByRole("heading", { name: "V1.5 无人调度、故障恢复与 V1 验收" })).toBeVisible();
  await page.selectOption("[aria-label='调度场景']", "recovery");
  await page.getByRole("button", { name: "运行 V1.5 场景" }).click();
  await expect(page.getByTestId("v15-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v15-evidence")).toContainText("BACKUP_RESTORE");
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
