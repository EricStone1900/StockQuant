import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratedTradeV13AutoMandateClient } from "../../src/contracts/generated-v13-auto-mandate-client.js";
import type * as Contracts from "../../src/contracts/generated-types.js";

const token = "t".repeat(40);
const mandateId = "mandate/id";
const reservationId = "reservation/id";
const authorize: Contracts.V13AutoMandateOrderCommand = {
  mandateVersion: 2,
  ownerId: "owner-1",
  clientOrderId: "order-1",
  commandHash: "b".repeat(64),
  proposal: {
    proposalId: "proposal-1",
    proposalVersion: 3,
    contentHash: "c".repeat(64),
    ownerId: "owner-1",
    testRunId: "run-1",
    accountId: "account-1",
    strategyVersion: "fixture-auto-policy-test-v1",
    operation: "REBALANCE",
    market: "CN_A",
    currency: "CNY",
    legs: [{ securityId: "600000.SH", side: "BUY", quantity: 100, limitPrice: "10.00", estimatedFee: "5.00" }],
  },
  now: "2026-09-25T01:00:00.000Z",
};
const settlement: Contracts.V13AutoMandateSettlementCommand = { outcome: "CONSUMED", now: authorize.now };

describe("GeneratedTradeV13AutoMandateClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps order authorization and budget settlement to Trade-only Governance operations", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ accepted: true }, { status: 200 }));
    const client = new GeneratedTradeV13AutoMandateClient("http://governance.test/", token, request);

    await client.authorizeOrder(mandateId, authorize);
    await client.settleReservation(reservationId, settlement, 1750);

    const expected = [
      ["http://governance.test/internal/v1/auto-mandates/mandate%2Fid/orders/authorize", authorize],
      ["http://governance.test/internal/v1/auto-mandates/reservations/reservation%2Fid/settle", settlement],
    ] as const;
    expect(request).toHaveBeenCalledTimes(expected.length);
    expect(timeoutSpy.mock.calls.map(([timeoutMs]) => timeoutMs)).toEqual([5000, 1750]);
    for (const [index, [url, body]] of expected.entries()) {
      const [input, init] = request.mock.calls[index]!;
      const headers = new Headers(init?.headers);
      expect(String(input)).toBe(url);
      expect(init?.method).toBe("POST");
      expect(headers.get("x-stockquant-service-id")).toBe("trade-execution-service");
      expect(headers.get("authorization")).toBe(`Bearer ${token}`);
      expect(headers.get("content-type")).toBe("application/json");
      expect(JSON.parse(String(init?.body))).toEqual(body);
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });
});
