# W2 P-F05 FakeBroker event-ordering implementation

Date: 2026-10-02 (Asia/Shanghai)

## Result

Implemented ADR-0008 for the repository-owned FakeBroker. Simulated cumulative Fill reports and cancellation outcomes now share a positive contiguous per-order sequence. Trade persists an inbox row and event cursor, buffers future sequence numbers, accepts byte-identical semantic retries idempotently, rejects changed facts at a reused sequence, and applies contiguous outcomes in one transaction. Cancellation result requests require `sequence`; a buffered event is reported as accepted/pending and does not mutate order or release resources while a gap remains.

The isolated PostgreSQL persistence scenario delivered cancel sequence 2 before Fill sequence 1, verified the cursor remained at zero, the order remained `CANCEL_REQUESTED`, the inbox row remained buffered, and no reservation resolution was written. Exact replay was idempotent and a changed same-sequence payload conflicted. After Trade restart, Fill sequence 1 drained both events through cursor 2 in order. Portfolio recorded the two fills (75 shares total); reservation release followed the delivered fills and accepted cancellation. The scenario also rechecked cumulative-to-incremental conversion, duplicate replay, post-ack fencing, fee correction, external-order discrepancy and Outbox recovery.

The dedicated isolated test `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` passed. The P5.7 cross-service PostgreSQL/HTTP recovery smoke passed as TestRun `d81e4df7-190a-4005-8ff1-a4e8ea479174`; it confirmed the buffered gap survived a Trade process restart, then recorded `fillSequenceDrainedThrough: 2`, `finalOrder: CANCELLED`, `total_quantity: 75`, and reservation status `RELEASED`. Trade unit tests passed (14 files / 65 tests), the TypeScript build and lint passed, and contract generation/drift checks passed.

The full `pnpm verify:stage -- --stage V2.4 --suite code` rerun completed through baseline/docs/contracts/fixtures, workspace tests, Python adapter tests (69 passed), operations tests, service authentication and database integrations, V2.4 HTTP/Web/CLI scenarios, and Linux/ARM64 container readiness. API TestRuns were `33ae1f2a-f5bc-4aa2-bb4a-f0b31796190f` (normal), `fa61338b-8f0a-40b4-8d57-6384fdd5afc8` (rejection), `919e8d8d-1fb1-487c-8110-7c4729e97790` (recovery), and `884265b6-d2bd-4d79-96e7-cb153df30ecb` (external reconciliation). The four Web TestRuns were `579dd6b7-ba6b-44ad-8cd4-003e72362e3e`, `9d3935c6-9795-49fa-b6eb-c0a6a092f62b`, `a77aa7e4-6787-4d6f-b4d5-c29516889726`, and `d37ee753-fe8c-46bc-9ca3-41bcfcb6907f`; all exited 0 and the CLI checked the same runs. The API/Web report is [V2.4 Paper smoke JSON](2026-10-02-v24-paper-smoke-67ce2137fd464458a5335a075d00dc6d.json), status PASS, with `activeServicesTouched: false`.

PostgreSQL tests used digest-pinned image `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`, random loopback bindings, bounded disposable containers, and isolated bridges. The shared wrapper now waits for three consecutive successful SQL probes so it cannot mistake the official PostgreSQL image's short-lived initialization server for the final server. Probe and suite runs reported containers/networks removed; active services remained `NOT_CONNECTED`.

## Boundary and remaining work

This proves causal ordering only for the deterministic FakeBroker protocol. It does not define compatibility with any real broker, nor an operator reconciliation procedure for a permanently missing sequence. No market-source authorization was present; `NO_TRADE` remains in force. Live market observation, the 20-session observation window, Ubuntu host acceptance, and current-scope human sign-off remain open. W2/V2.4 therefore remain in progress.

