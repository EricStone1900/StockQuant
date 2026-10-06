import { expect, test } from "@playwright/test";

test("V3.3 rejection action persists the budget-cap no-side-effect assertion on its TestRun", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174097";
  let verified = false;
  const run = () => ({ testRunId, stageId: "V3.3", scenarioId: "rejection", scenarioVersion: "v3.3-readiness-v1", status: verified ? "RUNNING" : "WAITING", seed: 20260907, assertions: verified ? [{ id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "PASS" }] : [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { workflowStep: verified ? "REJECTION_ASSERTION_VERIFIED" : "TEST_RUN_BUDGET_BOUND", businessValidation: verified ? "PASS" : "NOT_RUN", testRunBudget: { testRunId, budgetCents: 50, status: "CONFIGURED" }, rejectionAssertion: verified ? { result: "PASS", noExperiment: true, noModelCalls: true, noRunnerJobs: true } : undefined, runnerJobsCreated: 0, externalModelCalls: 0 } });
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.3/runs", (route) => route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, ...run() }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(run()) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/queue/cursor?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: null, nextAfterCursor: null, limit: 25, jobs: [], hasMore: false }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 25, rows: [], hasMore: false, coverage: { jobsOnPage: 0, experimentsOnPage: 0, budgetsFound: 0, budgetsMissing: 0 }, note: "no jobs" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget/summary?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 25, afterCursor: null, nextAfterCursor: null, rows: [], hasMore: false, totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/verify-rejection`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" });
    verified = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-rejection-verify-result-v1", testRunId, status: "RUNNING", idempotent: false, assertion: { id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "PASS" }, evidence: { result: "PASS", noExperiment: true, noModelCalls: true, noRunnerJobs: true } }) });
  });
  await page.goto("/acceptance/v3/v3.3");
  await page.getByTestId("v33-create-rejection").click();
  await expect(page.getByRole("heading", { name: "rejection · WAITING" })).toBeVisible();
  await page.getByTestId("v33-verify-rejection").click();
  await expect(page.getByRole("heading", { name: "rejection · RUNNING" })).toBeVisible();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"workflowStep": "REJECTION_ASSERTION_VERIFIED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"noModelCalls": true');
});

