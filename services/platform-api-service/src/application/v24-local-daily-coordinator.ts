import type { MarketDataDailyBarCompletion } from "../contracts/generated-types.js";
import { createHash } from "node:crypto";
import type { V24DailyTargetRepository, V24DailyTargetScope } from "../ports/v24-daily-target-repository.js";
import { prepareV24FixtureDailyTarget, V24_DAILY_DIRECTION_SHA256 } from "./v24-daily-target.js";

type LocalSession = { date: string; role: "WARMUP" | "EVALUATION"; close: string; availableAt: string; expected: { priorDates: [string, string]; referencePrice: string } | null };
export type LocalDailyFixture = { fixtureVersion: "v24-c5-local-engineering-1"; sessions: LocalSession[]; sha256: string; mandateSchedule: Array<{ date: string; validFrom: string; expiresAt: string }> };
type Mandate = { mandateId: string; mandateVersion: number; contentHash: string; ownerId: string; testRunId: string; accountId: string; strategyVersion: string; market: string; currency: string; securityScope: string[]; status: string; validFrom: string; expiresAt: string };
type Account = { ownerId: string; accountId: string; namespace: string; testRunId: string; market: string; environmentMode: string; brokerMode: string; cash: { amount: string; currency: string }; positions?: Array<{ security: string; quantity: number }> };
export interface V24LocalDailyCoordinatorPorts {
  loadFixture(): Promise<LocalDailyFixture>;
  readSessions(input: V24DailyTargetScope & { sessionDates: [string, string]; sourceId: string; dataVersion: string; dataMode: "FIXTURE"; asOf: string }): Promise<{ completions: MarketDataDailyBarCompletion[] | null }>;
  readAccount(accountId: string, ownerId: string): Promise<Account>;
  readMandate(mandateId: string, testRunId: string, ownerId: string): Promise<Mandate | null>;
  /** This must come from the account domain; absent/unknown availability fails closed. */
  readSellable(scope: V24DailyTargetScope, asOf: string): Promise<number | null>;
  targets: V24DailyTargetRepository;
}

