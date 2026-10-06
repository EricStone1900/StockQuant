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

- platform-api: `797315a0-3812-41f6-9b3d-f0a4b6590579`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `7c859db5-9d0f-4ff6-b508-c9bfe5d27a8f`, COMPLETED, 2 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS).
- cli-recovery: `993e12c0-22b2-4144-b018-00625f490877`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- web-created-1-and-cli-checked: `132e4034-4775-4a5d-a44e-c13f11f14b1f`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `042c32d7-757d-4ae7-982d-4f82f8ab6b6b`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-3-and-cli-checked: `cb095baa-e3c1-4181-a35e-a76b7993920f`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The Fixture contains only one security's daily close/volume. SELL/T+1, settlement, suspension/price-limit rules, corporate actions, direction/market fee schedules, Qlib/Paper rule parity, complete current-scope manual acceptance and Ubuntu acceptance remain incomplete. This audit does not close V1.4, W1 or the delivery plan.
