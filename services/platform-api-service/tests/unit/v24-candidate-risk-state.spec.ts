import { describe, expect, it } from "vitest";
import { advanceV24CandidateRiskSession, applyV24CandidateRiskFacts, applyV24CandidateRiskFill, initializeV24CandidateRiskState } from "../../src/application/v24-candidate-risk-state.js";

const input = () => ({ testRunId: "run", ownerId: "owner", accountId: "account", namespace: "v24-paper-v2-run", sessionDate: "2026-10-16", initialCash: "10000.0000", maxGrossExposure: "2000.0000", maxDailyTurnover: "2000.0000", cumulativeLossLimit: "200.0000" });

describe("C5 candidate risk state", () => {
  it("initializes an inactive Mandate as an isolated zero-fact pause", () => {
    expect(initializeV24CandidateRiskState({ ...input(), mandateStatus: "PENDING" })).toMatchObject({ status: "PAUSED", reason: "MANDATE_INACTIVE", dailyTurnover: "0.0000", grossExposure: "0.0000", cumulativeLoss: "0.0000" });
  });
  it("requires exact scope and positive fixed limits", () => {
    expect(() => initializeV24CandidateRiskState({ ...input(), namespace: "other", mandateStatus: "PENDING" })).toThrow("C5_RISK_STATE_INPUT_INVALID");
    expect(() => initializeV24CandidateRiskState({ ...input(), maxDailyTurnover: "0", mandateStatus: "ACTIVE" })).toThrow("C5_RISK_STATE_INPUT_INVALID");
  });
  it.each([
    [{ dailyTurnover: "2000.0001", grossExposure: "0.0000", cumulativeLoss: "0.0000" }, "DAILY_TURNOVER_LIMIT"],
    [{ dailyTurnover: "0.0000", grossExposure: "2000.0001", cumulativeLoss: "0.0000" }, "GROSS_EXPOSURE_LIMIT"],
    [{ dailyTurnover: "0.0000", grossExposure: "0.0000", cumulativeLoss: "200.0000" }, "LOSS_LIMIT_REACHED"],
  ])("pauses an active candidate at %s", (facts, reason) => {
    const active = initializeV24CandidateRiskState({ ...input(), mandateStatus: "ACTIVE" });
    expect(applyV24CandidateRiskFacts(active, facts)).toMatchObject({ status: "PAUSED", reason, ...facts });
  });
  it("does not allow a fact update to resume an already paused candidate", () => {
    const paused = initializeV24CandidateRiskState({ ...input(), mandateStatus: "PENDING" });
    expect(applyV24CandidateRiskFacts(paused, { dailyTurnover: "0.0000", grossExposure: "0.0000", cumulativeLoss: "0.0000" })).toMatchObject({ status: "PAUSED", reason: "MANDATE_INACTIVE" });
  });
  it("records a reconciled Fill exactly once and applies its notional to the daily turnover", () => {
    const active = initializeV24CandidateRiskState({ ...input(), mandateStatus: "ACTIVE" });
    const fill = { externalFillId: "fill-1", security: "600000.SH", quantity: 100, price: "10.2500", currency: "CNY", tradeDate: "2026-10-16", grossExposure: "1025.0000", cumulativeLoss: "5.0000", reconciliation: "MATCH" as const };
    const recorded = applyV24CandidateRiskFill(active, fill);
    expect(recorded).toMatchObject({ dailyTurnover: "1025.0000", grossExposure: "1025.0000", cumulativeLoss: "5.0000", appliedFills: [{ externalFillId: "fill-1" }], status: "ACTIVE" });
    expect(applyV24CandidateRiskFill(recorded, fill)).toEqual(recorded);
  });
  it("fails closed when a duplicate Fill changes or crosses the bounded trading date", () => {
    const active = initializeV24CandidateRiskState({ ...input(), mandateStatus: "ACTIVE" });
    const fill = { externalFillId: "fill-1", security: "600000.SH", quantity: 100, price: "10.2500", currency: "CNY", tradeDate: "2026-10-16", grossExposure: "1025.0000", cumulativeLoss: "5.0000", reconciliation: "MATCH" as const };
    const recorded = applyV24CandidateRiskFill(active, fill);
    expect(() => applyV24CandidateRiskFill(recorded, { ...fill, price: "10.2600" })).toThrow("C5_RISK_FILL_CONFLICT");
    expect(() => applyV24CandidateRiskFill(active, { ...fill, tradeDate: "2026-10-17" })).toThrow("C5_RISK_FILL_INPUT_INVALID");
  });
  it("rejects a Fill unless independent Portfolio and FakeBroker facts have reconciled", () => {
    const active = initializeV24CandidateRiskState({ ...input(), mandateStatus: "ACTIVE" });
    expect(() => applyV24CandidateRiskFill(active, { externalFillId: "fill-1", security: "600000.SH", quantity: 100, price: "10.2500", currency: "CNY", tradeDate: "2026-10-16", grossExposure: "1025.0000", cumulativeLoss: "5.0000", reconciliation: "DISCREPANCY" as never })).toThrow("C5_RISK_FILL_INPUT_INVALID");
  });
  it("resets the daily ledger on a later session and records an explicit threshold-pause recovery", () => {
    const paused = applyV24CandidateRiskFacts(initializeV24CandidateRiskState({ ...input(), mandateStatus: "ACTIVE" }), { dailyTurnover: "2000.0001", grossExposure: "0.0000", cumulativeLoss: "0.0000" });
    expect(() => advanceV24CandidateRiskSession(paused, { nextSessionDate: "2026-10-17", grossExposure: "0.0000", cumulativeLoss: "0.0000", reconciliation: "MATCH" })).toThrow("C5_RISK_SESSION_APPROVAL_REQUIRED");
    expect(advanceV24CandidateRiskSession(paused, { nextSessionDate: "2026-10-17", grossExposure: "0.0000", cumulativeLoss: "0.0000", reconciliation: "MATCH", recoveryApproval: { approvedBy: "fixture-operator", approvedAt: "2026-10-17T09:30:00+08:00" } })).toMatchObject({ sessionDate: "2026-10-17", dailyTurnover: "0.0000", appliedFills: [], status: "ACTIVE", sessionTransitions: [{ fromSessionDate: "2026-10-16", toSessionDate: "2026-10-17", approvedBy: "fixture-operator" }] });
  });
  it("never rolls an inactive Mandate forward into an active risk state", () => {
    const paused = initializeV24CandidateRiskState({ ...input(), mandateStatus: "PENDING" });
    expect(() => advanceV24CandidateRiskSession(paused, { nextSessionDate: "2026-10-17", grossExposure: "0.0000", cumulativeLoss: "0.0000", reconciliation: "MATCH", recoveryApproval: { approvedBy: "fixture-operator", approvedAt: "2026-10-17T09:30:00+08:00" } })).toThrow("C5_RISK_SESSION_MANDATE_INACTIVE");
  });
});
