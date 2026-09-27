import { randomUUID } from "node:crypto";

export type V24Scenario = "normal" | "rejection" | "recovery";
export const V24_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "Paper 执行链前置检查", expected: "当前真实执行链未接通时必须保持 WAITING" },
  { scenarioId: "rejection", version: "1.0.0", title: "拒绝场景前置检查", expected: "未实际运行时不生成陈旧拒绝或幂等 PASS" },
  { scenarioId: "recovery", version: "1.0.0", title: "恢复场景前置检查", expected: "未实际运行时不生成恢复或对账 PASS" }
] as const;
type Assertion = { assertionId: string; status: "WAITING"; expected: unknown; actual: unknown };
export class V24ContinuousPaperEngine {
  run(scenarioId: V24Scenario, seed = 20260907): any {
    const testRunId = randomUUID();
    const reason = "SNAPSHOT-to-Mandate/risk/reservation/FakeBroker execution is not connected to this acceptance scenario";
    const assertion: Assertion = {
      assertionId: `V2.4-${scenarioId.toUpperCase()}-CHAIN-001`,
      status: "WAITING",
      expected: "A real isolated Paper execution chain and backend evidence are required before this scenario can run",
      actual: "NOT_RUN"
    };
    return {
      testRunId,
      stageId: "V2.4",
      scenarioId,
      scenarioVersion: "1.0.0",
      seed,
      status: "WAITING",
      environmentMode: "PAPER",
      dataMode: "NOT_CONNECTED",
      brokerMode: "FAKE",
      executionPolicy: "PREPARATION_ONLY",
      executionGate: { status: "BLOCKED", reason, liveTradingEnabled: false },
      mandate: { schemaVersion: "v24-paper-mandate-v1", status: "PREPARATION_ONLY", mandateId: "UNSET", strategyVersion: "UNSET", approvalEvidenceRef: "UNSET" },
      source: { status: "NOT_RUN", sourceId: null, observedAt: null },
      orders: [],
      fills: [],
      reconciliation: { status: "NOT_RUN", differences: [] },
      observationDays: 0,
      assertions: [assertion]
    };
  }
}
