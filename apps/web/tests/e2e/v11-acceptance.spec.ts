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
