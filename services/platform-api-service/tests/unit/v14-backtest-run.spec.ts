import { afterEach, describe, expect, it, vi } from "vitest";
import { V14BacktestRunService } from "../../src/application/v14-backtest-run.js";

const id = "00000000-0000-4000-8000-000000000144";
const result = (testRunId: string) => ({ testRunId, stageId: "V1.4" as const, scenarioId: "normal" as const, seed: 7, status: "COMPLETED" as const, assertions: [{ assertionId: "V1.4-001", status: "PASS" as const, expected: "same run", actual: "same run" }], evidence: { dataVersion: "fixture-1", executionPolicy: { initialCashCents: 1 }, metrics: { finalNavCents: 1 } }, durableReport: { resultSha256: "a".repeat(64), manifestSha256: "b".repeat(64) } });

function harness(existing?: any) {
  let run = existing ?? null;
  const repository = {
    newId: () => id,
    save: vi.fn(async (input: any) => { run = { ...input, namespace: input.namespace, createdAt: "2026-10-07T00:00:00.000Z", completedAt: null }; return run; }),
    find: vi.fn(async (runId: string, ownerId: string) => run?.testRunId === runId && run?.ownerId === ownerId ? run : null),
    listRunnableV14Runs: vi.fn(async () => run?.status === "RUNNING" ? [run] : []),
    withV14RunLock: vi.fn(async (_runId: string, work: () => Promise<unknown>) => work()),
    updateV14Progress: vi.fn(async (_runId: string, _ownerId: string, progress: any) => { if (run?.status !== "RUNNING" || run.evidence.v14Task.cancelRequested) return false; run = { ...run, evidence: { ...run.evidence, v14Task: { ...run.evidence.v14Task, ...progress } } }; return true; }),
    requestV14Cancellation: vi.fn(async () => { run = { ...run, evidence: { ...run.evidence, v14Task: { ...run.evidence.v14Task, cancelRequested: true } } }; return run; }),
    finishV14Run: vi.fn(async (_runId: string, _ownerId: string, status: string, assertions: any[], evidence: any) => { run = { ...run, status, assertions, evidence, completedAt: "2026-10-07T00:00:01.000Z" }; return run; })
  } as any;
  return { repository, current: () => run };
}

describe("V1.4 persistent Quant backtest tasks", () => {
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.STOCKQUANT_V14_TEST_HOOKS_ENABLED; delete process.env.STOCKQUANT_V14_TEST_DELAY_MS; });

  it("persists TestRun before dispatch and passes that stable ID to Quant", async () => {
    const h = harness();
    const runner = vi.fn(async (_scenario, _seed, _policy, testRunId) => result(testRunId));
    const service = new V14BacktestRunService(h.repository, runner, () => "1.1.0");
    const accepted = await service.create("owner-a", "normal", 7, { initialCashCents: 1 });
    expect(accepted).toMatchObject({ accepted: true, testRunId: id, status: "RUNNING" });
    expect(h.repository.save).toHaveBeenCalledWith(expect.objectContaining({ testRunId: id, status: "RUNNING", evidence: expect.objectContaining({ v14Task: expect.objectContaining({ phase: "QUEUED" }) }) }));
    await vi.waitFor(() => expect(h.current()?.status).toBe("COMPLETED"));
    expect(runner).toHaveBeenCalledWith("normal", 7, { initialCashCents: 1 }, id);
    expect(h.current().evidence).toMatchObject({ dataVersion: "fixture-1", v14Task: { phase: "COMPLETED", quantBacktestRunId: id } });
    expect(h.current().evidence.reportArtifactRef).toMatchObject({ schemaVersion: "artifact-ref.v1", artifactId: "a".repeat(64), sha256: "a".repeat(64), ownerId: "owner-a", testRunId: id, kind: "BACKTEST_REPORT", status: "PUBLISHED" });
  });

  it("resumes an existing RUNNING TestRun after startup without changing its identity", async () => {
    const persisted = { testRunId: id, stageId: "V1.4", scenarioId: "normal", scenarioVersion: "1.1.0", ownerId: "owner-a", namespace: `v1-4-normal-${id}`, status: "RUNNING", seed: 7, assertions: [], evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", v14Task: { phase: "RUNNING_QUANT", attempt: 1, cancelRequested: false, policy: { initialCashCents: 1 } } }, createdAt: "2026-10-07T00:00:00.000Z", completedAt: null };
    const h = harness(persisted);
    const runner = vi.fn(async (_scenario, _seed, _policy, testRunId) => result(testRunId));
    const service = new V14BacktestRunService(h.repository, runner, () => "1.1.0");
    expect(await service.resumePending()).toBe(1);
    await vi.waitFor(() => expect(h.current()?.status).toBe("COMPLETED"));
    expect(runner).toHaveBeenCalledWith("normal", 7, { initialCashCents: 1 }, id);
    expect(h.current().testRunId).toBe(id);
    expect(h.current().evidence.v14Task.resumeCount).toBe(1);
  });

  it("honors a persisted cancellation before dispatching the Quant run", async () => {
    process.env.STOCKQUANT_V14_TEST_HOOKS_ENABLED = "true";
    process.env.STOCKQUANT_V14_TEST_DELAY_MS = "100";
    const h = harness();
    const runner = vi.fn(async (_scenario, _seed, _policy, testRunId) => result(testRunId));
    const service = new V14BacktestRunService(h.repository, runner, () => "1.1.0");
    const accepted = await service.create("owner-a", "recovery", 7, { initialCashCents: 1 });
    await vi.waitFor(() => expect(h.current()?.evidence.v14Task.phase).toBe("RUNNING_QUANT"));
    await service.cancel(accepted.testRunId, "owner-a");
    await vi.waitFor(() => expect(h.current()?.status).toBe("CANCELLED"));
    expect(runner).not.toHaveBeenCalled();
  });
});
