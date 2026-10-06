import { describe, expect, it } from "vitest";
import { BudgetLedger } from "../../src/application/v31-runtime-guards.js";
import { ModelGatewayCoordinator, type ModelGatewayReply } from "../../src/application/v31-model-gateway.js";

class FixedProvider {
  calls = 0;
  constructor(private readonly outcome: ModelGatewayReply | Error, private readonly beforeCall?: () => void) {}
  async complete(): Promise<ModelGatewayReply> {
    this.beforeCall?.();
    this.calls += 1;
    if (this.outcome instanceof Error) throw this.outcome;
    return this.outcome;
  }
}

const request = { experimentId: "exp-gateway", modelRunId: "model-run-1", requestFingerprint: "a".repeat(64), requestedCents: 80, payload: { prompt: "fixed test prompt" } };
const evidence = { provider: "fixture", model: "fixed-v1", requestId: "trace-1", inputTokens: 12, outputTokens: 8, tariffVersion: null, costBasis: "FIXTURE" as const, invoiceReconciliation: "NOT_PERFORMED" as const };

describe("V3.1 model gateway coordinator", () => {
  it("enforces a per-experiment call ceiling independently of the cent budget", () => {
    const budget = new BudgetLedger(3000, 1000, 80, 2);
    budget.reserve(request.experimentId, 100);
    for (const modelRunId of ["call-1", "call-2"]) {
      budget.reserveModelCall(request.experimentId, modelRunId, "a".repeat(64), 1);
      budget.dispatchModelCall(request.experimentId, modelRunId);
      budget.settleModelCall(request.experimentId, modelRunId, 1);
    }
    expect(() => budget.reserveModelCall(request.experimentId, "call-3", "b".repeat(64), 1)).toThrow("call count limit");
  });

  it("reserves and durably dispatches before a fixed provider reply, then settles known usage", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: { text: "fixture response" }, costCents: 23, evidence }, () => {
      expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "DISPATCHED", reservedCents: 80 });
    });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "COMPLETED", settledCostCents: 23, budgetStatus: "SETTLED" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "SETTLED", reservedCents: 80, spentCents: 23, providerEvidence: evidence });
    expect(provider.calls).toBe(1);
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "ALREADY_EXISTS", budgetStatus: "SETTLED" });
    expect(provider.calls).toBe(1);
  });

  it("does not reserve or invoke a provider when preflight is blocked", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: "unused", costCents: 0, evidence });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: false, reason: "provider host is not approved" }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "BLOCKED", reason: "provider host is not approved" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toBeNull();
    expect(provider.calls).toBe(0);
  });

  it("never invokes a provider when the durable dispatch acknowledgement is uncertain", async () => {
    class CommitThenThrowLedger extends BudgetLedger {
      override dispatchModelCall(experimentId: string, modelRunId: string) {
        super.dispatchModelCall(experimentId, modelRunId);
        throw new Error("simulated lost database acknowledgement");
      }
    }
    const budget = new CommitThenThrowLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: "must not be sent", costCents: 1, evidence });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "UNKNOWN", budgetStatus: "DISPATCHED" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "DISPATCHED", reservedCents: 80 });
    expect(provider.calls).toBe(0);
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "ALREADY_EXISTS", budgetStatus: "DISPATCHED" });
    expect(provider.calls).toBe(0);
  });

  it("keeps a dispatched request UNKNOWN after timeout and never blindly retries it", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider(new Error("simulated timeout"));
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "UNKNOWN", budgetStatus: "UNKNOWN" });
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "ALREADY_EXISTS", budgetStatus: "UNKNOWN" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "UNKNOWN", reservedCents: 80, spentCents: 0 });
    expect(provider.calls).toBe(1);
  });

  it("returns provider output without pretending an estimated cost is invoice-settled", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const estimatedEvidence = { ...evidence, costBasis: "ESTIMATE" as const, tariffVersion: "rate-card-v1" };
    const provider = new FixedProvider({ response: { text: "provider output" }, costCents: 23, evidence: estimatedEvidence });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "COMPLETED_UNRECONCILED", response: { text: "provider output" }, estimatedCostCents: 23, budgetStatus: "UNKNOWN" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "UNKNOWN", reservedCents: 80, spentCents: 0, providerEvidence: estimatedEvidence });
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "ALREADY_EXISTS", budgetStatus: "UNKNOWN" });
    expect(provider.calls).toBe(1);
  });

  it("preserves an over-reservation or unusable provider usage as UNKNOWN", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: "reply", costCents: 81, evidence });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "UNKNOWN", budgetStatus: "UNKNOWN" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "UNKNOWN", reservedCents: 80, providerEvidence: evidence });
  });
});
