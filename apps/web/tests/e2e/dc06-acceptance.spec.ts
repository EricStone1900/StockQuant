import { expect, test } from "@playwright/test";

test("DC-06 project delivery page shows authorization and export evidence", async ({ page }) => {
  await page.goto("/acceptance/v2/dc06");
  await expect(page.getByRole("heading", { name: "DC-06 多项目数据交付" })).toBeVisible();
  await page.getByRole("button", { name: "运行分页与脱敏" }).click();
  await expect(page.getByTestId("dc06-evidence")).toContainText("DC06-WEB-PAGE-001");
  await expect(page.getByTestId("dc06-evidence")).toContainText('"status": "PASS"');
  await page.getByRole("button", { name: "运行跨项目拒绝" }).click();
  await expect(page.getByTestId("dc06-evidence")).toContainText("DC06-WEB-AUTH-001");
});
