# W1 / V1.4 single-security and calendar-date input guard

Date: 2026-10-02 (Asia/Shanghai)

## Change

The daily backtest engine now validates real ISO calendar dates (not just `YYYY-MM-DD` shape) and rejects mixed-security bar sequences. The V1.4 Fixture and holdings/NAV implementation are explicitly single-security; accepting a second symbol would otherwise combine per-bar values with one position ledger and could misstate NAV. Unsupported or malformed inputs now fail before simulation.

## Verification

- Focused `v14-daily-backtest.spec.ts`: 10/10 PASS, including impossible `2024-02-30` date and mixed-symbol rejection.
- Quant Research build and lint PASS.
- `pnpm test:e2e -- --stage V1.4`: exit 0; browser 2/2. API normal/rejection/recovery and all browser-created TestRuns were read-only checked by CLI; six Quant BacktestRun/Manifest hashes matched and disposable resources were removed. [Machine report](./2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.json), [isolated audit](./2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.md).
- `pnpm verify:stage -- --stage V1.4 --suite code`: exit 0.
- No external market/provider, Paper/Broker, or active-service calls; no human acceptance changed.

This is a domain input guard, not multi-security support or full V1.4 acceptance. Exchange calendar, market rules, source authorization, human acceptance and Ubuntu remain unresolved.
