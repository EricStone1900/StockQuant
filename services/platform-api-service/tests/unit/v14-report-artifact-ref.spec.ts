import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { projectV14RunArtifactRefs, verifyV14ReportPayload } from "../../src/application/v14-report-artifact-ref.js";

const canonical = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
};

describe("V1.4 durable report ArtifactRef", () => {
  it("projects and verifies the Quant-owned immutable result under its Platform owner and TestRun", () => {
    const testRunId = "00000000-0000-4000-8000-000000000144";
    const content = { testRunId, stageId: "V1.4", scenarioId: "normal", seed: 7, status: "COMPLETED", assertions: [{ assertionId: "V1.4-001", status: "PASS", expected: "same run", actual: "same run" }], evidence: { metrics: { finalNavCents: 100 } } };
    const resultSha256 = createHash("sha256").update(canonical(content)).digest("hex");
    const run: any = { testRunId, stageId: "V1.4", ownerId: "owner-a", status: "COMPLETED", evidence: { reportPayload: { ...content, durableReport: { resultSha256, manifestSha256: "b".repeat(64) } } } };
    const [ref] = projectV14RunArtifactRefs(run);
    expect(ref).toMatchObject({ schemaVersion: "artifact-ref.v1", artifactId: resultSha256, sha256: resultSha256, testRunId, ownerId: "owner-a", kind: "BACKTEST_REPORT", namespace: `research/${testRunId}/daily-backtest`, status: "PUBLISHED", sourceRef: `quant-research-service:v1.4:${testRunId}` });
    expect(verifyV14ReportPayload(run, resultSha256)).toMatchObject({ ref, payload: content });
    expect(verifyV14ReportPayload(run, "f".repeat(64))).toBeNull();
    run.evidence.reportPayload.evidence.metrics.finalNavCents = 101;
    expect(verifyV14ReportPayload(run, resultSha256)).toBeNull();
  });

  it("does not publish a report reference for incomplete or failed runs", () => {
    expect(projectV14RunArtifactRefs({ stageId: "V1.4", status: "RUNNING", evidence: {} } as any)).toEqual([]);
    expect(projectV14RunArtifactRefs({ stageId: "V1.4", status: "FAILED", evidence: {} } as any)).toEqual([]);
  });
});
