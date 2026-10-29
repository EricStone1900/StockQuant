import { describe, expect, it, vi } from "vitest";
import { loadV24DailyDirectionFixture } from "../../src/adapters/v24-daily-direction-fixture.js";
import { V24FixtureDailyCoordinator, type V24FixtureDailyCoordinatorPorts } from "../../src/application/v24-fixture-daily-coordinator.js";
import type { V24DailyTarget } from "../../src/ports/v24-daily-target-repository.js";

const scope = { ownerId: "owner", accountId: "account", namespace: "v24-paper-v2-run", testRunId: "run" };
const input = { scope, sourceId: "fixture:daily", dataVersion: "test-v1", asOf: "2026-10-15T15:10:00+08:00", evaluatedAt: "2026-10-16T09:31:00+08:00" };

async function setup() {
  const fixture = await loadV24DailyDirectionFixture();
  const completions = fixture.input.bars.map((bar, index) => ({ status: "COMPLETED_FIXTURE", reason: null, completionId: `dailybar:${index}`, dataVersion: input.dataVersion, fixtureVersion: "test-fixture", sessionDate: bar.sessionDate, sourceId: input.sourceId, dataMode: "FIXTURE", scope: { market: "CN_A", ...scope }, availableAt: bar.availableAt, bars: [{ ...bar, open: bar.close, high: bar.close, low: bar.close, volume: 100, amount: "1000" }] }));
  let saved: V24DailyTarget | undefined;
  const ports = {
    loadFixture: vi.fn(async () => fixture),
    readSessions: vi.fn(async () => ({ completions })),
    readCalendar: vi.fn(async (date: string) => ({ date, status: "TRADING", calendarVersion: "fixture-calendar" })),
    readAccount: vi.fn(async () => ({ ...scope, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" }, positions: [] })),
    targets: { save: vi.fn(async (target: V24DailyTarget) => { if (saved && JSON.stringify(saved) !== JSON.stringify(target)) throw new Error("IMMUTABLE_CONFLICT"); const created = !saved; saved = target; return { target, created }; }), find: vi.fn(async () => saved ?? null) },
  } as unknown as V24FixtureDailyCoordinatorPorts;
  return { coordinator: new V24FixtureDailyCoordinator(ports), ports, completions };
}

describe("C5 isolated daily completion coordinator", () => {
  it("builds an immutable paused target from scoped, available and consecutive daily completions", async () => {
    const { coordinator, ports } = await setup();
    const first = await coordinator.materialize(input);
    expect(first.target).toMatchObject({ dataMode: "FIXTURE", clientOrderId: null, decision: { action: "PAUSED", reason: "MANDATE_INACTIVE" }, dailyBarProvenance: { completionIds: ["dailybar:0", "dailybar:1"], calendarVersion: "fixture-calendar", asOf: input.asOf } });
    expect(ports.readSessions).toHaveBeenCalledWith({ ...scope, sessionDates: ["2026-10-14", "2026-10-15"], sourceId: input.sourceId, dataVersion: input.dataVersion, dataMode: "FIXTURE", asOf: input.asOf });
    expect((await coordinator.materialize(input)).created).toBe(false);
  });
  it("rejects missing and foreign completions before reading the account or writing a target", async () => {
    const { coordinator, ports, completions } = await setup();
    vi.mocked(ports.readSessions).mockResolvedValueOnce({ completions: null });
    await expect(coordinator.materialize(input)).rejects.toThrow("DAILY_INPUT_UNAVAILABLE");
    completions[1].scope.testRunId = "other-run";
    await expect(coordinator.materialize(input)).rejects.toThrow("COMPLETION_MISMATCH");
    expect(ports.readAccount).not.toHaveBeenCalled(); expect(ports.targets.save).not.toHaveBeenCalled();
  });
  it("rejects a nonconsecutive or unknown calendar and changed frozen input", async () => {
    const { coordinator, ports, completions } = await setup();
    vi.mocked(ports.readCalendar).mockImplementationOnce(async (date) => ({ date, status: "UNKNOWN", calendarVersion: "fixture-calendar" }));
    await expect(coordinator.materialize(input)).rejects.toThrow("CALENDAR_UNVERIFIED");
    completions[1].bars[0].close = "9.0000";
    await expect(coordinator.materialize(input)).rejects.toThrow("FIXTURE_BAR_MISMATCH");
    expect(ports.targets.save).not.toHaveBeenCalled();
  });
  it("rejects future availability and foreign accounts", async () => {
    const { coordinator, ports, completions } = await setup();
    completions[1].availableAt = "2026-10-15T15:11:00+08:00";
    await expect(coordinator.materialize(input)).rejects.toThrow("COMPLETION_MISMATCH");
    completions[1].availableAt = "2026-10-15T15:05:00+08:00";
    vi.mocked(ports.readAccount).mockResolvedValueOnce({ ...scope, accountId: "other", market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" } });
    await expect(coordinator.materialize(input)).rejects.toThrow("ACCOUNT_SCOPE_MISMATCH");
    expect(ports.targets.save).not.toHaveBeenCalled();
  });
});
