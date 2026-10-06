# W1 / V1.4 Quant Research ownership and isolated end-to-end audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Daily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.

## Verification

- pnpm contracts:check: PASS; 148 schemas, 101 compatibility rules, 25 client generators registered.
- Quant build: PASS; focused service/auth/engine tests passed.
- Platform build and focused adapter/client tests passed.
- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection and recovery; Web-created TestRun checked by CLI; database assertion confirmed four Quant BacktestRuns, four Manifests and matching result hashes; all temporary containers, volume, network and images removed.
- Frozen Fixture SHA-256: 88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef.

TestRuns:

- platform-api: `2f085ea4-f509-4521-993f-437036bd36a1`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).
- cli-rejection: `ef6a6885-aed8-498c-ac49-1486c99cee1a`, COMPLETED, 2 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS).
- cli-recovery: `a347c1b1-f71c-4f33-890a-e0ce8d099f64`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- web-created-and-cli-checked: `1b56252c-b051-4ba5-9675-0f4474bd0404`, COMPLETED, 6 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The Fixture contains only one security's daily close/volume. SELL/T+1, settlement, suspension/price-limit rules, corporate actions, direction/market fee schedules, Qlib/Paper rule parity, complete current-scope manual acceptance and Ubuntu acceptance remain incomplete. This audit does not close V1.4, W1 or the delivery plan.
