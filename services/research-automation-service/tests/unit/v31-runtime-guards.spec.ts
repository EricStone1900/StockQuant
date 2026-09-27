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
    expect(() => validateArtifactRef({ schemaVersion: "v3.1-artifact-ref-v1", artifactId: "output-1", kind: "OUTPUT", namespace: "research/run-1/exp-1/outputs", sha256: "c".repeat(64), status: "PENDING", sourceRef: "runner:job-1" })).not.toThrow();
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

  it("reserves each model request before dispatch and keeps UNKNOWN request cost inside the experiment cap", () => {
    const ledger = new BudgetLedger(3000, 1000, 80);
    ledger.reserve("exp-calls", 80);
    const first = ledger.reserveModelCall("exp-calls", "model-run-1", "a".repeat(64), 60);
    expect(first).toMatchObject({ created: true, reservation: { status: "RESERVED", reservedCents: 60 } });
    expect(ledger.reserveModelCall("exp-calls", "model-run-1", "a".repeat(64), 60)).toMatchObject({ created: false, reservation: { status: "RESERVED" } });
    expect(() => ledger.reserveModelCall("exp-calls", "model-run-1", "b".repeat(64), 60)).toThrow("reused with different");

    ledger.dispatchModelCall("exp-calls", "model-run-1");
    expect(ledger.markModelCallUnknown("exp-calls", "model-run-1").status).toBe("UNKNOWN");
    expect(() => ledger.dispatchModelCall("exp-calls", "model-run-1")).toThrow("only be dispatched from RESERVED");
    expect(() => ledger.settle("exp-calls", 0)).toThrow("model call budget remains unresolved");
    expect(() => ledger.reserveModelCall("exp-calls", "model-run-2", "c".repeat(64), 21)).toThrow("budget exhausted");

    ledger.reserveModelCall("exp-calls", "model-run-2", "c".repeat(64), 20);
    ledger.dispatchModelCall("exp-calls", "model-run-2");
    expect(ledger.settleModelCall("exp-calls", "model-run-2", 15)).toMatchObject({ status: "SETTLED", spentCents: 15 });
    expect(ledger.settleModelCall("exp-calls", "model-run-1", 40)).toMatchObject({ status: "SETTLED", spentCents: 40 });
    expect(ledger.settleModelCall("exp-calls", "model-run-1", 40).status).toBe("SETTLED");
    expect(() => ledger.settleModelCall("exp-calls", "model-run-1", 41)).toThrow("cannot be changed");
    expect(() => ledger.settleModelCall("exp-calls", "model-run-2", 21)).toThrow("outside the reservation");
    expect(ledger.reserveModelCall("exp-calls", "model-run-3", "d".repeat(64), 25).created).toBe(true);
    expect(ledger.getModelCall("exp-calls", "model-run-1")).toMatchObject({ status: "SETTLED", requestedCents: 60, spentCents: 40 });
    ledger.rejectModelCall("exp-calls", "model-run-3");
    expect(() => ledger.settle("exp-calls", 54)).toThrow("below its settled model call costs");
    expect(ledger.settle("exp-calls", 55)).toMatchObject({ status: "SETTLED", spentCents: 55 });
    expect(() => ledger.reserveModelCall("exp-calls", "model-run-4", "1".repeat(64), 1)).toThrow("unavailable");
  });

  it("releases only model-call reservations proven not dispatched", () => {
    const ledger = new BudgetLedger(3000, 1000, 80);
    ledger.reserve("exp-reject-call", 50);
    ledger.reserveModelCall("exp-reject-call", "model-run", "e".repeat(64), 50);
    expect(ledger.rejectModelCall("exp-reject-call", "model-run").status).toBe("REJECTED");
    expect(() => ledger.rejectModelCall("exp-reject-call", "model-run")).toThrow("only an undispatched");
    expect(ledger.reserveModelCall("exp-reject-call", "model-run-2", "f".repeat(64), 50).created).toBe(true);
  });

  it("reports settled and uncertain model-call amounts in read-only budget snapshots", () => {
    const ledger = new BudgetLedger(3000, 1000, 80);
    ledger.reserve("exp-snapshot", 100);
    ledger.reserveModelCall("exp-snapshot", "settled", "1".repeat(64), 40);
    ledger.dispatchModelCall("exp-snapshot", "settled");
    ledger.settleModelCall("exp-snapshot", "settled", 23);
    ledger.reserveModelCall("exp-snapshot", "unknown", "2".repeat(64), 30);
    ledger.dispatchModelCall("exp-snapshot", "unknown");
    ledger.markModelCallUnknown("exp-snapshot", "unknown");
    expect(ledger.snapshot(["exp-snapshot", "missing"])).toEqual([{
      experimentId: "exp-snapshot", requestedCents: 100, reservedCents: 100, spentCents: 0, status: "RESERVED",
      modelCallSettledCents: 23, modelCallUnknownReservedCents: 30,
    }]);
  });
});
