import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { V24LocalDailyCoordinator, type V24LocalDailyCoordinatorPorts } from "../../src/application/v24-local-daily-coordinator.js";

const fixture = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../fixtures/v2/v2.4/c5-local-engineering-v1/input.json"), "utf8"));
const schedule = JSON.parse(readFileSync(resolve(import.meta.dirname, "../../../../fixtures/v2/v2.4/c5-local-mandate-schedule-v1/schedule.json"), "utf8"));
const scope = { ownerId: "owner", accountId: "00000000-0000-4000-8000-000000000001", namespace: "v24-paper-v2-00000000-0000-4000-8000-000000000002", testRunId: "00000000-0000-4000-8000-000000000002" };
const mandateHash = "a".repeat(64);
const command = { scope, sessionDate: "2024-01-04", evaluatedAt: "2024-01-04T09:31:00+08:00", mandateId: "mandate", mandateContentHash: mandateHash };

function setup() {
  const mandate = { mandateId: "mandate", mandateVersion: 1, contentHash: mandateHash, ownerId: scope.ownerId, testRunId: scope.testRunId, accountId: scope.accountId, strategyVersion: fixture.strategySha256, market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], status: "ACTIVE", validFrom: schedule.sessions[0].validFrom, expiresAt: schedule.sessions[0].expiresAt };
  const account = { ...scope, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [] as Array<{ security: string; quantity: number }> };
  const completions = fixture.sessions.slice(0, 2).map((bar: any, i: number) => ({ status: "COMPLETED_FIXTURE", dataMode: "FIXTURE", sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionId: `completion-${i}`, sessionDate: bar.date, availableAt: bar.availableAt, scope: { ...scope, market: "CN_A" }, bars: [{ securityId: "600000.SH", sessionDate: bar.date, close: bar.close }] }));
  const save = vi.fn(async (target) => ({ target, created: true }));
  const ports = { loadFixture: vi.fn(async () => ({ ...fixture, mandateSchedule: schedule.sessions, sha256: "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea" })), readSessions: vi.fn(async () => ({ completions })), readAccount: vi.fn(async () => account), readMandate: vi.fn(async () => mandate), readSellable: vi.fn(async () => null), targets: { save, find: vi.fn() } } as unknown as V24LocalDailyCoordinatorPorts;
  return { coordinator: new V24LocalDailyCoordinator(ports), ports, mandate, account, completions, save };
}

describe("isolated multi-day daily target coordination", () => {
  it("uses independently scoped persisted prior bars, account and mandate to persist the original per-day BUY identity", async () => {
    const { coordinator, ports } = setup();
    const result = await coordinator.materialize(command);
    expect(result.target).toMatchObject({ decision: { action: "BUY", quantity: 100 }, clientOrderId: `v24-fixture-v2-${scope.testRunId}-20240104`, input: { referencePrice: "10.2500" }, dailyBarProvenance: { completionIds: ["completion-0", "completion-1"] } });
    expect(ports.readSessions).toHaveBeenCalledWith(expect.objectContaining({ ...scope, sessionDates: ["2024-01-02", "2024-01-03"], asOf: command.evaluatedAt, dataMode: "FIXTURE" }));
  });
  it("persists a paused target for an inactive mandate and never infers an order", async () => {
    const { coordinator, mandate } = setup(); mandate.status = "PENDING";
    const result = await coordinator.materialize(command);
    expect(result.target).toMatchObject({ decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" }, clientOrderId: null });
  });
  it("fails closed for foreign mandate, mismatched daily facts and missing completions before target persistence", async () => {
    const wrongMandate = setup(); wrongMandate.mandate.accountId = "foreign";
    await expect(wrongMandate.coordinator.materialize(command)).rejects.toThrow("MANDATE_SCOPE_INVALID"); expect(wrongMandate.save).not.toHaveBeenCalled();
    const wrongWindow = setup(); wrongWindow.mandate.expiresAt = "2024-01-10T15:20:00+08:00";
    await expect(wrongWindow.coordinator.materialize(command)).rejects.toThrow("MANDATE_SCOPE_INVALID"); expect(wrongWindow.save).not.toHaveBeenCalled();
    const wrongData = setup(); wrongData.completions[1].bars[0].close = "9.0000";
    await expect(wrongData.coordinator.materialize(command)).rejects.toThrow("DAILY_MISMATCH"); expect(wrongData.save).not.toHaveBeenCalled();
    const missing = setup(); vi.mocked(missing.ports.readSessions).mockResolvedValue({ completions: null });
    await expect(missing.coordinator.materialize(command)).rejects.toThrow("DAILY_UNAVAILABLE"); expect(missing.save).not.toHaveBeenCalled();
  });
  it("does not assume that a held position is sellable when the account domain cannot confirm it", async () => {
    const x = setup(); x.mandate.validFrom = schedule.sessions[1].validFrom; x.mandate.expiresAt = schedule.sessions[1].expiresAt; x.account.positions = [{ security: "600000.SH", quantity: 100 }]; x.account.cash.amount = "8970.0000";
    x.completions.splice(0, 2, ...fixture.sessions.slice(1, 3).map((bar: any, i: number) => ({ status: "COMPLETED_FIXTURE", dataMode: "FIXTURE", sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionId: `sell-${i}`, sessionDate: bar.date, availableAt: bar.availableAt, scope: { ...scope, market: "CN_A" }, bars: [{ securityId: "600000.SH", sessionDate: bar.date, close: bar.close }] })));
    const result = await x.coordinator.materialize({ ...command, sessionDate: "2024-01-05", evaluatedAt: "2024-01-05T09:31:00+08:00" });
    expect(result.target).toMatchObject({ decision: { action: "PAUSED", reason: "SELLABLE_QUANTITY_INSUFFICIENT" }, clientOrderId: null });
    expect(x.ports.readSellable).toHaveBeenCalledWith(scope, "2024-01-05T09:31:00+08:00");
    vi.mocked(x.ports.readSellable).mockResolvedValue(100);
    const sell = await x.coordinator.materialize({ ...command, sessionDate: "2024-01-05", evaluatedAt: "2024-01-05T09:31:00+08:00" });
    expect(sell.target).toMatchObject({ decision: { action: "SELL", quantity: 100 }, clientOrderId: `v24-fixture-v2-${scope.testRunId}-20240105` });
  });
});
