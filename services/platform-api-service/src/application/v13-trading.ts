import { randomUUID } from "node:crypto";
import type { V13PaperStageRunRequest } from "../contracts/generated-types.js";

export type V13Scenario = "normal" | "rejection" | "recovery";
export const V13_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "全成与不可变账本", expected: "买入100股，现金8995、持仓100，唯一成交" },
  { scenarioId: "rejection", version: "1.0.0", title: "治理与风控拒绝", expected: "现金不足、T+1、过期授权和超预算均拒绝且无place" },
  { scenarioId: "recovery", version: "1.0.0", title: "UNKNOWN与重复成交恢复", expected: "丢响应进入UNKNOWN，原单查询恢复，重复Fill只入账一次" }
] as const;

export function isV13PaperStageRunRequest(value: unknown): value is V13PaperStageRunRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  if (Object.keys(request).some((key) => key !== "scenarioId" && key !== "seed")) return false;
  return V13_SCENARIOS.some((scenario) => scenario.scenarioId === request.scenarioId)
    && Number.isSafeInteger(request.seed)
    && Number(request.seed) >= 0
    && Number(request.seed) <= 2147483647;
}

type Assertion = { assertionId: string; status: "WAITING"; expected: unknown; actual: "NOT_RUN" };
export type V13Run = {
  testRunId: string;
  stageId: "V1.3";
  scenarioId: V13Scenario;
  seed: number;
  status: "WAITING";
  assertions: Assertion[];
  evidence: Record<string, unknown>;
};

const requiredServices = ["decision-governance-service", "trade-execution-service", "portfolio-risk-service", "FakeBroker"];

/**
 * V1.3's former local simulation fabricated order/Fill/account facts and then
 * marked them PASS. Until the real isolated service workflow is connected,
 * persist an explicit WAITING result instead of presenting those examples as
 * business evidence.
 */
export class V13TradingEngine {
  run(scenarioId: V13Scenario, seed = 20260907): V13Run {
    const testRunId = randomUUID();
    const scenario = V13_SCENARIOS.find((item) => item.scenarioId === scenarioId);
    const assertionIds = scenarioId === "normal"
      ? ["V1.3-EXE-FULL-FILL-001", "V1.3-GOV-AUTH-001"]
      : scenarioId === "rejection"
        ? ["V1.3-GOV-REJECT-001", "V1.3-RISK-REJECT-002"]
        : ["V1.3-EXE-UNKNOWN-001", "V1.3-LEDGER-IDEMPOTENCY-001"];
    const assertions = assertionIds.map((assertionId) => ({
      assertionId,
      status: "WAITING" as const,
      expected: "Persisted facts from the isolated Governance, Trade Execution, Portfolio ledger and FakeBroker workflow",
      actual: "NOT_RUN" as const,
    }));
    return {
      testRunId,
      stageId: "V1.3",
      scenarioId,
      seed,
      status: "WAITING",
      assertions,
      evidence: {
        evidenceScope: "PLATFORM_WAITING_DECLARATION",
        businessExecution: "NOT_RUN",
        requiredBusinessServices: requiredServices,
        businessServicesCalled: [],
        scenarioExpectation: scenario?.expected ?? "unknown scenario",
        environmentMode: "PAPER",
        dataMode: "FIXTURE",
        brokerMode: "FAKE",
        liveTradingEnabled: false,
        seed,
        orderFacts: "NOT_CREATED",
        fillFacts: "NOT_CREATED",
        portfolioLedgerFacts: "NOT_CREATED",
        runClockNow: "2026-09-28T09:31:00+08:00",
        strategyVersion: "fixture-manual-test-v1",
      },
    };
  }
}
