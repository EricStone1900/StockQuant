# V1.4 durable task, cancellation, restart recovery, Web and CLI audit

Date: 2026-10-07 (Asia/Shanghai)

## Change

Platform now persists V1.4 TestRun metadata before asynchronous Quant dispatch. Quant accepts that stable TestRun UUID as its BacktestRun/Manifest identity and returns the exact prior report on an identical retry; an input mismatch returns 409. Platform restart scans RUNNING tasks and resumes under a per-TestRun PostgreSQL advisory lock. Cancellation is durable and suppresses report publication when requested before Quant dispatch. Web and CLI poll the same persisted TestRun through a terminal state.

## Verification

- Contract generation/check: PASS; the Quant request contract carries optional testRunId, and response identity remains bound to request scenario/seed.
- Platform and Quant TypeScript checks: PASS; Platform persistent-task unit tests and Quant backtest service tests: PASS.
- pnpm test:integration:v14-backtest: PASS against fresh isolated PostgreSQL, Quant, Platform and Playwright Web. Two recovery tasks were interrupted with forced Platform process termination: one while RUNNING before Quant dispatch, and one after Quant durably persisted its BacktestRun/Manifest but before Platform finalized the TestRun. Both completed after startup recovery with the original TestRun UUID; the post-Quant retry returned the existing Quant report without a duplicate row. A separate cancellation completed as CANCELLED before Quant dispatch and created no BacktestRun. Identical Quant retry returned the prior report; same ID with a changed policy returned 409.
- Normal/rejection/recovery/market restrictions/historical fees/corporate actions, eight browser-created runs and same-run CLI checks passed. Quant persisted 16 BacktestRun/Manifest pairs with matching result hashes; Platform persisted 17 V1.4 TestRuns. Unknown policy fields were rejected before TestRun creation.
- Workspace codeVersion: `sha256:f01e93d1c0373ab66a1e40e81ccf555c3414c7ee86d25f04e60fedd249234d3a`. Each exported run has an immutable evidence/local/V1.4/<testRunId>/ bundle with a SHA-256 manifest and manualConclusion=NOT_RUN. Random Compose containers, volume, network and images were removed.

TestRuns:

- cancelled-before-Quant: `b581225f-2377-4fcc-96fe-6c9514ccb9a7`, CANCELLED, 1 assertions (V1.4-TASK-CANCEL-001=PASS).
- platform-restart-recovery: `cd502ec5-d947-43ca-b167-21e60af75f9a`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-post-Quant-crash-recovery: `66321346-3c9f-4da0-903e-92c5e0f3b636`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-api: `b8e5d445-ef4b-4a12-9de5-08c5fc2f2a6b`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `e63f2279-44c1-427e-b160-2b79623a06e4`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `38666728-0a2f-4cfb-a561-fd840cb43c6e`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `de3df453-5b1a-473d-87ff-eaefc919c8da`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `147cd493-b96c-4738-9c9b-10c452223f2c`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- cli-corporate-actions: `fc80f40e-357a-44c9-a5b6-d3be10c22b38`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-1-and-cli-checked: `dfd16f39-602d-43d7-bf1d-c5f7ef031a9e`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `b502119a-3ba1-4c59-a3e3-cafb149050ca`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-3-and-cli-checked: `412174f0-5f9d-4984-82e6-ca59f17d3de8`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-4-and-cli-checked: `059813e7-023a-4ba1-b7dc-f82c28d7baa0`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-5-and-cli-checked: `4ecc1c91-9cbe-4c09-9cf5-dd0de8bd547b`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-6-and-cli-checked: `541a3b52-6332-400f-a20d-2c79ad77e21e`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-7-and-cli-checked: `8d7dd020-ff65-4f08-a40f-521e044c789a`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-8-and-cli-checked: `c011d7a2-fc3e-4c5c-874c-a279dce89fe6`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The small deterministic fixtures do not establish full exchange rules, calendar coverage, complete fee/tax policy, Qlib/Paper parity, user sign-off or Ubuntu acceptance. V1.4 and the full V1 plan remain open.
