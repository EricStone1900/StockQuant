import { resolveNextV13CnSession, V13SessionClockError, type V13FixtureCalendarDay } from "./v13-session-clock.js";
import type { AccountSnapshot } from "../contracts/generated-types.js";
import type { StageRunRepository, StoredStageRun, V13SessionAdvance } from "../ports/stage-run-repository.js";

export type V13IndependentAssets = {
  owner_id?: string;
  test_run_id?: string;
  currency?: string;
  current_cash?: string;
  positions?: Array<{ security: string; quantity: number }>;
};

export type V13ReconciliationSummary = {
  unresolved_order_count?: number;
  pending_outbox_count?: number;
  externalOnlyOrderCount?: number;
};

export class V13SessionAdvanceError extends Error {
  constructor(readonly status: 403 | 404 | 409 | 422 | 503, message: string, readonly code?: string) {
    super(message);
    this.name = "V13SessionAdvanceError";
  }
}

export interface V13SessionAdvancePorts {
  runs: Pick<StageRunRepository, "find" | "listV13SessionAdvances" | "advanceV13Session">;
  readAccount(accountId: string, ownerId: string): Promise<AccountSnapshot>;
  readReconciliation(namespace: string): Promise<V13ReconciliationSummary>;
  readIndependentAssets(namespace: string, accountId: string): Promise<V13IndependentAssets>;
  readCalendarDay(date: string): Promise<V13FixtureCalendarDay>;
}

export class V13SessionAdvanceService {
  constructor(private readonly ports: V13SessionAdvancePorts) {}

  async advance(input: { testRunId: string; ownerId: string; accountId: string; expectedClock: string }): Promise<{
    event: V13SessionAdvance;
    run: StoredStageRun;
    reconciliation: { status: "MATCH" } & V13ReconciliationSummary;
    replayed: boolean;
  }> {
    const { testRunId, ownerId, accountId, expectedClock } = input;
    const run = await this.ports.runs.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") {
      throw new V13SessionAdvanceError(404, "V1.3 TestRun or its injected Clock was not found in user scope");
    }
    if (!accountId.trim() || !expectedClock.trim()) throw new V13SessionAdvanceError(422, "accountId and expectedClock are required");
    if (expectedClock !== run.evidence.runClockNow) {
      const prior = (await this.ports.runs.listV13SessionAdvances(testRunId, ownerId))
        .find((event) => Date.parse(event.fromClock) === Date.parse(expectedClock));
      if (prior) return { event: prior, run, reconciliation: { status: "MATCH" }, replayed: true };
      throw new V13SessionAdvanceError(409, "V1.3 Fixture clock changed before the requested session advance");
    }

    let account: AccountSnapshot;
    try { account = await this.ports.readAccount(accountId, ownerId); }
    catch (error) {
      if (error instanceof V13SessionAdvanceError) throw error;
      throw new V13SessionAdvanceError(503, "could not read the V1.3 Portfolio account before advancing its Fixture Clock");
    }
    if (account.testRunId !== testRunId || account.namespace !== run.namespace || account.market !== "CN_A" || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") {
      throw new V13SessionAdvanceError(403, "V1.3 session advancement requires a CN_A PAPER/FAKE account in this TestRun");
    }
    if (!(account.positions ?? []).some((position) => position.quantity > 0)) {
      throw new V13SessionAdvanceError(409, "V1.3 session advancement requires a persisted position");
    }
    if ((account.reservations ?? []).some((reservation) => reservation.status === "HELD")) {
      throw new V13SessionAdvanceError(409, "V1.3 session advancement is blocked while a Portfolio resource reservation is HELD");
    }

    let reconciliation: V13ReconciliationSummary;
    try { reconciliation = await this.ports.readReconciliation(run.namespace); }
    catch { throw new V13SessionAdvanceError(503, "FakeBroker reconciliation is unavailable"); }
    if (reconciliation.unresolved_order_count !== 0 || reconciliation.pending_outbox_count !== 0 || reconciliation.externalOnlyOrderCount !== 0) {
      throw new V13SessionAdvanceError(409, "V1.3 session advancement requires no unresolved FakeBroker orders, pending outbox events, or unmatched external orders");
    }

    let assets: V13IndependentAssets;
    try { assets = await this.ports.readIndependentAssets(run.namespace, accountId); }
    catch { throw new V13SessionAdvanceError(503, "V1.3 independent FakeBroker asset ledger is unavailable"); }
    const normalizeMoney = (value: string) => {
      if (!/^-?\d+(?:\.\d+)?$/u.test(value)) return null;
      const [whole, fraction = ""] = value.split(".");
      return `${BigInt(whole!)}:${fraction.padEnd(4, "0").slice(0, 4)}`;
    };
    const portfolioPositions = [...(account.positions ?? [])].sort((left, right) => left.security.localeCompare(right.security));
    const brokerPositions = [...(assets.positions ?? [])].sort((left, right) => left.security.localeCompare(right.security));
    const cashMatches = typeof assets.current_cash === "string" && assets.currency === account.cash.currency
      && normalizeMoney(assets.current_cash) !== null && normalizeMoney(account.cash.amount) !== null
      && normalizeMoney(assets.current_cash) === normalizeMoney(account.cash.amount);
    const positionsMatch = JSON.stringify(portfolioPositions) === JSON.stringify(brokerPositions);
    if (assets.owner_id !== ownerId || assets.test_run_id !== testRunId || !cashMatches || !positionsMatch) {
      throw new V13SessionAdvanceError(409, "V1.3 session advancement requires FakeBroker and Portfolio account assets to MATCH");
    }

    try {
      const resolved = await resolveNextV13CnSession(run.evidence.runClockNow, this.ports.readCalendarDay);
      const advanced = await this.ports.runs.advanceV13Session({ testRunId, ownerId, expectedClock, nextClock: resolved.clock, calendarVersion: resolved.calendarVersion });
      return { event: advanced.event, run: advanced.run, reconciliation: { status: "MATCH", ...reconciliation }, replayed: advanced.replayed };
    } catch (error) {
      if (error instanceof V13SessionAdvanceError) throw error;
      if (error instanceof V13SessionClockError) throw new V13SessionAdvanceError(422, error.message, error.code);
      throw new V13SessionAdvanceError(503, error instanceof Error ? error.message : "Market Data calendar could not resolve the next V1.3 Fixture session");
    }
  }
}
