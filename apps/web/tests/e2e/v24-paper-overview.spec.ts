import { expect, test } from "@playwright/test";

test("Paper overview keeps data use blocked and permits only explicit alert acknowledgement", async ({ page, context, baseURL }) => {
  const writes: string[] = [];
  const quoteRequests: string[] = [];
  const integration = process.env.STOCKQUANT_ALERT_INTEGRATION === "true";
  const incidentId = process.env.STOCKQUANT_ALERT_INCIDENT_ID ?? "39cf8ff6-5dcb-48f9-84a0-0250281528cb";
  const ownerId = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER ?? "overview-owner";
  const incident = { incidentId, alertKey: "collection-run:dc08a-test:INTRADAY_WINDOW", code: "COLLECTION_RUN_FAILED", severity: "CRITICAL", payload: { runId: "failed-run" }, state: "OPEN", firstSeenAt: "2026-10-02T02:00:00.000Z", lastSeenAt: "2026-10-02T02:00:00.000Z", acknowledgedBy: null, acknowledgedAt: null, resolvedAt: null };
  let activeIncident = { ...incident };
  if (integration) {
    expect(ownerId).not.toBe("overview-owner");
    expect(baseURL).toBeTruthy();
    await context.addCookies([{ name: "sq_session", value: ownerId, url: baseURL! }]);
  }
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ userId: "overview-owner" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/paper-readiness*", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v24-paper-execution-readiness-v1", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false, status: "BLOCKED", policyReadiness: { status: "BLOCKED", reason: "POLICY_PREPARATION_ONLY", configurationGaps: ["STRATEGY_VERSION"] }, mandateReadiness: { status: "BLOCKED", reason: "MANDATE_PREPARATION_ONLY", configurationGaps: ["MANDATE_ID"] }, riskEvaluation: { status: "NOT_RUN", reason: "NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT" }, resourceReservation: { status: "NOT_RUN", reason: "MANDATE_OR_ACCOUNT_UNSET" }, orderSubmissionEnabled: false }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/scheduler/status", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "STOPPED", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observation-summary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ targetDays: 20, countedDays: 0, recordedCountedDays: 10, unverifiedCountedDays: 10, remainingDays: 20, status: "WAITING", dates: [] }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observations", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ observationDate: "2026-10-02", evidence: { eventKind: "EXECUTION_WINDOW", executionGate: { status: "PAUSED", reason: "QUOTE_SOURCE_NOT_AUTHORIZED" } } }] ) }));
  if (!integration) {
    await page.route("**/api/v1/acceptance/v2/v2.4/alerts", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ incidents: [activeIncident] }) }));
    await page.route("**/api/v1/acceptance/v2/v2.4/alerts/*/acknowledge", async (route) => {
      activeIncident = { ...activeIncident, state: "ACKNOWLEDGED", acknowledgedBy: "overview-owner", acknowledgedAt: "2026-10-03T02:00:00.000Z" };
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(activeIncident) });
    });
  }
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().method() !== "GET") writes.push(`${route.request().method()} ${route.request().url()}`);
    await route.fallback();
  });
  await page.route("**/v2/quote/**", async (route) => { quoteRequests.push(route.request().url()); await route.abort(); });

  await page.goto("/paper");
  await expect(page.getByTestId("paper-overview-boundary")).toContainText("行情来源尚未授权");
  await expect(page.getByTestId("paper-overview-mode")).toContainText("PAPER / FAKE");
  await expect(page.getByTestId("paper-overview-readiness")).toContainText("BLOCKED");
  await expect(page.getByTestId("paper-overview-scheduler")).toContainText("STOPPED");
  await expect(page.getByTestId("paper-overview-data-age")).toContainText("未读取行情");
  await expect(page.getByTestId("paper-overview-observations")).toContainText("0/20 · WAITING");
  await expect(page.getByTestId("paper-overview-unverified-days")).toHaveText("10 / 10");
  await expect(page.getByTestId("paper-overview-execution-gate")).toContainText("PAUSED · QUOTE_SOURCE_NOT_AUTHORIZED");
  await expect(page.getByTestId(`paper-alert-${incident.incidentId}`)).toContainText("COLLECTION_RUN_FAILED");
  const acknowledgeResponse = integration ? page.waitForResponse((response) => response.url().includes(`/alerts/${incidentId}/acknowledge`) && response.request().method() === "POST") : undefined;
  await page.getByTestId(`paper-alert-${incident.incidentId}`).getByRole("button", { name: "确认告警" }).click();
  if (acknowledgeResponse) expect((await acknowledgeResponse).status()).toBe(200);
  await expect(page.getByTestId(`paper-alert-${incident.incidentId}`)).toContainText(`已由 ${ownerId} 确认`);
  await page.getByTestId("paper-overview-refresh").click();
  await expect(page.getByTestId("paper-overview-readiness")).toContainText("BLOCKED");
  expect(writes).toHaveLength(1);
  expect(writes[0]).toContain("POST ");
  expect(writes[0]).toContain(`/alerts/${incidentId}/acknowledge`);
  expect(quoteRequests).toEqual([]);
});
