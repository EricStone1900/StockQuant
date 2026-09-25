import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { calculateSnapshotFixtureExecution, selectFirstQualifyingSnapshot, V24_SNAPSHOT_ELIGIBILITY_POLICY, V24_SNAPSHOT_FIXTURE_EXECUTION_POLICY, type Snapshot, type SnapshotExecutionOrder } from "../../src/domain/snapshot-execution.js";

const order: SnapshotExecutionOrder = {
  security: "600000.SH",
  market: "CN_A",
  acceptedAt: "2026-09-25T09:31:00+08:00",
  executionWindowStart: "2026-09-25T09:31:00+08:00",
  executionWindowEnd: "2026-09-25T09:35:00+08:00"
};
const mode = { environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false };
const clock = { now: () => new Date("2026-09-25T09:33:00+08:00") };
const snapshot = (overrides: Partial<Snapshot> = {}): Snapshot => ({
  snapshotId: "snap-1", security: "600000.SH", market: "CN_A", sourceMode: "FIXTURE", status: "READY",
  observedAt: "2026-09-25T09:32:00+08:00", ingestedAt: "2026-09-25T09:32:01+08:00", price: "10.0000", ...overrides
});

describe("V2.4 Paper snapshot eligibility", () => {
  it("selects the first fresh matching snapshot observed after order acceptance", () => {
    const result = selectFirstQualifyingSnapshot({
      mode, order, clock,
      snapshots: [
        snapshot({ snapshotId: "pre-order", observedAt: "2026-09-25T09:30:59+08:00" }),
        snapshot({ snapshotId: "other-security", security: "000001.SZ" }),
        snapshot({ snapshotId: "first", observedAt: "2026-09-25T09:32:00+08:00" }),
        snapshot({ snapshotId: "second", observedAt: "2026-09-25T09:32:30+08:00" })
      ]
    });
    expect(result).toEqual({
      status: "ELIGIBLE", snapshotId: "first", security: "600000.SH", market: "CN_A", sourceMode: "FIXTURE", observedAt: "2026-09-25T09:32:00+08:00", price: "10.0000",
      executionModel: "SNAPSHOT", policyVersion: V24_SNAPSHOT_ELIGIBILITY_POLICY.version
    });
  });

  it("never backfills with a pre-order snapshot", () => {
    expect(selectFirstQualifyingSnapshot({ mode, order, clock, snapshots: [snapshot({ observedAt: "2026-09-25T09:30:00+08:00" })] }))
      .toEqual({ status: "WAITING", reason: "NO_POST_ORDER_SNAPSHOT" });
  });

  it("rejects a stale quote as execution evidence", () => {
    const staleClock = { now: () => new Date("2026-09-25T10:03:00+08:00") };
    expect(selectFirstQualifyingSnapshot({ mode, order, clock: staleClock, snapshots: [snapshot()] }))
      .toEqual({ status: "WAITING", reason: "SNAPSHOT_NOT_FRESH" });
  });

  it("waits outside the explicit execution window", () => {
    expect(selectFirstQualifyingSnapshot({ mode, order, clock, snapshots: [snapshot({ observedAt: "2026-09-25T09:36:00+08:00", ingestedAt: "2026-09-25T09:36:01+08:00" })] }))
      .toEqual({ status: "WAITING", reason: "NO_SNAPSHOT_IN_EXECUTION_WINDOW" });
  });

  it("rejects orders accepted outside the authorized execution window", () => {
    expect(selectFirstQualifyingSnapshot({ mode, order: { ...order, acceptedAt: "2026-09-25T09:30:00+08:00" }, clock, snapshots: [snapshot()] }))
      .toEqual({ status: "REJECTED", reason: "INVALID_ORDER_WINDOW" });
    expect(selectFirstQualifyingSnapshot({ mode, order: { ...order, acceptedAt: "2026-09-25T09:35:00+08:00" }, clock, snapshots: [snapshot()] }))
      .toEqual({ status: "REJECTED", reason: "INVALID_ORDER_WINDOW" });
  });

  it("rejects a non-Fake or LIVE configuration", () => {
    expect(selectFirstQualifyingSnapshot({ mode: { ...mode, brokerMode: "LIVE" }, order, clock, snapshots: [snapshot()] }))
      .toEqual({ status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE" });
    expect(selectFirstQualifyingSnapshot({ mode: { ...mode, liveTradingEnabled: true }, order, clock, snapshots: [snapshot()] }))
      .toEqual({ status: "REJECTED", reason: "LIVE_OR_NON_FAKE_MODE" });
  });

  it("rejects invalid prices and timestamps without producing any order or fill", () => {
    expect(selectFirstQualifyingSnapshot({ mode, order, clock, snapshots: [snapshot({ price: "10.00001" })] }))
      .toEqual({ status: "REJECTED", reason: "INVALID_SNAPSHOT" });
    expect(selectFirstQualifyingSnapshot({ mode, order, clock, snapshots: [snapshot({ observedAt: "2026-09-25T09:32:00" })] }))
      .toEqual({ status: "WAITING", reason: "NO_POST_ORDER_SNAPSHOT" });
  });
});

describe("V2.4 fixed-fixture SNAPSHOT execution projection", () => {
  const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "../../fixtures/v2/v2.4/snapshot-execution/v24-snapshot-cn-paper-execution-v1.json"), "utf8"));
  const orderFixture = { ...fixture.order, market: fixture.market, namespace: "v24-snapshot-fixture-test", accountId: "test-account", clientOrderId: "test-order-1" };
  const fixtureMode = { environmentMode: fixture.environmentMode, brokerMode: fixture.brokerMode, liveTradingEnabled: fixture.liveTradingEnabled, dataMode: fixture.dataMode };
  const eligibility = selectFirstQualifyingSnapshot({ mode: fixtureMode, order: { ...fixture.order, market: fixture.market }, snapshots: [fixture.snapshot], clock: { now: () => new Date(fixture.clockNow) } });
  const input = { mode: fixtureMode, eligibility, order: orderFixture, fixtureFee: fixture.fixtureFee, ids: { orderId: "fixture-order", externalFillId: "fixture-fill" } };

  it("projects a fixture fill at the first qualifying snapshot price and preserves unverified liquidity status", () => {
    expect(calculateSnapshotFixtureExecution(input)).toEqual({
      status: "PROJECTED_ONLY", proposedOrderId: "fixture-order", proposedFillId: "fixture-fill", quantity: 100,
      price: fixture.expected.projectedPrice, fee: fixture.expected.projectedFee, currency: fixture.currency, effectiveAt: fixture.snapshot.observedAt,
      snapshotId: fixture.snapshot.snapshotId, executionModel: fixture.expected.executionModel,
      policyVersion: V24_SNAPSHOT_FIXTURE_EXECUTION_POLICY.version, liquidityParticipation: "NOT_VERIFIED"
    });
  });

  it("keeps fixture costs and full-fill assumption out of REAL data and non-Fake modes", () => {
    expect(calculateSnapshotFixtureExecution({ ...input, mode: { ...input.mode, dataMode: "REAL" } })).toMatchObject({ status: "REJECTED", reason: "FIXTURE_ONLY" });
    expect(calculateSnapshotFixtureExecution({ ...input, mode: { ...input.mode, brokerMode: "LIVE" } })).toMatchObject({ status: "REJECTED" });
  });

  it("does not project a fill when snapshot eligibility is waiting or rejected", () => {
    expect(calculateSnapshotFixtureExecution({ ...input, eligibility: { status: "WAITING", reason: "NO_POST_ORDER_SNAPSHOT" } })).toMatchObject({ status: "WAITING" });
    expect(calculateSnapshotFixtureExecution({ ...input, eligibility: { status: "REJECTED", reason: "INVALID_SNAPSHOT" } })).toMatchObject({ status: "REJECTED" });
  });

  it("rejects invalid quantity and fixture fee without creating a fill projection", () => {
    expect(calculateSnapshotFixtureExecution({ ...input, order: { ...orderFixture, requestedQuantity: 0 } })).toMatchObject({ status: "REJECTED", reason: "INVALID_FIXTURE_EXECUTION_INPUT" });
    expect(calculateSnapshotFixtureExecution({ ...input, fixtureFee: "5.00001" })).toMatchObject({ status: "REJECTED", reason: "INVALID_FIXTURE_EXECUTION_INPUT" });
  });

  it("uses market currency explicitly for the fixture projection", () => {
    expect(calculateSnapshotFixtureExecution({ ...input, order: { ...orderFixture, market: "US_EQUITY" }, eligibility: { ...eligibility, market: "US_EQUITY" } })).toMatchObject({ currency: "USD" });
  });

  it("rejects a snapshot scope mismatch even if a projection is manually assembled", () => {
    expect(calculateSnapshotFixtureExecution({ ...input, order: { ...orderFixture, market: "US_EQUITY" } }))
      .toMatchObject({ status: "REJECTED", reason: "FIXTURE_SNAPSHOT_SCOPE_MISMATCH" });
  });
});
