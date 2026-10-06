import { describe, expect, it } from "vitest";
import { V25DataScaleEngine, assertPitSafe, cancelTask, queryPartition, walkForwardSplits } from "../../src/application/v25-data-scale.js";

describe("V2.5 data scale scenarios", () => {
  const engine = new V25DataScaleEngine();

  it("computes the deterministic synthetic fixture scale and regression from rows", () => {
    const result = engine.run("normal", 20260907, "v25-normal-test");
    expect(result.status).toBe("COMPLETED");
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
    expect(result.evidence.scale).toMatchObject({ securities: 20, sessions: 60, rows: 1200, dataVersion: "v2.5-acceptance-synthetic-fixture-v2" });
    expect(result.evidence.regression).toMatchObject({ baselineRows: 300, comparableRows: 300, unchanged: true });
    expect(result.evidence).toMatchObject({ modelTraining: "NOT_RUN", marketPIT: "NOT_RUN", durableMarketDataQuery: "NOT_RUN" });
    expect(result.evidence.splitValidation.walkForwardWindows).toBe(1);
  });

  it("executes the in-memory fixture admission, versioned cache and budget guards", () => {
    const result = engine.run("rejection", 20260907, "v25-rejection-test");
    expect(result.assertions).toHaveLength(3);
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
    expect(result.evidence.productionQueueValidation).toBe("NOT_RUN");
    expect(result.evidence.queue).toMatchObject({ maxConcurrent: 4, submitted: 5, admitted: 4, rejected: 1 });
    expect(result.evidence.budget).toMatchObject({ maxRows: 1000, requestedRows: 1001, code: "RESOURCE_BUDGET_EXCEEDED", published: false });
  });

  it("resumes a synthetic fixture from its checkpoint and keeps the durable recovery limit explicit", () => {
    const result = engine.run("recovery", 20260907, "v25-recovery-test");
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
    expect(result.evidence.resume).toMatchObject({ duplicateRows: 0, importedRows: 1200 });
    expect(result.evidence.durableImportRecovery).toBe("NOT_RUN");
    expect(result.evidence.cancellation).toMatchObject({ status: "CANCELLED", published: false });
  });

  it("verifies partition isolation, cancellation and walk-forward PIT boundaries", () => {
    const sessions = ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"];
    const rows = sessions.map((session) => ({ security: "S0", session, value: 1 }));
    expect(queryPartition(rows, "S0", "2024-01-02", "2024-01-03")).toHaveLength(2);
    expect(walkForwardSplits(sessions, 2, 1, 1)).toHaveLength(1);
    expect(assertPitSafe(rows, "2024-01-02", "2024-01-03")).toBe(true);
    expect(cancelTask("RUNNING")).toBe("CANCELLED");
    expect(cancelTask("COMPLETED")).toBe("COMPLETED");
  });
});
