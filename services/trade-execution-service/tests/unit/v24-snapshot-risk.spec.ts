import { describe, expect, it } from "vitest";
import { assessV24SnapshotRisk, type SnapshotRiskInput } from "../../src/domain/v24-snapshot-risk.js";

const input: SnapshotRiskInput = {
  security: "600000.SH",
  expectedSecurity: "600000.SH",
  market: "CN_A",
  supportedMarkets: ["CN_A"],
  acceptedAt: "2026-09-26T01:00:00.000Z",
  evaluatedAt: "2026-09-26T01:01:00.000Z",
  quote: { security: "600000.SH", observedAt: "2026-09-26T01:00:30.000Z", price: "10.0100" },
  referencePrice: "10.0000",
  freshnessLimitSeconds: 1800,
  maxDeviationBps: 20,
};

describe("V2.4 deterministic snapshot risk gate", () => {
  it("passes a fresh post-acceptance quote within the configured deviation", () => {
    expect(assessV24SnapshotRisk(input)).toEqual({ status: "PASS_RISK_CHECK", quoteAgeSeconds: 30, deviationBps: 10 });
  });

  it("rejects stale, pre-acceptance, mismatched and out-of-policy quotes", () => {
    expect(assessV24SnapshotRisk({ ...input, evaluatedAt: "2026-09-26T02:00:00.000Z" })).toMatchObject({ status: "REJECTED", reason: "STALE_QUOTE" });
    expect(assessV24SnapshotRisk({ ...input, quote: { ...input.quote, observedAt: input.acceptedAt } })).toMatchObject({ status: "REJECTED", reason: "QUOTE_NOT_AFTER_ACCEPTANCE" });
    expect(assessV24SnapshotRisk({ ...input, quote: { ...input.quote, security: "000001.SZ" } })).toMatchObject({ status: "REJECTED", reason: "SECURITY_MISMATCH" });
    expect(assessV24SnapshotRisk({ ...input, quote: { ...input.quote, price: "10.0300" } })).toMatchObject({ status: "REJECTED", reason: "PRICE_DEVIATION_EXCEEDED" });
  });

  it("compares fixed-point prices exactly at a zero-deviation boundary", () => {
    const tinyDeviation = { ...input, maxDeviationBps: 0, quote: { ...input.quote, price: "10.0001" } };
    expect(assessV24SnapshotRisk(tinyDeviation)).toMatchObject({ status: "REJECTED", reason: "PRICE_DEVIATION_EXCEEDED" });
    expect(assessV24SnapshotRisk({ ...input, maxDeviationBps: 10 })).toEqual({ status: "PASS_RISK_CHECK", quoteAgeSeconds: 30, deviationBps: 10 });
  });

  it("fails closed on non-canonical or over-precision prices and unsupported policy precision", () => {
    expect(assessV24SnapshotRisk({ ...input, quote: { ...input.quote, price: "1e-7" } })).toMatchObject({ status: "REJECTED", reason: "INVALID_PRICE" });
    expect(assessV24SnapshotRisk({ ...input, maxDeviationBps: 0.0000001 })).toMatchObject({ status: "BLOCKED", reason: "RISK_POLICY_UNSET" });
    expect(assessV24SnapshotRisk({ ...input, referencePrice: "0.0001", quote: { ...input.quote, price: `9${"0".repeat(400)}` } })).toMatchObject({ status: "REJECTED", reason: "INVALID_PRICE" });
  });

  it("blocks when the owner-approved deviation policy is still unset", () => {
    expect(assessV24SnapshotRisk({ ...input, maxDeviationBps: null })).toEqual({ status: "BLOCKED", reason: "RISK_POLICY_UNSET", configurationGaps: ["maxDeviationBps"] });
  });

  it("rejects a quote observed after its evaluation time and timestamps without an explicit zone", () => {
    expect(assessV24SnapshotRisk({ ...input, evaluatedAt: "2026-09-26T01:00:20.000Z" })).toMatchObject({ status: "REJECTED", reason: "QUOTE_FROM_FUTURE" });
    expect(assessV24SnapshotRisk({ ...input, quote: { ...input.quote, observedAt: "2026-09-26T01:00:30" } })).toMatchObject({ status: "REJECTED", reason: "INVALID_TIMESTAMP" });
  });

  it("does not treat a risk pass as an order or mandate authorization", () => {
    expect(assessV24SnapshotRisk({ ...input, market: "US_EQUITY" })).toEqual({ status: "REJECTED", reason: "UNSUPPORTED_MARKET" });
    expect(assessV24SnapshotRisk(input).status).toBe("PASS_RISK_CHECK");
  });
});
