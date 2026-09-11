import { describe, expect, it } from "vitest";
import { V25DataScaleEngine } from "../../src/application/v25-data-scale.js";

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
});