test("V3.3 page reads and paginates only the supplied existing queue", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174099";
  const cursors: Array<string | null> = [];
  const budgetOffsets: string[] = [];
  const summaryCursors: Array<string | null> = [];
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
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget/summary?*`, async (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("afterCursor");
    summaryCursors.push(cursor);
    const firstPage = cursor === null;
    const nextCursor = Buffer.from(JSON.stringify({ createdAt: "2026-09-27T01:00:00.000000Z", experimentId: "123e4567-e89b-42d3-a456-426614174001" })).toString("base64url");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 25, afterCursor: cursor, nextAfterCursor: firstPage ? nextCursor : null, hasMore: firstPage, rows: firstPage ? [{ experimentId: "123e4567-e89b-42d3-a456-426614174001", rounds: 2, requestedCents: 77, reservedCents: 77, roundBudget: [{ roundIndex: 1, allocatedCents: 39, usedCents: 40, unknownReservedCents: 30 }, { roundIndex: 2, allocatedCents: 38, usedCents: 7, unknownReservedCents: 0 }], status: "RESERVED", settledCents: 23, unknownReservedCents: 30, modelCallCount: 2 }] : [], totals: firstPage ? { experiments: 1, requestedCents: 77, reservedCents: 77, settledCents: 23, unknownReservedCents: 30, modelCallCount: 2 } : null, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }) });
  });
  await page.goto("/acceptance/v3/v3.3");
  await expect(page.getByRole("heading", { name: "V3.3 研究队列与预算证据" })).toBeVisible();
  await expect(page.getByTestId("v33-readiness-status")).toHaveText("PERSISTED_WAITING_WITH_SCENARIO_PROGRESS");
  await expect(page.getByTestId("v33-business-status")).toHaveText("TWO_ROUND_EXECUTION_SETTLEMENT_AND_NORMAL_RECOVERY_REJECTION_ASSERTIONS_VERIFIED");
  await expect(page.getByTestId("v33-stage-budget-status")).toHaveText("TEST_RUN_AND_ROUND_CAP_ENFORCED");
  await expect(page.getByTestId("v33-paper-status")).toHaveText("NOT_CHECKED");
  await expect(page.getByTestId("v33-budget-status")).toHaveText("OWNER_SCOPED_LEDGER_READ_ONLY");
  await page.getByLabel("V3.3 TestRun UUID").fill(testRunId);
  await page.getByTestId("v33-read-queue").click();
  await expect(page.getByText("QUEUED", { exact: true })).toBeVisible();
  await expect(page.getByTestId("v33-budget-evidence")).toContainText('"unknownReservedCents": 30');
  await page.getByText("查看TestRun预算总账原始证据").click();
  await expect(page.getByTestId("v33-test-run-budget-evidence")).toContainText('"modelCallCount": 2');
  await expect(page.getByRole("cell", { name: "R1: 40/39（UNKNOWN 30） · R2: 7/38" })).toBeVisible();
  await expect(page.getByTestId("v33-test-run-budget-scope")).toContainText("stage budget control: TEST_RUN_AND_ROUND_CAP_ENFORCED");
  await page.getByTestId("v33-summary-next-page").click();
  await expect(page.getByTestId("v33-test-run-budget-evidence")).toContainText('"totals": null');
  await expect(page.getByText(/1 个实验 · 申请 77 cents/)).toBeVisible();
  await page.getByTestId("v33-next-page").click();
  await expect(page.getByTestId("v33-queue-empty")).toBeVisible();
  expect(cursors).toEqual([null, expect.any(String)]);
  expect(budgetOffsets).toEqual(["0", "25"]);
  expect(summaryCursors).toEqual([null, expect.any(String)]);
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

test("V3.3 scenario reserves and explicitly dispatches both Fixture rounds on the same TestRun", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174098";
  const record = { testRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", testRunBudget: { schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId, budgetCents: 100, status: "CONFIGURED" }, blockers: [{ id: "V3.1_ACCEPTANCE", status: "NOT_VERIFIED" }, { id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED" }], runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED", paperContinuityPreflight: { schemaVersion: "v3.3-paper-continuity-preflight-v1", capturedAt: "2026-10-03T04:00:00.000Z", status: "NOT_VERIFIED", preflightStatus: "BLOCKED", scheduler: { status: "STOPPED", mode: "PAPER", brokerMode: "FAKE", samplingIntervalMinutes: 30, lastSampleAt: null, nextSampleAt: null, tickCount: 0, fresh: false, nextSampleScheduled: false }, observation: null, blockers: ["PAPER_SCHEDULER_NOT_FRESH_AND_SCHEDULED", "O2_OBSERVATION_NOT_QUALIFIED_20_OF_20"], acceptanceRequirement: "Run a measured concurrent research-load Paper test." } } };
  let created = 0;
  let cancelled = false;
  let dispatched = false;
  let reconciled = false;
  let recoveryVerified = false;
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.3/runs", async (route) => {
    created += 1;
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ scenarioId: "recovery", seed: 20260907 });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(record) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(cancelled ? { ...record, status: "CANCELLED", evidence: { ...record.evidence, readiness: "CANCELLED", cancellation: { scope: "READINESS_ONLY", cancelledAt: "2026-10-06T01:00:00.000Z", runnerJobsCancelled: 0 } } } : recoveryVerified ? { ...record, status: "RUNNING", assertions: [{ id: "V3.3_CHECKPOINT_RECOVERY_001", status: "PASS" }], evidence: { ...record.evidence, workflowStep: "RECOVERY_ASSERTION_VERIFIED", businessValidation: "PASS", recoveryAssertion: { result: "PASS", roundIndex: 1 } } } : reconciled ? { ...record, status: "RUNNING", evidence: { ...record.evidence, workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", runnerDispatch: "COMPLETED", runnerExecution: "COMPLETED", completedRounds: [{ roundIndex: 1, jobId: "job-1", artifacts: [{ sha256: "a".repeat(64) }] }, { roundIndex: 2, jobId: "job-2", artifacts: [{ sha256: "b".repeat(64) }] }], businessWorkflow: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", experimentSettlement: "VERIFIED_FIXTURE_LEDGER", experimentSettlementEvidence: { experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", requestedCents: 80, settledCents: 46, modelCallCount: 2, rounds: [{ roundIndex: 1, allocatedCents: 40, settledCents: 23 }, { roundIndex: 2, allocatedCents: 40, settledCents: 23 }] }, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } } : dispatched ? { ...record, status: "RUNNING", evidence: { ...record.evidence, workflowStep: "RUNNER_JOBS_QUEUED", runnerJobsCreated: 2, runnerDispatch: "QUEUED", runnerJobIds: [`${testRunId}:experiment:round-1`, `${testRunId}:experiment:round-2`] } } : record) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/cancel`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ confirmation: "CANCEL_V33_READINESS_RUN" });
    cancelled = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ testRunId, stageId: "V3.3", status: "CANCELLED", idempotent: false, evidence: { ...record.evidence, readiness: "CANCELLED", cancellation: { scope: "READINESS_ONLY", cancelledAt: "2026-10-06T01:00:00.000Z", runnerJobsCancelled: 0 } } }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/experiment`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" });
    const experiment = { experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", testRunId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCurrency: "USD", budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE", status: "PENDING_PREREQUISITES", budget: { experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", requestedCents: 80, reservedCents: 80, spentCents: 0, status: "RESERVED" } };
    record.evidence.workflowStep = "EXPERIMENT_RESERVED";
    record.evidence.experiment = experiment;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-scenario-experiment-result-v1", testRunId, status: "WAITING", idempotent: false, experiment }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/dispatch`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" });
    dispatched = true;
    record.evidence.workflowStep = "RUNNER_JOBS_QUEUED";
    record.evidence.runnerJobsCreated = 2;
    record.evidence.runnerDispatch = "QUEUED";
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-scenario-dispatch-result-v1", testRunId, status: "RUNNING", workflowStep: "RUNNER_JOBS_QUEUED", idempotent: false, runnerJobsCreated: 2, runnerJobIds: [`${testRunId}:experiment:round-1`, `${testRunId}:experiment:round-2`], rounds: [{ roundIndex: 1 }, { roundIndex: 2 }], externalModelCalls: 0 }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/reconcile`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" });
    reconciled = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-scenario-reconcile-result-v1", testRunId, status: "RUNNING", workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", completedRounds: 2, rounds: [{ roundIndex: 1 }, { roundIndex: 2 }], experimentSettlement: "VERIFIED_FIXTURE_LEDGER", settlement: { experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", requestedCents: 80, settledCents: 46, modelCallCount: 2, rounds: [{ roundIndex: 1, allocatedCents: 40, settledCents: 23 }, { roundIndex: 2, allocatedCents: 40, settledCents: 23 }] }, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/verify-recovery`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" });
    recoveryVerified = true;
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-recovery-verify-result-v1", testRunId, status: "RUNNING", idempotent: false, assertion: { id: "V3.3_CHECKPOINT_RECOVERY_001", status: "PASS" }, evidence: { result: "PASS", roundIndex: 1 } }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/queue/cursor?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: null, nextAfterCursor: null, limit: 25, jobs: [], hasMore: false }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 25, afterCursor: null, nextAfterCursor: null, rows: [], hasMore: false, coverage: { jobsOnPage: 0, experimentsOnPage: 0, budgetsFound: 0, budgetsMissing: 0 }, note: "no jobs" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget/summary?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 25, afterCursor: null, nextAfterCursor: null, rows: [], hasMore: false, totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }) }));
  await page.goto("/acceptance/v3/v3.3");
  await expect(page.getByTestId("v33-readiness-status")).toHaveText("PERSISTED_WAITING_WITH_SCENARIO_PROGRESS");
  await expect(page.getByTestId("v33-business-status")).toHaveText("TWO_ROUND_EXECUTION_SETTLEMENT_AND_NORMAL_RECOVERY_REJECTION_ASSERTIONS_VERIFIED");
  await page.getByTestId("v33-create-recovery").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"runnerJobsCreated": 0');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"budgetCents": 100');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"status": "NOT_VERIFIED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"preflightStatus": "BLOCKED"');
  await page.getByTestId("v33-reserve-experiment").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"workflowStep": "EXPERIMENT_RESERVED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"reservedCents": 80');
  await expect(page.getByTestId("v33-queue-empty")).toBeVisible();
  await expect(page.getByRole("heading", { name: "recovery · WAITING" })).toBeVisible();
  await expect(page.getByTestId("v33-cancel-readiness")).toHaveCount(0);
  await page.getByTestId("v33-dispatch-runner").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"workflowStep": "RUNNER_JOBS_QUEUED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"runnerJobsCreated": 2');
  await expect(page.getByRole("heading", { name: "recovery · RUNNING" })).toBeVisible();
  await page.getByTestId("v33-reconcile-runner-results").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"workflowStep": "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"businessWorkflow": "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"experimentSettlement": "VERIFIED_FIXTURE_LEDGER"');
  await expect(page.getByRole("heading", { name: "recovery · RUNNING" })).toBeVisible();
  await page.getByTestId("v33-verify-recovery").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText("RECOVERY_ASSERTION_VERIFIED");
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText("recoveryAssertion");
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"businessValidation": "PASS"');
  expect(recoveryVerified).toBe(true);
  expect(created).toBe(1);
});

