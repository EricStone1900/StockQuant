import { describe, expect, it } from "vitest";
import { admitV24CandidateExecution } from "../../src/application/v24-candidate-execution-gate.js";

const input = () => ({ acceptedAt: "2026-10-16T09:31:00+08:00", evaluatedAt: "2026-10-16T09:31:50+08:00", referencePrice: "10.0000", snapshot: { security: "600000.SH", market: "CN_A", status: "READY", observedAt: "2026-10-16T09:31:10+08:00", ingestedAt: "2026-10-16T09:31:11+08:00", price: "10.0500" } });

describe("C5 Candidate A strict execution admission", () => {
  it("admits only a post-acceptance snapshot within the exact window and 60 seconds", () => {
    expect(admitV24CandidateExecution(input())).toMatchObject({ status: "ELIGIBLE", quoteAgeSeconds: 40, deviationBps: 50 });
  });
  it.each([
    ["before window", (x: ReturnType<typeof input>) => { x.acceptedAt = "2026-10-16T09:30:59+08:00"; }],
    ["end exclusive", (x: ReturnType<typeof input>) => { x.acceptedAt = "2026-10-16T09:35:00+08:00"; x.evaluatedAt = "2026-10-16T09:35:50+08:00"; }],
  ])("pauses %s", (_name, mutate) => { const x = input(); mutate(x); expect(admitV24CandidateExecution(x)).toEqual({ status: "PAUSED", reason: "EXECUTION_WINDOW_CLOSED" }); });
  it("requires evaluation in the same trading-day window, including the exclusive end", () => {
    const boundary = input(); boundary.evaluatedAt = "2026-10-16T09:34:59+08:00"; boundary.snapshot.observedAt = "2026-10-16T09:34:50+08:00"; boundary.snapshot.ingestedAt = "2026-10-16T09:34:51+08:00";
    expect(admitV24CandidateExecution(boundary)).toMatchObject({ status: "ELIGIBLE", quoteAgeSeconds: 9 });
    boundary.evaluatedAt = "2026-10-16T09:35:00+08:00";
    expect(admitV24CandidateExecution(boundary)).toEqual({ status: "PAUSED", reason: "EXECUTION_WINDOW_CLOSED" });
    const nextDay = input(); nextDay.evaluatedAt = "2026-10-19T09:31:50+08:00"; nextDay.snapshot.observedAt = "2026-10-19T09:31:10+08:00"; nextDay.snapshot.ingestedAt = "2026-10-19T09:31:11+08:00";
    expect(admitV24CandidateExecution(nextDay)).toEqual({ status: "PAUSED", reason: "EXECUTION_WINDOW_CLOSED" });
  });
  it("pauses a snapshot that is too old or not observed after acceptance", () => {
    const stale = input(); stale.evaluatedAt = "2026-10-16T09:32:11+08:00";
    expect(admitV24CandidateExecution(stale)).toEqual({ status: "PAUSED", reason: "SNAPSHOT_STALE" });
    const old = input(); old.snapshot.observedAt = old.acceptedAt; old.snapshot.ingestedAt = old.acceptedAt;
    expect(admitV24CandidateExecution(old)).toEqual({ status: "PAUSED", reason: "SNAPSHOT_NOT_AFTER_ACCEPTANCE" });
  });
  it("preserves an explicit reason when quote status is unknown", () => {
    const unknown = input(); unknown.snapshot.status = "UNKNOWN";
    expect(admitV24CandidateExecution(unknown)).toEqual({ status: "PAUSED", reason: "SNAPSHOT_STATUS_UNKNOWN" });
  });
  it("pauses a mismatched or over-deviation snapshot", () => {
    const mismatch = input(); mismatch.snapshot.security = "000001.SZ";
    expect(admitV24CandidateExecution(mismatch)).toEqual({ status: "PAUSED", reason: "SNAPSHOT_INVALID" });
    const deviation = input(); deviation.snapshot.price = "10.1001";
    expect(admitV24CandidateExecution(deviation)).toEqual({ status: "PAUSED", reason: "PRICE_DEVIATION_EXCEEDED" });
  });
});
