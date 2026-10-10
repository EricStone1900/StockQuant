# V1.4 durable task, cancellation, restart recovery, Web and CLI audit

Date: 2026-10-07 (Asia/Shanghai)

## Change

Platform now persists V1.4 TestRun metadata before asynchronous Quant dispatch. Quant accepts that stable TestRun UUID as its BacktestRun/Manifest identity and returns the exact prior report on an identical retry; an input mismatch returns 409. Platform restart scans RUNNING tasks and resumes under a per-TestRun PostgreSQL advisory lock. Cancellation is durable and suppresses report publication when requested before Quant dispatch. Web and CLI poll the same persisted TestRun through a terminal state.

## Verification

- Contract generation/check: PASS; the Quant request contract carries optional testRunId, and response identity remains bound to request scenario/seed.
- Platform and Quant TypeScript checks: PASS; Platform persistent-task unit tests and Quant backtest service tests: PASS.
- pnpm test:integration:v14-backtest: PASS against fresh isolated PostgreSQL, Quant, Platform and Playwright Web. Two recovery tasks were interrupted with forced Platform process termination: one while RUNNING before Quant dispatch, and one after Quant durably persisted its BacktestRun/Manifest but before Platform finalized the TestRun. Both completed after startup recovery with the original TestRun UUID; the post-Quant retry returned the existing Quant report without a duplicate row. A separate cancellation completed as CANCELLED before Quant dispatch and created no BacktestRun. Identical Quant retry returned the prior report; same ID with a changed policy returned 409.
- Normal/rejection/recovery/market restrictions/historical fees/corporate actions, eight browser-created runs and same-run CLI checks passed. Quant persisted 17 BacktestRun/Manifest pairs with matching result hashes; Platform persisted 17 V1.4 TestRuns. Unknown policy fields were rejected before TestRun creation.
- Workspace codeVersion: `sha256:8627096edd72c2580d01c8c3658c4197fb7722b50a58fbabb0c6500b62bd4a16`. Each exported run has an immutable evidence/local/V1.4/<testRunId>/ bundle with a SHA-256 manifest and manualConclusion=NOT_RUN. Random Compose containers, volume, network and images were removed.

TestRuns:

- cancelled-before-Quant: `fd4cf01a-e2dc-48a7-9b4d-47027dc5dc2e`, CANCELLED, 1 assertions (V1.4-TASK-CANCEL-001=PASS).
- platform-restart-recovery: `731a53a2-82a8-4e56-9c18-7ebc0e96b93e`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-post-Quant-crash-recovery: `786ace2b-e843-48b9-a29c-f33e4571a8da`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- platform-api: `aae3573a-db02-407f-aa5a-20df4ff26248`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `eb2ad659-535d-40e5-a792-bd9c0c4fc5ce`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `684ff6fa-9033-429c-b502-f0e168d6b6fb`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `d2e69df4-a199-4010-8427-a0c52295a0c0`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `35482f84-f78a-4d2b-814c-b10f8c2cb5f9`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- cli-corporate-actions: `713b02a3-3c3a-4e90-896a-937f74013bb8`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-1-and-cli-checked: `760bb917-7ba0-45f0-890e-8df56774e424`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `373cd6c8-8bd5-4985-aaad-36c5d911ab45`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-3-and-cli-checked: `6b3ca46d-46ee-4112-99ad-f1661c3d322a`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- web-created-4-and-cli-checked: `f6019b25-6c53-450b-903a-0f03e2e7e62b`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-5-and-cli-checked: `0b95bb15-766d-4896-97f3-0507eda071d0`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-6-and-cli-checked: `9255c03b-e7cf-4414-bc6c-0e602737ad8a`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-7-and-cli-checked: `a25e3876-bcc7-4833-a487-6396987d9021`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-8-and-cli-checked: `39888184-efbf-40d4-a7b6-3dfb069ea656`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-9-and-cli-checked: `9782f6b9-076e-4696-b562-ea55f4e0c316`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The small deterministic fixtures do not establish full exchange rules, calendar coverage, complete fee/tax policy, Qlib/Paper parity, user sign-off or Ubuntu acceptance. V1.4 and the full V1 plan remain open.
