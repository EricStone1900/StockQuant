import { randomUUID } from "node:crypto";

export type V24Scenario = "normal" | "rejection" | "recovery" | "external-reconciliation" | "crossday-settlement" | "candidate-binding";
export const V24_SCENARIOS = [
  { scenarioId: "normal", version: "2.2.0", title: "日线目标与采样 Fixture 驱动的隔离 Paper 正常执行", expected: "同一TestRun的持久日线目标、采样结果驱动授权、风险、预留、FakeBroker Fill、Portfolio账本和对账" },
  { scenarioId: "rejection", version: "2.2.0", title: "采样 Fixture 陈旧行情拒绝", expected: "同一TestRun中持久化的陈旧采样被治理拒绝，账本无订单和成交副作用" },
  { scenarioId: "recovery", version: "2.2.0", title: "日线目标与采样 Fixture 驱动的Paper响应丢失恢复", expected: "接受响应不可用时按原namespace/clientOrderId查询，并重读原持久日线目标核对命令身份" },
  { scenarioId: "external-reconciliation", version: "2.2.0", title: "采样 Fixture Paper与FakeBroker独立外部订单差异", expected: "日线目标和采样驱动的Paper订单与独立券商侧订单差异在正式证据页显示" },
  { scenarioId: "crossday-settlement", version: "2.2.0", title: "跨交易日 SELL 与结算日资金释放", expected: "冻结 Fixture 在同一TestRun完成前日BUY、下一交易日SELL、结算日资金释放，并核对Portfolio与FakeBroker独立账" }
  ,{ scenarioId: "candidate-binding", version: "2.5.0", title: "Candidate A 隔离账户与未激活 Mandate 绑定", expected: "冻结候选参数绑定独立 PAPER/FAKE 账户和持久 Governance Mandate；Mandate 保持未激活，不生成订单、预算或调度副作用；到期、陈旧、未知行情和错过窗口均以明确原因失败关闭" }
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
