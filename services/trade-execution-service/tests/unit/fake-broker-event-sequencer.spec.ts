import { describe, expect, it } from "vitest";
import { acceptFakeBrokerEvent, type FakeBrokerEventSequenceState } from "../../src/domain/fake-broker-event-sequencer.js";

describe("FakeBroker authoritative event sequence", () => {
  it("buffers a later cancellation until its earlier Fill arrives, then reduces both in sequence order", () => {
    let state: FakeBrokerEventSequenceState<{ kind: string }> = { lastAppliedSequence: 0, pending: new Map(), fingerprints: new Map() };
    const cancellation = acceptFakeBrokerEvent(state, { sequence: 2, fingerprint: "cancel-2", payload: { kind: "CANCEL_ACCEPTED" } });
    expect(cancellation.applied).toEqual([]);
    expect(cancellation.buffered).toBe(true);
    expect(cancellation.state.lastAppliedSequence).toBe(0);

    const fill = acceptFakeBrokerEvent(cancellation.state, { sequence: 1, fingerprint: "fill-1", payload: { kind: "FILL" } });
    expect(fill.applied.map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(fill.applied.map(({ payload }) => payload.kind)).toEqual(["FILL", "CANCEL_ACCEPTED"]);
    expect(fill.state.lastAppliedSequence).toBe(2);
    expect(fill.state.pending.size).toBe(0);
  });

  it("keeps a gap unresolved and rejects changed facts at an already buffered sequence", () => {
    const state: FakeBrokerEventSequenceState<string> = { lastAppliedSequence: 0, pending: new Map(), fingerprints: new Map() };
    const buffered = acceptFakeBrokerEvent(state, { sequence: 3, fingerprint: "fill-3", payload: "fill" });
    expect(buffered.buffered).toBe(true);
    expect(buffered.state.lastAppliedSequence).toBe(0);
    expect(() => acceptFakeBrokerEvent(buffered.state, { sequence: 3, fingerprint: "other-fill-3", payload: "fill" }))
      .toThrow("FAKEBROKER_EVENT_SEQUENCE_CONFLICT");
  });

  it("treats the same event replay as idempotent and rejects invalid or stale sequences", () => {
    const initial: FakeBrokerEventSequenceState<string> = { lastAppliedSequence: 0, pending: new Map(), fingerprints: new Map() };
    const event = { sequence: 1, fingerprint: "fill-1", payload: "fill" };
    const accepted = acceptFakeBrokerEvent(initial, event);
    expect(acceptFakeBrokerEvent(accepted.state, event).replayed).toBe(true);
    expect(() => acceptFakeBrokerEvent(accepted.state, { ...event, fingerprint: "changed" }))
      .toThrow("FAKEBROKER_EVENT_SEQUENCE_CONFLICT");
    expect(() => acceptFakeBrokerEvent(accepted.state, { ...event, sequence: 0 })).toThrow("INVALID_FAKEBROKER_EVENT_SEQUENCE");
    const incomplete: FakeBrokerEventSequenceState<string> = { lastAppliedSequence: 2, pending: new Map(), fingerprints: new Map() };
    expect(() => acceptFakeBrokerEvent(incomplete, event)).toThrow("FAKEBROKER_EVENT_SEQUENCE_STALE");
  });
});
