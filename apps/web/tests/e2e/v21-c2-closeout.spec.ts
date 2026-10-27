import { test, expect } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash, randomUUID } from "node:crypto";

test("V2.1 C2 real-container Web scenarios, same-run CLI and immutable export", async ({ page, context }) => {
  test.setTimeout(120_000);
  const api = process.env.STOCKQUANT_V21_CLOSEOUT_API_URL;
  test.skip(!api || !process.env.PLAYWRIGHT_BASE_URL, "Requires the explicitly selected isolated container stack");
  const root = resolve("../..");
  const directory = resolve(root, "evidence/local/V2.1", randomUUID()); await mkdir(directory, { recursive: true });
  const runs: Array<Record<string, unknown>> = [];
  let lastScope: { accountId: string; namespace: string; testRunId: string } | undefined;
  await page.goto("/acceptance/v2/v2.1");
  await expect(page.getByRole("heading", { name: "V2.1 免费行情、新闻聚合与在线股票池" })).toBeVisible();
  const session = await context.request.get(`${api}/api/v1/session`); expect(session.ok()).toBe(true);
  const cookie = (await context.cookies()).find((item) => item.name === "sq_session"); expect(cookie).toBeTruthy();
  const credentials = { STOCKQUANT_PLATFORM_API_URL: api!, STOCKQUANT_SESSION_COOKIE: `sq_session=${cookie!.value}`, STOCKQUANT_EVIDENCE_SESSION_COOKIE: `sq_session=${cookie!.value}` };
  for (const [scenarioId, button] of [["normal", "运行正常"], ["rejection", "运行容量拒绝"], ["recovery", "运行任务恢复"], ["stale", "运行陈旧拒绝"]]) {
    const accepted = page.waitForResponse((response) => response.url().endsWith("/api/v1/acceptance/v2/v2.1/runs") && response.request().method() === "POST");
    await page.getByRole("button", { name: button, exact: true }).click();
    const response = await accepted; expect(response.status()).toBe(202); const body = await response.json();
    await expect(page.getByTestId("v21-test-run-id")).toHaveText(body.testRunId);
    await expect(page.getByTestId("v21-run-status")).toHaveText("COMPLETED");
    const read = () => context.request.get(`${api}/api/v1/acceptance/v2/v2.1/runs/${body.testRunId}`);
    const before = await (await read()).json(); expect(before.assertions.length).toBeGreaterThan(0);
    lastScope = before.evidence.scope;
    expect(before.assertions.every((item: { status: string }) => item.status === "PASS")).toBe(true);
    if (scenarioId === "stale") {
      const quality = before.assertions.find((item: { assertionId: string }) => item.assertionId === "V2.1-QUALITY-001").actual;
      expect(quality.freshCount).toBe(0); expect(quality.status).toBe("UNAVAILABLE"); expect(quality.anomalies).toHaveLength(2);
    }
    for (const [label, args] of [["check-only", ["scripts/verify-stage.mjs", "--stage", "V2.1", "--run", body.testRunId, "--check-only"]], ["export", ["scripts/evidence-export.mjs", "--stage", "V2.1", "--run", body.testRunId]]] as const) {
      const checked = spawnSync(process.execPath, [...args], { cwd: root, env: { ...process.env, ...credentials }, encoding: "utf8", timeout: 20000 });
      await writeFile(resolve(directory, `${scenarioId}-${label}.log`), (checked.stdout ?? "") + (checked.stderr ?? ""));
      expect(checked.status, checked.stderr || checked.stdout).toBe(0);
    }
    const after = await (await read()).json(); expect(after).toEqual(before);
    await page.reload(); await expect(page.getByTestId("v21-test-run-id")).toHaveText(body.testRunId); await expect(page.getByTestId("v21-run-status")).toHaveText("COMPLETED");
    await page.screenshot({ path: resolve(directory, `${scenarioId}.png`), fullPage: true });
    const bundle = resolve(root, "evidence/local/V2.1", body.testRunId, "evidence.json");
    const bytes = await readFile(bundle); const exported = JSON.parse(bytes.toString());
    expect(exported.testRunId).toBe(body.testRunId);
    runs.push({ scenarioId, testRunId: body.testRunId, assertions: before.assertions.length, scenarioVersion: before.scenarioVersion, evidenceSha256: createHash("sha256").update(bytes).digest("hex"), checkOnlyAndExport: "PASS", reloadSameRun: "PASS", humanAcceptance: "NOT_RUN" });
  }
  await page.getByTestId("v21-watchlist-account").fill(lastScope!.accountId);
  await page.getByTestId("v21-watchlist-namespace").fill(lastScope!.namespace);
  await page.getByTestId("v21-watchlist-test-run").fill(lastScope!.testRunId);
  await page.getByTestId("v21-read-scoped-watchlist").click();
  await expect(page.getByTestId("v21-scoped-watchlist-summary")).toContainText(lastScope!.testRunId);
  const dailyDenied = page.waitForResponse((response) => response.url().endsWith("/daily-bars/real/complete"));
  await page.getByTestId("v21-complete-real-daily-bar").click(); expect((await dailyDenied).status()).toBe(403);
  await expect(page.getByRole("alert")).toContainText("DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED");
  const schedulerDenied = page.waitForResponse((response) => response.url().endsWith("/sampling/schedules"));
  await page.getByTestId("v21-enable-snapshot-schedule").click(); expect((await schedulerDenied).status()).toBe(409);
  const stopped = page.waitForResponse((response) => response.url().endsWith("/sampling/schedules"));
  await page.getByTestId("v21-disable-snapshot-schedule").click(); expect((await stopped).status()).toBe(200);
  await page.screenshot({ path: resolve(directory, "source-gates.png"), fullPage: true });
  const report = JSON.stringify({ status: "PASS", webUrl: process.env.PLAYWRIGHT_BASE_URL, platformApiUrl: api, dataMode: "FIXTURE", brokerMode: "FAKE", externalRequests: 0, runs, humanAcceptance: "NOT_RUN" }, null, 2) + "\n";
  await writeFile(resolve(directory, "web-closeout.json"), report); await writeFile(resolve(directory, "manifest.sha256"), createHash("sha256").update(report).digest("hex") + "  web-closeout.json\n");
  console.log(JSON.stringify({ status: "PASS", evidenceDirectory: directory, runs }));
});
