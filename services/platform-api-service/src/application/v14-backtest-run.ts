import type { V14DailyBacktestFixtureResult } from "../contracts/generated-types.js";
import type { V14Scenario } from "./v14-backtest.js";
import type { V14BacktestRunRepository, StoredStageRun } from "../ports/stage-run-repository.js";
import { projectV14ReportArtifactRef } from "./v14-report-artifact-ref.js";

type Policy = Record<string, unknown>;
type Runner = (scenarioId: V14Scenario, seed: number, policy: Policy, testRunId: string) => Promise<V14DailyBacktestFixtureResult>;
type Version = (scenarioId: string) => string;

export class V14BacktestRunService {
  constructor(private readonly repository: V14BacktestRunRepository, private readonly runner: Runner, private readonly scenarioVersion: Version) {}

  async create(ownerId: string, scenarioId: V14Scenario, seed: number, policy: Policy) {
    if (!Number.isSafeInteger(seed) || seed < 0 || seed > 2_147_483_647) throw new Error("V1.4 seed is outside its supported range");
    const testRunId = this.repository.newId();
    await this.repository.save({
      testRunId, stageId: "V1.4", scenarioId, scenarioVersion: this.scenarioVersion(scenarioId), ownerId,
      namespace: `v1-4-${scenarioId}-${testRunId}`, status: "RUNNING", seed, assertions: [],
      evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", v14Task: { phase: "QUEUED", attempt: 0, cancelRequested: false, policy } }
    });
    queueMicrotask(() => { void this.execute(testRunId, ownerId); });
    return { accepted: true, testRunId, status: "RUNNING" };
  }

  async resumePending(): Promise<number> {
    const pending = await this.repository.listRunnableV14Runs();
    for (const run of pending) queueMicrotask(() => { void this.execute(run.testRunId, run.ownerId); });
    return pending.length;
  }

  find(testRunId: string, ownerId: string) { return this.repository.find(testRunId, ownerId); }
  cancel(testRunId: string, ownerId: string) { return this.repository.requestV14Cancellation(testRunId, ownerId); }

