import { expect, test } from "@playwright/test";

test("DC-08A read-only observation page is available", async ({ page }) => {
  await page.goto("/acceptance/v2/dc08");
  await expect(page.getByRole("heading", { name: "DC-08A 分钟采集观察" })).toBeVisible();
  await page.getByRole("button", { name: "刷新采集状态" }).click();
  await expect(page.getByTestId("dc08-evidence")).toBeVisible();
});
