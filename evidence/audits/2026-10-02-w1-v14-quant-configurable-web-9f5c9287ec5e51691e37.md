# W1 / V1.4 configurable Web and isolated end-to-end audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Daily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.

## Verification

- pnpm contracts:check: PASS; 148 schemas, 101 compatibility rules, 25 client generators registered.
- Quant build: PASS; focused service/auth/engine tests passed.
- Platform build and focused adapter/client tests passed.
- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection and recovery; unknown policy fields rejected without a Platform TestRun; configured Web runs and same-session metric comparison; every browser-created TestRun checked by CLI; database assertion confirmed six Quant BacktestRuns, six Manifests and matching result hashes; all temporary containers, volume, network and images removed.
- Frozen Fixture SHA-256: 88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef.

TestRuns:

- platform-api: `d520d2c1-faea-4cdf-8acb-fcc41daa9fc3`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `9acbbebe-e196-4da4-b9dc-49d20fb04074`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `9d1dc677-9bd8-49ed-8fed-92fb262a4bf3`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- web-created-1-and-cli-checked: `4aa5306e-e700-4842-bdc9-c0086739e5f0`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `23f587bf-8859-44d0-bdc4-58df1713ee36`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-3-and-cli-checked: `a2eed793-a915-4b20-959e-9d70ee0764d1`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The Fixture contains only one security's daily close/volume. SELL/T+1, settlement, suspension/price-limit rules, corporate actions, direction/market fee schedules, Qlib/Paper rule parity, complete current-scope manual acceptance and Ubuntu acceptance remain incomplete. This audit does not close V1.4, W1 or the delivery plan.
