import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateV24PaperFixtureGrant, fixtureClock, type V24PaperExecutionGrant } from "../../src/domain/v24-paper-execution.js";
import { selectFirstQualifyingSnapshot } from "../../src/domain/snapshot-execution.js";

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "../../fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json"), "utf8"));
const grant: V24PaperExecutionGrant = {
  scenarioId: "v24-isolated-snapshot-paper-normal", scenarioVersion: fixture.scenarioVersion,
  testRunId: "11111111-1111-4111-8111-111111111111", ownerId: "fixture-owner",
  namespace: "v24-paper-v2-11111111-1111-4111-8111-111111111111", accountId: "22222222-2222-4222-8222-222222222222",
  clockNow: fixture.snapshot.ingestedAt, dataMode: fixture.dataMode, environmentMode: fixture.environmentMode,
  brokerMode: fixture.brokerMode, liveTradingEnabled: fixture.liveTradingEnabled, market: fixture.market,
  currency: fixture.currency, policy: fixture.policy, mandate: fixture.mandate, signal: fixture.signal,
  order: { clientOrderId: "v24-fixture-v2-test", security: fixture.order.security, acceptedAt: fixture.order.acceptedAt, requestedQuantity: fixture.order.requestedQuantity },
  snapshot: fixture.snapshot, fee: fixture.fee
};

describe("V2.4 isolated Fixture SNAPSHOT execution gate", () => {
  it("selects the eligible post-acceptance snapshot and reserves exact cash including fee", () => {
    expect(evaluateV24PaperFixtureGrant(grant, fixtureClock(grant.clockNow))).toMatchObject({
      status: "ELIGIBLE", executionModel: "SNAPSHOT", policyVersion: "v24-snapshot-eligibility-v1", reservedCash: "1005.0000",
      risk: { quoteAgeSeconds: 1, deviationBps: 0 }
    });
  });

  it("allows the same isolated Fixture gate to evaluate a SELL; sellability remains a Portfolio reservation concern", () => {
    const sell = { ...grant, signal: { ...grant.signal, action: "SELL" as const }, order: { ...grant.order, clientOrderId: "v24-fixture-v2-test-sell" } };
    expect(evaluateV24PaperFixtureGrant(sell, fixtureClock(sell.clockNow))).toMatchObject({
      status: "ELIGIBLE", reservedCash: "1005.0000", risk: { quoteAgeSeconds: 1, deviationBps: 0 }
    });
  });

  it("waits on unqualified snapshots and rejects LIVE writes and unsupported markets", () => {
    expect(evaluateV24PaperFixtureGrant({ ...grant, snapshot: { ...grant.snapshot, status: "STALE", observedAt: grant.order.acceptedAt } }, fixtureClock(grant.clockNow)).status).toBe("WAITING");
    expect(evaluateV24PaperFixtureGrant({ ...grant, liveTradingEnabled: true }, fixtureClock(grant.clockNow)).status).toBe("REJECTED");
    expect(evaluateV24PaperFixtureGrant({ ...grant, market: "US_EQUITY" } as unknown as V24PaperExecutionGrant, fixtureClock(grant.clockNow)).status).toBe("REJECTED");
  });

  it("does not use a wrong-security, future-ingested, or pre-acceptance snapshot", () => {
    expect(evaluateV24PaperFixtureGrant({ ...grant, snapshot: { ...grant.snapshot, security: "000001.SZ" } }, fixtureClock(grant.clockNow))).toMatchObject({ status: "REJECTED", reason: "MANDATE_ORDER_SCOPE_MISMATCH" });
    expect(evaluateV24PaperFixtureGrant({ ...grant, snapshot: { ...grant.snapshot, observedAt: "2026-09-25T01:30:59.000Z", ingestedAt: "2026-09-25T01:32:01.000Z" } }, fixtureClock(grant.clockNow))).toMatchObject({ status: "WAITING", reason: "NO_POST_ORDER_SNAPSHOT" });
    expect(evaluateV24PaperFixtureGrant({ ...grant, snapshot: { ...grant.snapshot, ingestedAt: "2026-09-25T01:33:00.000Z" }, clockNow: "2026-09-25T01:32:30.000Z" }, fixtureClock("2026-09-25T01:32:30.000Z")).status).toBe("REJECTED");
  });

  it("selects the earliest qualifying snapshot after a stale earlier quote", () => {
    const earlier = { ...grant.snapshot, snapshotId: "earlier-stale", observedAt: "2026-09-25T01:32:01.000Z", ingestedAt: "2026-09-25T01:32:02.000Z", status: "STALE" };
    const next = { ...grant.snapshot, snapshotId: "next-ready", observedAt: "2026-09-25T01:32:03.000Z", ingestedAt: "2026-09-25T01:32:04.000Z" };
    const result = selectFirstQualifyingSnapshot({
      mode: { environmentMode: "PAPER", brokerMode: "FAKE", liveTradingEnabled: false },
      order: { security: grant.order.security, market: grant.market, acceptedAt: grant.order.acceptedAt, executionWindowStart: grant.policy.executionWindowStart, executionWindowEnd: grant.policy.executionWindowEnd },
      snapshots: [next, earlier], clock: fixtureClock("2026-09-25T01:33:00.000Z")
    });
    expect(result).toMatchObject({ status: "ELIGIBLE", snapshotId: "next-ready" });
  });
});
