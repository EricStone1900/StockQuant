import { describe, expect, it, vi } from "vitest";
import type { AccountSnapshot } from "../../src/contracts/generated-types.js";
import type { StoredStageRun, V13SessionAdvance } from "../../src/ports/stage-run-repository.js";
import { V13SessionAdvanceError, V13SessionAdvanceService, type V13SessionAdvancePorts } from "../../src/application/v13-session-advance.js";

const run: StoredStageRun = {
  testRunId: "run-1", stageId: "V1.3", scenarioId: "normal", scenarioVersion: "1.0.0", ownerId: "owner-1",
  namespace: "ns-run-1", status: "WAITING", seed: 1, assertions: [],
  evidence: { runClockNow: "2026-09-28T09:31:00+08:00" }, createdAt: "2026-09-28T00:00:00.000Z", completedAt: null,
};
const account: AccountSnapshot = {
  accountId: "account-1", namespace: run.namespace, testRunId: run.testRunId, ownerId: run.ownerId,
  fixtureAccountRef: "fixture-1", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
  cash: { amount: "8995.0000", currency: "CNY" }, positionCount: 1, ledgerEntryCount: 2, ledgerVersion: 2,
  positions: [{ security: "600000.SH", quantity: 100 }], reservations: [],
};
const event: V13SessionAdvance = {
  sequence: 1, fromClock: "2026-09-28T09:31:00+08:00", toClock: "2026-09-29T09:31:00+08:00",
  calendarVersion: "sse-cn-a-share-2026-1", idempotencyKey: "run-1:2026-09-28T09:31:00+08:00", recordedAt: "2026-09-28T02:00:00.000Z",
};

function subject(overrides: Partial<V13SessionAdvancePorts> = {}) {
  const runs: V13SessionAdvancePorts["runs"] = {
    find: vi.fn().mockResolvedValue(run),
    listV13SessionAdvances: vi.fn().mockResolvedValue([]),
    advanceV13Session: vi.fn().mockResolvedValue({ run: { ...run, evidence: { ...run.evidence, runClockNow: event.toClock } }, event, replayed: false }),
  };
  const ports: V13SessionAdvancePorts = {
    runs,
    readAccount: vi.fn().mockResolvedValue(account),
    readReconciliation: vi.fn().mockResolvedValue({ unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 }),
    readIndependentAssets: vi.fn().mockResolvedValue({ owner_id: run.ownerId, test_run_id: run.testRunId, currency: "CNY", current_cash: "8995.0000", positions: [{ security: "600000.SH", quantity: 100 }] }),
    readCalendarDay: vi.fn(async (date: string) => ({ date, status: "TRADING" as const, calendarVersion: "sse-cn-a-share-2026-1", sessions: [{ start: "09:30", end: "15:00" }] })),
    ...overrides,
  };
  return { service: new V13SessionAdvanceService(ports), ports, runs };
}

describe("V1.3 session-advance application service", () => {
  it("requires settled positions and no held reservation before advancing", async () => {
    const heldAccount = { ...account, reservations: [{ reservationId: "r1", clientOrderId: "o1", side: "BUY" as const, cashAmount: "1000", capturedCashAmount: "0", capturedQuantity: 0, status: "HELD" as const, evidenceRef: null }] };
    const { service, ports } = subject({ readAccount: vi.fn().mockResolvedValue(heldAccount) });
    await expect(service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: String(run.evidence.runClockNow) }))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining("reservation is HELD") });
    expect(ports.readReconciliation).not.toHaveBeenCalled();
  });

  it("requires independent FakeBroker cash and positions to match before advancing the persisted run clock", async () => {
    const { service, ports, runs } = subject({ readIndependentAssets: vi.fn().mockResolvedValue({ owner_id: run.ownerId, test_run_id: run.testRunId, currency: "CNY", current_cash: "8994.9999", positions: [{ security: "600000.SH", quantity: 100 }] }) });
    await expect(service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: String(run.evidence.runClockNow) }))
      .rejects.toMatchObject({ status: 409, message: expect.stringContaining("assets to MATCH") });
    expect(runs.advanceV13Session).not.toHaveBeenCalled();
    expect(ports.readCalendarDay).not.toHaveBeenCalled();
  });

  it("resolves the next verified calendar session and persists using the expected-clock fence", async () => {
    const { service, ports, runs } = subject();
    const result = await service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: String(run.evidence.runClockNow) });
    expect(result).toMatchObject({ event, run: { testRunId: run.testRunId, evidence: { runClockNow: event.toClock } }, reconciliation: { status: "MATCH" }, replayed: false });
    expect(runs.advanceV13Session).toHaveBeenCalledWith({ testRunId: run.testRunId, ownerId: run.ownerId, expectedClock: event.fromClock, nextClock: event.toClock, calendarVersion: event.calendarVersion });
    expect(ports.readCalendarDay).toHaveBeenCalledTimes(2);
  });

  it("returns the original advance for an idempotent stale-clock retry without reading or mutating business state", async () => {
    const { service, ports, runs } = subject({ runs: {
      find: vi.fn().mockResolvedValue({ ...run, evidence: { ...run.evidence, runClockNow: event.toClock } }),
      listV13SessionAdvances: vi.fn().mockResolvedValue([event]),
      advanceV13Session: vi.fn(),
    } });
    const result = await service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: event.fromClock });
    expect(result).toMatchObject({ event, replayed: true, reconciliation: { status: "MATCH" } });
    expect(ports.readAccount).not.toHaveBeenCalled();
    expect(runs.advanceV13Session).not.toHaveBeenCalled();
  });

  it("fails closed on unknown or cross-stage runs", async () => {
    const { service } = subject({ runs: {
      find: vi.fn().mockResolvedValue({ ...run, stageId: "V1.2" }),
      listV13SessionAdvances: vi.fn(), advanceV13Session: vi.fn(),
    } });
    await expect(service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: String(run.evidence.runClockNow) }))
      .rejects.toBeInstanceOf(V13SessionAdvanceError);
    await expect(service.advance({ testRunId: run.testRunId, ownerId: run.ownerId, accountId: account.accountId, expectedClock: String(run.evidence.runClockNow) }))
      .rejects.toMatchObject({ status: 404 });
  });
});
