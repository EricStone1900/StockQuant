import { expect, test } from "@playwright/test";

test("V2.4 observation revision is read from the same persisted TestRun", async ({ page }) => {
  const testRunId = process.env.STOCKQUANT_P3_REVISION_TEST_RUN_ID;
  const observationDate = process.env.STOCKQUANT_P3_REVISION_OBSERVATION_DATE;
  test.skip(!testRunId || !observationDate, "requires the isolated platform_api_test smoke harness");
  await page.goto("/acceptance/v2/v2.4");
  await page.getByRole("button", { name: "查看观察记录" }).click();
  const row = page.getByTestId(`v24-observation-run-${testRunId}`);
  await expect(row).toBeVisible();
  const revisionResponse = page.waitForResponse((response) => response.url().includes(`/runs/${testRunId}/revisions`) && response.status() === 200);
  await row.getByRole("button", { name: `查看 ${observationDate} 修订历史` }).click();
  await revisionResponse;
  await expect(page.getByRole("heading", { name: "观察证据修订历史" })).toBeVisible();
  await expect(page.getByText(`TestRun：${testRunId}`)).toBeVisible();
  await expect(page.getByText(/OBSERVATION_EVENT_ERRORS/)).toBeVisible();
  await expect(page.getByText(/P3-REVISION-SAME-RUN/)).toBeVisible();
});
