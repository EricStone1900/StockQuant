import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../../../../", import.meta.url)));

test("V2.4 Web creates a persistent WAITING run and CLI reads that same run", async ({ page, context, baseURL }) => {
  const ownerId = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER;
  const apiUrl = process.env.STOCKQUANT_PLATFORM_API_URL;
  expect(ownerId).toBeTruthy();
  expect(apiUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
  await context.addCookies([{ name: "sq_session", value: ownerId!, url: baseURL! }]);
  await page.goto("/acceptance/v2/v2.4");
  await expect(page.getByTestId("v24-mode")).toContainText("NOT_CONNECTED");
  await page.route("**/api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v24-paper-execution-readiness-v1", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false, status: "BLOCKED", policyReadiness: { status: "BLOCKED", reason: "POLICY_PREPARATION_ONLY", configurationGaps: ["STRATEGY_VERSION"] }, mandateReadiness: { status: "BLOCKED", reason: "MANDATE_PREPARATION_ONLY", configurationGaps: ["MANDATE_ID"] }, riskEvaluation: { status: "NOT_RUN", reason: "NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT" }, resourceReservation: { status: "NOT_RUN", reason: "MANDATE_OR_ACCOUNT_UNSET" }, orderSubmissionEnabled: false }) }));
  await page.getByRole("button", { name: "检查 Paper 就绪门禁" }).click();
  await expect(page.getByTestId("v24-paper-readiness")).toContainText("CN_A · BLOCKED · PAPER/FAKE");
  await expect(page.getByRole("region", { name: "Paper 就绪门禁" })).toContainText("风控：NOT_RUN；资源预留：NOT_RUN；下单：关闭");
  await page.getByRole("button", { name: "检查正常路径前置" }).click();
  const evidence = page.getByTestId("v24-evidence");
  await expect(evidence).toContainText('"status": "WAITING"');
  const webRun = JSON.parse(await evidence.textContent() ?? "null") as { testRunId: string; status: string; evidence: { orders: unknown[]; fills: unknown[] } };
  expect(webRun.status).toBe("WAITING");
  expect(webRun.evidence.orders).toEqual([]);
  expect(webRun.evidence.fills).toEqual([]);

  const cli = spawnSync(process.execPath, [resolve(repositoryRoot, "scripts/verify-stage.mjs"), "--stage", "V2.4", "--run", webRun.testRunId, "--check-only"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: apiUrl!, STOCKQUANT_SESSION_COOKIE: `sq_session=${ownerId}` },
    timeout: 5000,
  });
  expect(cli.status, cli.stderr).toBe(2);
  const cliRun = JSON.parse(cli.stdout) as { checkOnly: boolean; testRunId: string; status: string };
  expect(cliRun).toMatchObject({ checkOnly: true, testRunId: webRun.testRunId, status: "WAITING" });
  await expect(page.getByTestId("v24-evidence")).toContainText(webRun.testRunId);
});
