import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));

test("V2.4 Web executes all isolated Paper scenarios and CLI checks each persisted TestRun", async ({ page, context, baseURL }) => {
  test.setTimeout(90000);
  const ownerId = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER;
  const apiUrl = process.env.STOCKQUANT_PLATFORM_API_URL;
  expect(ownerId).toBeTruthy();
  expect(apiUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  await context.addCookies([{ name: "sq_session", value: ownerId!, url: baseURL! }]);
  await page.goto("/acceptance/v2/v2.4");
  page.on("requestfailed", (request) => console.log(`request failed: ${request.method()} ${request.url()} ${request.failure()?.errorText}`));
  page.on("request", (request) => { if (request.url().includes("/api/v1/session") || request.url().includes("/api/v1/acceptance/v2/v2.4/runs")) console.log(`acceptance request: ${request.method()} ${request.url()}`); });
  page.on("response", async (response) => {
    if (response.url().includes("/api/v1/session") || response.url().includes("/api/v1/acceptance/v2/v2.4/runs") || response.url().includes("observation-summary")) {
      const body = response.status() >= 400 ? (await response.text().catch(() => "")).slice(0, 4000) : "";
      console.log(`acceptance response: ${response.status()} ${response.url()}${body ? ` body=${body}` : ""}`);
    }
  });
  page.on("console", (message) => { if (message.type() === "error") console.log(`browser console: ${message.text()}`); });
  await expect(page.getByTestId("v24-mode")).toContainText("隔离FIXTURE / PAPER / FAKE");
  await page.route("**/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v24-paper-execution-readiness-v1", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false, status: "BLOCKED", policyReadiness: { status: "BLOCKED", reason: "POLICY_PREPARATION_ONLY", configurationGaps: ["STRATEGY_VERSION"] }, mandateReadiness: { status: "BLOCKED", reason: "MANDATE_PREPARATION_ONLY", configurationGaps: ["MANDATE_ID"] }, riskEvaluation: { status: "NOT_RUN", reason: "NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT" }, resourceReservation: { status: "NOT_RUN", reason: "MANDATE_OR_ACCOUNT_UNSET" }, orderSubmissionEnabled: false }) }));
  await page.getByRole("button", { name: "检查 Paper 就绪门禁" }).click();
  await expect(page.getByTestId("v24-paper-readiness")).toContainText("CN_A · BLOCKED · PAPER/FAKE");
  await expect(page.getByRole("region", { name: "Paper 就绪门禁" })).toContainText("风控：NOT_RUN；资源预留：NOT_RUN；下单：关闭");
  const runs: Array<{ scenarioId: string; testRunId: string }> = [];
  const webEvidence: Array<Record<string, unknown>> = [];
  const scenarios = [
    { id: "normal", button: "运行隔离Paper正常场景" },
    { id: "rejection", button: "运行隔离Paper拒绝场景" },
    { id: "recovery", button: "运行隔离Paper恢复场景" },
    { id: "external-reconciliation", button: "运行外部订单差异场景" },
  ] as const;
  for (const scenario of scenarios) {
    if (scenario.id === "recovery") {
      const faultControlUrl = process.env.STOCKQUANT_V24_RECOVERY_FAULT_CONTROL_URL;
      expect(faultControlUrl).toBeTruthy();
      const armed = await fetch(faultControlUrl!, { method: "POST" });
      expect(armed.status).toBe(204);
    }
    await page.getByRole("button", { name: scenario.button }).click({ noWaitAfter: true });
    if (scenario.id === "normal") await expect(page.getByRole("status")).toContainText("normal 场景正在执行", { timeout: 1000 });
    const summary = page.getByRole("region", { name: "Paper场景业务证据" });
    await expect(summary).toBeVisible({ timeout: 35000 });
    if (scenario.id === "recovery") {
      await expect(page.getByTestId("v24-scenario-status")).toContainText("recovery · FAILED");
      await page.getByTestId("v24-resume-failed-run").click();
      await expect(page.getByTestId("v24-scenario-status")).toContainText("recovery · COMPLETED");
      await expect(page.getByTestId("v24-recovery-history")).toContainText('"status": "FAILED"');
    }
    await expect(page.getByTestId("v24-scenario-status")).toContainText(`${scenario.id} · COMPLETED`);
    await expect(page.getByTestId("v24-business-timeline")).toContainText("最终对账");
    const testRunId = await page.getByTestId("v24-test-run-id").textContent();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    const rawEvidence = JSON.parse(await page.getByTestId("v24-evidence").textContent() ?? "null") as { assertions: Array<{ assertionId: string; status: string }>; evidence: Record<string, any> };
    const anonymousRead = await context.request.get(`${apiUrl}/api/v1/acceptance/v2/v2.4/runs/${testRunId}`, { headers: { cookie: "" } });
    expect(anonymousRead.status()).toBe(401);
    const foreignOwnerRead = await context.request.get(`${apiUrl}/api/v1/acceptance/v2/v2.4/runs/${testRunId}`, { headers: { cookie: "sq_session=foreign-owner" } });
    expect(foreignOwnerRead.status()).toBe(403);
    if (scenario.id === "normal" || scenario.id === "recovery") {
      await expect(page.getByTestId("v24-authorization-result")).toHaveText("AUTHORIZED");
      await expect(page.getByTestId("v24-risk-result")).toContainText("PASS");
      await expect(page.getByTestId("v24-order-status")).toContainText("FILLED");
      await expect(page.getByTestId("v24-fill-summary")).toContainText("100 股 × 10.0000；费用 5.0000");
      await expect(page.getByTestId("v24-reservation-status")).toContainText("CAPTURED");
      await expect(page.getByTestId("v24-cash")).toContainText("8995.0000");
      await expect(page.getByTestId("v24-reconciliation")).toContainText("待处理 0");
      await expect(page.getByTestId("v24-reconciliation")).toContainText("外部未匹配 0");
    } else if (scenario.id === "rejection") {
      await expect(page.getByTestId("v24-governance-result")).toContainText("REJECTED · HTTP 422");
      await expect(page.getByTestId("v24-positions")).toHaveText("无");
      await expect(page.getByTestId("v24-cash")).toContainText("10000.0000");
      await expect(page.getByTestId("v24-reconciliation")).toContainText("订单 0，成交 0，待处理 0");
      await expect(page.getByTestId("v24-reconciliation")).toContainText("外部未匹配 0");
    } else {
      await expect(page.getByTestId("v24-order-status")).toContainText("FILLED");
      await expect(page.getByTestId("v24-reconciliation")).toContainText("外部未匹配 1");
      await expect(page.getByTestId("v24-reconciliation-discrepancies")).toContainText("EXTERNAL_ORDER_MISSING_LOCALLY");
      await expect(page.getByTestId("v24-reconciliation-discrepancies")).toContainText("fixture-external");
    }

    const cli = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", testRunId!, "--check-only"], {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl!, STOCKQUANT_SESSION_COOKIE: `sq_session=${ownerId}` },
      timeout: 5000,
    });
    expect(cli.status, cli.stderr).toBe(0);
    const cliRun = JSON.parse(cli.stdout) as { checkOnly: boolean; testRunId: string; status: string };
    expect(cliRun).toMatchObject({ checkOnly: true, testRunId, status: "COMPLETED" });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("v24-download-evidence").click()]);
    expect(download.suggestedFilename()).toBe(`v24-paper-${testRunId}.json`);
    const downloadedEvidence = JSON.parse(await readFile(await download.path(), "utf8")) as { testRunId: string; scenarioId: string };
    expect(downloadedEvidence).toMatchObject({ testRunId, scenarioId: scenario.id });
    runs.push({ scenarioId: scenario.id, testRunId: testRunId! });
    await summary.scrollIntoViewIfNeeded();
    const screenshot = `evidence/audits/2026-10-02-v24-paper-web-${scenario.id}-${testRunId}.png`;
    await page.screenshot({ path: resolve(repositoryRoot, screenshot), fullPage: true });
    webEvidence.push({ scenarioId: scenario.id, testRunId, screenshot, status: cliRun.status, cliCheckOnly: cliRun.checkOnly, assertions: rawEvidence.assertions.map(({ assertionId, status }) => ({ assertionId, status })), businessEvidence: { fixture: rawEvidence.evidence.fixture, governance: rawEvidence.evidence.governance, order: rawEvidence.evidence.order, fills: rawEvidence.evidence.fills, resourceReservation: rawEvidence.evidence.resourceReservation, account: rawEvidence.evidence.account, outbox: rawEvidence.evidence.outbox, reconciliation: rawEvidence.evidence.reconciliation }, trace: [...(scenario.id === "recovery" ? ["arm isolated network proxy to drop actual Trade Execution response"] : []), "click scenario", "read persisted TestRun", "assert business evidence", "CLI --check-only reads same TestRun", "download and verify raw evidence", "anonymous and foreign-owner reads rejected"] });
    await page.reload();
    await expect(page.getByTestId("v24-test-run-id")).toHaveText(testRunId!);
    await expect(page.getByTestId("v24-scenario-status")).toContainText(`${scenario.id} · COMPLETED`);
  }
  await context.clearCookies();
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "session expired" }) }));
  await page.reload();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/v1/session");
  await page.reload();
  await expect(page.getByTestId("v24-test-run-id")).toHaveText(runs.at(-1)!.testRunId);
  await page.close();
  const reopenedPage = await context.newPage();
  await reopenedPage.goto("/acceptance/v2/v2.4");
  await expect(reopenedPage.getByTestId("v24-test-run-id")).toHaveText(runs.at(-1)!.testRunId);
  await reopenedPage.getByRole("button", { name: "查看日终观察进度" }).click();
  await expect(reopenedPage.getByTestId("v24-observation-status")).toHaveText("WAITING");
  await reopenedPage.reload();
  await expect(reopenedPage.getByTestId("v24-test-run-id")).toHaveText(runs.at(-1)!.testRunId);
  const finalWebEvidence = webEvidence.at(-1);
  if (finalWebEvidence && Array.isArray(finalWebEvidence.trace)) finalWebEvidence.trace.push("expired session displays an error", "restored owner session resumes last TestRun", "close browser page and reopen the route; last TestRun resumes", "read persisted observation summary in WAITING state");
  const evidenceDirectory = resolve(repositoryRoot, "evidence/audits");
  await mkdir(evidenceDirectory, { recursive: true });
  const webAuditReport = resolve(evidenceDirectory, `2026-10-02-v24-paper-web-e2e-${runs.at(-1)!.testRunId}.json`);
  await writeFile(webAuditReport, `${JSON.stringify({ status: "PASS", environment: "isolated local PostgreSQL and Platform/Governance/Portfolio/Trade Execution processes", brokerMode: "FAKE", dataMode: "FIXTURE", scenarios: webEvidence }, null, 2)}\n`, { mode: 0o600 });
  console.log(`Web audit ${webAuditReport}; TestRuns ${JSON.stringify(runs)}`);
});
