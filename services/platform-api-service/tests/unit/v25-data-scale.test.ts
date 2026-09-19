import { describe, expect, it } from "vitest";
import { V25DataScaleEngine, assertPitSafe, cancelTask, queryPartition, walkForwardSplits } from "../../src/application/v25-data-scale.js";

describe("V2.5 data scale scenarios", () => {
  const engine = new V25DataScaleEngine();

  it("keeps the canonical regression stable at S2 scale", () => {
    const result = engine.run("normal", 20260907, "v25-normal-test");
    expect(result.status).toBe("COMPLETED");
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
    expect(result.evidence.regression).toMatchObject({ unchanged: true });
  });

  it("rejects concurrency, cache and resource boundary violations", () => {
    const result = engine.run("rejection", 20260907, "v25-rejection-test");
    expect(result.assertions).toHaveLength(3);
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
  });

  it("resumes from a checkpoint without publishing partial data", () => {
    const result = engine.run("recovery", 20260907, "v25-recovery-test");
    expect(result.assertions.every((assertion) => assertion.status === "PASS")).toBe(true);
    expect(result.evidence.resume).toMatchObject({ duplicateRows: 0, importedRows: 1200 });
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
