# W1 / V1.4 configurable Web and isolated end-to-end audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Daily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.

## Verification

- pnpm contracts:check: PASS; 151 schemas, 106 compatibility rules, 25 client generators registered.
- Quant build: PASS; focused service/auth/engine tests passed.
- Platform build and focused adapter/client tests passed.
- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection, recovery and synthetic market restrictions; unknown policy fields rejected without a Platform TestRun; configured Web runs and same-session metric comparison; every browser-created TestRun checked by CLI; database assertion confirmed eight Quant BacktestRuns, eight Manifests and matching result hashes; all temporary containers, volume, network and images removed.
- Workspace codeVersion: `sha256:100a2be63323b0fcd9461f3620b37da7a1c11b1944a4e418fc27788d2ff26020`; computed from the exact V1.4 contract, Fixture, Quant/Platform/Web sources, integration harness and lockfile, and asserted in each TestRun.
- Each TestRun has an immutable evidence/local/V1.4/<testRunId>/ bundle with unchanged source evidence, SHA-256 manifest, and manualConclusion=NOT_RUN.
- Frozen Fixture SHA-256: 88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef.

TestRuns:

- platform-api: `195377ad-a37f-42cf-a0d2-119fe8980843`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `58e5fb69-6d19-4726-9267-40fed179b60d`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `142f43ce-3644-4e5d-915c-eb62b36c0ef6`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `c317bb5f-fc82-4497-a7b3-2f564db9eacc`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `70327ef6-5ca0-4832-886b-63259ff825a8`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-1-and-cli-checked: `d02c6f24-2f3b-494a-9e4d-17e4f5d88f8d`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `ee8ee8e7-9de9-41b3-9628-3e5fce0019d2`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-3-and-cli-checked: `57526b46-cfd6-4f79-aee0-a3bb88a1b3f7`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-4-and-cli-checked: `8a7b18c3-c71f-4b7c-ac8c-59ff4a7cdbf7`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-5-and-cli-checked: `77d74b4b-309f-4413-abf3-77d81dc24fd7`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-6-and-cli-checked: `57fc659d-8e78-407b-bcb3-e35e70a706b3`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The original Fixture contains one security's daily close/volume; the restriction case uses a separate synthetic OHLCV Manifest. It does not implement exchange-specific limit formulas, intraday queue/fills, full fee schedules, corporate actions, Qlib/Paper rule parity, complete current-scope manual acceptance or Ubuntu acceptance. This audit does not close V1.4, W1 or the delivery plan.
