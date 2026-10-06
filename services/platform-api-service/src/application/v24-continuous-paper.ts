import { randomUUID } from "node:crypto";

export type V24Scenario = "normal" | "rejection" | "recovery" | "external-reconciliation";
export const V24_SCENARIOS = [
  { scenarioId: "normal", version: "2.0.0", title: "隔离 Fixture Paper 正常执行", expected: "授权、风险、预留、SNAPSHOT、FakeBroker Fill、Portfolio 账本和对账全部通过" },
  { scenarioId: "rejection", version: "2.0.0", title: "隔离 Fixture Paper 拒绝路径", expected: "过期/不合格快照被治理与执行门禁拒绝，账本无订单和成交副作用" },
  { scenarioId: "recovery", version: "2.0.0", title: "隔离 Fixture Paper 响应丢失恢复", expected: "接受响应不可用时按原 namespace/clientOrderId 查询并核对已持久业务结果" },
  { scenarioId: "external-reconciliation", version: "2.0.0", title: "FakeBroker独立外部订单差异", expected: "独立券商侧订单被持久记录并在正式证据页显示本地缺单差异" }
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
