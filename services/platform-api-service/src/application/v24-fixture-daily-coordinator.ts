import type { CnAShareCalendarSession, MarketDataDailyBarCompletion } from "../contracts/generated-types.js";
import type { V24DailyTarget, V24DailyTargetRepository, V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";
import type { DailyDirectionInput } from "./v24-daily-direction.js";
import { prepareV24FixtureDailyTarget } from "./v24-daily-target.js";

type ScopedAccount = { ownerId: string; accountId: string; namespace: string; testRunId: string; market: string; environmentMode: string; brokerMode: string; cash: { amount: string; currency: string }; positions?: Array<{ security?: string; quantity?: number; sellableQuantity?: number }> };
type SessionsRequest = V24DailyTargetScope & { sessionDates: [string, string]; sourceId: string; dataVersion: string; dataMode: "FIXTURE"; asOf: string };
export interface V24FixtureDailyCoordinatorPorts {
  loadFixture(): Promise<{ input: Omit<DailyDirectionInput, "clock">; sha256: string }>;
  readSessions(request: SessionsRequest): Promise<{ completions: MarketDataDailyBarCompletion[] | null }>;
  readCalendar(date: string): Promise<CnAShareCalendarSession>;
  readAccount(accountId: string, ownerId: string): Promise<ScopedAccount>;
  targets: V24DailyTargetRepository;
}

/** Isolated preparation only: persisted bars must match the frozen candidate; it cannot activate a mandate or submit an order. */
export class V24FixtureDailyCoordinator {
  constructor(private readonly ports: V24FixtureDailyCoordinatorPorts) {}

  async materialize(input: { scope: V24DailyTargetScope; sourceId: string; dataVersion: string; asOf: string; evaluatedAt: string }): Promise<{ target: V24DailyTarget; created: boolean }> {
    const { scope, sourceId, dataVersion, asOf, evaluatedAt } = input;
    if (!sourceId.trim() || !dataVersion.trim() || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(asOf) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(evaluatedAt) || !Number.isFinite(Date.parse(asOf)) || !Number.isFinite(Date.parse(evaluatedAt)) || Date.parse(asOf) > Date.parse(evaluatedAt)) throw new Error("C5_COORDINATOR_CLOCK_OR_SOURCE_INVALID");
    const fixture = await this.ports.loadFixture();
    if (fixture.input.bars.length !== 2) throw new Error("C5_COORDINATOR_FIXTURE_BAR_MISMATCH");
    const [older, newer] = fixture.input.expectedPriorSessions;
    const end = fixture.input.sessionDate;
    const startMs = Date.parse(`${older}T00:00:00Z`); const endMs = Date.parse(`${end}T00:00:00Z`);
    if (![older, newer, end].every((date) => /^\d{4}-\d{2}-\d{2}$/u.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date) || !(older < newer && newer < end) || endMs - startMs > 31 * 86_400_000) throw new Error("C5_COORDINATOR_SESSIONS_INVALID");
    const days = Array.from({ length: (endMs - startMs) / 86_400_000 + 1 }, (_, index) => new Date(startMs + index * 86_400_000).toISOString().slice(0, 10));
    const calendars = await Promise.all(days.map((date) => this.ports.readCalendar(date)));
    const calendarVersion = calendars[0]?.calendarVersion;
    if (!calendarVersion || calendars.some((entry, i) => entry.date !== days[i] || !["TRADING", "CLOSED"].includes(entry.status) || entry.calendarVersion !== calendarVersion)
      || JSON.stringify(calendars.filter((entry) => entry.status === "TRADING").map((entry) => entry.date)) !== JSON.stringify([older, newer, end])) throw new Error("C5_COORDINATOR_CALENDAR_UNVERIFIED");
    const result = await this.ports.readSessions({ ...scope, sessionDates: [older, newer], sourceId, dataVersion, dataMode: "FIXTURE", asOf });
    if (!result.completions || result.completions.length !== 2) throw new Error("C5_COORDINATOR_DAILY_INPUT_UNAVAILABLE");
    const bars = result.completions.map((completion, index) => {
      const expected = fixture.input.bars[index];
      if (!expected || completion.status !== "COMPLETED_FIXTURE" || completion.dataMode !== "FIXTURE" || completion.sourceId !== sourceId || completion.dataVersion !== dataVersion || !completion.completionId || !completion.availableAt || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(completion.availableAt) || !Number.isFinite(Date.parse(completion.availableAt)) || Date.parse(completion.availableAt) > Date.parse(asOf) || Date.parse(completion.availableAt) < Date.parse(`${expected.sessionDate}T15:00:00+08:00`)
        || completion.scope.market !== "CN_A" || completion.scope.ownerId !== scope.ownerId || completion.scope.accountId !== scope.accountId || completion.scope.namespace !== scope.namespace || completion.scope.testRunId !== scope.testRunId || completion.sessionDate !== expected.sessionDate) throw new Error("C5_COORDINATOR_COMPLETION_MISMATCH");
      const matches = completion.bars.filter((bar) => bar.securityId === "600000.SH" && bar.sessionDate === expected.sessionDate);
      if (matches.length !== 1 || matches[0].close !== expected.close) throw new Error("C5_COORDINATOR_FIXTURE_BAR_MISMATCH");
      return { securityId: matches[0].securityId, sessionDate: matches[0].sessionDate, close: matches[0].close, availableAt: completion.availableAt };
    });
    if (result.completions[0].completionId === result.completions[1].completionId) throw new Error("C5_COORDINATOR_COMPLETION_MISMATCH");
    const account = await this.ports.readAccount(scope.accountId, scope.ownerId);
    if (account.ownerId !== scope.ownerId || account.accountId !== scope.accountId || account.namespace !== scope.namespace || account.testRunId !== scope.testRunId || account.market !== "CN_A" || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE" || account.cash?.currency !== "CNY") throw new Error("C5_COORDINATOR_ACCOUNT_SCOPE_MISMATCH");
    const position = account.positions?.find((item) => item.security === "600000.SH");
    const targetInput: DailyDirectionInput = { ...fixture.input, bars, clock: { now: () => new Date(evaluatedAt) }, account: { heldQuantity: position?.quantity ?? 0, sellableQuantity: position?.sellableQuantity ?? 0, settledCash: account.cash?.amount ?? "" }, mandate: { ...fixture.input.mandate, paused: true } };
    return prepareV24FixtureDailyTarget(this.ports.targets, scope, targetInput, fixture.sha256, { sourceId, dataVersion, completionIds: [result.completions[0].completionId!, result.completions[1].completionId!], calendarVersion, asOf });
  }
}
