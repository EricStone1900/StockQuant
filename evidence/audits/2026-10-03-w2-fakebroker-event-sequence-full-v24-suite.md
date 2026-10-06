# W2 / P-F05 sequenced FakeBroker events: current V2.4 suite

Date: 2026-10-03 (Asia/Shanghai)

The current Trade Execution working tree already implements ADR-0008 across the cancellation HTTP contract, PostgreSQL inbox/cursor, transactional ordered reducer, reservation-resolution Outbox, and persisted integration tests. This run verifies that implementation; it corrects older plan text that still called the reducer unintegrated.

- Command: `pnpm verify:stage -- --stage V2.4 --suite code`
- Result: exit 0. Trade Execution 15 unit files / 67 tests; Platform 46 / 166; Research Automation 36 / 202; Quant 18 / 91; Market Data 18 / 71; Governance 6 / 22; Replay 9 / 25; Portfolio 3 / 5; Web 1 / 1. Relevant integrations and all required code-suite steps passed.
- P5.7 HTTP/PG TestRun `5b5cabfe-8965-4106-8980-109a71c1e112` covers the persisted out-of-order case: cancel sequence 2 is buffered while sequence 1 is missing; the gap survives Trade restart, order state and reservation remain unresolved, then Fill sequence 1 arrives and drains both events through sequence 2. Duplicate replay is idempotent, changed facts conflict, resulting cumulative quantity is 75 with an incremental Fill of 25, terminal order is `CANCELLED`, and reservation release waits for both Fill deliveries. Final Portfolio cash was 8230.9685 and captured reservation 766.0305.
- Same suite: four V2.4 API TestRuns and four Web TestRuns passed for normal, rejection, recovery, and external-reconciliation; each Web TestRun was checked by CLI on the same ID. The external-order discrepancy was shown without rewriting local order/Fills/ledger.
- Disposable PostgreSQL containers and networks were removed and verified. The 13 pre-existing `stockquant-v12-*` active containers remained running with their baseline identities; `activeServicesTouched=false`. No market or external provider calls were made.
- Full output: [captured V2.4 suite log](2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.log). Machine assertions and file hashes are in the adjacent JSON and SHA-256 manifest.

This closes the sequenced FakeBroker event ordering engineering/integration sub-item under ADR-0008. It does not establish real-broker event semantics, market authorization, NO_TRADE clearance, O1/O2 observation, V2.4 user acceptance, or overall W2 completion. Those remain outstanding.
