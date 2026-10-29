import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));
const apiBase = "/api/v1/acceptance/v2/v2.4/local-engineering";
const dates = ["2024-01-04", "2024-01-05", "2024-01-08", "2024-01-09", "2024-01-10"];

test("C5 local engineering Web run survives reopen, rejects pending authorization, completes, checks and exports the same run", async ({ page, context, baseURL }) => {
  test.setTimeout(120_000);
  const ownerId = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER;
  const apiUrl = process.env.STOCKQUANT_PLATFORM_API_URL;
  expect(ownerId).toBeTruthy();
  expect(apiUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  const issuedSession = await fetch(`${apiUrl}/api/v1/session`);
  expect(issuedSession.status).toBe(200);
  const sessionCookie = issuedSession.headers.get("set-cookie")?.split(";")[0];
  expect(sessionCookie).toMatch(/^sq_session=/u);
  await context.addCookies([{ name: "sq_session", value: sessionCookie!.slice("sq_session=".length), url: baseURL! }]);

  await page.goto("/acceptance/v2/v2.4/c5-local");
  await expect(page.getByRole("heading", { name: "C5 本地 Fixture 工程闭环" })).toBeVisible();
  await page.getByRole("button", { name: "创建隔离 C5 TestRun" }).click();
  await expect(page.getByTestId("c5-local-test-run")).toContainText("WAITING", { timeout: 20_000 });
  const testRunId = (await page.getByTestId("c5-local-test-run").textContent())!.split(" · ")[0]!;
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);

  // Prove the server rejects an attempt to authorize with a newly created but inactive Mandate.
  const pendingMandateResponse = await context.request.post(`${apiUrl}${apiBase}/runs/${testRunId}/mandates`, {
    headers: { cookie: sessionCookie! },
    data: { mandateId: crypto.randomUUID(), sessionDate: dates[0], reason: "C5 Web rejection acceptance" },
  });
  expect(pendingMandateResponse.status()).toBe(201);
  const pendingMandate = await pendingMandateResponse.json();
  expect(pendingMandate.status).toBe("PENDING");
  const rejectedAuthorization = await context.request.post(`${apiUrl}${apiBase}/runs/${testRunId}/sessions/${dates[0]}/authorize`, {
    headers: { cookie: sessionCookie! }, data: { mandateId: pendingMandate.mandateId },
  });
  expect(rejectedAuthorization.status()).toBe(409);
  const rejectedBody = await rejectedAuthorization.json();
  expect(JSON.stringify(rejectedBody)).toContain("exact ACTIVE session-scoped C5 Mandate");
  const rejectionEvidence = await (await context.request.get(`${apiUrl}${apiBase}/runs/${testRunId}`, { headers: { cookie: sessionCookie! } })).json();
  expect(rejectionEvidence.evidence.orders).toEqual([]);
  expect(rejectionEvidence.evidence.fills).toEqual([]);

  // Close and reopen the page while the persisted job runs; localStorage must restore the same TestRun.
  let activePage = page;
  for (let index = 0; index < dates.length; index += 1) {
    const date = dates[index]!;
    await activePage.getByLabel("合成交易日").selectOption(date);
    if (index === 0) {
      // The rejected request created a pending mandate outside the UI. Activate that exact persisted
      // mandate only after confirming the UI still refuses to create a duplicate for this date.
      const activatePending = await context.request.post(`${apiUrl}${apiBase}/runs/${testRunId}/mandates/${pendingMandate.mandateId}/activate`, {
        headers: { cookie: sessionCookie! }, data: { mandateVersion: pendingMandate.mandateVersion, contentHash: pendingMandate.contentHash, reason: "Owner explicitly activates the fixed C5 session" },
      });
      expect(activatePending.status()).toBe(200);
      await activePage.getByRole("button", { name: "刷新同一 Run" }).click();
    } else {
      await expect(activePage.getByRole("button", { name: "为当日创建 Mandate" })).toBeEnabled();
      await activePage.getByRole("button", { name: "为当日创建 Mandate" }).click();
      await expect(activePage.getByText("此日期 Mandate：PENDING")).toBeVisible();
      await activePage.getByRole("button", { name: "明确激活当日 Mandate" }).click();
      await expect(activePage.getByText("此日期 Mandate：ACTIVE")).toBeVisible();
    }

    await expect(activePage.getByRole("button", { name: "排队当日授权评估" })).toBeEnabled();
    await activePage.getByRole("button", { name: "排队当日授权评估" }).click();
    if (index === 0) {
      await expect(activePage.getByTestId("c5-local-job")).toContainText('"state"', { timeout: 5000 });
      await activePage.close();
      activePage = await context.newPage();
      await activePage.goto("/acceptance/v2/v2.4/c5-local");
      await expect(activePage.getByTestId("c5-local-test-run")).toContainText(testRunId);
    }
    const job = activePage.getByTestId("c5-local-job");
    let observedJob: Record<string, unknown> | null = null;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      await activePage.getByRole("button", { name: "查询 Job" }).click();
      observedJob = JSON.parse((await job.textContent()) ?? "null");
      if (observedJob?.state === "COMPLETED") break;
      await activePage.waitForTimeout(500);
    }
    expect(observedJob, `C5 local session ${date} did not complete`).toMatchObject({ state: "COMPLETED" });
    await expect(activePage.getByRole("button", { name: "暂停当日 Mandate" })).toBeEnabled();
    await activePage.getByRole("button", { name: "暂停当日 Mandate" }).click();
    await expect(activePage.getByText("此日期 Mandate：PAUSED")).toBeVisible();
  }

  await activePage.getByRole("button", { name: "核对并完成 Run" }).click();
  await expect(activePage.getByTestId("c5-local-test-run")).toContainText("COMPLETED", { timeout: 20_000 });
  const runEvidence = JSON.parse(await activePage.locator("details pre").textContent() ?? "null");
  expect(runEvidence.testRunId).toBe(testRunId);
  expect(runEvidence.evidence.humanAcceptance).toBe("NOT_RUN");
  expect(runEvidence.assertions.length).toBeGreaterThan(0);
  expect(runEvidence.assertions.every((assertion: { status: string }) => assertion.status === "PASS")).toBe(true);
  expect(runEvidence.evidence.sessionResults.map((result: { action: string }) => result.action)).toEqual(["BUY", "SELL", "HOLD", "HOLD", "HOLD"]);
  expect(runEvidence.evidence.sessionResults.slice(0, 2).every((result: { execution?: { status?: string; order?: { fill?: unknown } } }) => result.execution?.status === "FILLED" && result.execution.order?.fill)).toBe(true);

  const cli = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--scenario", "c5-local-engineering", "--run", testRunId, "--check-only"], {
    cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl!, STOCKQUANT_SESSION_COOKIE: sessionCookie! }, timeout: 5000,
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(JSON.parse(cli.stdout)).toMatchObject({ checkOnly: true, stageId: "V2.4", testRunId, status: "COMPLETED" });

  const exportResult = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/evidence-export.mjs"), "--stage", "V2.4", "--scenario", "c5-local-engineering", "--run", testRunId], {
    cwd: repositoryRoot, encoding: "utf8", env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl!, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie! }, timeout: 10_000,
  });
  expect(exportResult.status, exportResult.stderr).toBe(0);
  expect(JSON.parse(exportResult.stdout)).toMatchObject({ stageId: "V2.4", testRunId, kind: "TEST_RUN_EVIDENCE" });

  await activePage.reload();
  await expect(activePage.getByTestId("c5-local-test-run")).toContainText(testRunId);
});
