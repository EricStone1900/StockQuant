# W1 / V1.4 cost, slippage, and cash-constrained fill audit

Date: 2026-10-02 (Asia/Shanghai)

## Change

The isolated daily-bar Fixture engine now accepts a run-scoped `V14ExecutionPolicy` with integer-cent starting cash and fixed fee, target whole-share quantity, participation rate in basis points, and adverse slippage in basis points. BUY fill prices round upward to an integer cent. Actual quantity is capped by target quantity, bar-volume participation, and affordability after the fee. A zero-fill order records one rejection, all unfilled quantity, zero fees, and zero fill rate. Nonzero fills record partial-fill rate and quantity remaining. Cash, turnover, NAV, return, and drawdown calculations use integer cents and BigInt intermediates; an unrepresentable NAV fails closed.

Default fixed Fixture policy is CNY 10,000.00 initial cash, 100 target shares, 1% participation, 0 bps slippage, and CNY 5.00 fixed fee. An independent hand case with 100 bps BUY slippage and CNY 1,020.00 cash fills 99 shares at CNY 10.21 and leaves CNY 4.21. A 99-share participation cap at 1% volume produces zero fills; cash equal to the fixed fee also produces zero fills without charging that fee.

The frozen Fixture bytes were not changed. This is only the Platform API V1.4 Fixture adapter; the full backtest domain has not been moved to Quant Research and the policy is not exposed as a product/Web configuration.

The first post-change review also found drawdown high-water was anchored to the default CNY 10,000.00 even when a run supplied another initial cash value. The engine now initializes high-water from the run's actual initial cash; a regression assertion checks the CNY 1,020.00 case reports 156 bps drawdown. This is a calculation correctness fix within the same isolated Fixture slice.

## Verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v14-backtest.spec.ts`: 7/7 PASS.
- `pnpm --filter @stockquant/platform-api-service build`: PASS.
- `pnpm --filter @stockquant/platform-api-service lint`: PASS.
- Final `pnpm verify:stage -- --stage V1.4 --suite code`: exit 0. This runs baseline, build, typecheck, and workspace unit tests; Platform API reports 45 files / 159 tests, and Quant Worker Python tests report 13 passed.
- Re-ran the complete code suite after correcting run-scoped drawdown high-water: exit 0, captured from the process; all repository build/typecheck/unit checks completed, including Platform API 45 files / 159 tests and Quant Worker Python 13/13.
- Initial full-suite attempt inside the default sandbox failed because the unrelated Qlib Worker test could not bind its ephemeral loopback socket (`EPERM`). A subsequent controlled run of the same isolated code suite completed with exit 0. The first version of the new focused tests also exposed two assertion assumptions; both were corrected before the final runs.

No active service, database, Market Data source, Paper workflow, broker, or external model was accessed. No V1.4 business TestRun was created. Stage status and historical human sign-off remain unchanged.

## Remaining V1.4 requirements

This does not implement SELL/T+1 available quantity, settlement calendars, suspensions, price limits, direction/market fee schedules, corporate actions, Qlib-versus-execution rule comparison, full Quant-owned backtesting, production Web controls, complete operator runbook, or current-scope human acceptance. V1.4/W1 remain incomplete.
