import { createHash } from "node:crypto";

export type V31GateRun = {
  testRunId: string;
  stageId: string;
  scenarioId: string;
  status: string;
  assertions: unknown[];
  evidence: Record<string, unknown>;
};

export type V31GateEvaluation = {
  stageStatus: "PASS" | "NOT_RUN";
  evidenceSha256: string;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new Error("V3.1 acceptance evidence is not JSON serializable");
    return serialized;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function evaluateV31PromotionGate(run: V31GateRun): V31GateEvaluation {
  const evidenceSha256 = createHash("sha256").update(canonicalJson({
    testRunId: run.testRunId,
    stageId: run.stageId,
    scenarioId: run.scenarioId,
    status: run.status,
    assertions: run.assertions,
    evidence: run.evidence,
  }), "utf8").digest("hex");
  const evidence = run.evidence as Record<string, any>;
  const model = evidence.modelCall as Record<string, unknown> | undefined;
  const orchestration = evidence.orchestration as Record<string, any> | undefined;
  const runnerJob = orchestration?.runnerJob as Record<string, unknown> | undefined;
  const allAssertionsPass = run.assertions.length > 0 && run.assertions.every((item) => Boolean(item && typeof item === "object" && (item as Record<string, unknown>).status === "PASS"));
  const requiredAssertionsPass = ["V3.1-REAL-MODEL-001", "V3.1-RUNNER-001"].every((assertionId) => run.assertions.some((item) => Boolean(item && typeof item === "object" && (item as Record<string, unknown>).assertionId === assertionId && (item as Record<string, unknown>).status === "PASS")));
  const realModelEvidence = model?.providerMode === "LIVE"
    && typeof model.modelRunId === "string" && model.modelRunId.length > 0
    && typeof model.responseSha256 === "string" && /^[a-f0-9]{64}$/.test(model.responseSha256)
    && Number.isSafeInteger(model.actualCostCents) && (model.actualCostCents as number) >= 0;
  const completedRunnerEvidence = runnerJob?.status === "COMPLETED"
    && Array.isArray(runnerJob.artifacts) && runnerJob.artifacts.some((item: any) => item?.status === "PUBLISHED" && /^[a-f0-9]{64}$/.test(item.sha256 ?? ""));
  const stagePass = run.stageId === "V3.1"
    && run.scenarioId === "normal"
    && run.status === "COMPLETED"
    && allAssertionsPass
    && requiredAssertionsPass
    && evidence.environmentMode === "RESEARCH"
    && evidence.brokerMode === "FAKE"
    && realModelEvidence
    && completedRunnerEvidence;
  return { stageStatus: stagePass ? "PASS" : "NOT_RUN", evidenceSha256 };
}
