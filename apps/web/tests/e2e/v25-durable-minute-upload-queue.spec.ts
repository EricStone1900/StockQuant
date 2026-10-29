import { expect, test } from "@playwright/test";

test("V2.5 reads and cancels an owner-scoped durable minute upload job", async ({ page }) => {
  const uploadId = "11111111-1111-4111-8111-111111111111";
  let jobStatus = "QUEUED";
  await page.addInitScript(({ id }) => window.localStorage.setItem("stockquant:v22:csvUpload", JSON.stringify({ uploadId: id, fileFormat: "CSV" })), { id: uploadId });
  await page.route("**/api/v1/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "authenticated" }) }));
  await page.route(`**/api/v1/acceptance/v2/v2.2/csv/uploads/${uploadId}/finalization`, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId, ownerId: "test-user", status: jobStatus, attempt: 1, error: null, result: null }) }));
  await page.route(`**/api/v1/acceptance/v2/v2.2/csv/uploads/${uploadId}/cancel`, async (route) => { jobStatus = "CANCELLED"; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ uploadId, status: "CANCELLED" }) }); });

  await page.goto("/acceptance/v2/v2.5");
  await expect(page.getByRole("link", { name: "前往V2.2分钟导入与查询" })).toBeVisible();
  await page.getByTestId("v25-read-upload-job").click();
  await expect(page.getByTestId("v25-upload-job-state")).toContainText("QUEUED");
  await page.getByTestId("v25-cancel-upload-job").click();
  await expect(page.getByTestId("v25-upload-job-state")).toContainText("CANCELLED");
});
