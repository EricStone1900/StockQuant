import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validatePaperFixtureGrant } from "../../src/domain/paper-fixture-authorization.js";

const fixture = JSON.parse(readFileSync(resolve(process.cwd(), "../../fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json"), "utf8"));
const grant = {
  scenarioId: "v24-isolated-snapshot-paper-normal", scenarioVersion: "2.0.0", testRunId: "11111111-1111-4111-8111-111111111111",
  ownerId: "fixture-owner", namespace: "v24-paper-v2-11111111-1111-4111-8111-111111111111", accountId: "22222222-2222-4222-8222-222222222222",
  clockNow: fixture.snapshot.ingestedAt, dataMode: fixture.dataMode, environmentMode: fixture.environmentMode, brokerMode: fixture.brokerMode,
  liveTradingEnabled: fixture.liveTradingEnabled, market: fixture.market, currency: fixture.currency, policy: fixture.policy, mandate: fixture.mandate,
  signal: fixture.signal, order: { clientOrderId: "v24-fixture-v2-test", security: fixture.order.security, acceptedAt: fixture.order.acceptedAt, requestedQuantity: fixture.order.requestedQuantity },
  snapshot: fixture.snapshot, fee: fixture.fee
};

describe("run-scoped V2.4 Fixture Paper authorization", () => {
  it("accepts the exact frozen CN_A PAPER/FAKE fixture grant", () => {
    expect(validatePaperFixtureGrant(grant)).toBe(true);
  });

  it.each([
    ["LIVE writes", { liveTradingEnabled: true }],
    ["other markets", { market: "US_EQUITY" }],
    ["other data modes", { dataMode: "LIVE_SOURCE" }],
    ["cross-run namespaces", { namespace: "other-run" }],
    ["future snapshots", { snapshot: { ...fixture.snapshot, observedAt: "2026-09-27T09:33:00+08:00", ingestedAt: "2026-09-27T09:33:00+08:00" } }],
    ["non-whitelisted grant fields", { administrator: true }],
  ])("rejects %s", (_reason, override) => {
    expect(validatePaperFixtureGrant({ ...grant, ...override })).toBe(false);
  });
});
