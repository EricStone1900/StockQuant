import { expect, test } from "@playwright/test";

test("V3.1 preparation page exposes bounded scenarios", async ({ page }) => {
  const ids: Record<string, string> = { normal: "123e4567-e89b-42d3-a456-426614174101", rejection: "123e4567-e89b-42d3-a456-426614174102", recovery: "123e4567-e89b-42d3-a456-426614174103" };
  let selected = "normal";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.1/runs", async (route) => { selected = route.request().postDataJSON().scenarioId; await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ testRunId: ids[selected] }) }); });
  await page.route(/\/api\/v1\/acceptance\/v3\/v3\.1\/runs\/[0-9a-f-]+$/, (route) => {
    const recovery = selected === "recovery";
    const rejection = selected === "rejection";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      testRunId: ids[selected], scenarioId: selected, status: "COMPLETED", namespace: `v3-1-${selected}`, assertions: [{ assertionId: recovery ? "V3.1-PREP-RECOVERY-001" : rejection ? "V3.1-PREP-REJECTION-001" : "V3.1-PREP-CHAIN-001", status: "PASS", expected: "fixed evidence", actual: recovery ? { status: "CANCELLED" } : rejection ? { status: 422, message: "LIVE rejected with 422", error: "brokerMode must be FAKE" } : "PENDING_PREREQUISITES" }],
      evidence: { environmentMode: "RESEARCH", brokerMode: "FAKE", modelCalls: "NOT_RUN", experiment: { status: recovery ? "CANCELLED" : "PENDING_PREREQUISITES", readiness: { status: "PENDING_PREREQUISITES" } }, orchestration: { chainStatus: "PENDING_PREREQUISITES", inputRef: { status: "PUBLISHED" }, runnerJob: { status: "QUEUED", execution: "NOT_STARTED", prerequisiteStatus: "PENDING_PREREQUISITES" } } },
    }) });
  });
  await page.route(/\/api\/v1\/acceptance\/v3\/v3\.1\/runs\/[0-9a-f-]+\/promotion-gate$/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.1-promotion-gate-v1", testRunId: ids[selected], stageStatus: "NOT_RUN", humanAcceptance: "NOT_RUN", evidenceSha256: "a".repeat(64) }) }));
  await page.goto("/acceptance/v3/v3.1");
  await expect(page.getByRole("heading", { name: "V3.1 研究实验编排准备" })).toBeVisible();
  const normal = page.getByRole("button", { name: "运行正常前置检查" });
  const rejection = page.getByRole("button", { name: "运行 LIVE 拒绝" });
  const recovery = page.getByRole("button", { name: "运行取消与幂等恢复" });
  await expect(normal).toBeVisible();
  await expect(rejection).toBeVisible();
  await expect(recovery).toBeVisible();

  const evidence = page.getByTestId("v31-evidence");
  await normal.click();
  await expect(evidence).toContainText("PENDING_PREREQUISITES");
  await expect(evidence).toContainText("V3.1-PREP-CHAIN-001");
  await expect(evidence).toContainText("PUBLISHED");
  await expect(page.getByTestId("v31-experiment-status")).toHaveText("PENDING_PREREQUISITES");
  await expect(page.getByTestId("v31-artifact-status")).toHaveText("PUBLISHED");
  await expect(page.getByTestId("v31-runner-status")).toHaveText("QUEUED");
  await expect(page.getByTestId("v31-execution-status")).toHaveText("NOT_STARTED");
  await expect(page.getByTestId("v31-prerequisite-status")).toHaveText("PENDING_PREREQUISITES");
  const runId = await page.getByTestId("v31-test-run-id").textContent();
  await page.getByTestId("v31-refresh").click();
  await expect(page.getByTestId("v31-test-run-id")).toHaveText(runId ?? "");
  await rejection.click();
  await expect(evidence).toContainText("LIVE rejected with 422");
  await recovery.click();
  await expect(evidence).toContainText("CANCELLED");
});

