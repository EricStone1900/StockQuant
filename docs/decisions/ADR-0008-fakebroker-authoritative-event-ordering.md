# ADR-0008: Sequence and buffer FakeBroker order events

Status: Accepted (2026-10-02)

## Context

The FakeBroker simulation accepts cumulative Fill reports with a per-order sequence, but simulated cancellation outcomes have no sequence. A database row lock serializes arrival; it cannot establish the causal order of independently delayed Fill and cancellation reports. Applying a later cancellation before an earlier Fill can release a reservation while a valid Fill is still in flight.

This delivery round uses only the repository-owned FakeBroker. The protocol must model authoritative event ordering deterministically without connecting to or claiming compatibility with a real broker.

## Decision

Every simulated authoritative order event (cumulative Fill report or cancellation outcome) carries a positive, monotonically increasing sequence in one per-order sequence space. Trade persists each event idempotently before reducing it. Only the next contiguous sequence is applied; later events remain buffered until the gap arrives. Same-sequence/same-payload retry is idempotent; same-sequence/different-payload is a conflict. An unresolved gap leaves the order and resource reservation unresolved; neither timeout nor arrival order may skip the missing event. Once the gap is filled, Trade reduces all newly contiguous events in sequence order in a transaction and emits the corresponding durable Outbox events.

Legacy/direct state transitions that do not carry a simulated authoritative broker event remain separate and cannot advance this sequence. No real broker adapter is authorized by this decision.

## Consequences

- Cancellation API input gains a sequence field and the Fill and cancellation event paths share an order-scoped cursor.
- A buffered event is accepted as pending, not reported as an applied order transition.
- Cancellation reservation release is enqueued only when the cancellation event is reduced after all earlier sequence numbers.
- Gaps need an operational reconciliation path before a real adapter can be considered; this ADR does not allow silently aging out or skipping a gap.

## Verification

Trade service contract tests and isolated PostgreSQL tests must cover cancellation sequence 2 arriving before Fill sequence 1, subsequent ordered reduction, held reservation until Fill delivery, duplicate replay, conflicting sequence payload, and a permanently missing sequence that remains unresolved. The V2.4 code suite must run against disposable PostgreSQL only.

## Alternatives considered

- **Rely on row-lock arrival order:** rejected because it orders receipt, not broker event occurrence.
- **Use timestamps:** rejected because timestamp precision, clock skew, and equal timestamps do not provide a stable causal order.
- **Allow a timeout to skip gaps:** rejected because it can release reserved resources ahead of a delayed Fill.
- **Connect to a broker-hosted paper API:** outside the approved FakeBroker-only scope.
