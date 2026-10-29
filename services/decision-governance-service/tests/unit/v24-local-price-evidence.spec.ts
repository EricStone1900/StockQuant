import { describe, expect, it, vi } from "vitest";
import { resolveV24LocalPriceEvidence, type V24LocalPriceEvidencePorts } from "../../src/application/v24-local-price-evidence.js";
import { evaluateAutoMandate, type AutoMandateDecision } from "../../src/domain/auto-mandate.js";

const scope = { ownerId: "owner", accountId: "22222222-2222-4222-8222-222222222222", testRunId: "11111111-1111-4111-8111-111111111111", namespace: "v24-paper-v2-11111111-1111-4111-8111-111111111111" };
const clientOrderId = `v24-fixture-v2-${scope.testRunId}-20240104`;
const input = { scope, targetId: "target", clientOrderId, evaluatedAt: "2024-01-04T09:31:50+08:00" };
function setup() {
  const target = { ...scope, targetId: "target", clientOrderId, dataMode: "FIXTURE", fixtureSha256: "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea", strategySha256: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", sessionDate: "2024-01-04", evaluationAt: "2024-01-04T09:31:00+08:00", input: { referencePrice: "10.2500" }, decision: { action: "BUY", quantity: 100 }, dailyBarProvenance: { completionIds: ["bar-1", "bar-2"] } };
  const order = { ...scope, clientOrderId, targetId: "target", security: "600000.SH", side: "BUY", quantity: 100, status: "ACCEPTED_INTENT", acceptedAt: "2024-01-04T09:31:00+08:00" };
  const snapshot = { ...scope, clientOrderId, snapshotId: "snapshot-1", security: "600000.SH", market: "CN_A", dataMode: "FIXTURE", status: "READY", price: "10.2500", observedAt: "2024-01-04T09:31:10+08:00", ingestedAt: "2024-01-04T09:31:11+08:00" };
  const ports: V24LocalPriceEvidencePorts = { readTarget: vi.fn(async () => target), readOriginalIntent: vi.fn(async () => order), readFirstEligibleSnapshot: vi.fn(async () => snapshot) };
  return { ports, target, order, snapshot };
}

describe("C5 local scoped price evidence", () => {
  it("uses the persisted snapshot price and exact fee for budget instead of the old 10.00 fixture", async () => {
    const x = setup(); const facts = await resolveV24LocalPriceEvidence(x.ports, input);
    expect(facts).toMatchObject({ price: "10.25", fee: "5.00", budgetAmount: "1030.00", quantity: 100, snapshotId: "snapshot-1" });
    const mandate = { mandateId: "mandate", mandateVersion: 1, contentHash: "a".repeat(64), ownerId: scope.ownerId, testRunId: scope.testRunId, accountId: scope.accountId, strategyVersion: x.target.strategySha256, market: "CN_A" as const, currency: "CNY" as const, securityScope: ["600000.SH"], maxOrderAmount: "1029.00", maxTotalAmount: "2000.00", maxOrderCount: 1, validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00", status: "ACTIVE" as const };
    const proposal: AutoMandateDecision = { proposalId: "proposal", proposalVersion: 1, contentHash: "b".repeat(64), ownerId: scope.ownerId, testRunId: scope.testRunId, accountId: scope.accountId, strategyVersion: x.target.strategySha256, operation: "REBALANCE", market: "CN_A", currency: "CNY", legs: [{ securityId: "600000.SH", side: facts.side, quantity: facts.quantity, limitPrice: facts.price, estimatedFee: facts.fee }] };
    const evaluate = (limit: string) => evaluateAutoMandate({ mandate: { ...mandate, maxOrderAmount: limit }, proposal, now: input.evaluatedAt, acceptedOrReservedAmount: "0.00", acceptedOrderCount: 0 });
    expect(evaluate("1029.00")).toMatchObject({ status: "REJECTED", reasonCode: "BUDGET_EXCEEDED" });
    expect(evaluate("1030.00")).toMatchObject({ status: "AUTHORIZED", reservedAmount: "1030.00" });
  });
  it("rejects missing or foreign facts and altered target/order identities", async () => {
    const missing = setup(); vi.mocked(missing.ports.readFirstEligibleSnapshot).mockResolvedValue(null);
    await expect(resolveV24LocalPriceEvidence(missing.ports, input)).rejects.toThrow("FACTS_UNAVAILABLE");
    const foreign = setup(); foreign.snapshot.ownerId = "other";
    await expect(resolveV24LocalPriceEvidence(foreign.ports, input)).rejects.toThrow("SCOPE_MISMATCH");
    const wrongRun = setup(); wrongRun.snapshot.testRunId = "33333333-3333-4333-8333-333333333333";
    await expect(resolveV24LocalPriceEvidence(wrongRun.ports, input)).rejects.toThrow("SCOPE_MISMATCH");
    const wrongStatus = setup(); wrongStatus.order.status = "FILLED";
    await expect(resolveV24LocalPriceEvidence(wrongStatus.ports, input)).rejects.toThrow("ORDER_MISMATCH");
    const forged = setup(); forged.order.quantity = 50;
    await expect(resolveV24LocalPriceEvidence(forged.ports, input)).rejects.toThrow("ORDER_MISMATCH");
    const badBars = setup(); badBars.target.dailyBarProvenance.completionIds = ["same", "same"];
    await expect(resolveV24LocalPriceEvidence(badBars.ports, input)).rejects.toThrow("TARGET_INVALID");
  });
  it("fails closed for stale, pre-acceptance, deviating, sub-cent and out-of-window quotes", async () => {
    const stale = setup(); await expect(resolveV24LocalPriceEvidence(stale.ports, { ...input, evaluatedAt: "2024-01-04T09:32:11+08:00" })).rejects.toThrow("SNAPSHOT_INVALID");
    const early = setup(); early.snapshot.observedAt = early.order.acceptedAt;
    await expect(resolveV24LocalPriceEvidence(early.ports, input)).rejects.toThrow("SNAPSHOT_INVALID");
    const deviation = setup(); deviation.snapshot.price = "10.5000";
    await expect(resolveV24LocalPriceEvidence(deviation.ports, input)).rejects.toThrow("DEVIATION_EXCEEDED");
    const subcent = setup(); subcent.snapshot.price = "10.2501";
    await expect(resolveV24LocalPriceEvidence(subcent.ports, input)).rejects.toThrow("PRECISION_INVALID");
    const closed = setup(); await expect(resolveV24LocalPriceEvidence(closed.ports, { ...input, evaluatedAt: "2024-01-04T09:35:00+08:00" })).rejects.toThrow("WINDOW_INVALID");
  });
});