test("V3.3 normal scenario verifies and persists same-TestRun output and ledger assertions", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174097";
  const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
  let step = "TEST_RUN_BUDGET_BOUND";
  const record = () => ({ testRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", status: step === "TEST_RUN_BUDGET_BOUND" || step === "EXPERIMENT_RESERVED" ? "WAITING" : "RUNNING", seed: 20260907, assertions: step === "NORMAL_ASSERTION_VERIFIED" ? [{ id: "V3.3_NORMAL_RESULTS_001", status: "PASS" }] : [], evidence: { readiness: "WAITING", workflowStep: step, businessValidation: step === "NORMAL_ASSERTION_VERIFIED" ? "PASS" : "NOT_RUN", testRunBudget: { schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId, budgetCents: 100, status: "CONFIGURED" }, experiment: { experimentId, testRunId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCents: 80, status: "PENDING_PREREQUISITES", budget: { status: "RESERVED" } }, runnerJobsCreated: step === "RUNNER_JOBS_QUEUED" || step === "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" || step === "NORMAL_ASSERTION_VERIFIED" ? 2 : 0, runnerJobIds: ["job-1", "job-2"], completedRounds: step === "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" || step === "NORMAL_ASSERTION_VERIFIED" ? [{ roundIndex: 1 }, { roundIndex: 2 }] : [], experimentSettlement: step === "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" || step === "NORMAL_ASSERTION_VERIFIED" ? "VERIFIED_FIXTURE_LEDGER" : "NOT_RUN", humanAcceptance: "NOT_RUN" } });
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v3/v3.3/runs", async (route) => {
    expect(await route.request().postDataJSON()).toEqual({ scenarioId: "normal", seed: 20260907 });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify(record()) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(record()) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/experiment`, async (route) => { step = "EXPERIMENT_RESERVED"; await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ testRunId, status: "WAITING", experiment: record().evidence.experiment }) }); });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/dispatch`, async (route) => { step = "RUNNER_JOBS_QUEUED"; await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ testRunId, status: "RUNNING", runnerJobsCreated: 2, runnerJobIds: ["job-1", "job-2"] }) }); });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/reconcile`, async (route) => { step = "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED"; await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ testRunId, completedRounds: 2, experimentSettlement: "VERIFIED_FIXTURE_LEDGER" }) }); });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/verify-normal`, async (route) => {
    expect(await route.request().postDataJSON()).toEqual({ schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS" });
    step = "NORMAL_ASSERTION_VERIFIED";
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-normal-verify-result-v1", testRunId, status: "RUNNING", idempotent: false, assertion: { id: "V3.3_NORMAL_RESULTS_001", status: "PASS" }, evidence: { result: "PASS" } }) });
  });
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/queue/cursor?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: null, nextAfterCursor: null, limit: 25, jobs: [], hasMore: false }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 25, afterCursor: null, nextAfterCursor: null, rows: [], hasMore: false, coverage: { jobsOnPage: 0, experimentsOnPage: 0, budgetsFound: 0, budgetsMissing: 0 }, note: "no jobs" }) }));
  await page.route(`**/api/v1/acceptance/v3/v3.3/runs/${testRunId}/research/budget/summary?*`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 25, afterCursor: null, nextAfterCursor: null, rows: [], hasMore: false, totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }) }));
  await page.goto("/acceptance/v3/v3.3");
  await page.getByTestId("v33-create-normal").click();
  await page.getByTestId("v33-reserve-experiment").click();
  await page.getByTestId("v33-dispatch-runner").click();
  await page.getByTestId("v33-reconcile-runner-results").click();
  await page.getByTestId("v33-verify-normal").click();
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"workflowStep": "NORMAL_ASSERTION_VERIFIED"');
  await expect(page.getByTestId("v33-readiness-evidence")).toContainText('"businessValidation": "PASS"');
  expect(step).toBe("NORMAL_ASSERTION_VERIFIED");
});
