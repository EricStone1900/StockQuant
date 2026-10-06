# W1 / V1.4 configurable Web and isolated end-to-end audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Daily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.

## Verification

- pnpm contracts:check: PASS; 151 schemas, 106 compatibility rules, 25 client generators registered.
- Quant build: PASS; focused service/auth/engine tests passed.
- Platform build and focused adapter/client tests passed.
- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection, recovery and synthetic market restrictions; unknown policy fields rejected without a Platform TestRun; configured Web runs and same-session metric comparison; every browser-created TestRun checked by CLI; database assertion confirmed eight Quant BacktestRuns, eight Manifests and matching result hashes; all temporary containers, volume, network and images removed.
- Workspace codeVersion: `sha256:d68430b0eb3eb7b0e22d17d1c32a9b0e3f525533dabed181876429ebe8c7ec3a`; computed from the exact V1.4 contract, Fixture, Quant/Platform/Web sources, integration harness and lockfile, and asserted in each TestRun.
- Each TestRun has an immutable evidence/local/V1.4/<testRunId>/ bundle with unchanged source evidence, SHA-256 manifest, and manualConclusion=NOT_RUN.
- Frozen Fixture SHA-256: 88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef.

TestRuns:

- platform-api: `536711cd-d4c0-4b83-9761-2ac4125d758d`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `48870368-cbdc-40b0-8e7e-c39cc4d18c43`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `3d778c41-5594-47d7-8093-286857d3e889`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `ff922706-7c85-4f32-98b4-a11f929ee904`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-1-and-cli-checked: `2a96fda5-d0ab-42dd-9d6f-38fff0663307`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `54846618-6d65-431f-b11f-8de5508ad578`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-3-and-cli-checked: `4c9609a0-286f-4e7b-8a42-bd782a42d341`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-4-and-cli-checked: `3d0cfffb-78b2-453a-a7dd-356094d00f02`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-5-and-cli-checked: `9b21f3f1-0926-4440-bf5c-9698cb0c1e72`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The original Fixture contains one security's daily close/volume; the restriction case uses a separate synthetic OHLCV Manifest. It does not implement exchange-specific limit formulas, intraday queue/fills, full fee schedules, corporate actions, Qlib/Paper rule parity, complete current-scope manual acceptance or Ubuntu acceptance. This audit does not close V1.4, W1 or the delivery plan.
