# V1 Fixture strategy and OD-007 active-strategy boundary

Date: 2026-10-09

## Decision boundary

This inventory separates reproducible V1 test inputs from the active Paper decision. OD-007 records the owner's approval of a read-only `NO_TRADE` baseline only. It does not approve a TopK strategy, data source, account, universe, capital limit, cost/risk policy, Mandate, or order. The active strategy configuration therefore remains unset and Paper remains preparation-only.

## V1 test-only inputs

| Stage | Fixture/test version | Frozen test behavior | What it does not authorize |
|---|---|---|---|
| V1.2 research | Fixture `v1.2-market-data-4`; generated research outputs are bound to the TestRun and input/strategy hash | Synthetic daily bars for CN_A and US_EQUITY; per-market 20-day momentum, volume-ratio and range features; next-session close-return label; locked Qlib/LightGBM fit and test-segment predictions; TopK candidate plus explicit empty-target `v1.2-no-trade-1` baseline | No real-source use, model-quality claim, proposal, Mandate, Paper order, or activation of the TopK candidate |
| V1.3 manual Paper | Fixture `v1.3-trading-loop` 1.0.0; code tags the manual test strategy `fixture-manual-test-v1` | CN_A: CNY 10,000 initial cash, 600000.SH BUY 100 at CNY 10, CNY 5 fee. US_EQUITY: USD 10,000, AAPL BUY 10 at USD 25, USD 0.05 fee. Both use PAPER/FAKE and isolated TestRun accounts | No standing strategy, live account, exchange price, real fee schedule, or reusable authorization outside that TestRun |
| V1.5 AUTO workflow | Fixture strategy tag `fixture-auto-policy-test-v1`; session inputs are `v1.5-auto-trade-calendar-2` | Run-scoped test Proposal/Mandate and FakeBroker. Base order quantities are 100 CN_A shares at CNY 10 plus CNY 5 fee, or 10 AAPL shares at USD 25 plus USD 0.05 fee; the calendar fixture overrides these to 50 and 5 shares for its two execution sessions. Mandate maximums equal each test order's notional plus fixed fixture fee, with one order per Mandate | No production strategy; no indefinite or cross-TestRun Mandate; synthetic sessions are not exchange calendars or real-time schedules |

## Active Paper configuration

| Field | Current owner-approved value | Status |
|---|---|---|
| Strategy | `NO_TRADE` read-only observation baseline | Confirmed; emits no order intent |
| Active strategy version/hash | None | UNSET; Fixture strategy IDs/hashes are not substitutes |
| Data-source authorization | None | UNSET; no V1 fixture or endpoint grants source rights |
| Account, capital, universe | None | UNSET |
| Fees, risk limits, holding/rebalance policy | None | UNSET |
| Active Paper Mandate / orders | None | Not authorized |

## Source evidence

- [OD-007 decision register](../../docs/decisions/open-decisions.md) and [W3 Paper decision package](2026-09-30-w3-paper-decision-package.md).
- [V1.2 Qlib research and Fixture behavior](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md), including `fixtures/v1/v1.2/v1.2-market-data-4/manifest.json`.
- [V1.3 dual-market trading Fixture](../../fixtures/v1/v1.3/trading-loop-scenarios.json).
- [V1.5 AUTO session Fixture](../../fixtures/v1/v1.5/auto-trade-calendar-2.json) and implementation tags/limits in `services/platform-api-service/src/application/v15-auto-trade.ts`.

This closes the documentation task to list Fixture parameters separately from OD-007 activity parameters. It does not close OD-007, validate strategy profitability, or activate anything.
