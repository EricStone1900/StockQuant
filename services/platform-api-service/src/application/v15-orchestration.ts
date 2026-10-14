import { randomUUID } from "node:crypto";

export type V15Scenario = "normal" | "auto-trade" | "rejection" | "recovery";
export const V15_SCENARIOS = [
  { scenarioId: "normal", version: "1.1.0", title: "后台调度与 60 日 HOLD", expected: "真实后台工作流继续执行，CN/US权威账本与FakeBroker状态均为零委托" },
  { scenarioId: "auto-trade", version: "1.3.0", title: "双市场多会话 Fixture 自动交易", expected: "首个合成窗口错过后，两次重新评估分别经独立AUTO Mandate、FakeBroker成交、Portfolio入账并在每个合成收盘核对；本场景不代表真实市场日历、实时时钟或结算" },
  { scenarioId: "rejection", version: "1.1.0", title: "暂停与窗口拒绝", expected: "暂停和过期窗口由治理/执行服务拒绝且没有新发送" },
  { scenarioId: "recovery", version: "1.2.0", title: "Worker/总线与备份恢复", expected: "UNKNOWN后查询原单，恢复后无重复订单或账务副作用；完整备份恢复仍单独验收" }
] as const;

type Assertion = {
  assertionId: string;
  status: "WAITING";
  expected: unknown;
  actual: "NOT_RUN";
};

const ASSERTION_IDS: Record<V15Scenario, readonly string[]> = {
  normal: ["V1.5-SYS-SCHEDULE-001", "V1.5-HOLD-002"],
  "auto-trade": ["V1.5-AUTO-ORDER-001", "V1.5-AUTO-RECON-001", "V1.5-AUTO-EOD-RECON-001"],
  rejection: ["V1.5-OPS-PAUSE-001", "V1.5-REJECTION-ZERO-SIDE-EFFECTS-001"],
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
        environmentMode: "PAPER",
        dataMode: "FIXTURE",
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
