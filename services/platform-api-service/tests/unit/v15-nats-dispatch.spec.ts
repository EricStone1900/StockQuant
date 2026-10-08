import { describe, expect, it } from "vitest";
import { validateV15DispatchEnvelope } from "../../src/integration/v15-nats-dispatch.js";

const testRunId = "60cbf540-c418-4d66-a279-25bd4e35fab2";
const payload = { testRunId, ownerId: "owner-1", namespace: `v1-5-normal-${testRunId}`, scenarioId: "normal", seed: 20260907 } as const;

describe("V1.5 JetStream dispatch envelope validation", () => {
  it("accepts only an event whose identity matches its normal TestRun", () => {
    expect(validateV15DispatchEnvelope({ eventId: testRunId, payload })).toEqual({ eventId: testRunId, payload });
  });

  it.each([
    null,
    {},
    { eventId: "other", payload },
    { eventId: testRunId, payload: { ...payload, scenarioId: "recovery" } },
  ])("rejects malformed or out-of-scope envelopes permanently", (value) => {
    expect(() => validateV15DispatchEnvelope(value)).toThrow();
  });
});
