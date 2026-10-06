import { expect, test } from "@playwright/test";

test("V3.2 readiness page persists and rereads the same WAITING TestRun without business side effects", async ({ page }) => {
  const id = "123e4567-e89b-42d3-a456-426614174013";
  let stored: Record<string, unknown> | null = null;
  await page.route("**/api/v1/acceptance/v3/v3.2/runs", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ scenarioId: "normal", seed: 20260907 });
    stored = { testRunId: id, stageId: "V3.2", scenarioId: "normal", scenarioVersion: "v3.2-readiness-v1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.2_BUSINESS_WORKFLOW", status: "NOT_RUN" }], evidence: { readiness: "WAITING", sourceMode: "READINESS_ONLY", candidateExecution: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED", paperCalls: 0, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } };
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, ...stored }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.2/runs/${id}`, async (route) => {
    expect(route.request().method()).toBe("GET");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(stored) });
  });
  await page.goto("/acceptance/v3/v3.2");
  await page.getByTestId("v32-readiness-normal").click();
  await expect(page.getByTestId("v32-readiness-result")).toContainText(id);
  await expect(page.getByTestId("v32-readiness-result")).toContainText("WAITING");
  await expect(page.getByTestId("v32-readiness-result")).toContainText("READINESS_ONLY");
  await expect(page.getByTestId("v32-readiness-result")).toContainText("NOT_PERFORMED");
});

test("V3.2 page reads immutable evidence and keeps missing validation/report state explicit", async ({ page }) => {
  const id = "123e4567-e89b-42d3-a456-426614174010";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.2/promotions/${id}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    request: { schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: id, status: "AWAITING_INDEPENDENT_VALIDATION", createdAt: "2026-09-27T00:00:00.000Z", request: {
      schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: id, testRunId: "123e4567-e89b-42d3-a456-426614174011", experimentId: "123e4567-e89b-42d3-a456-426614174012", candidateSource: "FIXTURE", candidateArtifact: { artifactId: "candidate", namespace: "research/run/exp/outputs", sha256: "a".repeat(64) }, codeSha256: "b".repeat(64), dataManifestSha256: "c".repeat(64), metricsManifestSha256: "d".repeat(64), validationPlanSha256: "e".repeat(64), budget: {}, idempotencyKey: "test-key-1234", decision: null,
    } }, validationReport: null, registryMutation: "NOT_PERFORMED", activation: "DISABLED_UNTIL_MANDATE" }) }));
  await page.goto("/acceptance/v3/v3.2");
  await expect(page.getByRole("heading", { name: "V3.2 候选验证记录" })).toBeVisible();
  await page.getByLabel("PromotionRequest UUID").fill(id);
  await page.getByRole("button", { name: "读取记录" }).click();
  await expect(page.getByText("FIXTURE", { exact: false })).toBeVisible();
  await expect(page.getByTestId("v32-validation-status")).toHaveText("NOT_RUN：Quant 尚无持久化验证报告");
  await expect(page.getByText("NOT_PERFORMED", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /批准|晋级|激活/ })).toHaveCount(0);
});

test("V3.2 owner action submits only the selected V3.1 TestRun and reports gate blockers", async ({ page }) => {
  const runId = "123e4567-e89b-42d3-a456-426614174099";
  await page.addInitScript((value) => localStorage.setItem("stockquant:v31:testRunId", value), runId);
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.2/runs/${runId}/promotion-submission`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ confirmation: "SUBMIT_V32_PROMOTION_REQUEST" });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ status: "WAITING", testRunId: runId, ownerId: "acceptance-owner-1", humanAcceptance: "NOT_CHANGED", blockers: ["V3.1 acceptance is required"] }) });
  });
  await page.goto("/acceptance/v3/v3.2");
  await expect(page.getByLabel("V3.1 TestRun UUID")).toHaveValue(runId);
  await page.getByTestId("v32-submit-promotion").click();
  await expect(page.getByTestId("v32-submit-status")).toHaveText("提交状态：WAITING");
  await expect(page.getByText("V3.1 acceptance is required")).toBeVisible();
  await expect(page.getByText("人工验收记录：NOT_CHANGED")).toBeVisible();
});

