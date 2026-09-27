import { expect, test } from "@playwright/test";

test("V3.3 page reads and paginates only the supplied existing queue", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174099";
  const cursors: Array<string | null> = [];
  const budgetOffsets: string[] = [];
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/queue/cursor?*`, async (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("afterCursor");
    cursors.push(cursor);
    const firstPage = cursor === null;
    const nextCursor = Buffer.from(JSON.stringify({ submittedAt: "2026-09-27T01:00:00.000Z", jobId: `${testRunId}:experiment-1` })).toString("base64url");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: cursor, nextAfterCursor: firstPage ? nextCursor : null, limit: 25, jobs: firstPage ? [{ jobId: `${testRunId}:experiment-1`, status: "QUEUED", submittedAt: "2026-09-27T01:00:00.000Z", startedAt: null, completedAt: null, attempt: 1, retryOf: null, artifacts: [], execution: null }] : [], hasMore: firstPage }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget?*`, async (route) => {
    const url = new URL(route.request().url());
    budgetOffsets.push(url.searchParams.get("offset") ?? "");
    const offset = Number(url.searchParams.get("offset"));
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset, limit: 25, rows: offset === 0 ? [{ jobId: `${testRunId}:experiment-1`, experimentId: "experiment-1", requestedCents: 77, reservedCents: 77, settledCents: 23, unknownReservedCents: 30, status: "RESERVED", source: "IN_MEMORY_LEDGER" }] : [], hasMore: false, coverage: { jobsOnPage: offset === 0 ? 1 : 0, experimentsOnPage: offset === 0 ? 1 : 0, budgetsFound: offset === 0 ? 1 : 0, budgetsMissing: 0 }, note: "page-scoped ledger evidence" }) });
  });
  await page.goto("/acceptance/v3/v3.3");
  await expect(page.getByRole("heading", { name: "V3.3 研究队列与预算证据" })).toBeVisible();
  await expect(page.getByTestId("v33-readiness-status")).toHaveText("PERSISTED_WAITING_ONLY");
  await expect(page.getByTestId("v33-business-status")).toHaveText("NOT_IMPLEMENTED");
  await expect(page.getByTestId("v33-stage-budget-status")).toHaveText("NOT_IMPLEMENTED");
  await expect(page.getByTestId("v33-paper-status")).toHaveText("NOT_CHECKED");
  await expect(page.getByTestId("v33-budget-status")).toHaveText("OWNER_SCOPED_LEDGER_READ_ONLY");
  await page.getByLabel("V3.3 TestRun UUID").fill(testRunId);
  await page.getByTestId("v33-read-queue").click();
  await expect(page.getByText("QUEUED", { exact: true })).toBeVisible();
  await expect(page.getByTestId("v33-budget-evidence")).toContainText('"unknownReservedCents": 30');
  await page.getByTestId("v33-next-page").click();
  await expect(page.getByTestId("v33-queue-empty")).toBeVisible();
  expect(cursors).toEqual([null, expect.any(String)]);
  expect(budgetOffsets).toEqual(["0", "25"]);
  await expect(page.getByTestId("v33-next-page")).toBeDisabled();
});

test("V3.3 queue page validates UUID locally and displays owner-scope rejection", async ({ page }) => {
  let queueRequests = 0;
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.3/runs/*/research/queue/cursor*", async (route) => {
    queueRequests += 1;
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "V3.3 run was not found in user scope" }) });
  });
  await page.goto("/acceptance/v3/v3.3");
  await page.getByLabel("V3.3 TestRun UUID").fill("not-a-uuid");
  await page.getByTestId("v33-read-queue").click();
  await expect(page.getByRole("alert")).toContainText("有效的 V3.3 TestRun UUID");
  expect(queueRequests).toBe(0);
  await page.getByLabel("V3.3 TestRun UUID").fill("123e4567-e89b-42d3-a456-426614174099");
  await page.getByTestId("v33-read-queue").click();
  await expect(page.getByRole("alert")).toContainText("V3.3 run was not found in user scope");
  expect(queueRequests).toBe(1);
});

test("V3.3 scenarios persist one WAITING TestRun and inspect that same run without dispatch", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174098";
  const record = { testRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", blockers: [{ id: "V3.1_ACCEPTANCE", status: "NOT_VERIFIED" }, { id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED" }], runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED" } };
  let created = 0;
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.3/runs", async (route) => {
    created += 1;
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ scenarioId: "recovery", seed: 20260907 });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(record) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(record) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/queue/cursor?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: null, nextAfterCursor: null, limit: 25, jobs: [], hasMore: false }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 25, rows: [], hasMore: false, coverage: { jobsOnPage: 0, experimentsOnPage: 0, budgetsFound: 0, budgetsMissing: 0 }, note: "no jobs" }) }));
  await page.goto("/acceptance/v3/v3.3");
  await expect(page.getByTestId("v33-readiness-status")).toHaveText("PERSISTED_WAITING_ONLY");
  await expect(page.getByTestId("v33-business-status")).toHaveText("NOT_IMPLEMENTED");
  await page.getByTestId("v33-create-recovery").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"runnerJobsCreated": 0');
  await expect(page.getByTestId("v33-queue-empty")).toBeVisible();
  expect(created).toBe(1);
});