  private async execute(testRunId: string, ownerId: string): Promise<void> {
    try {
      await this.repository.withV14RunLock(testRunId, async () => {
        const run = await this.repository.find(testRunId, ownerId);
        if (!run || run.status !== "RUNNING") return;
        const task = run.evidence.v14Task as Record<string, unknown> | undefined;
        if (task?.cancelRequested === true) {
          await this.repository.finishV14Run(testRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled before Quant execution", actual: "cancelled" }], { ...run.evidence, v14Task: { ...task, phase: "CANCELLED" } });
          return;
        }
        const policy = task?.policy;
        if (!policy || typeof policy !== "object" || Array.isArray(policy)) throw new Error("persisted V1.4 execution policy is missing");
        const attempt = Number(task.attempt ?? 0) + 1;
        const started = await this.repository.updateV14Progress(testRunId, ownerId, { phase: "RUNNING_QUANT", attempt, lastStartedAt: new Date().toISOString() });
        if (!started) {
          const latest = await this.repository.find(testRunId, ownerId);
          const latestTask = latest?.evidence.v14Task as Record<string, unknown> | undefined;
          if (latest?.status === "RUNNING" && latestTask?.cancelRequested === true) await this.repository.finishV14Run(testRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled before Quant execution", actual: "cancelled" }], { ...latest.evidence, v14Task: { ...latestTask, phase: "CANCELLED" } });
          return;
        }
        if (task?.phase && task.phase !== "QUEUED") await this.repository.updateV14Progress(testRunId, ownerId, { resumeCount: Number(task.resumeCount ?? 0) + 1, resumedFromPhase: task.phase, resumedAt: new Date().toISOString() });
        const beforeQuant = await this.repository.find(testRunId, ownerId);
        const beforeQuantTask = beforeQuant?.evidence.v14Task as Record<string, unknown> | undefined;
        if (beforeQuant?.status !== "RUNNING") return;
        if (beforeQuantTask?.cancelRequested === true) {
          await this.repository.finishV14Run(testRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled before Quant execution", actual: "cancelled" }], { ...beforeQuant.evidence, v14Task: { ...beforeQuantTask, phase: "CANCELLED" } });
          return;
        }
        if (process.env.STOCKQUANT_V14_TEST_HOOKS_ENABLED === "true" && run.scenarioId === "recovery") {
          const delayMs = Number(process.env.STOCKQUANT_V14_TEST_DELAY_MS ?? 0);
          if (Number.isSafeInteger(delayMs) && delayMs > 0 && delayMs <= 5_000) await new Promise((resolve) => setTimeout(resolve, delayMs));
          const afterDelay = await this.repository.find(testRunId, ownerId);
          const afterDelayTask = afterDelay?.evidence.v14Task as Record<string, unknown> | undefined;
          if (afterDelay?.status !== "RUNNING") return;
          if (afterDelayTask?.cancelRequested === true) {
            await this.repository.finishV14Run(testRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled before Quant execution", actual: "cancelled" }], { ...afterDelay.evidence, v14Task: { ...afterDelayTask, phase: "CANCELLED" } });
            return;
          }
        }
        const result = await this.runner(run.scenarioId as V14Scenario, run.seed, policy as Policy, testRunId);
        if (process.env.STOCKQUANT_V14_TEST_HOOKS_ENABLED === "true" && run.scenarioId === "recovery") {
          const delayMs = Number(process.env.STOCKQUANT_V14_TEST_AFTER_QUANT_DELAY_MS ?? 0);
          if (Number.isSafeInteger(delayMs) && delayMs > 0 && delayMs <= 5_000) await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        if (result.testRunId !== testRunId || result.scenarioId !== run.scenarioId || result.seed !== run.seed) throw new Error("Quant returned a result for a different TestRun identity");
        const latest = await this.repository.find(testRunId, ownerId);
        if (!latest || latest.status !== "RUNNING") return;
        const latestTask = latest.evidence.v14Task as Record<string, unknown> | undefined;
        const assertions = result.assertions;
        const status = latestTask?.cancelRequested === true ? "CANCELLED" : result.status === "COMPLETED" && assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
        const taskEvidence = { ...(latestTask ?? {}), phase: status, attempt, quantBacktestRunId: testRunId, quantResultStatus: result.status, finishedAt: new Date().toISOString() };
        const reportArtifactRef = status === "COMPLETED" ? projectV14ReportArtifactRef(testRunId, ownerId, result.durableReport) : undefined;
        await this.repository.finishV14Run(testRunId, ownerId, status, status === "CANCELLED" ? [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled before report publication", actual: "Quant completed, report suppressed" }] : assertions, { ...latest.evidence, ...result.evidence, quant: result.evidence, ...(reportArtifactRef ? { reportPayload: result, reportArtifactRef } : {}), v14Task: taskEvidence });
      });
    } catch (error) {
      const run: StoredStageRun | null = await this.repository.find(testRunId, ownerId).catch(() => null);
      if (!run || run.status !== "RUNNING") return;
      const task = run.evidence.v14Task as Record<string, unknown> | undefined;
      if (task?.cancelRequested === true) {
        await this.repository.finishV14Run(testRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS", expected: "cancelled with report suppressed", actual: "cancelled" }], { ...run.evidence, v14Task: { ...task, phase: "CANCELLED", error: error instanceof Error ? error.message : "Quant execution failed" } }).catch(() => undefined);
      } else {
        await this.repository.finishV14Run(testRunId, ownerId, "FAILED", [{ assertionId: "V1.4-TASK-EXECUTION-001", status: "FAIL", expected: "durable Quant BacktestRun and Manifest", actual: error instanceof Error ? error.message : "Quant execution failed" }], { ...run.evidence, v14Task: { ...task, phase: "FAILED", error: error instanceof Error ? error.message : "Quant execution failed" } }).catch(() => undefined);
      }
    }
  }
}
