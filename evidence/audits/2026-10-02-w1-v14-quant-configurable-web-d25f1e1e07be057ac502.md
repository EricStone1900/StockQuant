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

- platform-api: `c60adf8e-c875-421b-a97c-54c9dff4ae47`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).
- cli-rejection: `550b2b28-00b0-471d-8267-5255c5ab41a1`, COMPLETED, 2 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS).
- cli-recovery: `2433980b-27a2-4adf-8896-3ff12ed91a26`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- web-created-1-and-cli-checked: `4b5e0e35-5516-4e5a-ad6a-de9c71ca98de`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).
- web-created-2-and-cli-checked: `2fbea2c7-48bf-48e7-9b51-65a4a1bfa166`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).
- web-created-3-and-cli-checked: `10857fea-4d30-4358-87f4-67e6e5f6077e`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The Fixture contains only one security's daily close/volume. SELL/T+1, settlement, suspension/price-limit rules, corporate actions, direction/market fee schedules, Qlib/Paper rule parity, complete current-scope manual acceptance and Ubuntu acceptance remain incomplete. This audit does not close V1.4, W1 or the delivery plan.
