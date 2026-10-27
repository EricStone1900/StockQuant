import { describe, expect, it } from "vitest";
import { projectV24CandidateRiskFacts } from "../../src/application/v24-candidate-risk-facts.js";

const portfolio = (overrides: Record<string, unknown> = {}) => ({
  cash: { amount: "10000.0000", currency: "CNY" }, positions: [], unsettledReceivables: [], ...overrides,
});

describe("C5 candidate risk facts", () => {
  it("projects an inactive empty account but refuses an update without independent assets and fill facts", () => {
    expect(projectV24CandidateRiskFacts({ initialCash: "10000.0000", referencePrice: "10.2500", portfolio: portfolio() })).toEqual({
      grossExposure: "0.0000", cumulativeLoss: "0.0000", netValue: "10000.0000", holdingQuantity: 0,
      dailyTurnover: { status: "NOT_AVAILABLE", reason: "FILL_FACTS_REQUIRED" },
      reconciliation: { status: "NOT_AVAILABLE", reason: "INDEPENDENT_FAKEBROKER_ASSETS_NOT_CREATED" }, eligibleForRiskUpdate: false,
    });
  });

  it("calculates holding exposure and net-value loss from the two ledgers without inferring turnover", () => {
    const result = projectV24CandidateRiskFacts({
      initialCash: "10000.0000", referencePrice: "10.2500",
      portfolio: portfolio({ cash: { amount: "8970.0000", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] }),
      independentAssets: { initial_cash: "10000.0000", current_cash: "8970.0000", currency: "CNY", positions: [{ security: "600000.SH", quantity: 100 }], unsettledReceivables: [] },
    });
    expect(result).toMatchObject({ grossExposure: "1025.0000", cumulativeLoss: "5.0000", netValue: "9995.0000", reconciliation: { status: "MATCH" }, eligibleForRiskUpdate: false });
  });

  it("reports a discrepant independent ledger as ineligible", () => {
    expect(projectV24CandidateRiskFacts({
      initialCash: "10000.0000", referencePrice: "10.2500", portfolio: portfolio(),
      independentAssets: { initial_cash: "10000.0000", current_cash: "9999.0000", currency: "CNY", positions: [], unsettledReceivables: [] },
    })).toMatchObject({ reconciliation: { status: "DISCREPANCY", reason: "PORTFOLIO_AND_FAKEBROKER_ASSETS_DIFFER" }, eligibleForRiskUpdate: false });
  });
  it("does not add an already settled receivable to cash a second time", () => {
    const result = projectV24CandidateRiskFacts({
      initialCash: "10000.0000", referencePrice: "10.2500",
      portfolio: portfolio({ cash: { amount: "10015.0000", currency: "CNY" }, unsettledReceivables: [{ amount: "1020.0000", currency: "CNY", status: "SETTLED" }] }),
      independentAssets: { initial_cash: "10000.0000", current_cash: "10015.0000", currency: "CNY", positions: [], unsettledReceivables: [{ amount: "1020.0000", currency: "CNY", status: "SETTLED" }] },
    });
    expect(result).toMatchObject({ netValue: "10015.0000", cumulativeLoss: "0.0000", reconciliation: { status: "MATCH" } });
  });
});
