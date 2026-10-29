import { describe, expect, it, vi } from "vitest";
import { V24LocalPriceAuthorizationCoordinator } from "../../src/application/v24-local-price-authorization-coordinator.js";

const run = "11111111-1111-4111-8111-111111111111";
const scope = { ownerId: "owner", accountId: "22222222-2222-4222-8222-222222222222", namespace: `v24-paper-v2-${run}`, testRunId: run };
const intent = { ...scope, targetId: "target", clientOrderId: `v24-fixture-v2-${run}-20240104`, security: "600000.SH" as const, side: "BUY" as const, quantity: 100 as const, acceptedAt: "2024-01-04T01:31:00.000Z", status: "ACCEPTED_INTENT" as const };
const target = { ...scope, targetId: intent.targetId, clientOrderId: intent.clientOrderId, sessionDate: "2024-01-04", decision: { action: "BUY", quantity: 100 } } as never;
const request = { ...scope, mandateId: "33333333-3333-4333-8333-333333333333", mandateVersion: 1, sessionDate: "2024-01-04", evaluatedAt: "2024-01-04T09:31:50+08:00", mandateContentHash: "a".repeat(64) };

describe("C5 local target-to-authorization coordinator", () => {
  it("materializes first, persists the exact immutable intent, then sends only generated target identity to Governance", async () => {
    const order: string[] = [];
    const materialize = vi.fn(async () => { order.push("target"); return { target, created: true }; });
    const accept = vi.fn(async (...args: unknown[]) => { order.push("intent"); expect(args).toEqual([scope, intent.targetId, "2024-01-04T09:31:00+08:00"]); return { intent, created: true }; });
    const authorize = vi.fn(async (body: unknown) => { order.push("governance"); return { status: 200, body: { decision: { status: "AUTHORIZED" }, reservationId: "reservation" } }; });
    const coordinator = new V24LocalPriceAuthorizationCoordinator({ daily: { materialize }, intents: { accept }, governance: { authorize } });
    const result = await coordinator.evaluate(request);
    expect(order).toEqual(["target", "intent", "governance"]);
    expect(result).toMatchObject({ status: "AUTHORIZED", target, intent, authorization: { reservationId: "reservation" } });
    expect(authorize).toHaveBeenCalledWith({ ...scope, mandateId: request.mandateId, mandateVersion: 1, targetId: intent.targetId, clientOrderId: intent.clientOrderId, evaluatedAt: request.evaluatedAt });
    expect(materialize).toHaveBeenCalledWith({ scope, sessionDate: request.sessionDate, evaluatedAt: "2024-01-04T09:31:00+08:00", mandateId: request.mandateId, mandateContentHash: request.mandateContentHash });
  });
  it("does not create an intent or request a reservation for HOLD and PAUSED targets", async () => {
    for (const action of ["HOLD", "PAUSED"]) {
      const materialize = vi.fn(async () => ({ target: { ...target, clientOrderId: null, decision: { action, quantity: 0 } } as never, created: true }));
      const accept = vi.fn(); const authorize = vi.fn();
      const coordinator = new V24LocalPriceAuthorizationCoordinator({ daily: { materialize }, intents: { accept }, governance: { authorize } });
      await expect(coordinator.evaluate(request)).resolves.toMatchObject({ status: action });
      expect(accept).not.toHaveBeenCalled(); expect(authorize).not.toHaveBeenCalled();
    }
  });
  it("persists the intent but reports a Governance reservation rejection without claiming authorization", async () => {
    const authorize = vi.fn(async () => ({ status: 409, body: { decision: { status: "REJECTED", reason: "MANDATE_NOT_ACTIVE" } } }));
    const coordinator = new V24LocalPriceAuthorizationCoordinator({
      daily: { materialize: vi.fn(async () => ({ target, created: true })) },
      intents: { accept: vi.fn(async () => ({ intent, created: true })) },
      governance: { authorize },
    });
    await expect(coordinator.evaluate(request)).resolves.toMatchObject({
      status: "REJECTED",
      authorization: { decision: { status: "REJECTED", reason: "MANDATE_NOT_ACTIVE" } },
    });
    expect(authorize).toHaveBeenCalledOnce();
  });
  it("fails closed on scope mismatch before persisting an intent or contacting Governance", async () => {
    const accept = vi.fn(); const authorize = vi.fn();
    const coordinator = new V24LocalPriceAuthorizationCoordinator({
      daily: { materialize: vi.fn(async () => ({ target: { ...target, ownerId: "other-owner" }, created: true })) },
      intents: { accept }, governance: { authorize },
    });
    await expect(coordinator.evaluate(request)).rejects.toThrow("C5_LOCAL_TARGET_SCOPE_MISMATCH");
    expect(accept).not.toHaveBeenCalled(); expect(authorize).not.toHaveBeenCalled();
  });
  it("fails closed when a tradeable target lacks its generated client order identity", async () => {
    const accept = vi.fn(); const authorize = vi.fn();
    const coordinator = new V24LocalPriceAuthorizationCoordinator({
      daily: { materialize: vi.fn(async () => ({ target: { ...target, clientOrderId: null }, created: true })) },
      intents: { accept }, governance: { authorize },
    });
    await expect(coordinator.evaluate(request)).rejects.toThrow("C5_LOCAL_ORDER_ID_MISSING");
    expect(accept).not.toHaveBeenCalled(); expect(authorize).not.toHaveBeenCalled();
  });
});
