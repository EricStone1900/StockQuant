import { randomUUID } from "node:crypto";

export type V15Scenario = "normal" | "rejection" | "recovery";
export const V15_SCENARIOS = [
  { scenarioId: "normal", version: "1.1.0", title: "后台调度与 60 日 HOLD", expected: "真实后台工作流继续执行，CN/US权威账本与FakeBroker状态均为零委托" },
  { scenarioId: "rejection", version: "1.1.0", title: "暂停与窗口拒绝", expected: "暂停和过期窗口由治理/执行服务拒绝且没有新发送" },
  { scenarioId: "recovery", version: "1.1.0", title: "Worker/总线与备份恢复", expected: "未知订单查询原单，恢复后无重复副作用且备份事实一致" }
] as const;

type Assertion = {
  assertionId: string;
  status: "WAITING";
  expected: unknown;
  actual: "NOT_RUN";
};

const ASSERTION_IDS: Record<V15Scenario, readonly string[]> = {
  normal: ["V1.5-SYS-SCHEDULE-001", "V1.5-HOLD-002"],
  rejection: ["V1.5-OPS-PAUSE-001", "V1.5-XMK-CURRENCY-002"],
  recovery: ["V1.5-RECOVERY-001", "V1.5-RECOVERY-002"]
};

/**
 * V1.5 must not infer completed business facts from scenario names or expected
 * values. Until the durable workflow adapter and independent fact readers are
 * connected, expose a resumable preparation result and keep every assertion
 * NOT_RUN.
 */
export class V15OrchestrationEngine {
  run(scenarioId: V15Scenario, seed = 20260907) {
    const scenario = V15_SCENARIOS.find((item) => item.scenarioId === scenarioId);
    const testRunId = randomUUID();
    const assertions: Assertion[] = ASSERTION_IDS[scenarioId].map((assertionId) => ({
      assertionId,
      status: "WAITING",
      expected: "Evidence from the durable workflow and authoritative domain services is required",
      actual: "NOT_RUN"
    }));

    return {
      testRunId,
      stageId: "V1.5" as const,
      scenarioId,
      scenarioVersion: scenario?.version ?? "1.1.0",
      seed,
      status: "WAITING" as const,
      assertions,
      evidence: {
        evidenceScope: "PLATFORM_WAITING_DECLARATION",
        businessExecution: "NOT_RUN",
        businessServicesCalled: [],
        scenarioExpectation: scenario?.expected ?? "unknown scenario",
        brokerMode: "FAKE",
        liveTradingEnabled: false,
        fixtureVersion: "v1.5-orchestration-1",
        workflow: "NOT_CONNECTED",
        nats: "NOT_RUN",
        temporal: "NOT_RUN",
        seed,
        orders: "NOT_CREATED",
        fills: "NOT_CREATED",
        portfolioLedgerFacts: "NOT_CREATED",
        reconciliation: "NOT_RUN",
        backupRestore: "NOT_RUN"
      }
    };
  }
}
