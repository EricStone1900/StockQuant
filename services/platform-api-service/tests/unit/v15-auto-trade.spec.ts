import { describe, expect, it, vi } from "vitest";
import { completeV15AutoTrade, completeV15AutoTradeCancelled, completeV15PausedRejection, executeV15AutoTrade, rejectV15PausedAutoTrade, v15SessionCloseClock, v15SessionOpenClock, type V15AutoTradeCommand, type V15AutoTradePorts, type V15AutoOrderResult } from "../../src/application/v15-auto-trade.js";
import { loadV15AutoTradeCalendar } from "../../src/application/v15-auto-trade-calendar.js";
import type { V13ProposalResult } from "../../src/contracts/generated-types.js";

const command: V15AutoTradeCommand = {
  testRunId: "60cbf540-c418-4d66-a279-25bd4e35fab2", ownerId: "owner-v15", namespace: "v15-auto-test",
  market: "CN_A", accountId: "account-cn", runClockNow: "2026-01-05T01:30:00.000Z"
};
const autoTradeSessions = [
  { market: "CN_A" as const, localDate: "2026-01-05", timeZone: "Asia/Shanghai", calendarVersion: "sse-cn-a-share-2026-1", sequence: 1, openTimeLocal: "09:31", closeTimeLocal: "15:00" },
  { market: "CN_A" as const, localDate: "2026-01-06", timeZone: "Asia/Shanghai", calendarVersion: "sse-cn-a-share-2026-1", sequence: 2, orderQuantity: 50, openTimeLocal: "09:31", closeTimeLocal: "15:00" },
  { market: "CN_A" as const, localDate: "2026-01-07", timeZone: "Asia/Shanghai", calendarVersion: "sse-cn-a-share-2026-1", sequence: 3, orderQuantity: 50, openTimeLocal: "09:31", closeTimeLocal: "15:00" },
  { market: "US_EQUITY" as const, localDate: "2026-01-05", timeZone: "America/New_York", calendarVersion: "nyse-2026-1", sequence: 1, openTimeLocal: "09:31", closeTimeLocal: "16:00" },
  { market: "US_EQUITY" as const, localDate: "2026-01-06", timeZone: "America/New_York", calendarVersion: "nyse-2026-1", sequence: 2, orderQuantity: 5, openTimeLocal: "09:31", closeTimeLocal: "16:00" },
  { market: "US_EQUITY" as const, localDate: "2026-01-07", timeZone: "America/New_York", calendarVersion: "nyse-2026-1", sequence: 3, orderQuantity: 5, openTimeLocal: "09:31", closeTimeLocal: "16:00" }
];
const eodOrders = [
  { sessionSequence: 2, proposal: { market: "CN_A" }, mandate: {}, execution: { fill: { effectiveAt: "2026-01-06T01:31:00.000Z" } }, reconciliation: { status: "MATCH" }, windowDecision: { missedSession: 1, missedAt: "2026-01-05T07:00:00.000Z", staleOrderCreated: false, reevaluatedSession: 2 } },
  { sessionSequence: 3, proposal: { market: "CN_A" }, mandate: {}, execution: { fill: { effectiveAt: "2026-01-07T01:31:00.000Z" } }, reconciliation: { status: "MATCH" } },
  { sessionSequence: 2, proposal: { market: "US_EQUITY" }, mandate: {}, execution: { fill: { effectiveAt: "2026-01-06T14:31:00.000Z" } }, reconciliation: { status: "MATCH" }, windowDecision: { missedSession: 1, missedAt: "2026-01-05T21:00:00.000Z", staleOrderCreated: false, reevaluatedSession: 2 } },
  { sessionSequence: 3, proposal: { market: "US_EQUITY" }, mandate: {}, execution: { fill: { effectiveAt: "2026-01-07T14:31:00.000Z" } }, reconciliation: { status: "MATCH" } }
] as unknown as V15AutoOrderResult[];

