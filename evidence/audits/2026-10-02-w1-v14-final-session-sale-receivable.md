# W1 / V1.4 final-session partial-sale settlement boundary

Date: 2026-10-02 (Asia/Shanghai)

## Change

Added a Quant domain assertion and regression case for a volume-limited SELL on the last Fixture session. A 100-share request with the last session capped to 5,000 shares at 100 basis points fills only 50 shares. After the fixed 500-cent fee, 50,250 cents remain an unsettled receivable because there is no subsequent Fixture session; settled cash remains 898,500 cents. NAV counts the receivable once and remains 999,500 cents for this fixed synthetic input.

The new case exposed that `V1.4-BT-SELL-SETTLEMENT-008` required every valid SELL to fill completely and settle within the Fixture. The assertion now recomputes the volume-bounded quantity, adverse sell price, fixed fee, order status, execution-day cash split and settlement status from the input bars and policy. This preserves end-of-Fixture unsettled proceeds as a valid report state.

## Verification

- V1.4 Quant focused daily-backtest test: 10/10 PASS.
- Quant Research suite: 82 TypeScript unit tests and 13 Python Worker tests PASS. The default sandbox attempt retained a loopback `EPERM` failure; the controlled local test rerun exited 0.
- `pnpm test:e2e -- --stage V1.4`: exit 0, browser tests 2/2; three browser-created TestRuns were checked by CLI, six Quant BacktestRuns/Manifests matched, and isolated containers/volume/network/images were removed. Machine report: [isolated Web audit](./2026-10-02-w1-v14-quant-configurable-web-8a3f64eba4cbf65bbaaa.json).
- `pnpm verify:stage -- --stage V1.4 --suite code`: exit 0 after the assertion change.
- No external market/provider, Paper/Broker, or active-service calls. No human acceptance status changed.

This remains Fixture-only evidence. It does not verify an exchange settlement calendar, market-side tax schedules, price limits, corporate actions, Qlib/Paper rule parity, Ubuntu or full V1.4 acceptance.
