import { describe, expect, it } from "vitest";
import { validateV15DispatchEnvelope } from "../../src/integration/v15-nats-dispatch.js";

const testRunId = "60cbf540-c418-4d66-a279-25bd4e35fab2";
const payload = {
  testRunId,
  ownerId: "owner-1",
  namespace: `v1-5-normal-${testRunId}`,
  scenarioId: "normal",
  seed: 20260907,
  fixtureVersion: "v1.5-no-trade-calendar-1",
  fixtureSha256: "a".repeat(64),
  sessions: [{ market: "CN_A", localDate: "2026-01-05", timeZone: "Asia/Shanghai", calendarVersion: "sse-cn-a-share-2026-1", sequence: 1 }],
} as const;

describe("V1.5 JetStream dispatch envelope validation", () => {
  it("accepts only an event whose identity matches its normal TestRun", () => {
    expect(validateV15DispatchEnvelope({ eventId: testRunId, payload })).toEqual({ eventId: testRunId, payload });
  });

  it("accepts the separately versioned isolated AUTO Trade scenario", () => {
    const autoPayload = { ...payload, namespace: `v1-5-auto-trade-${testRunId}`, scenarioId: "auto-trade" };
    expect(validateV15DispatchEnvelope({ eventId: testRunId, payload: autoPayload })).toEqual({ eventId: testRunId, payload: autoPayload });
  });

  it("accepts the durable fixed paused-mandate rejection scenario", () => {
    const rejectionPayload = { ...payload, namespace: `v1-5-rejection-${testRunId}`, scenarioId: "rejection" };
    expect(validateV15DispatchEnvelope({ eventId: testRunId, payload: rejectionPayload })).toEqual({ eventId: testRunId, payload: rejectionPayload });
  });

  it("accepts the durable UNKNOWN original-order recovery scenario", () => {
    const recoveryPayload = { ...payload, namespace: `v1-5-recovery-${testRunId}`, scenarioId: "recovery" };
    expect(validateV15DispatchEnvelope({ eventId: testRunId, payload: recoveryPayload })).toEqual({ eventId: testRunId, payload: recoveryPayload });
  });

  it.each([
    null,
    {},
    { eventId: "other", payload },
    { eventId: testRunId, payload: { ...payload, scenarioId: "unsupported" } },
  ])("rejects malformed or out-of-scope envelopes permanently", (value) => {
    expect(() => validateV15DispatchEnvelope(value)).toThrow();
  });

  it.each([
    ["PAPER", "FAKE"],
    ["PAPER", "REAL"],
    ["BACKTEST", "FAKE"],
    ["BACKTEST", "REAL"],
    ["LIVE", "FAKE"],
    ["LIVE", "REAL"],
  ])("rejects injected %s/%s mode fields before Temporal dispatch", (environmentMode, brokerMode) => {
    expect(() => validateV15DispatchEnvelope({ eventId: testRunId, payload: { ...payload, environmentMode, brokerMode } })).toThrow("invalid V1.5 workflow dispatch envelope");
  });

  it.each([
    { status: "COMPLETED" },
    { cash: { amount: "999999.00", currency: "CNY" } },
    { ledgerVersion: 999 },
    { orders: [{ orderId: "client-injected" }] },
  ])("rejects client-owned business facts in a dispatch payload", (facts) => {
    expect(() => validateV15DispatchEnvelope({ eventId: testRunId, payload: { ...payload, ...facts } })).toThrow("invalid V1.5 workflow dispatch envelope");
  });

  it("rejects client-owned fields nested in a session", () => {
    expect(() => validateV15DispatchEnvelope({ eventId: testRunId, payload: { ...payload, sessions: [{ ...payload.sessions[0], environmentMode: "LIVE" }] } })).toThrow("invalid V1.5 workflow dispatch envelope");
  });
});
