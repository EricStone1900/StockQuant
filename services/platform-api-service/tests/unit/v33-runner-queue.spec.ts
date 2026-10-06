import { afterEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { V33AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V3.3 owner-scoped Research queue proxy", () => {
  const platformToken = "p".repeat(40);
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

  it("verifies and persists the same TestRun checkpoint recovery from durable history and resumed metrics", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const checkpointHash = (cursor: number) => createHash("sha256").update(JSON.stringify({ cursor })).digest("hex");
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "recovery", ownerId: "acceptance-owner-1", status: "RUNNING", assertions: [], evidence: { workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", experiment: { testRunId, experimentId, rounds: 2 }, dispatchedRounds: [{ roundIndex: 1, jobId: "job-1" }], completedRounds: [{ roundIndex: 1, artifacts: [{ metrics: { bars: 6, fixtureId: "v3.1-research-small-sample-1", qlibVersion: "0.9.6.99", recovery: { resumedFromSequence: 1, checkpointSequence: 2, cursor: 2 } } }] }] } };
    const transitions: any[] = [];
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { transitions.push(input); stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence }; return stored; }) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-checkpoint-history-v1", testRunId, experimentId, roundIndex: 1, checkpoints: [1, 2].map((sequence) => ({ schemaVersion: "v3.3-research-checkpoint-v1", testRunId, experimentId, roundIndex: 1, sequence, state: { cursor: sequence }, stateSha256: checkpointHash(sequence), createdAt: `2026-10-06T01:0${sequence}:00.000Z` })) }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.verifyCheckpointRecovery("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" });
    expect(result).toMatchObject({ schemaVersion: "v3.3-recovery-verify-result-v1", testRunId, status: "RUNNING", assertion: { id: "V3.3_CHECKPOINT_RECOVERY_001", status: "PASS" }, evidence: { result: "PASS", roundIndex: 1 } });
    expect(stored.evidence.workflowStep).toBe("RECOVERY_ASSERTION_VERIFIED");
    expect(stored.evidence.businessValidation).toBe("PASS");
    expect(stored.assertions).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.3_EXECUTOR", status: "PASS" }), expect.objectContaining({ id: "V3.3_CHECKPOINT_RECOVERY_001", status: "PASS" })]));
    expect(transitions).toHaveLength(1);
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/checkpoints?testRunId=${testRunId}&experimentId=${experimentId}&roundIndex=1`);
    await expect(controller.verifyCheckpointRecovery("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" })).resolves.toMatchObject({ idempotent: true });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("independently verifies and persists both normal Fixture outputs and the settled TestRun ledger", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const contentBase64 = Buffer.from(JSON.stringify({ fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12 })).toString("base64");
    const sha256 = createHash("sha256").update(Buffer.from(contentBase64, "base64")).digest("hex");
    const namespace = `research/${testRunId}/${experimentId}/outputs`;
    const jobs = [1, 2].map((roundIndex) => ({ jobId: `job-${roundIndex}`, job: { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, roundIndex, imageDigest: `sha256:${"a".repeat(64)}`, inputArtifact: "inputs/hash", outputNamespace: namespace, resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 300, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } }, status: "COMPLETED", submittedAt: "2026-10-06T01:00:00.000Z", startedAt: "2026-10-06T01:00:01.000Z", completedAt: "2026-10-06T01:00:02.000Z", execution: { status: "COMPLETED", exitCode: 0 }, artifacts: [{ schemaVersion: "v3.1-artifact-ref-v1", artifactId: `artifact-${roundIndex}`, kind: "OUTPUT", namespace, sha256, status: "PUBLISHED", sourceRef: "fixture" }], attempt: 1, retryOf: null, lease: null }));
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "normal", ownerId: "acceptance-owner-1", status: "RUNNING", assertions: [], evidence: { workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", experiment: { testRunId, experimentId, rounds: 2 }, runnerJobIds: ["job-1", "job-2"], completedRounds: [1, 2].map((roundIndex) => ({ roundIndex, jobId: `job-${roundIndex}`, artifacts: [{ artifactId: `artifact-${roundIndex}`, namespace, sha256, metrics: { fixtureId: "v3.1-research-small-sample-1", bars: 6, qlibVersion: "0.9.6.99", return: 0.12 } }] })) } };
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { stored = { ...stored, assertions: input.assertions, evidence: input.evidence }; return stored; }) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/v1/runner/jobs?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 100, jobs, hasMore: false }), { status: 200 });
      if (url.includes("/v1/runner/budgets/test-run?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 100, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [{ experimentId, rounds: 2, requestedCents: 80, reservedCents: 0, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2, status: "SETTLED", roundBudget: [1, 2].map((roundIndex) => ({ roundIndex, allocatedCents: 40, usedCents: 23, unknownReservedCents: 0 })) }], totals: { experiments: 1, requestedCents: 80, reservedCents: 0, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }), { status: 200 });
      if (url.endsWith("/v1/artifacts/read")) { const command = JSON.parse(String(init?.body)); const job = jobs.find((item) => item.artifacts[0]?.artifactId === command.artifactId)!; return new Response(JSON.stringify({ ref: job.artifacts[0], contentBase64 }), { status: 200 }); }
      throw new Error(`unexpected request ${url}`);
    });
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.verifyNormalScenario("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS" });
    expect(result).toMatchObject({ schemaVersion: "v3.3-normal-verify-result-v1", testRunId, assertion: { id: "V3.3_NORMAL_RESULTS_001", status: "PASS" }, evidence: { result: "PASS", outputs: [{ valid: true }, { valid: true }] } });
    expect(stored.evidence.workflowStep).toBe("NORMAL_ASSERTION_VERIFIED");
    expect(stored.evidence.businessValidation).toBe("PASS");
    expect(stored.assertions).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.3_EXECUTOR", status: "PASS" }), expect.objectContaining({ id: "V3.3_NORMAL_RESULTS_001", status: "PASS" })]));
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    await expect(controller.verifyNormalScenario("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS" })).resolves.toMatchObject({ idempotent: true });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("persists an explicit WAITING readiness TestRun without creating jobs or calling services", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const stored = { testRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", ownerId: "acceptance-owner-1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 } };
    const container = {
      stageRuns: { newId: vi.fn(() => testRunId), save: vi.fn(async (value) => value), find: vi.fn(async () => stored) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
      schedulerClock: { now: vi.fn(() => new Date("2026-10-03T04:00:00.000Z")) },
      scheduler: { status: vi.fn(() => ({ status: "STOPPED", samplingIntervalMinutes: 30, lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" })) },
      v24Observation: { observationSummary: vi.fn(async () => ({ targetDays: 20, countedDays: 8, recordedCountedDays: 8, unverifiedCountedDays: 0, remainingDays: 12, status: "WAITING", dates: [] })) },
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId, budgetCents: 100, status: "CONFIGURED" }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    const created = await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: 20260907 });
    expect(container.schedulerClock.now).toHaveBeenCalledOnce();
    expect(created).toMatchObject({ accepted: true, testRunId, status: "WAITING", evidence: { workflowStep: "TEST_RUN_BUDGET_BOUND", testRunBudget: { testRunId, budgetCents: 100, status: "CONFIGURED" }, runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED", paperContinuityPreflight: { status: "NOT_VERIFIED", preflightStatus: "BLOCKED", blockers: ["PAPER_SCHEDULER_NOT_FRESH_AND_SCHEDULED", "O2_OBSERVATION_NOT_QUALIFIED_20_OF_20"] } } });
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe("http://research.local/v1/runner/budgets/test-run/limit");
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({ schemaVersion: "v3.3-test-run-budget-limit-command-v1", testRunId, budgetCents: 100 });
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${platformToken}` });
    expect(container.stageRuns.save).toHaveBeenCalledWith(expect.objectContaining({ testRunId, stageId: "V3.3", status: "WAITING", assertions: expect.arrayContaining([expect.objectContaining({ status: "NOT_RUN" })]) }));
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).resolves.toMatchObject({ status: "WAITING" });
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("rejects malformed scenario requests before storing a readiness run", async () => {
    const container = { stageRuns: { newId: vi.fn(), save: vi.fn() } };
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: -1 })).rejects.toThrow("seed must be an integer");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", dispatch: true })).rejects.toThrow("only scenarioId, seed");
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("binds the frozen TestRun cap for each scenario before persisting its readiness record", async () => {
    const ids = ["b1205560-6ca0-4d6c-b3d5-d292dae4a8dd", "c1205560-6ca0-4d6c-b3d5-d292dae4a8dd", "d1205560-6ca0-4d6c-b3d5-d292dae4a8dd"];
    let nextId = 0;
    const container = {
      stageRuns: { newId: vi.fn(() => ids[nextId++]!), save: vi.fn(async (value) => value) },
      researchAutomationUrl: "http://research.local", portfolioToken: platformToken,
      schedulerClock: { now: vi.fn(() => new Date("2026-10-03T04:00:00.000Z")) },
      scheduler: { status: vi.fn(() => ({ status: "STOPPED", samplingIntervalMinutes: 30, lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" })) },
      v24Observation: { observationSummary: vi.fn(async () => ({ targetDays: 20, countedDays: 0, recordedCountedDays: 0, unverifiedCountedDays: 0, remainingDays: 20, status: "WAITING", dates: [] })) },
    };
    const budgets: number[] = [];
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const command = JSON.parse(String(init?.body)) as { testRunId: string; budgetCents: number };
      budgets.push(command.budgetCents);
      return new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId: command.testRunId, budgetCents: command.budgetCents, status: "CONFIGURED" }), { status: 200 });
    });
    const controller = new V33AcceptanceController(container as never);
    for (const [scenarioId, cap] of [["normal", 100], ["rejection", 50], ["recovery", 100]] as const) {
      await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId, seed: 20260907 });
      expect(container.stageRuns.save).toHaveBeenLastCalledWith(expect.objectContaining({ scenarioId, evidence: expect.objectContaining({ testRunBudget: expect.objectContaining({ budgetCents: cap }) }) }));
    }
    expect(budgets).toEqual([100, 50, 100]);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("persists a rejected 80-cent Experiment only after proving the 50-cent cap left no side effects", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "rejection", ownerId: "acceptance-owner-1", status: "WAITING", assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { workflowStep: "TEST_RUN_BUDGET_BOUND", testRunBudget: { testRunId, budgetCents: 50, status: "CONFIGURED" }, runnerJobsCreated: 0, externalModelCalls: 0 } };
    const transitions: any[] = [];
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { transitions.push(input); stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence }; return stored; }) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/v1/experiments")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ testRunId, rounds: 2, budgetCents: 80, idempotencyKey: `v33-rejection-budget-${testRunId}` });
        return new Response(JSON.stringify({ error: "TestRun budget exhausted" }), { status: 422 });
      }
      if (url.includes("/v1/runner/budgets/test-run?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 100, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [], totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }), { status: 200 });
      if (url.includes("/v1/runner/jobs?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 100, jobs: [], hasMore: false }), { status: 200 });
      throw new Error(`unexpected request ${url}`);
    });
    const controller = new V33AcceptanceController(container as never);
    const command = { schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" };
    const result = await controller.verifyBudgetRejection("sq_session=acceptance-owner-1", undefined, testRunId, command);
    expect(result).toMatchObject({ schemaVersion: "v3.3-rejection-verify-result-v1", testRunId, status: "RUNNING", assertion: { id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "PASS" }, evidence: { result: "PASS", noExperiment: true, noModelCalls: true, noRunnerJobs: true } });
    expect(stored.evidence.workflowStep).toBe("REJECTION_ASSERTION_VERIFIED");
    expect(stored.evidence.businessValidation).toBe("PASS");
    expect(transitions).toHaveLength(2);
    expect(stored.assertions).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.3_EXECUTOR", status: "PASS" }), expect.objectContaining({ id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "PASS" })]));
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    await expect(controller.verifyBudgetRejection("sq_session=acceptance-owner-1", undefined, testRunId, command)).resolves.toMatchObject({ idempotent: true });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("records FAIL and observed side effects if the rejection request is unexpectedly accepted", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "rejection", ownerId: "acceptance-owner-1", status: "WAITING", assertions: [], evidence: { workflowStep: "TEST_RUN_BUDGET_BOUND", testRunBudget: { testRunId, budgetCents: 50, status: "CONFIGURED" } } };
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence }; return stored; }) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith("/v1/experiments")) return new Response(JSON.stringify({ accepted: true }), { status: 201 });
      if (url.includes("/v1/runner/budgets/test-run?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 100, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [{ experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd" }], totals: { experiments: 1, requestedCents: 80, reservedCents: 80, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }), { status: 200 });
      if (url.includes("/v1/runner/jobs?")) return new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 100, jobs: [{ jobId: "unexpected-job" }], hasMore: false }), { status: 200 });
      throw new Error(`unexpected request ${url}`);
    });
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.verifyBudgetRejection("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" });
    expect(result.assertion).toMatchObject({ id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "FAIL" });
    expect(stored.evidence.businessValidation).toBe("FAIL");
    expect(stored.assertions).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.3_EXECUTOR", status: "FAIL" }), expect.objectContaining({ id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "FAIL" })]));
    expect(stored.evidence.runnerJobsCreated).toBe(1);
    expect(stored.evidence.rejectionAssertion.noExperiment).toBe(false);
    expect(stored.evidence.rejectionAssertion.noRunnerJobs).toBe(false);
  });

  it("does not persist a TestRun when Research Automation fails to bind the cap", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { newId: vi.fn(() => testRunId), save: vi.fn() }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ message: "unavailable" }), { status: 503 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal" })).rejects.toMatchObject({ status: 503 });
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("reserves the frozen two-round Experiment against the same TestRun and is retry-safe", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", ownerId: "acceptance-owner-1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 } };
    const transitions: any[] = [];
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = {
      stageRuns: {
        find: vi.fn(async () => stored),
        transitionV33Workflow: vi.fn(async (input) => {
          transitions.push(input);
          stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence };
          return stored;
        }),
      },
      researchAutomationUrl: "http://research.local", portfolioToken: platformToken,
    };
    const response = { testRunId, experimentId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCurrency: "USD", budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v33-normal-${testRunId}`, status: "PENDING_PREREQUISITES", reason: "waiting for isolated Fixture Runner", createdAt: "2026-10-06T00:00:00.000Z", cancelledAt: null, budget: { experimentId, requestedCents: 80, reservedCents: 80, spentCents: 0, status: "RESERVED" } };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(response), { status: 202 }));
    const controller = new V33AcceptanceController(container as never);
    const command = { schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" };
    const first = await controller.reserveScenarioExperiment("sq_session=acceptance-owner-1", undefined, testRunId, command);
    expect(first).toMatchObject({ testRunId, status: "WAITING", idempotent: false, experiment: response });
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({ testRunId, fixtureId: "v3.3-research-orchestration-1", rounds: 2, budgetCents: 80, brokerMode: "FAKE", environmentMode: "RESEARCH", idempotencyKey: `v33-normal-${testRunId}` });
    expect(transitions.map((entry) => [entry.expectedStatus, entry.status])).toEqual([["WAITING", "RUNNING"], ["RUNNING", "WAITING"]]);
    expect(stored.evidence).toMatchObject({ workflowStep: "EXPERIMENT_RESERVED", experimentId, runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 });
    await expect(controller.reserveScenarioExperiment("sq_session=acceptance-owner-1", undefined, testRunId, command)).resolves.toMatchObject({ idempotent: true, experiment: response });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("settles only deterministic Fixture calls and idempotently queues both bound Runner rounds", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const imageDigest = `sha256:${"a".repeat(64)}`;
    vi.stubEnv("STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST", imageDigest);
    const experiment = { experimentId, testRunId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCurrency: "USD", budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE", status: "PENDING_PREREQUISITES", budget: { experimentId, requestedCents: 80, reservedCents: 80, spentCents: 0, status: "RESERVED" } };
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "normal", ownerId: "acceptance-owner-1", status: "WAITING", assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { workflowStep: "EXPERIMENT_RESERVED", experiment } };
    const transitions: any[] = [];
    const container = {
      stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { transitions.push(input); stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence }; return stored; }) },
      researchAutomationUrl: "http://research.local", portfolioToken: platformToken,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const request = JSON.parse(String(init?.body ?? "{}"));
      if (url.endsWith("/v1/model-gateway/fixture-call")) return new Response(JSON.stringify({ providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", status: "COMPLETED", modelRunId: request.modelRunId, budgetStatus: "SETTLED", actualCostCents: 23, response: { generatedCode: "print('frozen-fixture')\\n" } }), { status: 200 });
      if (url.endsWith("/v1/artifacts/publish")) return new Response(JSON.stringify({ ref: request.ref }), { status: 201 });
      if (url.endsWith("/v1/runner/jobs")) return new Response(JSON.stringify({ jobId: `${testRunId}:${experimentId}:round-${request.roundIndex}`, job: request, status: "QUEUED", submittedAt: "2026-10-06T00:00:00.000Z", startedAt: null, completedAt: null, execution: "NOT_STARTED", artifacts: [], attempt: 1, retryOf: null, lease: null, prerequisiteStatus: "CONFIGURED" }), { status: 202 });
      throw new Error(`unexpected URL ${url}`);
    });
    const controller = new V33AcceptanceController(container as never);
    const command = { schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" };
    await expect(controller.dispatchScenarioExperiment("sq_session=acceptance-owner-1", undefined, testRunId, command)).resolves.toMatchObject({ schemaVersion: "v3.3-scenario-dispatch-result-v1", testRunId, status: "RUNNING", workflowStep: "RUNNER_JOBS_QUEUED", runnerJobsCreated: 2, externalModelCalls: 0 });
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    const jobs = fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/v1/runner/jobs"));
    expect(jobs.map(([, init]) => JSON.parse(String(init?.body)).roundIndex)).toEqual([1, 2]);
    expect(jobs.map(([, init]) => JSON.parse(String(init?.body)).imageDigest)).toEqual([imageDigest, imageDigest]);
    const modelCalls = fetchSpy.mock.calls.filter(([url]) => String(url).endsWith("/v1/model-gateway/fixture-call"));
    expect(modelCalls.map(([, init]) => JSON.parse(String(init?.body)).modelRunId)).toEqual([`${testRunId}.round-1`, `${testRunId}.round-2`]);
    expect(stored.evidence).toMatchObject({ workflowStep: "RUNNER_JOBS_QUEUED", runnerDispatch: "QUEUED", runnerJobsCreated: 2, roundSettledCents: [23, 23], experimentSpentCents: 46, releasedReservationCents: 34, externalModelCalls: 0 });
    expect(transitions.map((entry) => [entry.expectedStatus, entry.status])).toEqual([["WAITING", "RUNNING"], ["RUNNING", "RUNNING"], ["RUNNING", "RUNNING"], ["RUNNING", "RUNNING"]]);
    await expect(controller.dispatchScenarioExperiment("sq_session=acceptance-owner-1", undefined, testRunId, command)).resolves.toMatchObject({ idempotent: true, runnerJobsCreated: 2 });
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  it("rejects a mismatched Experiment response without recording it as reserved", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const run = { testRunId, stageId: "V3.3", scenarioId: "recovery", status: "WAITING", assertions: [], evidence: { workflowStep: "TEST_RUN_BUDGET_BOUND" } };
    const container = { stageRuns: { find: vi.fn(async () => run), transitionV33Workflow: vi.fn(async (input) => ({ ...run, status: input.status, assertions: input.assertions, evidence: input.evidence })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ testRunId, experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", rounds: 2, budgetCents: 79, budget: { status: "RESERVED", reservedCents: 79 } }), { status: 202 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.reserveScenarioExperiment("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" })).rejects.toMatchObject({ status: 503 });
    expect(container.stageRuns.transitionV33Workflow).toHaveBeenCalledTimes(1);
  });

  it("verifies exact owner-scoped V3.1 and V3.2 references while retaining runtime blockers", async () => {
    const sourceId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const promotionId = "c1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const run = { testRunId: sourceId, stageId: "V3.1", scenarioId: "normal" };
    const container = {
      stageRuns: { newId: vi.fn(() => "d1205560-6ca0-4d6c-b3d5-d292dae4a8dd"), find: vi.fn(async () => run), getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED", evidenceSha256: "a".repeat(64) })), save: vi.fn(async (value) => value) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
      schedulerClock: { now: vi.fn(() => new Date("2026-10-03T04:00:00.000Z")) },
      scheduler: { status: vi.fn(() => ({ status: "STOPPED", samplingIntervalMinutes: 30, lastSampleAt: null, nextSampleAt: null, tickCount: 0, mode: "PAPER", brokerMode: "FAKE" })) },
      v24Observation: { observationSummary: vi.fn(async () => ({ targetDays: 20, countedDays: 8, recordedCountedDays: 8, unverifiedCountedDays: 0, remainingDays: 12, status: "WAITING", dates: [] })) },
      quantResearchHeaders: vi.fn(() => ({ authorization: "Bearer " + "p".repeat(40) })),
    };
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: promotionId, request: { testRunId: sourceId }, status: "CANDIDATE_APPROVED", decision: { decision: "APPROVE", registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE", versionFingerprint: "b".repeat(64) } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId: "d1205560-6ca0-4d6c-b3d5-d292dae4a8dd", budgetCents: 100, status: "CONFIGURED" }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: sourceId, promotionRequestId: promotionId }) as { evidence: { blockers: Array<{ id: string; status: string }>; runnerJobsCreated: number } };
    expect(result.evidence.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.1_ACCEPTANCE", status: "VERIFIED" }), expect.objectContaining({ id: "V3.2_EXACT_VERSION", status: "VERIFIED" }), expect.objectContaining({ id: "PAPER_CONTINUITY", status: "NOT_VERIFIED" }), expect.objectContaining({ id: "V3.3_EXECUTOR", status: "NOT_RUN" })]));
    expect(result.evidence.runnerJobsCreated).toBe(0);
    expect(container.stageRuns.getV31PromotionGate).toHaveBeenCalledWith(sourceId);
  });

  it("rejects a PromotionRequest bound to a different exact source run", async () => {
    const sourceId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const promotionId = "c1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { newId: vi.fn(), find: vi.fn(async () => ({ testRunId: sourceId, stageId: "V3.1", scenarioId: "normal" })), getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED" })), save: vi.fn() }, quantResearchHeaders: vi.fn(() => ({})) };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: promotionId, request: { testRunId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd" }, status: "AWAITING_REVIEW", decision: null }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: sourceId, promotionRequestId: promotionId })).rejects.toThrow("bound to a different V3.1 source run");
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("requires a session-owned V3.3 run and forwards bounded pagination with Platform identity", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = {
      stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 10, jobs: [], hasMore: false }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);

    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10"))
      .resolves.toMatchObject({ schemaVersion: "v3.3-runner-queue-v1", testRunId, jobs: [] });
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/jobs?testRunId=${testRunId}&offset=0&limit=10`);
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${platformToken}` });

    await expect(controller.runnerQueue(undefined, undefined, testRunId)).rejects.toBeInstanceOf(UnauthorizedException);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects unbounded or malformed pagination before making an upstream request", async () => {
    const container = { stageRuns: { find: vi.fn() }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd", undefined, "101")).rejects.toThrow("limit must be between 1 and 100");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.stageRuns.find).not.toHaveBeenCalled();
  });

  it("reads budget evidence only after validating the owner's V3.3 run", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = {
      stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 10, rows: [], hasMore: false }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10"))
      .resolves.toMatchObject({ schemaVersion: "v3.3-runner-budget-v1", rows: [] });
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/budgets?testRunId=${testRunId}&offset=0&limit=10`);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("reads the complete TestRun budget summary and validates its scope", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const summary = { schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 10, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [], totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "NOT_IMPLEMENTED" };
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(summary), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudgetSummary("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10")).resolves.toEqual(summary);
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/budgets/test-run?testRunId=${testRunId}&offset=0&limit=10`);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerBudgetSummary("sq_session=other-owner", undefined, testRunId)).rejects.toBeInstanceOf(ForbiddenException);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("forwards each contract-defined TestRun budget capability from Research Automation", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const capabilities = ["NOT_IMPLEMENTED", "TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED", "TEST_RUN_AND_ROUND_CAP_ENFORCED"] as const;
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new V33AcceptanceController(container as never);
    for (const stageBudgetControl of capabilities) {
      const summary = { schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 10, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [], totals: { experiments: 0, requestedCents: 0, reservedCents: 0, settledCents: 0, unknownReservedCents: 0, modelCallCount: 0 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl };
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify(summary), { status: 200 }));
      await expect(controller.runnerBudgetSummary("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10")).resolves.toEqual(summary);
    }
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("forwards a bounded summary cursor and accepts totals omitted on continuation pages", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const cursor = Buffer.from(JSON.stringify({ createdAt: "2026-09-27T01:00:00.000000Z", experimentId: "123e4567-e89b-42d3-a456-426614174001" })).toString("base64url");
    const payload = { schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 25, afterCursor: cursor, nextAfterCursor: null, hasMore: false, rows: [], totals: null, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "NOT_IMPLEMENTED" };
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudgetSummary("sq_session=acceptance-owner-1", undefined, testRunId, "0", "25", cursor)).resolves.toEqual(payload);
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toContain(`&afterCursor=${cursor}`);
    await expect(controller.runnerBudgetSummary("sq_session=acceptance-owner-1", undefined, testRunId, "1", "25", cursor)).rejects.toThrow("afterCursor pagination requires offset 0");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("rejects an incomplete or unsupported full TestRun budget response", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 50, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [], totals: { experiments: 0 }, stageBudgetControl: "ENFORCED" }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudgetSummary("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toThrow("does not match the scoped request");
  });

  it("rejects an upstream budget response for a different run or page", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId: "123e4567-e89b-42d3-a456-426614174000", offset: 0, limit: 10 }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10")).rejects.toThrow("does not match the scoped request");
  });

  it("reads a keyset queue page only after the owner's exact V3.3 run check", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const cursor = Buffer.from(JSON.stringify({ submittedAt: "2026-09-27T00:00:00.000Z", jobId: "job-a" })).toString("base64url");
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const payload = { schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: cursor, limit: 25, jobs: [], hasMore: false, nextAfterCursor: null };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId, cursor, "25")).resolves.toEqual(payload);
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/jobs/cursor?testRunId=${testRunId}&afterCursor=${cursor}&limit=25`);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId, undefined, "101")).rejects.toThrow("limit must be between 1 and 100");
  });

  it("reconciles only the exact two completed rounds after independently verifying output Artifact bytes", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const namespace = `research/${testRunId}/${experimentId}/outputs`;
    const artifactBytes = Buffer.from('{"bars":6,"fixtureId":"v3.1-research-small-sample-1","qlibVersion":"0.9.6.99","return":0.12}\n');
    const sha256 = createHash("sha256").update(artifactBytes).digest("hex");
    const artifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "round-output-1", kind: "OUTPUT", namespace, sha256, status: "PUBLISHED", sourceRef: "fixture-round-1" };
    const dispatchedRounds = [1, 2].map((roundIndex) => ({ roundIndex, jobId: `job-${roundIndex}`, outputNamespace: namespace }));
    let budgetSettled = false;
    let stored: any = { testRunId, stageId: "V3.3", scenarioId: "normal", ownerId: "acceptance-owner-1", status: "RUNNING", assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { workflowStep: "RUNNER_JOBS_QUEUED", experiment: { testRunId, experimentId, rounds: 2 }, runnerJobIds: ["job-1", "job-2"], dispatchedRounds } };
    const transitions: any[] = [];
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn(async (input) => { transitions.push(input); stored = { ...stored, status: input.status, assertions: input.assertions, evidence: input.evidence }; return stored; }) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const queue = { schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 100, hasMore: false, jobs: dispatchedRounds.map((round, index) => ({ jobId: round.jobId, job: { testRunId, experimentId, roundIndex: round.roundIndex, outputNamespace: namespace }, status: "COMPLETED", execution: { status: "COMPLETED", exitCode: 0, signal: null, stdout: "ok", stderr: "", durationMs: 10 }, artifacts: index === 0 ? [artifactRef] : [{ ...artifactRef, artifactId: "round-output-2", sourceRef: "fixture-round-2" }], completedAt: "2026-10-06T01:00:00.000Z" })) };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input).includes("/v1/runner/jobs?")) return new Response(JSON.stringify(queue), { status: 200 });
      if (String(input).includes("/v1/runner/budgets/test-run")) {
        const status = budgetSettled ? "SETTLED" : "RESERVED";
        const reservedCents = budgetSettled ? 0 : 80;
        return new Response(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, offset: 0, limit: 100, afterCursor: null, nextAfterCursor: null, hasMore: false, rows: [{ experimentId, rounds: 2, requestedCents: 80, reservedCents, roundBudget: [1, 2].map((roundIndex) => ({ roundIndex, allocatedCents: 40, usedCents: 23, unknownReservedCents: 0 })), status, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2 }], totals: { experiments: 1, requestedCents: 80, reservedCents, settledCents: 46, unknownReservedCents: 0, modelCallCount: 2 }, accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED" }), { status: 200 });
      }
      if (String(input).includes("/budget/settle-from-model-calls")) {
        expect(JSON.parse(String(init?.body))).toEqual({ testRunId, expectedRounds: 2 });
        budgetSettled = true;
        return new Response(JSON.stringify({ experimentId, testRunId, requestedCents: 80, reservedCents: 80, spentCents: 46, status: "SETTLED", modelCallCount: 2, rounds: [{ roundIndex: 1, settledCents: 23 }, { roundIndex: 2, settledCents: 23 }] }), { status: 200 });
      }
      if (String(input).endsWith("/budget")) return new Response(JSON.stringify({ experimentId, requestedCents: 80, reservedCents: 80, spentCents: 46, status: budgetSettled ? "SETTLED" : "RESERVED" }), { status: 200 });
      const request = JSON.parse(String(init?.body ?? "{}"));
      const ref = queue.jobs.flatMap((job) => job.artifacts).find((candidate) => candidate.artifactId === request.artifactId);
      return new Response(JSON.stringify({ ref, contentBase64: artifactBytes.toString("base64") }), { status: 200 });
    });
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.reconcileScenarioResults("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" });
    expect(result).toMatchObject({ status: "RUNNING", workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", completedRounds: 2, experimentSettlement: "VERIFIED_FIXTURE_LEDGER", settlement: { experimentId, requestedCents: 80, settledCents: 46, modelCallCount: 2 }, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" });
    expect(stored.evidence.completedRounds).toHaveLength(2);
    expect(stored.evidence.businessWorkflow).toBe("EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED");
    expect(stored.evidence.experimentSettlementEvidence.settledCents).toBe(46);
    expect(stored.assertions).toEqual([{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }]);
    expect(fetchSpy).toHaveBeenCalledTimes(7);
    expect(transitions).toHaveLength(1);
  });

  it("does not reconcile an incomplete Runner round or read any output Artifacts", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const experimentId = "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const dispatchedRounds = [1, 2].map((roundIndex) => ({ roundIndex, jobId: `job-${roundIndex}`, outputNamespace: `research/${testRunId}/${experimentId}/outputs` }));
    const stored = { testRunId, stageId: "V3.3", scenarioId: "normal", status: "RUNNING", assertions: [], evidence: { workflowStep: "RUNNER_JOBS_QUEUED", experiment: { testRunId, experimentId, rounds: 2 }, runnerJobIds: ["job-1", "job-2"], dispatchedRounds } };
    const container = { stageRuns: { find: vi.fn(async () => stored), transitionV33Workflow: vi.fn() }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const queue = { schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 100, hasMore: false, jobs: dispatchedRounds.map((round, index) => ({ jobId: round.jobId, job: { testRunId, experimentId, roundIndex: round.roundIndex, outputNamespace: round.outputNamespace }, status: index === 0 ? "RUNNING" : "COMPLETED", execution: index === 0 ? null : { status: "COMPLETED", exitCode: 0, signal: null, stdout: "", stderr: "", durationMs: 1 }, artifacts: [], completedAt: null })) };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queue), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.reconcileScenarioResults("sq_session=acceptance-owner-1", undefined, testRunId, { schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" })).rejects.toThrow("has not completed successfully");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(container.stageRuns.transitionV33Workflow).not.toHaveBeenCalled();
  });
});
