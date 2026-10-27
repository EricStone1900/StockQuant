import { expect, test } from "@playwright/test";

test("V2.1 C2 edits sampling, runs blocked and Fixture ticks, and displays stable-ID news revisions", async ({ page }) => {
  const samplingWrites: number[] = [];
  const monitorPolicyWrites: boolean[] = [];
  const dailyBarScheduleWrites: boolean[] = [];
  let samplingMode: "REAL" | "FIXTURE" = "REAL";
  const policies = [
    { policyId: "snapshotSampling", version: 2, enabled: false, trigger: "FIXED_INTERVAL", intervalMinutes: 20, timezone: "Asia/Shanghai", windows: [], activationGate: "SOURCE_AUTHORIZATION", executor: "CONFIGURED", updatedAt: null },
    { policyId: "monitorEvaluation", version: 1, enabled: false, trigger: "ON_QUOTE_AVAILABLE", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "DATA_READY", executor: "CONFIGURED", updatedAt: null },
    { policyId: "dailyBarCompletion", version: 1, enabled: false, trigger: "AFTER_SESSION_CLOSE", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "DATA_READY", executor: "CONFIGURED", updatedAt: null },
    { policyId: "strategyEvaluation", version: 1, enabled: false, trigger: "ON_DAILY_BAR_READY", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "OD007_APPROVAL", executor: "NOT_IMPLEMENTED", updatedAt: null },
    { policyId: "orderExecution", version: 1, enabled: false, trigger: "C5_EXECUTION_WINDOW", intervalMinutes: null, timezone: "Asia/Shanghai", windows: [], activationGate: "C5_APPROVAL", executor: "NOT_IMPLEMENTED", updatedAt: null }
  ];
  const scope = { accountId: "11111111-1111-4111-8111-111111111112", namespace: "paper:FAKE", testRunId: "11111111-1111-4111-8111-111111111113" };
  await page.route("**/api/v1/session", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "authenticated" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/sampling", async (route) => {
    if (route.request().method() === "PUT") {
      const interval = route.request().postDataJSON().intervalMinutes;
      samplingWrites.push(interval);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ intervalMinutes: interval, settingsVersion: 2, updatedAt: "2026-10-17T02:00:00.000Z", persistence: "POSTGRESQL", allowed: [20, 30], tradingWindows: [{ name: "morning", start: "09:30", end: "11:30" }, { name: "afternoon", start: "13:00", end: "15:00" }], lunchBreak: ["11:30", "13:00"], policies, scheduleSeparation: { snapshotSampling: "CONFIGURED", monitorEvaluation: "CONFIGURED", dailyBarCompletion: "CONFIGURED", strategyEvaluation: "NOT_CONFIGURED", orderExecution: "NOT_CONFIGURED" }, placeOrders: false }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ intervalMinutes: 30, settingsVersion: 1, updatedAt: null, persistence: "POSTGRESQL", allowed: [20, 30], tradingWindows: [], lunchBreak: ["11:30", "13:00"], policies, scheduleSeparation: { snapshotSampling: "CONFIGURED", monitorEvaluation: "CONFIGURED", dailyBarCompletion: "CONFIGURED", strategyEvaluation: "NOT_CONFIGURED", orderExecution: "NOT_CONFIGURED" }, placeOrders: false }) });
  });
  await page.route("**/api/v1/acceptance/v2/v2.1/daily-bars/schedules", async (route) => { const body = route.request().postDataJSON(); dailyBarScheduleWrites.push(body.enabled); policies[2].enabled = body.enabled; policies[2].version += 1; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scope: { market: "CN_A", ownerId: "acceptance-owner-1", ...body.scope }, enabled: body.enabled, enabledScopes: body.enabled ? 1 : 0, fixture: { version: "v2.1-daily-bars-1", sessionDate: "2026-10-16", dataMode: "FIXTURE" }, externalRequests: 0, placeOrders: false }) }); });
  await page.route("**/api/v1/acceptance/v2/v2.1/sampling/monitor-policy", async (route) => {
    const enabled = route.request().postDataJSON().enabled as boolean;
    monitorPolicyWrites.push(enabled);
    policies[1].enabled = enabled;
    policies[1].version += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ policy: policies[1], consumer: "monitorOutboxWorker", pendingEventsRetained: true, placeOrders: false }) });
  });
  await page.route("**/api/v1/acceptance/v2/v2.1/news", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dataMode: "FIXTURE", sourceStatus: "FIXTURE_ONLY", deduplicated: false, items: [{ newsId: "v2-fixture-news-001", sourceId: "fixture-news-v2.1", sourceIds: ["fixture-news-v2.1"], title: "示例公告（合成验收样本）", publishedAt: null, publicationTimeStatus: "UNKNOWN", revision: 1, revisionStatus: "UNVERIFIED_NO_STABLE_SOURCE_ID", symbols: [], entityMatchStatus: "UNMATCHED" }] }) }));
  await page.route(`**/api/v1/acceptance/v2/v2.1/watchlist/${scope.accountId}`, async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1", ...scope, securities: ["600000.SH", "000001.SZ"], count: 2, requiredCount: 0, omittedCandidates: [] }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/sampling/tasks/tick", async (route) => { samplingMode = "REAL"; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ decision: { status: "ELIGIBLE" }, externalRequests: 0, task: { taskId: "real-task", status: "QUEUED" }, execution: { taskId: "real-task", state: "QUEUED", attempt: 0, maxAttempts: 3 } }) }); });
  await page.route("**/api/v1/acceptance/v2/v2.1/sampling/tasks/tick-fixture", async (route) => { samplingMode = "FIXTURE"; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ decision: { status: "ELIGIBLE" }, dataMode: "FIXTURE", externalRequests: 0, task: { taskId: "fixture-task", status: "QUEUED", fixtureVersion: "v2.1-snapshot-sampling-1", observations: [] }, execution: { taskId: "fixture-task", state: "QUEUED", attempt: 0, maxAttempts: 3 } }) }); });
  await page.route("**/api/v1/acceptance/v2/v2.1/sampling/tasks/latest**", async (route) => { const fixture = samplingMode === "FIXTURE"; const observations = fixture ? ["600000.SH", "000001.SZ"].map((securityId, index) => ({ snapshotId: `fixture-${index + 1}`, securityId, sourceId: "fixture:v2.1-snapshot-sampling-1", dataMode: "FIXTURE", observedAt: "2026-10-16T01:50:00.000Z", ingestedAt: "2026-10-18T13:00:00.000Z", availableAt: "2026-10-18T13:00:00.000Z", ageSeconds: 214200, freshness: "STALE", price: index ? "12.3400" : "10.2500", status: "STALE" })) : []; return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ task: { taskId: fixture ? "fixture-task" : "real-task", dataMode: fixture ? "FIXTURE" : "REAL", status: fixture ? "COMPLETED_FIXTURE" : "BLOCKED_SOURCE_AUTHORIZATION", fixtureVersion: fixture ? "v2.1-snapshot-sampling-1" : null, observations }, execution: { taskId: fixture ? "fixture-task" : "real-task", state: fixture ? "COMPLETED" : "BLOCKED_SOURCE_AUTHORIZATION", attempt: 1, maxAttempts: 3 } }) }); });
  await page.route("**/api/v1/acceptance/v2/v2.1/quote-quality/evaluate", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scope: { market: "CN_A", ownerId: "acceptance-owner-1", ...scope }, taskId: "fixture-task", expectedCount: 2, freshCount: 0, coverageRatio: 0, status: "UNAVAILABLE", maxAgeSeconds: null, anomalies: [{ securityId: "600000.SH", code: "QUOTE_STALE", snapshotId: "fixture-1" }, { securityId: "000001.SZ", code: "QUOTE_STALE", snapshotId: "fixture-2" }], quoteRefs: [], evaluationId: "quotequality:test", evaluatedAt: "2026-10-19T10:00:00Z" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/quote-quality/latest**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ quality: { taskId: "fixture-task", expectedCount: 2, freshCount: 0, coverageRatio: 0, status: "UNAVAILABLE", maxAgeSeconds: null, anomalies: [{ securityId: "600000.SH", code: "QUOTE_STALE", snapshotId: "fixture-1" }, { securityId: "000001.SZ", code: "QUOTE_STALE", snapshotId: "fixture-2" }], evaluationId: "quotequality:test" } }) }));
  const dailyBarResult = { status: "COMPLETED_FIXTURE", reason: null, completionId: "dailybar:fixture-123", dataVersion: "daily-bars-cn-v1", fixtureVersion: "v2.1-daily-bars-1", sessionDate: "2026-10-16", sourceId: "fixture:v2.1-daily-bars-1", dataMode: "FIXTURE", scope: { market: "CN_A", ownerId: "acceptance-owner-1", ...scope }, availableAt: "2026-10-16T07:00:00.000Z", bars: [{ securityId: "600000.SH", sessionDate: "2026-10-16", open: "10.00", high: "10.20", low: "9.90", close: "10.10", volume: 100, amount: "1000" }, { securityId: "000001.SZ", sessionDate: "2026-10-16", open: "12.00", high: "12.20", low: "11.90", close: "12.10", volume: 200, amount: "2400" }] };
  const dailyBarTask = { taskId: "dailybartask:fixture-123", state: "COMPLETED", scope: { market: "CN_A", ownerId: "acceptance-owner-1", ...scope }, fixtureVersion: "v2.1-daily-bars-1", fixtureSha256: "b".repeat(64), attempt: 1, maxAttempts: 3, leaseOwner: null, leaseUntil: null, nextAttemptAt: null, lastError: null, completionId: dailyBarResult.completionId, createdAt: "2026-10-19T00:00:00.000Z", updatedAt: "2026-10-19T00:00:01.000Z" };
  await page.route("**/api/v1/acceptance/v2/v2.1/daily-bars/fixture/complete", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ task: { ...dailyBarTask, state: "QUEUED", attempt: 0 }, created: true, dataMode: "FIXTURE", externalRequests: 0, placeOrders: false }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/daily-bars/completions/latest**", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ task: dailyBarTask, completion: dailyBarResult }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/news/fixture/ingest", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fixtureVersion: "v2.1-news-revisions-1", dataMode: "FIXTURE", records: [{ created: true }, { created: true }, { created: true }] }) }));
  await page.route("**/api/v1/acceptance/v2/v2.1/news/fixture/history", async (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fixtureVersion: "v2.1-news-revisions-1", dataMode: "FIXTURE", histories: [{ sourceId: "fixture-news-a", sourceItemId: "notice-001", revision: 1, title: "浦发银行发布年度业绩预告", publishedAt: "2026-10-14T01:00:00.000Z", observedAt: "2026-10-14T01:01:00.000Z", ingestedAt: "2026-10-14T01:01:02.000Z", availableAt: "2026-10-14T01:01:02.000Z", entityMatchStatus: "LINKED", revisionStatus: "VERIFIED_STABLE_SOURCE_ID" }, { sourceId: "fixture-news-a", sourceItemId: "notice-001", revision: 2, title: "浦发银行发布年度业绩预告（修订）", publishedAt: "2026-10-14T01:00:00.000Z", observedAt: "2026-10-14T02:00:00.000Z", ingestedAt: "2026-10-14T02:00:02.000Z", availableAt: "2026-10-14T02:00:02.000Z", entityMatchStatus: "LINKED", revisionStatus: "VERIFIED_STABLE_SOURCE_ID" }] }) }));

  await page.goto("/acceptance/v2/v2.1");
  await page.getByTestId("v21-read-sampling").click();
  await expect(page.getByTestId("v21-sampling-interval")).toHaveValue("30");
  await page.getByTestId("v21-sampling-interval").selectOption("20");
  await page.getByTestId("v21-save-sampling").click();
  await expect(page.getByTestId("v21-sampling-summary")).toContainText("20分钟 · POSTGRESQL");
  await expect(page.getByTestId("v21-sampling-summary")).toContainText("配置版本2");
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("monitorEvaluation · v1 · ON_QUOTE_AVAILABLE · 禁用 · CONFIGURED");
  await page.getByTestId("v21-toggle-monitor-policy").click();
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("monitorEvaluation · v2 · ON_QUOTE_AVAILABLE · 启用 · CONFIGURED");
  await expect(page.getByTestId("v21-toggle-monitor-policy")).toHaveText("关闭自动行情质量评估");
  await page.getByTestId("v21-toggle-monitor-policy").click();
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("monitorEvaluation · v3 · ON_QUOTE_AVAILABLE · 禁用 · CONFIGURED");
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("strategyEvaluation · v1 · ON_DAILY_BAR_READY · 禁用");
  await page.getByTestId("v21-watchlist-account").fill(scope.accountId);
  await page.getByTestId("v21-watchlist-namespace").fill(scope.namespace);
  await page.getByTestId("v21-watchlist-test-run").fill(scope.testRunId);
  await page.getByTestId("v21-watchlist-candidates").fill("600000.SH,000001.SZ");
  await page.getByTestId("v21-update-scoped-watchlist").click();
  await page.getByTestId("v21-toggle-daily-bar-schedule").click();
  await expect(page.getByTestId("v21-daily-bar-scheduler-state")).toContainText("已启用");
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("dailyBarCompletion · v2 · AFTER_SESSION_CLOSE · 启用 · CONFIGURED");
  await page.getByTestId("v21-toggle-daily-bar-schedule").click();
  await expect(page.getByTestId("v21-sampling-policies")).toContainText("dailyBarCompletion · v3 · AFTER_SESSION_CLOSE · 禁用 · CONFIGURED");
  await page.getByTestId("v21-evaluate-sampling-tick").click();
  await expect(page.getByTestId("v21-sampling-task-state")).toContainText("BLOCKED_SOURCE_AUTHORIZATION");
  await page.getByTestId("v21-evaluate-sampling-fixture-tick").click();
  await expect(page.getByTestId("v21-sampling-fixture-task-state")).toContainText("COMPLETED_FIXTURE");
  await expect(page.getByTestId("v21-sampling-fixture-task-state")).toContainText("2 条合成观测 · 外部请求0");
  await expect(page.getByTestId("v21-sampling-observations")).toContainText("fixture:v2.1-snapshot-sampling-1 · FIXTURE");
  await expect(page.getByTestId("v21-sampling-observations")).toContainText("STALE");
  await page.getByTestId("v21-read-latest-sampling-task").click();
  await expect(page.getByTestId("v21-latest-sampling-task")).toContainText("FIXTURE · COMPLETED_FIXTURE");
  await expect(page.getByTestId("v21-latest-sampling-task")).toContainText("Worker COMPLETED (1/3)");
  await page.getByTestId("v21-evaluate-quote-quality").click();
  await expect(page.getByTestId("v21-quote-quality")).toContainText("UNAVAILABLE");
  await expect(page.getByTestId("v21-quote-quality")).toContainText("600000.SH:QUOTE_STALE");
  await page.getByTestId("v21-read-quote-quality").click();
  await expect(page.getByTestId("v21-quote-quality")).toContainText("quotequality:test");
  await page.getByTestId("v21-complete-daily-bar-fixture").click();
  await expect(page.getByTestId("v21-daily-bar-completion")).toContainText("任务 COMPLETED");
  await expect(page.getByTestId("v21-daily-bar-completion")).toContainText("1/3");
  await page.getByTestId("v21-read-latest-daily-bar-completion").click();
  await expect(page.getByTestId("v21-latest-daily-bar-completion")).toContainText("COMPLETED");
  await expect(page.getByTestId("v21-latest-daily-bar-completion")).toContainText("dailybar:fixture-123");
  await page.getByTestId("v21-ingest-news-fixture").click();
  await expect(page.getByTestId("v21-news-fixture-history")).toContainText("v2.1-news-revisions-1");
  await expect(page.getByTestId("v21-news-fixture-history")).toContainText("修订2");
  await expect(page.getByTestId("v21-news-fixture-history")).toContainText("VERIFIED_STABLE_SOURCE_ID");
  expect(samplingWrites).toEqual([20]);
  expect(monitorPolicyWrites).toEqual([true, false]);
  expect(dailyBarScheduleWrites).toEqual([true, false]);
});
