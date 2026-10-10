# V1.4 durable task, cancellation, restart recovery, Web and CLI audit

Date: 2026-10-07 (Asia/Shanghai)

## Change

Platform now persists V1.4 TestRun metadata before asynchronous Quant dispatch. Quant accepts that stable TestRun UUID as its BacktestRun/Manifest identity and returns the exact prior report on an identical retry; an input mismatch returns 409. Platform restart scans RUNNING tasks and resumes under a per-TestRun PostgreSQL advisory lock. Cancellation is durable and suppresses report publication when requested before Quant dispatch. Web and CLI poll the same persisted TestRun through a terminal state.

## Verification

- Contract generation/check: PASS; the Quant request contract carries optional testRunId, and response identity remains bound to request scenario/seed.
- Platform and Quant TypeScript checks: PASS; Platform persistent-task unit tests and Quant backtest service tests: PASS.
- pnpm test:integration:v14-backtest: PASS against fresh isolated PostgreSQL, Quant, Platform and Playwright Web. Two recovery tasks were interrupted with forced Platform process termination: one while RUNNING before Quant dispatch, and one after Quant durably persisted its BacktestRun/Manifest but before Platform finalized the TestRun. Both completed after startup recovery with the original TestRun UUID; the post-Quant retry returned the existing Quant report without a duplicate row. A separate cancellation completed as CANCELLED before Quant dispatch and created no BacktestRun. Identical Quant retry returned the prior report; same ID with a changed policy returned 409.
- Normal/rejection/recovery/market restrictions/historical fees/corporate actions, eight browser-created runs and same-run CLI checks passed. Quant persisted 16 BacktestRun/Manifest pairs with matching result hashes; Platform persisted 17 V1.4 TestRuns. Unknown policy fields were rejected before TestRun creation.
- Workspace codeVersion: `sha256:760083f28ab67c39c316bc7d89f5f368b2f946e6e6d777393e83231bba502fa4`. Each exported run has an immutable evidence/local/V1.4/<testRunId>/ bundle with a SHA-256 manifest and manualConclusion=NOT_RUN. Random Compose containers, volume, network and images were removed.

TestRuns:

- cancelled-before-Quant: `6f676eca-fa93-4be3-8a17-df71fbe37374`, CANCELLED, 1 assertions (V1.4-TASK-CANCEL-001=PASS).
- platform-restart-recovery: `36133e39-a150-4853-8311-76bdb61cf559`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-post-Quant-crash-recovery: `29bc6a31-6191-4eae-a4b4-916a8cfcf110`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-api: `b7b441b0-542c-4748-bd85-79f0c5401800`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `ea5a303d-37aa-42c0-b363-2c342948747f`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `de25b3f0-e4f7-4f50-a0b4-19a3b03506c2`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `252bd3e5-28b0-4a2d-b16d-9660fb8aa828`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `ac940d78-6e1a-450b-adc7-b4bd3588aaa4`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- cli-corporate-actions: `ca1c308b-80cc-46e3-b95f-774dcc5bb593`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-1-and-cli-checked: `08205ee2-0f3e-4183-a007-9f4d9f0ccb07`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `024eaf4d-f574-4f6c-bbdd-8f221d9d0774`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-3-and-cli-checked: `cba4d853-39ac-40e8-806c-1f8b657e113d`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-4-and-cli-checked: `19ff71c1-4d7a-4719-8ea5-877280a68d94`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-5-and-cli-checked: `2f301435-b0a1-4788-8cdf-350ce72a5cbb`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-6-and-cli-checked: `f0888cfa-42af-4f8e-aefb-0183c528efb9`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-7-and-cli-checked: `65caad60-1f57-40ed-bb11-dfc19ba30486`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-8-and-cli-checked: `8bb3f4cd-e8d2-438a-bde8-5a7d6a4ce0d5`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The small deterministic fixtures do not establish full exchange rules, calendar coverage, complete fee/tax policy, Qlib/Paper parity, user sign-off or Ubuntu acceptance. V1.4 and the full V1 plan remain open.
