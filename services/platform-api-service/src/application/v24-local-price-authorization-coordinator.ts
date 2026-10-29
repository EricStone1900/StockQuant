import type { V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";
import type { V24LocalOrderIntent } from "../ports/v24-local-order-intent.js";
import type { V24LocalDailyCoordinator } from "./v24-local-daily-coordinator.js";
import type { V24LocalPriceAuthorizationRequestV1 } from "../contracts/generated-types.js";

export interface V24LocalPriceAuthorizationCoordinatorPorts {
  daily: Pick<V24LocalDailyCoordinator, "materialize" | "findPersistedTarget">;
  intents: { accept(scope: V24DailyTargetScope, targetId: string, acceptedAt: string): Promise<{ intent: V24LocalOrderIntent; created: boolean }>; find(scope: V24DailyTargetScope, clientOrderId: string): Promise<V24LocalOrderIntent | null> };
  governance: { authorize(body: V24LocalPriceAuthorizationRequestV1): Promise<{ status: number; body?: Record<string, unknown> }> };
}

/** Coordinates durable target -> pre-execution intent -> Mandate-backed price authorization. It never submits an order. */
export class V24LocalPriceAuthorizationCoordinator {
  constructor(private readonly ports: V24LocalPriceAuthorizationCoordinatorPorts) {}

  async recover(input: Omit<V24LocalPriceAuthorizationRequestV1, "targetId" | "clientOrderId"> & { sessionDate: string; mandateContentHash: string }) {
    const { sessionDate, ...authorization } = input;
    const scope = { ownerId: authorization.ownerId, accountId: authorization.accountId, namespace: authorization.namespace, testRunId: authorization.testRunId };
    const target = await this.ports.daily.findPersistedTarget(scope, sessionDate);
    if (!target || target.sessionDate !== sessionDate || (target.decision.action !== "BUY" && target.decision.action !== "SELL") || !target.clientOrderId) throw new Error("C5_LOCAL_RECOVERY_TARGET_NOT_FOUND");
    const intent = await this.ports.intents.find(scope, target.clientOrderId);
    if (!intent || intent.targetId !== target.targetId || intent.clientOrderId !== target.clientOrderId || intent.ownerId !== scope.ownerId || intent.accountId !== scope.accountId || intent.testRunId !== scope.testRunId || intent.namespace !== scope.namespace || intent.side !== target.decision.action || intent.quantity !== target.decision.quantity) throw new Error("C5_LOCAL_RECOVERY_INTENT_NOT_CONFIRMED");
    const response = await this.ports.governance.authorize({ mandateId: authorization.mandateId, mandateVersion: authorization.mandateVersion, ownerId: authorization.ownerId, accountId: authorization.accountId, namespace: authorization.namespace, testRunId: authorization.testRunId, targetId: target.targetId, clientOrderId: target.clientOrderId, evaluatedAt: authorization.evaluatedAt });
    if (response.status !== 200 || (response.body?.decision as Record<string, unknown> | undefined)?.status !== "AUTHORIZED" || typeof response.body?.reservationId !== "string") throw new Error(`C5_LOCAL_RECOVERY_AUTHORIZATION_UNAVAILABLE:${response.status}:${JSON.stringify(response.body ?? {})}`);
    return { status: "AUTHORIZED" as const, target, intent, authorization: response.body, recoveredPersistedTarget: true };
  }

  async evaluate(input: Omit<V24LocalPriceAuthorizationRequestV1, "targetId" | "clientOrderId"> & { sessionDate: string; mandateContentHash: string }) {
    const { mandateContentHash, sessionDate, ...authorization } = input;
    const scope = { ownerId: authorization.ownerId, accountId: authorization.accountId, namespace: authorization.namespace, testRunId: authorization.testRunId };
    const targetEvaluationAt = `${sessionDate}T09:31:00+08:00`;
    if (Date.parse(targetEvaluationAt) > Date.parse(authorization.evaluatedAt)) throw new Error("C5_LOCAL_TARGET_EVALUATION_AFTER_AUTHORIZATION");
    const materialized = await this.ports.daily.materialize({ scope, sessionDate, evaluatedAt: targetEvaluationAt, mandateId: authorization.mandateId, mandateContentHash });
    const target = materialized.target;
    if (target.ownerId !== authorization.ownerId || target.accountId !== authorization.accountId || target.namespace !== authorization.namespace || target.testRunId !== authorization.testRunId) throw new Error("C5_LOCAL_TARGET_SCOPE_MISMATCH");
    if (target.decision.action === "HOLD") return { status: "HOLD" as const, target, intent: null, authorization: null };
    if (target.decision.action === "PAUSED") return { status: "PAUSED" as const, target, intent: null, authorization: null };
    if (target.decision.action !== "BUY" && target.decision.action !== "SELL") throw new Error("C5_LOCAL_TARGET_ACTION_INVALID");
    if (!target.clientOrderId) throw new Error("C5_LOCAL_ORDER_ID_MISSING");
    // The frozen scenario accepts the order at 09:31, observes the point quote at
    // 09:31:10, then evaluates authorization at 09:31:50. Keep these distinct
    // instants so a quote cannot appear to predate the order's acceptance.
    const intentAcceptedAt = targetEvaluationAt;
    if (Date.parse(intentAcceptedAt) > Date.parse(authorization.evaluatedAt)) throw new Error("C5_LOCAL_INTENT_ACCEPTANCE_AFTER_EVALUATION");
    const { intent } = await this.ports.intents.accept(scope, target.targetId, intentAcceptedAt);
    if (intent.targetId !== target.targetId || intent.clientOrderId !== target.clientOrderId || intent.ownerId !== authorization.ownerId || intent.accountId !== authorization.accountId || intent.testRunId !== authorization.testRunId || intent.namespace !== authorization.namespace || intent.side !== target.decision.action || intent.quantity !== target.decision.quantity) throw new Error("C5_LOCAL_INTENT_SCOPE_MISMATCH");
    const response = await this.ports.governance.authorize({ mandateId: authorization.mandateId, mandateVersion: authorization.mandateVersion, ownerId: authorization.ownerId, accountId: authorization.accountId, namespace: authorization.namespace, testRunId: authorization.testRunId, targetId: target.targetId, clientOrderId: target.clientOrderId, evaluatedAt: authorization.evaluatedAt });
    if (response.status === 409 && (response.body?.decision as Record<string, unknown> | undefined)?.status === "REJECTED") return { status: "REJECTED" as const, target, intent, authorization: response.body };
    if (response.status !== 200 || (response.body?.decision as Record<string, unknown> | undefined)?.status !== "AUTHORIZED" || typeof response.body?.reservationId !== "string") throw new Error(`${response.status === 409 ? "C5_LOCAL_AUTHORIZATION_REJECTED" : "C5_LOCAL_AUTHORIZATION_UNAVAILABLE"}:${response.status}:${JSON.stringify(response.body ?? {})}`);
    return { status: "AUTHORIZED" as const, target, intent, authorization: response.body };
  }

}
