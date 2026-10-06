# W2 FakeBroker event-ordering decision and reducer prototype

Date: 2026-10-02 (Asia/Shanghai)

The P-F05 race audit established that Fill reports carry a per-order sequence while cancellation outcomes do not. Row locks serialize arrival, not authoritative occurrence. Accepted [ADR-0008](../../docs/decisions/ADR-0008-fakebroker-authoritative-event-ordering.md) defines one contiguous per-order sequence for simulated authoritative Fill and cancellation events, durable gap buffering, idempotent same-payload replay, conflict on reused sequence with changed facts, and no timeout-based sequence skipping. This remains within FakeBroker-only scope and does not authorize real broker access.

A pure domain reducer prototype was added at `services/trade-execution-service/src/domain/fake-broker-event-sequencer.ts`. Its tests cover cancel sequence 2 arriving before Fill sequence 1 (nothing applies until the gap is filled; then both reduce in sequence order), a still-open gap and conflicting sequence payload, idempotent replay, invalid sequence, and stale sequence. Trade unit suite passed 14 files / 65 tests plus 5 isolated-PostgreSQL target guards; TypeScript build/lint and `pnpm docs:check` (2691 links, zero failures) passed.

**Historical status:** at the time this design audit was written, the reducer was only a prototype and the race was not yet proven fixed. The implementation and follow-up verification are recorded in [the event-ordering implementation audit](2026-10-02-w2-fakebroker-event-ordering-implementation.md); the earlier design-stage limitation remains as historical context.