test("V3.1 Artifact control reads only the current run's published input", async ({ page }) => {
  const runId = "123e4567-e89b-42d3-a456-426614174000";
  const artifactId = "a".repeat(64);
  const bytes = JSON.stringify({ fixture: "v3.1-input" });
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.1/runs", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ testRunId: runId }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ testRunId: runId, scenarioId: "normal", status: "COMPLETED", namespace: `v3-1-normal-${runId}`, accountId: null, error: null, assertions: [], evidence: { orchestration: { inputRef: { artifactId, kind: "INPUT", namespace: `research/${runId}/exp/inputs`, sha256: artifactId, status: "PUBLISHED" }, runnerJob: { status: "QUEUED", job: { testRunId: runId, experimentId: "exp", imageDigest: `sha256:${"b".repeat(64)}`, networkPolicy: { mode: "DENY" } } } } } }) }));
  let requestedArtifactUrl = "";
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}/artifacts/${artifactId}`, (route) => { requestedArtifactUrl = route.request().url(); return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ref: { artifactId, sha256: artifactId, namespace: `research/${runId}/exp/inputs` }, contentBase64: Buffer.from(bytes).toString("base64") }) }); });
  await page.goto("/acceptance/v3/v3.1");
  await page.getByRole("button", { name: "运行正常前置检查" }).click();
  await page.getByTestId("v31-read-artifact").click();
  await expect(page.getByTestId("v31-artifact-read-hash")).toContainText(artifactId);
  await expect(page.getByTestId("v31-artifact-download")).toHaveAttribute("download", `${artifactId}.json`);
  expect(requestedArtifactUrl).toContain(`/runs/${runId}/artifacts/${artifactId}`);
});

test("V3.1 fixed Fixture pipeline is explicit and exposes verified output metrics", async ({ page }) => {
  const runId = "123e4567-e89b-42d3-a456-426614174001";
  const experimentId = "123e4567-e89b-42d3-a456-426614174002";
  const outputId = "c".repeat(64);
  const outputBytes = JSON.stringify({ fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12 });
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.1/preview", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ fixedPipelineAvailable: true, modelCalls: "NOT_RUN" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.1/runs", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ testRunId: runId, status: "WAITING" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
    testRunId: runId, scenarioId: "fixed-pipeline", status: "COMPLETED", namespace: `v3-1-fixed-pipeline-${runId}`, assertions: [],
    evidence: {
      experiment: { experimentId, status: "PENDING_PREREQUISITES" },
      orchestration: {
        modelCall: { providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", actualCostCents: 23 },
        budget: { status: "SETTLED", spentCents: 23 },
        inputRef: { artifactId: "a".repeat(64), kind: "INPUT", namespace: `research/${runId}/${experimentId}/inputs`, sha256: "a".repeat(64), status: "PUBLISHED" },
        runnerJob: { jobId: `${runId}:${experimentId}`, status: "COMPLETED", execution: { status: "COMPLETED" }, artifacts: [{ artifactId: outputId, kind: "OUTPUT", namespace: `research/${runId}/${experimentId}/outputs`, sha256: outputId, status: "PUBLISHED" }], job: { testRunId: runId, experimentId, imageDigest: `sha256:${"b".repeat(64)}`, networkPolicy: { mode: "DENY" } } },
      },
    },
  }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}/artifacts/${outputId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ref: { artifactId: outputId, sha256: outputId, namespace: `research/${runId}/${experimentId}/outputs` }, contentBase64: Buffer.from(outputBytes).toString("base64") }) }));
  await page.goto("/acceptance/v3/v3.1");
  await page.getByRole("button", { name: "查看 V3.1 准备状态" }).click();
  await expect(page.getByTestId("v31-fixed-pipeline-available")).toBeVisible();
  await page.getByTestId("v31-run-fixed-pipeline").click();
  await expect(page.getByTestId("v31-model-provider")).toHaveText("FIXTURE / NO_EXTERNAL_CALL");
  await expect(page.getByTestId("v31-budget-state")).toHaveText("23 cents / SETTLED");
  await page.getByTestId("v31-read-output-artifact").click();
  await expect(page.getByTestId("v31-output-metrics")).toContainText('"bars": 6');
  await expect(page.getByTestId("v31-output-artifact-download")).toHaveAttribute("download", `${outputId}.json`);
});

test("V3.1 exact-run human acceptance is available only after the authoritative gate passes", async ({ page }) => {
  const runId = "123e4567-e89b-42d3-a456-426614174099";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.1/runs", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ testRunId: runId }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ testRunId: runId, scenarioId: "normal", status: "COMPLETED", namespace: "v3-1-normal", assertions: [], evidence: { experiment: { experimentId: "123e4567-e89b-42d3-a456-426614174098" } } }) }));
  let accepted = false;
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}/promotion-gate`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.1-promotion-gate-v1", testRunId: runId, stageStatus: "PASS", humanAcceptance: accepted ? "ACCEPTED" : "NOT_RUN", evidenceSha256: "a".repeat(64) }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.1/runs/${runId}/acceptance`, async (route) => { accepted = true; const body = route.request().postDataJSON(); expect(body.confirmation).toBe("ACCEPT_EXACT_V31_RUN"); expect(body.note).toBe("I accept this run"); await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ status: "ACCEPTED" }) }); });
  await page.goto("/acceptance/v3/v3.1");
  await page.getByRole("button", { name: "运行正常前置检查" }).click();
  await expect(page.getByTestId("v31-promotion-stage-status")).toHaveText("阶段证据：PASS");
  await page.getByLabel("V3.1 验收说明").fill("I accept this run");
  await page.getByTestId("v31-accept-exact-run").click();
  await expect(page.getByTestId("v31-human-acceptance-status")).toHaveText("人工接受：ACCEPTED");
});
