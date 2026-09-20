import { expect, test } from "@playwright/test";

test("V3.1 preparation page exposes bounded scenarios", async ({ page }) => {
  await page.goto("/acceptance/v3/v3.1");
  await expect(page.getByRole("heading", { name: "V3.1 研究实验编排准备" })).toBeVisible();
  await expect(page.getByRole("button", { name: "运行正常前置检查" })).toBeVisible();
  await expect(page.getByRole("button", { name: "运行 LIVE 拒绝" })).toBeVisible();
  await expect(page.getByRole("button", { name: "运行取消与幂等恢复" })).toBeVisible();
});
