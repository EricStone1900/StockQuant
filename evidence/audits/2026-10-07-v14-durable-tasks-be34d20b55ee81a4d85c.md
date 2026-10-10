# V1.4 durable task, cancellation, restart recovery, Web and CLI audit

Date: 2026-10-07 (Asia/Shanghai)

## Change

Platform now persists V1.4 TestRun metadata before asynchronous Quant dispatch. Quant accepts that stable TestRun UUID as its BacktestRun/Manifest identity and returns the exact prior report on an identical retry; an input mismatch returns 409. Platform restart scans RUNNING tasks and resumes under a per-TestRun PostgreSQL advisory lock. Cancellation is durable and suppresses report publication when requested before Quant dispatch. Web and CLI poll the same persisted TestRun through a terminal state.

## Verification

- Contract generation/check: PASS; the Quant request contract carries optional testRunId, and response identity remains bound to request scenario/seed.
- Platform and Quant TypeScript checks: PASS; Platform persistent-task unit tests and Quant backtest service tests: PASS.
- pnpm test:integration:v14-backtest: PASS against fresh isolated PostgreSQL, Quant, Platform and Playwright Web. Two recovery tasks were interrupted with forced Platform process termination: one while RUNNING before Quant dispatch, and one after Quant durably persisted its BacktestRun/Manifest but before Platform finalized the TestRun. Both completed after startup recovery with the original TestRun UUID; the post-Quant retry returned the existing Quant report without a duplicate row. A separate cancellation completed as CANCELLED before Quant dispatch and created no BacktestRun. Identical Quant retry returned the prior report; same ID with a changed policy returned 409.
- Normal/rejection/recovery/market restrictions/historical fees/corporate actions, eight browser-created runs and same-run CLI checks passed. Quant persisted 16 BacktestRun/Manifest pairs with matching result hashes; Platform persisted 17 V1.4 TestRuns. Unknown policy fields were rejected before TestRun creation.
- Workspace codeVersion: `sha256:bd3c7d1ba039f30c50e8490b85a56d81d5065d2f3c11cb35ed19172cd166353b`. Each exported run has an immutable evidence/local/V1.4/<testRunId>/ bundle with a SHA-256 manifest and manualConclusion=NOT_RUN. Random Compose containers, volume, network and images were removed.

TestRuns:

- cancelled-before-Quant: `ff52f398-22d6-4b1a-aba0-022be400d0ec`, CANCELLED, 1 assertions (V1.4-TASK-CANCEL-001=PASS).
- platform-restart-recovery: `3a5bf8bf-5f56-4680-91b2-1ba410501952`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-post-Quant-crash-recovery: `3b147a36-f39f-4dc9-9ef3-e1320fc205b8`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-api: `e4903f6f-7991-47f0-a7f0-01347efc8c79`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `76a8e766-e960-43ac-9d89-86cdcf045b5b`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `d8c7eb9e-23ba-4556-9d62-cef17def5688`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `df5ee08e-18c1-488c-bd7c-21e07523ea94`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `8434c14e-baee-4269-9c10-5dcdc25334fb`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- cli-corporate-actions: `e4d5e5e6-2ce5-49a6-97ca-9fa6e4b12302`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-1-and-cli-checked: `6853036c-9de7-43b4-b5a0-30d63c330f7d`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `0b8aafad-ea2d-4f8b-a005-c173d396cd87`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-3-and-cli-checked: `806d31ae-3bc1-498b-a50f-1a50980231f5`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-4-and-cli-checked: `34c90e31-4fa8-4949-9d2a-42d82b81b3b6`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-5-and-cli-checked: `7c06f680-41ed-40e9-be20-40b23da1cb6a`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-6-and-cli-checked: `2e611e78-5184-4785-95e9-f134d0d39c00`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-7-and-cli-checked: `7c4128b2-2846-4e32-bb13-14c5ab1c5398`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-8-and-cli-checked: `8a97a321-b8f5-4e4b-8b29-6564b4bc1ba0`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The small deterministic fixtures do not establish full exchange rules, calendar coverage, complete fee/tax policy, Qlib/Paper parity, user sign-off or Ubuntu acceptance. V1.4 and the full V1 plan remain open.
