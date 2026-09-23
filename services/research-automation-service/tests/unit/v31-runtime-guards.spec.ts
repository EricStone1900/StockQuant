import { describe, expect, it } from "vitest";
import { BudgetLedger, sha256, validateArtifactRef, validateRunnerJob } from "../../src/application/v31-runtime-guards.js";

const job = {
  schemaVersion: "v3.1-runner-job-v1" as const, testRunId: "run-1", experimentId: "exp-1", imageDigest: `sha256:${"a".repeat(64)}`,
  inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`, outputNamespace: "research/run-1/exp-1/outputs",
  resources: { cpuMilli: 500, memoryMiB: 1024, timeoutSeconds: 120, pidsLimit: 64 }, networkPolicy: { mode: "DENY" as const, allowlist: [] }
};

describe("V3.1 runtime guards", () => {
  it("accepts an immutable, isolated Runner job", () => expect(() => validateRunnerJob(job)).not.toThrow());
  it("rejects cross-run namespaces and mutable image references", () => {
    expect(() => validateRunnerJob({ ...job, imageDigest: "latest" })).toThrow("immutable");
    expect(() => validateRunnerJob({ ...job, outputNamespace: "research/run-2/exp-1/outputs" })).toThrow("namespace");
  });
  it("rejects missing, unknown, or excessive resource fields and unsafe identifiers", () => {
    expect(() => validateRunnerJob({ ...job, resources: {} } as never)).toThrow("exactly");
    expect(() => validateRunnerJob({ ...job, resources: { ...job.resources, extra: 1 } } as never)).toThrow("exactly");
    expect(() => validateRunnerJob({ ...job, resources: { ...job.resources, memoryMiB: 4097 } })).toThrow("between 1 and 4096");
    expect(() => validateRunnerJob({ ...job, testRunId: "../host" })).toThrow("safe");
    expect(() => validateRunnerJob({ ...job, networkPolicy: { mode: "UNKNOWN", allowlist: [] } } as never)).toThrow("network policy");
  });
  it("validates content-addressed ArtifactRefs", () => {
    expect(() => validateArtifactRef({ schemaVersion: "v3.1-artifact-ref-v1", artifactId: "input-1", kind: "INPUT", namespace: "research/run-1/exp-1/inputs", sha256: "c".repeat(64), status: "PUBLISHED", sourceRef: "fixture:v3.1" })).not.toThrow();
    expect(() => validateArtifactRef({ schemaVersion: "v3.1-artifact-ref-v1", artifactId: "bad", kind: "INPUT", namespace: "research/run-1/exp-1/outputs", sha256: "c".repeat(64), status: "PUBLISHED", sourceRef: "fixture:v3.1" })).toThrow("inputs");
    expect(sha256("fixture")).toHaveLength(64);
  });
  it("makes budget reservations idempotent and preserves UNKNOWN amounts until reconciliation", () => {
    const ledger = new BudgetLedger(3000, 1000, 80);
    expect(ledger.warningThresholdCents()).toBe(2400);
    const original = ledger.reserve("exp-1", 1000);
    expect(ledger.reserve("exp-1", 1000)).toEqual(original);
    expect(() => ledger.reserve("exp-1", 1)).toThrow("different budget");
    expect(ledger.settle("exp-1", "UNKNOWN").status).toBe("UNKNOWN");
    expect(() => ledger.reserve("exp-1", 1000)).toThrow("UNKNOWN");
    expect(() => ledger.settle("exp-1", 10)).not.toThrow();
    expect(ledger.get("exp-1")).toMatchObject({ status: "SETTLED", reservedCents: 1000, spentCents: 10 });
    expect(() => ledger.settle("exp-1", 11)).toThrow("cannot be changed");
    expect(() => ledger.reserve("exp-2", 1000)).not.toThrow();
    expect(() => ledger.reserve("exp-3", 1000)).not.toThrow();
  expect(() => ledger.reserve("exp-4", 1000)).toThrow("stage budget exhausted");
  expect(ledger.reject("exp-3").status).toBe("REJECTED");
  expect(() => ledger.reject("exp-3")).toThrow("only a reserved budget");
});
});