test("V3.2 approval is an explicit exact-version action and reports the disabled Registry result", async ({ page }) => {
  const id = "123e4567-e89b-42d3-a456-426614174030";
  const testRunId = "123e4567-e89b-42d3-a456-426614174031";
  const reportFingerprint = "f".repeat(64);
  let decided = false;
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.2/promotions/${id}/decision`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ decision: "APPROVE", confirmation: "REVIEW_EXACT_PROMOTION_VERSION" });
    decided = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.2-user-promotion-decision-result-v1", testRunId, decision: { schemaVersion: "v3.2-promotion-decision-result-v1", promotionRequestId: id, decision: "APPROVE", reportFingerprint, versionFingerprint: "a".repeat(64), actorId: "acceptance-owner-1", registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE", createdAt: "2026-09-27T00:00:00.000Z", idempotent: false } }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.2/promotions/${id}`, async (route) => {
    const request = { schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: id, status: decided ? "CANDIDATE_APPROVED" : "AWAITING_REVIEW", createdAt: "2026-09-27T00:00:00.000Z", decision: decided ? { decision: "APPROVE", reportFingerprint, versionFingerprint: "a".repeat(64), actorId: "acceptance-owner-1", registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" } : null, request: { schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: id, testRunId, experimentId: "123e4567-e89b-42d3-a456-426614174032", candidateSource: "FIXTURE", candidateArtifact: { artifactId: "candidate", namespace: `research/${testRunId}/123e4567-e89b-42d3-a456-426614174032/outputs`, sha256: "1".repeat(64) }, codeSha256: "2".repeat(64), dataManifestSha256: "3".repeat(64), metricsManifestSha256: "4".repeat(64), validationPlanSha256: "5".repeat(64), budget: {}, idempotencyKey: "test-key-5678" } };
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ request, validationReport: { reportFingerprint, report: { disposition: "ELIGIBLE_FOR_REVIEW", checks: [] } }, registryMutation: decided ? "CANDIDATE_APPROVED" : "NOT_PERFORMED", activation: "DISABLED_UNTIL_MANDATE" }) });
  });
  await page.goto("/acceptance/v3/v3.2");
  await page.getByLabel("PromotionRequest UUID").fill(id);
  await page.getByRole("button", { name: "读取记录" }).click();
  await page.getByTestId("v32-approve-version").click();
  await expect(page.getByTestId("v32-decision-result")).toContainText("APPROVE");
  await expect(page.getByTestId("v32-registry-decision")).toContainText("DISABLED_UNTIL_MANDATE");
  await expect(page.getByTestId("v32-approve-version")).toHaveCount(0);
});

test("V3.2 owner can request an exact candidate-to-Mandate binding check without activation", async ({ page }) => {
  const id = "123e4567-e89b-42d3-a456-426614174040";
  const testRunId = "123e4567-e89b-42d3-a456-426614174041";
  const mandateId = "123e4567-e89b-42d3-a456-426614174042";
  const accountId = "123e4567-e89b-42d3-a456-426614174043";
  const fingerprint = "a".repeat(64);
  const candidateArtifact = { artifactId: "candidate-exact", namespace: `research/${testRunId}/outputs`, sha256: "b".repeat(64) };
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.2/promotions/${id}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    request: { schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: id, status: "CANDIDATE_APPROVED", createdAt: "2026-09-27T00:00:00.000Z", decision: { decision: "APPROVE", versionFingerprint: fingerprint, registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" }, request: { schemaVersion: "v3.2-promotion-request-v1", promotionRequestId: id, testRunId, experimentId: "123e4567-e89b-42d3-a456-426614174044", candidateSource: "FIXTURE", candidateArtifact, codeSha256: "c".repeat(64), dataManifestSha256: "d".repeat(64), metricsManifestSha256: "e".repeat(64), validationPlanSha256: "f".repeat(64) } }, validationReport: null, registryMutation: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.2/candidate-mandate-binding", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ schemaVersion: "v3.2-candidate-mandate-binding-command-v1", mandateId, testRunId, ownerId: "acceptance-owner-1", accountId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", strategyVersion: fingerprint, candidateArtifact });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.2-candidate-mandate-binding-result-v1", status: "EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW", reason: "APPROVED_VERSION_AND_CANDIDATE_ARTIFACT_MATCH", mandateId, testRunId, ownerId: "acceptance-owner-1", accountId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", versionFingerprint: fingerprint, registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE", promotionRequestId: id, accountValidation: "NOT_PERFORMED", mandatePersistence: "NOT_PERFORMED" }) });
  });
  await page.goto("/acceptance/v3/v3.2");
  await page.getByLabel("PromotionRequest UUID").fill(id);
  await page.getByRole("button", { name: "读取记录" }).click();
  await page.getByLabel("拟议 Mandate UUID").fill(mandateId);
  await page.getByLabel("拟议模拟账户 UUID").fill(accountId);
  await page.getByTestId("v32-check-mandate-binding").click();
  await expect(page.getByTestId("v32-mandate-binding-result")).toContainText("EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW");
  await expect(page.getByTestId("v32-mandate-binding-result")).toContainText("账户验证：NOT_PERFORMED");
  await expect(page.getByTestId("v32-mandate-binding-result")).toContainText("Mandate 持久化：NOT_PERFORMED");
  await expect(page.getByTestId("v32-mandate-binding-result")).toContainText("策略激活：DISABLED_UNTIL_MANDATE");
});
