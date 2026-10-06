import type { ModelCallBudgetReservation, ModelCallReservationResult, ProviderCallEvidence } from "./v31-runtime-guards.js";

export type ModelGatewayRequest = {
  experimentId: string;
  modelRunId: string;
  requestFingerprint: string;
  requestedCents: number;
  /** One-based experiment round. Required when the experiment has multiple rounds. */
  roundIndex?: number;
  payload: unknown;
};

export type ModelGatewayReply = { response: unknown; costCents: number; evidence: ProviderCallEvidence };

export type ModelCallBudgetPort = {
  reserveModelCall(experimentId: string, modelRunId: string, requestFingerprint: string, requestedCents: number, roundIndex?: number): Promise<ModelCallReservationResult> | ModelCallReservationResult;
  dispatchModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> | ModelCallBudgetReservation;
  markModelCallUnknown(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> | ModelCallBudgetReservation;
  recordModelCallEvidence(experimentId: string, modelRunId: string, evidence: ProviderCallEvidence): Promise<ModelCallBudgetReservation> | ModelCallBudgetReservation;
  settleModelCall(experimentId: string, modelRunId: string, spentCents: number): Promise<ModelCallBudgetReservation> | ModelCallBudgetReservation;
  rejectModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> | ModelCallBudgetReservation;
  getModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation | null> | ModelCallBudgetReservation | null;
};

export type ModelProviderAdapter = { complete(payload: unknown): Promise<ModelGatewayReply> };

export type ModelGatewayResult =
  | { status: "BLOCKED"; reason: string; modelRunId: string }
  | { status: "ALREADY_EXISTS"; modelRunId: string; budgetStatus: ModelCallBudgetReservation["status"] }
  | { status: "UNKNOWN"; modelRunId: string; budgetStatus: "UNKNOWN" | "DISPATCHED" }
  | { status: "COMPLETED_UNRECONCILED"; modelRunId: string; response: unknown; estimatedCostCents: number; budgetStatus: "UNKNOWN" }
  | { status: "COMPLETED"; modelRunId: string; response: unknown; settledCostCents: number; budgetStatus: "SETTLED" };

/**
 * The injected adapter owns provider I/O. No provider is configured here.
 * A stored modelRunId can never trigger a second outbound request.
 */
export class ModelGatewayCoordinator {
  constructor(
    private readonly budget: ModelCallBudgetPort,
    private readonly provider: ModelProviderAdapter,
    private readonly readiness: () => { ready: boolean; reason?: string },
  ) {}

  async complete(request: ModelGatewayRequest): Promise<ModelGatewayResult> {
    const readiness = this.readiness();
    if (!readiness.ready) return { status: "BLOCKED", reason: readiness.reason ?? "model gateway prerequisites are not ready", modelRunId: request.modelRunId };

    const reserved = await this.budget.reserveModelCall(request.experimentId, request.modelRunId, request.requestFingerprint, request.requestedCents, request.roundIndex);
    if (!reserved.created) return { status: "ALREADY_EXISTS", modelRunId: request.modelRunId, budgetStatus: reserved.reservation.status };

    try {
      // This durable transition must commit before the provider can be called.
      await this.budget.dispatchModelCall(request.experimentId, request.modelRunId);
    } catch {
      // If the commit result is uncertain, reject may fail and leave a conservative hold.
      try { await this.budget.rejectModelCall(request.experimentId, request.modelRunId); } catch { /* a committed dispatch must remain reserved */ }
      let current: ModelCallBudgetReservation | null = null;
      try { current = await this.budget.getModelCall(request.experimentId, request.modelRunId); } catch { /* preserve the conservative UNKNOWN result */ }
      if (current?.status === "REJECTED" || current?.status === "RESERVED") return { status: "BLOCKED", reason: "model request could not be durably marked dispatched", modelRunId: request.modelRunId };
      return { status: "UNKNOWN", modelRunId: request.modelRunId, budgetStatus: "DISPATCHED" };
    }

    let reply: ModelGatewayReply;
    try {
      reply = await this.provider.complete(request.payload);
    } catch {
      let unknown: ModelCallBudgetReservation | null = null;
      try { unknown = await this.budget.markModelCallUnknown(request.experimentId, request.modelRunId); } catch { /* DISPATCHED remains a full reservation */ }
      return { status: "UNKNOWN", modelRunId: request.modelRunId, budgetStatus: unknown?.status === "UNKNOWN" ? "UNKNOWN" : "DISPATCHED" };
    }

    try {
      if (!reply) throw new Error("provider reply is missing");
      // Preserve the original provider trace even if the estimate is invalid or exceeds the budget.
      await this.budget.recordModelCallEvidence(request.experimentId, request.modelRunId, reply.evidence);
      if (!Number.isSafeInteger(reply.costCents) || reply.costCents < 0 || reply.costCents > reserved.reservation.reservedCents) throw new Error("provider usage is invalid or exceeds the reservation");
      if (reply.evidence.costBasis !== "FIXTURE") {
        await this.budget.markModelCallUnknown(request.experimentId, request.modelRunId);
        return { status: "COMPLETED_UNRECONCILED", modelRunId: request.modelRunId, response: reply.response, estimatedCostCents: reply.costCents, budgetStatus: "UNKNOWN" };
      }
      const settled = await this.budget.settleModelCall(request.experimentId, request.modelRunId, reply.costCents);
      return { status: "COMPLETED", modelRunId: request.modelRunId, response: reply.response, settledCostCents: settled.spentCents, budgetStatus: "SETTLED" };
    } catch {
      let unknown: ModelCallBudgetReservation | null = null;
      try { unknown = await this.budget.markModelCallUnknown(request.experimentId, request.modelRunId); } catch { /* DISPATCHED remains a full reservation */ }
      return { status: "UNKNOWN", modelRunId: request.modelRunId, budgetStatus: unknown?.status === "UNKNOWN" ? "UNKNOWN" : "DISPATCHED" };
    }
  }
}
