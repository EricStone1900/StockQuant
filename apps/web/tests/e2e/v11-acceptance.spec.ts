import { expect, test } from "@playwright/test";

test("V1.1 normal scenario creates an isolated run with backend assertions", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.1");
  await expect(page.getByRole("heading", { name: "V1.1 环境、账户初始化与 Web 验收中心" })).toBeVisible();
  await page.getByRole("button", { name: "准备隔离运行：normal" }).click();
  await expect(page.getByTestId("test-run-id")).not.toHaveText("", { timeout: 10_000 });
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 10_000 });
  await expect(page.getByText("V1.1-ACCOUNT-INIT-001")).toBeVisible();
  await expect(page.getByText("PASS").first()).toBeVisible();
});

test("V1.2 data and Qlib probe page shows real container evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.2");
  await page.getByRole("button", { name: "预览正常 Fixture" }).click();
  await expect(page.getByTestId("normal-preview")).toContainText("v1.2-market-data-1");
  await page.getByRole("button", { name: "预览未来数据拒绝样本" }).click();
  await expect(page.getByTestId("bad-preview")).toContainText("FUTURE_DATA");
  await page.getByRole("button", { name: "运行 Qlib CPU 探针" }).click();
  await expect(page.getByTestId("qlib-probe")).toContainText("READY");
  await page.getByRole("button", { name: "运行 RD-Agent 兼容探针" }).click();
  await expect(page.getByTestId("rdagent-probe")).toContainText("fixed-probe-ok");
});

test("V1.3 FakeBroker trading page verifies recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await expect(page.getByRole("heading", { name: "V1.3 治理、风控与模拟券商交易链路" })).toBeVisible();
  await page.selectOption("[aria-label='验收场景']", "recovery");
  await page.getByRole("button", { name: "运行 V1.3 场景" }).click();
  await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
  await expect(page.getByTestId("v13-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v13-evidence")).toContainText("ACCEPT_RESPONSE_LOST");
  await expect(page.getByText("V1.3-LEDGER-IDEMPOTENCY-001")).toBeVisible();
});

test("V1.4 daily backtest page shows report evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await expect(page.getByRole("heading", { name: "V1.4 日线历史回测与可核对报告" })).toBeVisible();
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("DAILY_BAR");
  await expect(page.getByText("V1.4-BT-NEXT-BAR-001")).toBeVisible();
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
