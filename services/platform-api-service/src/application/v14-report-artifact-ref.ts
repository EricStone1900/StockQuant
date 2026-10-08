import { createHash } from "node:crypto";
import type { ArtifactRef, V14DailyBacktestFixtureResult } from "../contracts/generated-types.js";
import type { StoredStageRun } from "../ports/stage-run-repository.js";

type DurableReport = NonNullable<V14DailyBacktestFixtureResult["durableReport"]>;
const HASH = /^[a-f0-9]{64}$/u;

export function projectV14ReportArtifactRef(testRunId: string, ownerId: string, durable: DurableReport): ArtifactRef {
  return {
    schemaVersion: "artifact-ref.v1", artifactId: durable.resultSha256, testRunId, ownerId,
    kind: "BACKTEST_REPORT", namespace: `research/${testRunId}/daily-backtest`,
    mediaType: "application/vnd.stockquant.v14-backtest-report+json", sha256: durable.resultSha256,
    status: "PUBLISHED", sourceRef: `quant-research-service:v1.4:${testRunId}`,
  };
}

export function projectV14RunArtifactRefs(run: StoredStageRun): ArtifactRef[] {
  if (run.stageId !== "V1.4" || run.status !== "COMPLETED") return [];
  const payload = run.evidence.reportPayload as (V14DailyBacktestFixtureResult & { testRunId?: string }) | undefined;
  if (!payload || payload.testRunId !== run.testRunId || payload.status !== "COMPLETED" || payload.assertions.some((item) => item.status !== "PASS")
    || !payload.durableReport || !HASH.test(payload.durableReport.resultSha256) || !HASH.test(payload.durableReport.manifestSha256)) return [];
  return [projectV14ReportArtifactRef(run.testRunId, run.ownerId, payload.durableReport)];
}

export function verifyV14ReportPayload(run: StoredStageRun, artifactId: string): { ref: ArtifactRef; payload: Omit<V14DailyBacktestFixtureResult, "durableReport"> } | null {
  const ref = projectV14RunArtifactRefs(run).find((item) => item.artifactId === artifactId);
  const payload = run.evidence.reportPayload as (V14DailyBacktestFixtureResult & { testRunId?: string }) | undefined;
  if (!ref || !payload) return null;
  const { durableReport, ...content } = payload;
  const canonical = (value: unknown): string => {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  };
  return createHash("sha256").update(canonical(content)).digest("hex") === durableReport?.resultSha256 ? { ref, payload: content as Omit<V14DailyBacktestFixtureResult, "durableReport"> } : null;
}
