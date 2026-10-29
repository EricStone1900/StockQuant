import { describe, expect, it, vi } from "vitest";
import { authorizeV24LocalPriceOrder } from "../../src/application/v24-local-price-authorizer.js";
import type { AutoMandateRepository } from "../../src/ports/auto-mandate-repository.js";
const run = "11111111-1111-4111-8111-111111111111";
const account = "22222222-2222-4222-8222-222222222222";
const mandateId = "33333333-3333-4333-8333-333333333333";
const scope = { ownerId: "owner", accountId: account, namespace: `v24-paper-v2-${run}`, testRunId: run };
const targetId = "target-c5";
const clientOrderId = `v24-fixture-v2-${run}-20240104`;
const token = "g".repeat(40);
const facts = { target: { ...scope, targetId, clientOrderId, dataMode: "FIXTURE", fixtureSha256: "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea", strategySha256: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", sessionDate: "2024-01-04", evaluationAt: "2024-01-04T09:31:00+08:00", input: { referencePrice: "10.2500" }, decision: { action: "BUY", quantity: 100 }, dailyBarProvenance: { completionIds: ["bar-1", "bar-2"] } }, intent: { ...scope, clientOrderId, targetId, security: "600000.SH", side: "BUY", quantity: 100, acceptedAt: "2024-01-04T01:31:00.000Z", status: "ACCEPTED_INTENT" }, selection: { status: "SELECTED", planId: "plan", taskId: "task", observation: { snapshotId: "snapshot-c5", securityId: "600000.SH", sourceId: "fixture:v24-c5-local-snapshot-20240104-1", dataMode: "FIXTURE", status: "READY", price: "10.2500", observedAt: "2024-01-04T01:31:10.000Z", ingestedAt: "2024-01-04T01:31:11.000Z", availableAt: "2024-01-04T01:31:11.000Z" } } };
const mandate = { mandateId, mandateVersion: 1, contentHash: "a".repeat(64), ...scope, strategyVersion: "2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8", market: "CN_A" as const, currency: "CNY" as const, securityScope: ["600000.SH"], maxOrderAmount: "2000.00", maxTotalAmount: "2000.00", maxOrderCount: 1, validFrom: "2024-01-04T09:30:00+08:00", expiresAt: "2024-01-04T15:20:00+08:00", status: "ACTIVE" as const };

describe("C5 local price authorizer", () => {
  it("derives a stable proposal from persisted facts and asks the mandate repository for an atomic budget reservation", async () => {
    const fetcher = vi.fn(async () => Response.json(facts));
    const authorizeOrder = vi.fn(async (input) => ({ decision: { status: "AUTHORIZED" as const, mandateId, mandateVersion: 1, proposalId: input.proposal.proposalId, proposalVersion: 1, contentHash: input.proposal.contentHash, reservedAmount: "1030.00", orderCount: 1 }, reservationId: "reservation", replayed: false }));
    const mandates = { find: vi.fn(async () => mandate), authorizeOrder } as unknown as AutoMandateRepository;
    const input = { platformUrl: "http://platform.test", governanceToken: token, mandates, mandateId, mandateVersion: 1, ...scope, targetId, clientOrderId, evaluatedAt: "2024-01-04T09:31:50+08:00", request: fetcher };
    const first = await authorizeV24LocalPriceOrder(input);
    const second = await authorizeV24LocalPriceOrder(input);
    expect(first).toMatchObject({ decision: { status: "AUTHORIZED", reservedAmount: "1030.00" }, reservationId: "reservation", priceEvidence: { price: "10.25", budgetAmount: "1030.00" } });
    expect(second.proposal).toEqual(first.proposal);
    expect(authorizeOrder).toHaveBeenCalledTimes(2);
    expect(authorizeOrder.mock.calls[0]?.[0]).toMatchObject({ clientOrderId, now: input.evaluatedAt, proposal: { legs: [{ securityId: "600000.SH", side: "BUY", quantity: 100, limitPrice: "10.25", estimatedFee: "5.00" }] } });
  });
  it("rejects inactive or mismatched mandate scope before reserving", async () => {
    const fetcher = vi.fn(async () => Response.json(facts));
    const authorizeOrder = vi.fn();
    const mandates = { find: vi.fn(async () => ({ ...mandate, status: "PAUSED" })), authorizeOrder } as unknown as AutoMandateRepository;
    await expect(authorizeV24LocalPriceOrder({ platformUrl: "http://platform.test", governanceToken: token, mandates, mandateId, mandateVersion: 1, ...scope, targetId, clientOrderId, evaluatedAt: "2024-01-04T09:31:50+08:00", request: fetcher })).rejects.toThrow("C5_LOCAL_MANDATE_SCOPE_INVALID");
    expect(authorizeOrder).not.toHaveBeenCalled();
  });
});
