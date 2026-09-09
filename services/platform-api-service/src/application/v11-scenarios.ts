import type { ScenarioId } from "../domain/test-run.js";

export const V11_SCENARIOS: ReadonlyArray<{ scenarioId: ScenarioId; version: "1.0.0"; title: string; expected: string }> = [
  { scenarioId: "normal", version: "1.0.0", title: "初始化幂等", expected: "CN 10000 CNY，期初流水一笔，十次重试无累加" },
  { scenarioId: "rejection", version: "1.0.0", title: "初始化冲突与隔离", expected: "同键异载荷 409，跨 owner 查询 403，无额外流水" },
  { scenarioId: "recovery", version: "1.0.0", title: "持久化恢复", expected: "重启组合服务后，以原 testRunId 复核账户事实" }
];

export function isV11Scenario(value: unknown): value is ScenarioId {
  return V11_SCENARIOS.some((scenario) => scenario.scenarioId === value);
}
