import { expect, test } from "@playwright/test";

test("V3.1 preparation page exposes bounded scenarios", async ({ page }) => {
  await page.goto("/acceptance/v3/v3.1");
  await expect(page.getByRole("heading", { name: "V3.1 研究实验编排准备" })).toBeVisible();
  const normal = page.getByRole("button", { name: "运行正常前置检查" });
  const rejection = page.getByRole("button", { name: "运行 LIVE 拒绝" });
  const recovery = page.getByRole("button", { name: "运行取消与幂等恢复" });
  await expect(normal).toBeVisible();
  await expect(rejection).toBeVisible();
  await expect(recovery).toBeVisible();

  const evidence = page.getByTestId("v31-evidence");
  await normal.click();
  await expect(evidence).toContainText("PENDING_PREREQUISITES");
  await rejection.click();
  await expect(evidence).toContainText("LIVE rejected with 422");
  await recovery.click();
  await expect(evidence).toContainText("CANCELLED");
});