/** Prepares a local test target; it never reserves resources or sends orders. */
export class V24LocalDailyCoordinator {
  constructor(private readonly ports: V24LocalDailyCoordinatorPorts) {}
  async findPersistedTarget(scope: V24DailyTargetScope, sessionDate: string) {
    const targetId = `c5-target-${createHash("sha256").update(JSON.stringify([scope.ownerId, scope.accountId, scope.namespace, scope.testRunId, sessionDate, V24_DAILY_DIRECTION_SHA256])).digest("hex")}`;
    return this.ports.targets.find(scope, targetId);
  }
  async materialize(input: { scope: V24DailyTargetScope; sessionDate: string; evaluatedAt: string; mandateId: string; mandateContentHash: string }) {
    const { scope, sessionDate, evaluatedAt, mandateId, mandateContentHash } = input;
    if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(evaluatedAt) || !Number.isFinite(Date.parse(evaluatedAt)) || !/^[a-f0-9]{64}$/u.test(mandateContentHash)) throw new Error("C5_LOCAL_COORDINATOR_INPUT_INVALID");
    const fixture = await this.ports.loadFixture();
    if (fixture.fixtureVersion !== "v24-c5-local-engineering-1" || fixture.sha256 !== "96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea" || fixture.sessions.length !== 7) throw new Error("C5_LOCAL_COORDINATOR_FIXTURE_INVALID");
    const index = fixture.sessions.findIndex((item) => item.date === sessionDate);
    const session = fixture.sessions[index];
    if (index < 2 || !session || session.role !== "EVALUATION" || !session.expected || session.expected.priorDates[0] !== fixture.sessions[index - 2]?.date || session.expected.priorDates[1] !== fixture.sessions[index - 1]?.date) throw new Error("C5_LOCAL_COORDINATOR_SESSION_INVALID");
    const scheduled = fixture.mandateSchedule?.find((item) => item.date === sessionDate);
    if (!scheduled || fixture.mandateSchedule.length !== 5 || !Number.isFinite(Date.parse(scheduled.validFrom)) || !Number.isFinite(Date.parse(scheduled.expiresAt)) || Date.parse(scheduled.expiresAt) <= Date.parse(scheduled.validFrom) || Date.parse(scheduled.expiresAt) - Date.parse(scheduled.validFrom) > 24 * 60 * 60 * 1000) throw new Error("C5_LOCAL_COORDINATOR_MANDATE_SCHEDULE_INVALID");
    const mandate = await this.ports.readMandate(mandateId, scope.testRunId, scope.ownerId);
    if (!mandate || Date.parse(mandate.validFrom) !== Date.parse(scheduled.validFrom) || Date.parse(mandate.expiresAt) !== Date.parse(scheduled.expiresAt) || mandate.mandateId !== mandateId || mandate.mandateVersion !== 1 || mandate.contentHash !== mandateContentHash || mandate.ownerId !== scope.ownerId || mandate.testRunId !== scope.testRunId || mandate.accountId !== scope.accountId || mandate.strategyVersion !== V24_DAILY_DIRECTION_SHA256 || mandate.market !== "CN_A" || mandate.currency !== "CNY" || !Array.isArray(mandate.securityScope) || mandate.securityScope.length !== 1 || mandate.securityScope[0] !== "600000.SH" || !["PENDING", "ACTIVE", "PAUSED", "REVOKED"].includes(mandate.status)) throw new Error("C5_LOCAL_COORDINATOR_MANDATE_SCOPE_INVALID");
    const account = await this.ports.readAccount(scope.accountId, scope.ownerId);
    if (account.accountId !== scope.accountId || account.ownerId !== scope.ownerId || account.testRunId !== scope.testRunId || account.namespace !== scope.namespace || account.market !== "CN_A" || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE" || account.cash.currency !== "CNY") throw new Error("C5_LOCAL_COORDINATOR_ACCOUNT_SCOPE_INVALID");
    const priorDates: [string, string] = [fixture.sessions[index - 2]!.date, fixture.sessions[index - 1]!.date];
    const result = await this.ports.readSessions({ ...scope, sessionDates: priorDates, sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", dataMode: "FIXTURE", asOf: evaluatedAt });
    if (!result.completions || result.completions.length !== 2) throw new Error("C5_LOCAL_COORDINATOR_DAILY_UNAVAILABLE");
    const bars = result.completions.map((completion, i) => {
      const frozen = fixture.sessions[index - 2 + i];
      if (!frozen || completion.status !== "COMPLETED_FIXTURE" || completion.dataMode !== "FIXTURE" || completion.sourceId !== "fixture:v24-c5-local-daily-1" || completion.dataVersion !== "v24-c5-local-daily-1" || !completion.completionId || completion.sessionDate !== frozen.date || completion.availableAt !== frozen.availableAt || Date.parse(completion.availableAt) > Date.parse(evaluatedAt) || completion.scope.market !== "CN_A" || completion.scope.ownerId !== scope.ownerId || completion.scope.accountId !== scope.accountId || completion.scope.testRunId !== scope.testRunId || completion.scope.namespace !== scope.namespace || completion.bars.length !== 1 || completion.bars[0]?.securityId !== "600000.SH" || completion.bars[0]?.sessionDate !== frozen.date || completion.bars[0]?.close !== frozen.close) throw new Error("C5_LOCAL_COORDINATOR_DAILY_MISMATCH");
      return { securityId: "600000.SH", sessionDate: frozen.date, availableAt: completion.availableAt, close: frozen.close };
    });
    if (result.completions[0]!.completionId === result.completions[1]!.completionId) throw new Error("C5_LOCAL_COORDINATOR_DAILY_MISMATCH");
    const held = account.positions?.find((position) => position.security === "600000.SH")?.quantity ?? 0;
    // A zero holding is never sellable, so do not ask the historical sellable
    // endpoint to reconstruct a quantity that is known to be zero. This also
    // avoids rejecting the first BUY session because of irrelevant history.
    const sellable = held === 0 ? 0 : await this.ports.readSellable(scope, evaluatedAt);
    return prepareV24FixtureDailyTarget(this.ports.targets, scope, { clock: { now: () => new Date(evaluatedAt) }, sessionDate, expectedPriorSessions: priorDates, bars, account: { heldQuantity: held, sellableQuantity: sellable ?? 0, settledCash: account.cash.amount }, mandate: { validFrom: mandate.validFrom, expiresAt: mandate.expiresAt, paused: mandate.status !== "ACTIVE" }, referencePrice: fixture.sessions[index - 1]!.close }, fixture.sha256, { sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", completionIds: [result.completions[0]!.completionId!, result.completions[1]!.completionId!], calendarVersion: "c5-local-synthetic-sessions-1", asOf: evaluatedAt }, "LOCAL_SESSION");
  }
}