function ports(overrides: Partial<V15AutoTradePorts> = {}): V15AutoTradePorts {
  const proposal: V13ProposalResult = {
    proposalId: "proposal-v15", proposalVersion: 1, contentHash: "a".repeat(64), status: "AUTO_POLICY_PENDING",
    approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE",
    expiresAt: "2026-01-05T02:30:00.000Z", legs: [{ legId: "v15-auto-CN_A-buy", securityId: "600000.SH", side: "BUY", quantity: 100 }],
    ownerId: command.ownerId, testRunId: command.testRunId, accountId: command.accountId, strategyVersion: "fixture-auto-policy-test-v1"
  };
  return {
    createProposal: vi.fn(async (input) => input.currency !== (input.market === "CN_A" ? "CNY" : "USD") ? { status: 422, body: { error: "proposal market and currency do not match" } } : { status: 201, body: proposal }),
    createMandate: vi.fn(async (input) => ({ status: 201, body: { mandateId: input.mandateId, mandateVersion: 1, contentHash: "b".repeat(64) } })),
    readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: { mandateId, mandateVersion: 1, contentHash: "b".repeat(64), ownerId, testRunId, accountId: command.accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxTotalAmount: "1005.00", maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: "2026-01-06T01:30:00.000Z", status: "ACTIVE" } })),
    readMandateBudget: vi.fn(async (mandateId, testRunId, mandateVersion, ownerId) => ({ status: 200, body: { mandateId, mandateVersion, ownerId, testRunId, reservedAmount: "0.00", consumedAmount: "1005.00", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 } })),
    activateMandate: vi.fn(async () => ({ status: 200, body: { status: "ACTIVE" } })),
    pauseMandate: vi.fn(async () => ({ status: 200, body: { status: "PAUSED" } })),
    execute: vi.fn(async () => ({ status: 200, body: { order: { clientOrderId: `v15-auto-${command.market}-${command.testRunId}`, status: "FILLED" }, fill: { quantity: 100, price: "10.00", fee: "5.00" }, outbox: { status: "DELIVERED" } } })),
    readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "8995.00", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] })),
    readFakeBrokerAssets: vi.fn(async () => ({ status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "CNY", current_cash: "8995.00", positions: [{ security: "600000.SH", quantity: 100 }] } })),
    readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 1, fill_count: 1, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })),
    ...overrides
  };
}

