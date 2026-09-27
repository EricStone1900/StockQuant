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

describe("V3.1 model gateway coordinator", () => {
  it("reserves and durably dispatches before a fixed provider reply, then settles known usage", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: { text: "fixture response" }, actualCostCents: 23 }, () => {
      expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "DISPATCHED", reservedCents: 80 });
    });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "COMPLETED", actualCostCents: 23, budgetStatus: "SETTLED" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "SETTLED", reservedCents: 80, spentCents: 23 });
    expect(provider.calls).toBe(1);
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "ALREADY_EXISTS", budgetStatus: "SETTLED" });
    expect(provider.calls).toBe(1);
  });

  it("does not reserve or invoke a provider when preflight is blocked", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: "unused", actualCostCents: 0 });
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
    const provider = new FixedProvider({ response: "must not be sent", actualCostCents: 1 });
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

  it("preserves an over-reservation or unusable provider usage as UNKNOWN", async () => {
    const budget = new BudgetLedger(3000, 1000, 80);
    budget.reserve(request.experimentId, 100);
    const provider = new FixedProvider({ response: "reply", actualCostCents: 81 });
    const gateway = new ModelGatewayCoordinator(budget, provider, () => ({ ready: true }));
    await expect(gateway.complete(request)).resolves.toMatchObject({ status: "UNKNOWN", budgetStatus: "UNKNOWN" });
    expect(budget.getModelCall(request.experimentId, request.modelRunId)).toMatchObject({ status: "UNKNOWN", reservedCents: 80 });
  });
});
