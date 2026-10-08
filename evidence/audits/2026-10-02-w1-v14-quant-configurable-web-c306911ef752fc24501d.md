# W1 / V1.4 configurable Web and isolated end-to-end audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

Daily Fixture calculation, Fixture hash verification and durable BacktestRun/Manifest persistence now run in Quant Research. Platform uses the generated OpenAPI Bearer client and stores TestRun metadata plus returned evidence. The isolated Compose stack includes Quant, Platform, Portfolio, PostgreSQL, Web and CLI verification.

## Verification

- pnpm contracts:check: PASS; 151 schemas, 106 compatibility rules, 25 client generators registered.
- Quant build: PASS; focused service/auth/engine tests passed.
- Platform build and focused adapter/client tests passed.
- pnpm test:integration:v14-backtest: PASS. Fresh PostgreSQL and service containers; Web/CLI normal, rejection, recovery and synthetic market restrictions; unknown policy fields rejected without a Platform TestRun; configured Web runs and same-session metric comparison; every browser-created TestRun checked by CLI; database assertion confirmed eight Quant BacktestRuns, eight Manifests and matching result hashes; all temporary containers, volume, network and images removed.
- Workspace codeVersion: `sha256:38e5b8a65aa913eb06be1a4ec046d819d8d7dc0a0ad2b42752f85a038d447357`; computed from the exact V1.4 contract, Fixture, Quant/Platform/Web sources, integration harness and lockfile, and asserted in each TestRun.
- Each TestRun has an immutable evidence/local/V1.4/<testRunId>/ bundle with unchanged source evidence, SHA-256 manifest, and manualConclusion=NOT_RUN.
- Frozen Fixture SHA-256: 88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef.

TestRuns:

- platform-api: `8f6d871d-a2e1-4d6f-a00c-1a19e0978fc9`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- cli-rejection: `9fc5ad49-3d76-42a1-8487-ba309dac2ffa`, COMPLETED, 3 assertions (V1.4-BT-PIT-001=PASS, V1.4-BT-REPORT-002=PASS, V1.4-BT-TPLUS1-REJECT-009=PASS).
- cli-recovery: `04b7b461-5f0b-4a4b-91a5-ed6ac0cc2d82`, COMPLETED, 2 assertions (V1.4-BT-CANCEL-001=PASS, V1.4-BT-REPLAY-002=PASS).
- cli-market-restrictions: `a351a67a-bf0e-4dca-8365-670075ce6fb1`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- cli-historical-fees: `26b73839-5312-4175-bb24-9855bf257c7e`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- cli-corporate-actions: `1ba33e5f-162f-4e09-adac-444b7d441b3a`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-1-and-cli-checked: `d27f3d9e-440a-484b-9d05-dd371db25a62`, COMPLETED, 7 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS).
- web-created-2-and-cli-checked: `3638ca7f-e0a6-4c0a-bf75-4f5205b84766`, COMPLETED, 1 assertions (V1.4-BT-MARKET-RESTRICTIONS-001=PASS).
- web-created-3-and-cli-checked: `ebc02508-0478-459e-9925-760d515f516d`, COMPLETED, 10 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-HISTORICAL-FEE-001=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-4-and-cli-checked: `0ceae8a1-c216-4c20-9d51-e65ab40dd23a`, COMPLETED, 3 assertions (V1.4-BT-CORPORATE-ACTION-RAW-001=PASS, V1.4-BT-CORPORATE-ACTION-IDEMPOTENCY-002=PASS, V1.4-BT-CORPORATE-ACTION-NO-ADJUSTED-DOUBLE-COUNT-003=PASS).
- web-created-5-and-cli-checked: `7593eca1-997e-47ed-91d2-32971f1bfe57`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-6-and-cli-checked: `35834b45-e867-425f-a4d9-64ba3ff64eaf`, COMPLETED, 8 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).
- web-created-7-and-cli-checked: `bd0cb62d-0168-4667-8d74-fe18d6e04ea4`, COMPLETED, 9 assertions (V1.4-BT-NEXT-BAR-001=PASS, V1.4-BT-FEE-002=PASS, V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS, V1.4-BT-LEDGER-003=PASS, V1.4-BT-VOLUME-004=PASS, V1.4-BT-CASH-006=PASS, V1.4-BT-DRAWDOWN-005=PASS, V1.4-BT-TPLUS1-SELLABLE-007=PASS, V1.4-BT-SELL-SETTLEMENT-008=PASS).

## Boundaries

External market calls: 0. Provider calls: 0. Paper/broker calls: 0. Active services touched: no. Human acceptance: unchanged.

The original Fixture contains one security's daily close/volume; the restriction case uses a separate synthetic OHLCV Manifest. It does not implement exchange-specific limit formulas, intraday queue/fills, full fee schedules, corporate actions, Qlib/Paper rule parity, complete current-scope manual acceptance or Ubuntu acceptance. This audit does not close V1.4, W1 or the delivery plan.