describe("V1.5 AUTO fixture execution", () => {
  it("loads three hash-verified market sessions with explicit order quantities for both execution days", () => {
    const fixture = loadV15AutoTradeCalendar();
    expect(fixture.fixtureVersion).toBe("v1.5-auto-trade-calendar-2");
    expect(fixture.sessions.filter((session) => session.market === "CN_A").map((session) => [session.sequence, session.orderQuantity])).toEqual([[1, undefined], [2, 50], [3, 50]]);
    expect(fixture.sessions.filter((session) => session.market === "US_EQUITY").map((session) => [session.sequence, session.orderQuantity])).toEqual([[1, undefined], [2, 5], [3, 5]]);
  });

  it.each([
    [{ localDate: "2026-01-05", timeZone: "Asia/Shanghai" }, "2026-01-05T01:31:00.000Z"],
    [{ localDate: "2026-01-05", timeZone: "America/New_York" }, "2026-01-05T14:31:00.000Z"],
    [{ localDate: "2026-07-06", timeZone: "America/New_York" }, "2026-07-06T13:31:00.000Z"]
  ])("derives the simulated session clock from the frozen market timezone", (session, expected) => {
    expect(v15SessionOpenClock(session)).toBe(expected);
  });

  it.each([
    [autoTradeSessions[1]!, "2026-01-06T07:00:00.000Z"],
    [autoTradeSessions[4]!, "2026-01-06T21:00:00.000Z"]
  ])("derives the fixed daily close clock from the market-local Fixture", (session, expected) => {
    expect(v15SessionCloseClock(session)).toBe(expected);
  });

  it("persists a scoped Proposal and Mandate before calling FakeBroker execution", async () => {
    const p = ports();
    const result = await executeV15AutoTrade(command, p);
    expect(p.createProposal).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: command.ownerId, testRunId: command.testRunId, accountId: command.accountId,
      approvalMode: "AUTO_POLICY", strategyVersion: "fixture-auto-policy-test-v1", brokerMode: "FAKE",
      legs: [{ legId: "v15-auto-CN_A-buy", securityId: "600000.SH", side: "BUY", quantity: 100 }]
    }));
    const mandateInput = vi.mocked(p.createMandate).mock.calls[0]?.[0];
    expect(mandateInput).toMatchObject({ securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxOrderCount: 1 });
    expect(mandateInput?.mandateId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
    expect(p.activateMandate).not.toHaveBeenCalled();
    expect(p.readMandate).toHaveBeenCalledWith(result.mandate.mandateId, command.testRunId, command.ownerId);
    expect(p.readMandateBudget).toHaveBeenCalledWith(result.mandate.mandateId, command.testRunId, 1, command.ownerId);
    expect(result.mandate.independentlyReadBudget).toEqual({ status: "ACTIVE", maxOrderAmount: "1005.00", maxTotalAmount: "1005.00", maxOrderCount: 1 });
    expect(result.mandate.independentlyReadReservation).toEqual({ mandateId: result.mandate.mandateId, mandateVersion: 1, ownerId: command.ownerId, testRunId: command.testRunId, reservedAmount: "0.00", consumedAmount: "1005.00", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 });
    expect(p.execute).toHaveBeenCalledWith(expect.objectContaining({ proposalId: "proposal-v15", mandateVersion: 1, now: command.runClockNow }));
    expect(result.execution.outbox).toEqual({ status: "DELIVERED" });
  });

  it("does not reactivate an independently read active Mandate on a Temporal retry", async () => {
    const p = ports({
      createMandate: vi.fn(async (input) => ({ status: 200, body: { mandateId: input.mandateId, mandateVersion: 1, contentHash: "b".repeat(64), status: "PENDING" } })),
      activateMandate: vi.fn(async () => ({ status: 422, body: { reasonCode: "MANDATE_NOT_PENDING" } })),
      readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: { mandateId, mandateVersion: 1, contentHash: "b".repeat(64), ownerId, testRunId, accountId: command.accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxTotalAmount: "1005.00", maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: "2026-01-06T01:30:00.000Z", status: "ACTIVE" } }))
    });
    await expect(executeV15AutoTrade(command, p)).resolves.toMatchObject({ mandate: { independentlyReadBudget: { status: "ACTIVE" } } });
    expect(p.readMandate).toHaveBeenCalledOnce();
    expect(p.activateMandate).not.toHaveBeenCalled();
  });

  it("preserves PAUSED state for the Trade service to authorize only an existing-order replay", async () => {
    const p = ports({
      readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: {
        mandateId, mandateVersion: 1, contentHash: "b".repeat(64), ownerId, testRunId, accountId: command.accountId,
        strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"],
        maxOrderAmount: "1005.00", maxTotalAmount: "1005.00", maxOrderCount: 1,
        validFrom: command.runClockNow, expiresAt: "2026-01-06T01:30:00.000Z", status: "PAUSED"
      } }))
    });
    await expect(executeV15AutoTrade(command, p)).resolves.toBeDefined();
    expect(p.activateMandate).not.toHaveBeenCalled();
    expect(p.execute).toHaveBeenCalledOnce();
  });

  it("uses distinct proposal, mandate and FakeBroker idempotency identities for consecutive sessions", async () => {
    const proposals: V13ProposalCommand[] = [];
    const mandates = new Map<string, Record<string, unknown>>();
    const clientOrderIds: string[] = [];
    let executions = 0;
    const p = ports({
      createProposal: vi.fn(async (input) => {
        proposals.push(input);
        return { status: 201, body: { proposalId: `proposal-${input.idempotencyKey}`, proposalVersion: 1, contentHash: "a".repeat(64), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY", market: input.market, currency: input.currency, operation: input.operation, environmentMode: input.environmentMode, brokerMode: input.brokerMode, expiresAt: input.expiresAt, legs: input.legs, ownerId: input.ownerId, testRunId: input.testRunId, accountId: input.accountId, strategyVersion: input.strategyVersion } };
      }),
      createMandate: vi.fn(async (input) => {
        const value = { ...input, ownerId: command.ownerId, contentHash: "b".repeat(64), status: "ACTIVE" };
        mandates.set(input.mandateId, value);
        return { status: 201, body: value };
      }),
      pauseMandate: vi.fn(async (mandateId) => {
        const current = mandates.get(mandateId);
        if (current) mandates.set(mandateId, { ...current, status: "PAUSED" });
        return { status: 200, body: { status: "PAUSED" } };
      }),
      readMandate: vi.fn(async (mandateId) => ({ status: 200, body: mandates.get(mandateId) })),
      execute: vi.fn(async (input) => {
        executions += 1;
        clientOrderIds.push(input.clientOrderId);
        return { status: 201, body: { order: { clientOrderId: input.clientOrderId, status: "FILLED" }, fill: { quantity: 50, price: "10.00", fee: "5.00", effectiveAt: input.now }, outbox: { status: "DELIVERED" } } };
      }),
      readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: executions === 1 ? "9495.00" : "8990.00", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: executions * 50 }] })),
      readFakeBrokerAssets: vi.fn(async () => ({ status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "CNY", current_cash: executions === 1 ? "9495.00" : "8990.00", positions: [{ security: "600000.SH", quantity: executions * 50 }] } })),
      readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: executions, fill_count: executions, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })),
      readMandateBudget: vi.fn(async (mandateId) => ({ status: 200, body: { mandateId, mandateVersion: 1, ownerId: command.ownerId, testRunId: command.testRunId, reservedAmount: "0.00", consumedAmount: "505.00", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 } }))
    });
    const first = await executeV15AutoTrade({ ...command, sessionSequence: 2, orderQuantity: 50 }, p);
    const second = await executeV15AutoTrade({ ...command, sessionSequence: 3, runClockNow: "2026-01-07T01:31:00.000Z", orderQuantity: 50 }, p);
    expect(first.mandate.pausedAfterSession).toEqual({ status: "PAUSED", mandateId: first.mandate.mandateId });
    expect(first.mandate.mandateId).not.toBe(second.mandate.mandateId);
    expect(proposals).toHaveLength(2);
    expect(proposals[0]!.idempotencyKey).not.toBe(proposals[1]!.idempotencyKey);
    expect(clientOrderIds).toEqual([`v15-auto-${command.market}-${command.testRunId}-session-2`, `v15-auto-${command.market}-${command.testRunId}-session-3`]);
    expect(second.reconciliation.status).toBe("MATCH");
  });

  it("uses the fixed US Fixture and USD mandate limits", async () => {
    const p = ports({
      createProposal: vi.fn(async (input) => ({ status: 201, body: {
        proposalId: "proposal-us", proposalVersion: 1, contentHash: "a".repeat(64), status: "AUTO_POLICY_PENDING", approvalMode: "AUTO_POLICY",
        market: "US_EQUITY", currency: "USD", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE", expiresAt: input.expiresAt,
        legs: input.legs, ownerId: command.ownerId, testRunId: command.testRunId, accountId: "account-us", strategyVersion: "fixture-auto-policy-test-v1"
      } })),
      readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: { mandateId, mandateVersion: 1, contentHash: "b".repeat(64), ownerId, testRunId, accountId: "account-us", strategyVersion: "fixture-auto-policy-test-v1", market: "US_EQUITY", currency: "USD", securityScope: ["AAPL"], maxOrderAmount: "250.05", maxTotalAmount: "250.05", maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: "2026-01-06T01:30:00.000Z", status: "ACTIVE" } })),
      readMandateBudget: vi.fn(async (mandateId, testRunId, mandateVersion, ownerId) => ({ status: 200, body: { mandateId, mandateVersion, ownerId, testRunId, reservedAmount: "0.00", consumedAmount: "250.05", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 } })),
      execute: vi.fn(async () => ({ status: 200, body: { order: { clientOrderId: `v15-auto-US_EQUITY-${command.testRunId}`, status: "FILLED" }, fill: { quantity: 10, price: "25.00", fee: "0.05" }, outbox: { status: "DELIVERED" } } })),
      readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "US_EQUITY" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "9749.95", currency: "USD" }, positions: [{ security: "AAPL", quantity: 10 }] })),
      readFakeBrokerAssets: vi.fn(async () => ({ status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "USD", current_cash: "9749.95", positions: [{ security: "AAPL", quantity: 10 }] } }))
    });
    await executeV15AutoTrade({ ...command, market: "US_EQUITY", accountId: "account-us" }, p);
    expect(p.createMandate).toHaveBeenCalledWith(expect.objectContaining({ currency: "USD", securityScope: ["AAPL"], maxOrderAmount: "250.05" }));
    const usMandateId = vi.mocked(p.createMandate).mock.calls[0]?.[0].mandateId;
    const cnPorts = ports();
    await executeV15AutoTrade(command, cnPorts);
    const cnMandateId = vi.mocked(cnPorts.createMandate).mock.calls[0]?.[0].mandateId;
    expect(usMandateId).not.toBe(cnMandateId);
  });

  it("arbitrates AUTO cancellation after an authoritative partial Fill and releases the unfilled remainder", async () => {
    let state = "ACCEPTED";
    let fills: Array<Record<string, unknown>> = [];
    let reads = 0;
    const p = ports({
      execute: vi.fn(async () => ({ status: 202, body: { executionMode: "SEQUENCED", order: { order_id: "11111111-1111-4111-a111-111111111111", clientOrderId: `v15-auto-${command.market}-${command.testRunId}-session-2`, status: "ACCEPTED" } } })),
      readCancellationRequest: vi.fn(async () => "2026-10-09T01:30:01.000Z"),
      readOrder: vi.fn(async () => {
        reads += 1;
        return { status: 200, body: { order: { order_id: "11111111-1111-4111-a111-111111111111", clientOrderId: `v15-auto-${command.market}-${command.testRunId}-session-2`, status: state }, fills, outbox: { status: "DELIVERED" } } };
      }),
      recordSequencedFill: vi.fn(async (_orderId, report) => {
        fills = [{ externalFillId: report.externalFillId, quantity: report.cumulativeQuantity, price: report.price, fee: report.fee, effectiveAt: report.effectiveAt, brokerSequence: report.sequence }];
        state = "PARTIALLY_FILLED";
        return { status: 202, body: { totalFilledQuantity: report.cumulativeQuantity } };
      }),
      requestOrderCancel: vi.fn(async () => { state = "CANCEL_REQUESTED"; return { status: 202 }; }),
      resolveOrderCancel: vi.fn(async (_orderId, cancel) => { expect(cancel.sequence).toBe(2); state = "CANCELLED"; return { status: 200 }; }),
      pauseMandate: vi.fn(async (mandateId) => ({ status: 200, body: { status: "PAUSED", mandateId } })),
      readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: { mandateId, mandateVersion: 1, contentHash: "b".repeat(64), ownerId, testRunId, accountId: command.accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxTotalAmount: "1005.00", maxOrderCount: 1, validFrom: command.runClockNow, expiresAt: "2026-01-06T01:30:00.000Z", status: "PAUSED" } })),
      readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "9497.50", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 50 }], reservations: [{ clientOrderId: `v15-auto-${command.market}-${command.testRunId}-session-2`, status: "RELEASED", cashAmount: "1005.00", capturedCashAmount: "502.50" }] })),
      readFakeBrokerAssets: vi.fn(async () => ({ status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "CNY", current_cash: "9497.50", positions: [{ security: "600000.SH", quantity: 50 }] } }))
    });
    const result = await executeV15AutoTrade({ ...command, sessionSequence: 2, orderQuantity: 100 }, p);
    expect(result.execution.order).toMatchObject({ status: "CANCELLED" });
    expect(result.execution.fill).toMatchObject({ quantity: 50, fee: "2.50" });
    expect(result.execution.cancellation).toMatchObject({ result: "CANCELLED", partialFillQuantity: 50, reservationStatus: "RELEASED" });
    expect(p.requestOrderCancel).toHaveBeenCalledTimes(1);
    expect(p.resolveOrderCancel).toHaveBeenCalledTimes(1);
    expect(reads).toBe(3);
  });

  it("fails closed when persisted Proposal scope does not match this TestRun", async () => {
    const p = ports({ createProposal: vi.fn(async () => ({ status: 201, body: { proposalId: "foreign", ownerId: "other" } as never })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("exact Fixture scope");
    expect(p.createMandate).not.toHaveBeenCalled();
    expect(p.execute).not.toHaveBeenCalled();
  });

  it("does not execute if Mandate activation is rejected", async () => {
    const p = ports({ activateMandate: vi.fn(async () => ({ status: 409, body: { status: "CONFLICT" } })), readMandate: vi.fn(async (mandateId, testRunId, ownerId) => ({ status: 200, body: { mandateId, testRunId, ownerId, contentHash: "b".repeat(64), status: "PENDING" } })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("Mandate activation failed");
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.readPortfolio).not.toHaveBeenCalled();
    expect(p.readFakeBrokerAssets).not.toHaveBeenCalled();
    expect(p.readBrokerSummary).not.toHaveBeenCalled();
  });

  it("fails closed before order submission if an independent Mandate budget read disagrees", async () => {
    const p = ports({ readMandate: vi.fn(async () => ({ status: 200, body: { mandateId: "wrong", status: "ACTIVE", maxOrderAmount: "999999.00" } })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("Mandate independent status read");
    expect(p.execute).not.toHaveBeenCalled();
    expect(p.readPortfolio).not.toHaveBeenCalled();
  });

  it("pauses the persisted Mandate and proves Governance rejection has no order or ledger side effects", async () => {
    const p = ports({ execute: vi.fn(async () => ({ status: 403, body: { error: "AUTO_POLICY Mandate rejected this Proposal", detail: { reasonCode: "MANDATE_INACTIVE" } } })), readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "CNY" }, positions: [] })), readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 0, fill_count: 0, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })) });
    const result = await rejectV15PausedAutoTrade(command, p);
    expect(p.createProposal).toHaveBeenNthCalledWith(1, expect.objectContaining({ market: "CN_A", currency: "USD", approvalMode: "AUTO_POLICY" }));
    expect(result.crossCurrencyStatus).toBe(422);
    expect(p.activateMandate).toHaveBeenCalledOnce();
    expect(p.pauseMandate).toHaveBeenCalledOnce();
    expect(p.execute).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ mandateStatus: "PAUSED", executionStatus: 403, rejectionReasonCode: "MANDATE_INACTIVE", brokerSummary: { order_count: 0, fill_count: 0, pending_outbox_count: 0 }, portfolio: { cash: { amount: "10000.00" }, positions: [] } });
  });

  it("fails the paused-rejection scenario if execution accepts the order", async () => {
    const p = ports({ execute: vi.fn(async () => ({ status: 200, body: { order: { status: "FILLED" } } })) });
    await expect(rejectV15PausedAutoTrade(command, p)).rejects.toThrow("did not preserve the Governance MANDATE_INACTIVE decision");
    expect(p.readPortfolio).not.toHaveBeenCalled();
  });

  it("persists paused rejection assertions using the scenario's frozen version", async () => {
    const input = { testRunId: command.testRunId, ownerId: command.ownerId, namespace: command.namespace, seed: 20260907, scenarioId: "rejection" as const, fixtureVersion: "v1.5-auto-fixture-v1", fixtureSha256: "a".repeat(64), sessions: [] };
    let saved: unknown;
    const marketResult = (market: "CN_A" | "US_EQUITY") => ({ market, crossCurrencyStatus: 422, crossCurrencyRejection: { error: "market/currency mismatch" }, proposalId: `proposal-${market}`, mandateId: `mandate-${market}`, mandateStatus: "PAUSED", executionStatus: 403, rejection: { error: "AUTO_POLICY Mandate rejected this Proposal" }, portfolio: {}, brokerSummary: {} });
    await completeV15PausedRejection(input, [marketResult("CN_A"), marketResult("US_EQUITY")], vi.fn(async (run) => { saved = run; return run; }));
    expect(saved).toMatchObject({ scenarioId: "rejection", scenarioVersion: "1.1.0", assertions: [{ assertionId: "V1.5-OPS-PAUSE-001", status: "PASS" }, { assertionId: "V1.5-XMK-CURRENCY-002", status: "PASS" }, { assertionId: "V1.5-REJECTION-ZERO-SIDE-EFFECTS-001", status: "PASS" }] });
  });

  it("does not report completion when Fill or its Outbox is missing", async () => {
    const p = ports({ execute: vi.fn(async () => ({ status: 200, body: { order: { clientOrderId: `v15-auto-${command.market}-${command.testRunId}` }, fill: null, outbox: { status: "PENDING" } } })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("exact FakeBroker Fill and delivered Outbox");
  });

  it("fails when the independent Portfolio and FakeBroker ledgers disagree", async () => {
    const p = ports({ readPortfolio: vi.fn(async () => ({ ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "9000.00", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("Portfolio ledger does not match");
  });

  it("fails when unresolved or external FakeBroker facts remain", async () => {
    const p = ports({ readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 1, fill_count: 1, unresolved_order_count: 1, pending_outbox_count: 0, externalOnlyOrderCount: 0 })) });
    await expect(executeV15AutoTrade(command, p)).rejects.toThrow("reconciliation contains missing, duplicate or unresolved facts");
  });

  it("records next-session close reconciliation and missed-window recovery", async () => {
    const input = { testRunId: command.testRunId, ownerId: command.ownerId, namespace: command.namespace, seed: 20260907, scenarioId: "auto-trade" as const, fixtureVersion: "v1.5-auto-trade-calendar-2", fixtureSha256: "a".repeat(64), sessions: autoTradeSessions };
    const account = { accountId: "account-cn", ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "CNY" } };
    const usAccount = { ...account, accountId: "account-us", market: "US_EQUITY" as const, cash: { amount: "10000.00", currency: "USD" } };
    let saved: unknown;
    await completeV15AutoTrade(input, { CN_A: account, US_EQUITY: usAccount }, eodOrders, {
      readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 4, fill_count: 4, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })),
      readPortfolio: vi.fn(async (accountId) => accountId === "account-cn"
        ? { ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "8990.00", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] }
        : { ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "US_EQUITY" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "9749.90", currency: "USD" }, positions: [{ security: "AAPL", quantity: 10 }] }),
      readFakeBrokerAssets: vi.fn(async (_namespace, accountId) => accountId === "account-cn"
        ? { status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "CNY", current_cash: "8990.00", positions: [{ security: "600000.SH", quantity: 100 }] } }
        : { status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "USD", current_cash: "9749.90", positions: [{ security: "AAPL", quantity: 10 }] } }),
      saveRun: vi.fn(async (run) => { saved = run; return run; })
    });
    expect(saved).toMatchObject({ status: "WAITING", assertions: [{ status: "PASS" }, { status: "PASS" }, { assertionId: "V1.5-AUTO-TERMINAL-RECON-001", status: "PASS" }, { assertionId: "V1.5-AUTO-EOD-RECON-001", status: "PASS" }, { assertionId: "V1.5-AUTO-MISSED-WINDOW-001", status: "PASS" }], evidence: { workflowCompletionReconciliation: { status: "MATCH", source: "FRESH_OWNER_AND_TESTRUN_SCOPED_PORTFOLIO_AND_FAKEBROKER_READS" }, dailyEndOfDay: { status: "MATCH", clockSource: "VERSIONED_AUTO_TRADE_FIXTURE_SESSION_CLOSE", sessionsPerMarket: 3, executedSessionsPerMarket: 2 }, missedWindowRecovery: { status: "RECOVERED" }, multiSessionObservation: "NOT_RUN", humanAcceptance: "NOT_RUN" } });
  });

  it("records a partial FakeBroker Fill, accepted cancellation and released remainder while leaving full AUTO acceptance waiting", async () => {
    const input = { testRunId: command.testRunId, ownerId: command.ownerId, namespace: command.namespace, seed: 20260907, scenarioId: "auto-trade" as const, fixtureVersion: "v1.5-auto-trade-calendar-2", fixtureSha256: "a".repeat(64), sessions: autoTradeSessions };
    const account = { accountId: "account-cn", ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "CNY" } };
    const order = { ...eodOrders[0]!, proposal: { ...eodOrders[0]!.proposal, legs: [{ quantity: 50 }] }, execution: { ...eodOrders[0]!.execution, order: { order_id: "order-1", clientOrderId: "client-1", status: "CANCELLED" }, fill: { externalFillId: "fill-1", quantity: 25 }, cancellation: { result: "CANCELLED", reservationStatus: "RELEASED" }, outbox: { status: "DELIVERED" } } } as V15AutoOrderResult;
    let saved: any;
    await completeV15AutoTradeCancelled(input, { CN_A: account, US_EQUITY: { ...account, accountId: "account-us", market: "US_EQUITY", cash: { amount: "10000.00", currency: "USD" } } }, { orders: [order], cancelled: true, cancelRequestedAt: "2026-10-09T01:00:00.000Z" }, {
      readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 1, fill_count: 1, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })),
      saveRun: vi.fn(async (run) => { saved = run; return run; })
    });
    expect(saved).toMatchObject({ status: "WAITING", assertions: [{ assertionId: "V1.5-AUTO-CANCEL-001", status: "PASS" }, { assertionId: "V1.5-AUTO-ORDER-001", status: "WAITING" }, { assertionId: "V1.5-AUTO-RECON-001", status: "PASS" }], evidence: { businessExecution: "AUTO_TRADE_CANCELLED", autoTradeCancellation: { status: "CURRENT_ORDER_PARTIALLY_FILLED_THEN_CANCELLED", partialFillQuantity: 25, remainingQuantityCancelled: 25, reservationStatus: "RELEASED", completedOrderCount: 1, laterSessionOrdersCreated: 0 } } });
  });

  it("does not save AUTO completion when a fresh terminal ledger read disagrees", async () => {
    const input = { testRunId: command.testRunId, ownerId: command.ownerId, namespace: command.namespace, seed: 20260907, scenarioId: "auto-trade" as const, fixtureVersion: "v1.5-auto-trade-calendar-2", fixtureSha256: "a".repeat(64), sessions: autoTradeSessions };
    const account = { accountId: "account-cn", ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.00", currency: "CNY" } };
    const usAccount = { ...account, accountId: "account-us", market: "US_EQUITY" as const, cash: { amount: "10000.00", currency: "USD" } };
    const saveRun = vi.fn();
    await expect(completeV15AutoTrade(input, { CN_A: account, US_EQUITY: usAccount }, eodOrders, {
      readBrokerSummary: vi.fn(async () => ({ namespace: command.namespace, brokerMode: "FAKE", order_count: 4, fill_count: 4, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 })),
      readPortfolio: vi.fn(async (accountId) => accountId === "account-cn"
        ? { ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "CN_A" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "8990.00", currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] }
        : { ownerId: command.ownerId, testRunId: command.testRunId, namespace: command.namespace, market: "US_EQUITY" as const, environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "1.00", currency: "USD" }, positions: [] }),
      readFakeBrokerAssets: vi.fn(async (_namespace, accountId) => accountId === "account-cn"
        ? { status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "CNY", current_cash: "8990.00", positions: [{ security: "600000.SH", quantity: 100 }] } }
        : { status: 200, body: { owner_id: command.ownerId, test_run_id: command.testRunId, currency: "USD", current_cash: "9749.95", positions: [{ security: "AAPL", quantity: 10 }] } }),
      saveRun
    })).rejects.toThrow("terminal Portfolio read does not match the completed US_EQUITY Fixture trade");
    expect(saveRun).not.toHaveBeenCalled();
  });
});
