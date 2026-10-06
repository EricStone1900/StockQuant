export interface SequencedFakeBrokerEvent<TPayload> {
  sequence: number;
  fingerprint: string;
  payload: TPayload;
}

export interface FakeBrokerEventSequenceState<TPayload> {
  lastAppliedSequence: number;
  pending: ReadonlyMap<number, SequencedFakeBrokerEvent<TPayload>>;
  fingerprints: ReadonlyMap<number, string>;
}

export interface FakeBrokerEventSequenceResult<TPayload> {
  state: FakeBrokerEventSequenceState<TPayload>;
  applied: SequencedFakeBrokerEvent<TPayload>[];
  replayed: boolean;
  buffered: boolean;
}

export function acceptFakeBrokerEvent<TPayload>(
  state: FakeBrokerEventSequenceState<TPayload>,
  event: SequencedFakeBrokerEvent<TPayload>,
): FakeBrokerEventSequenceResult<TPayload> {
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || !event.fingerprint) {
    throw new Error("INVALID_FAKEBROKER_EVENT_SEQUENCE");
  }

  const existingFingerprint = state.fingerprints.get(event.sequence);
  if (existingFingerprint !== undefined) {
    if (existingFingerprint !== event.fingerprint) throw new Error("FAKEBROKER_EVENT_SEQUENCE_CONFLICT");
    return { state, applied: [], replayed: true, buffered: event.sequence > state.lastAppliedSequence };
  }
  if (event.sequence <= state.lastAppliedSequence) throw new Error("FAKEBROKER_EVENT_SEQUENCE_STALE");

  const pending = new Map(state.pending);
  const fingerprints = new Map(state.fingerprints);
  pending.set(event.sequence, event);
  fingerprints.set(event.sequence, event.fingerprint);
  const applied: SequencedFakeBrokerEvent<TPayload>[] = [];
  let lastAppliedSequence = state.lastAppliedSequence;
  while (pending.has(lastAppliedSequence + 1)) {
    const next = pending.get(lastAppliedSequence + 1)!;
    pending.delete(next.sequence);
    applied.push(next);
    lastAppliedSequence = next.sequence;
  }

  return {
    state: { lastAppliedSequence, pending, fingerprints },
    applied,
    replayed: false,
    buffered: pending.has(event.sequence),
  };
}
