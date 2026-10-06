# V1.4 fixture-backed backtest audit — 2026-10-01

## Change

Replaced the prior self-asserting V1.4 scenario stub with a fixture-backed deterministic calculation. The Platform adapter reads `fixtures/v1/v1.4/backtest_daily.csv`, checks its frozen SHA-256 (`88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`), and parses validated daily rows. The application engine derives next-bar execution, quantity cap, fixed fee, cash, daily NAV, return and drawdown from those rows. Follow-up review found drawdown had compared every bar to the eventual full-period high-water mark, leaking future prices into earlier drawdown values; it now advances the high-water mark sequentially, and the frozen sequence asserts 5 bp maximum drawdown. The rejection scenario compares signal-visibility and requested-execution timestamps. Recovery cancels after a queued signal without publishing a report, then executes the same simulation twice and compares the complete reports derived from the Fixture.

## Verification

- `pnpm --filter @stockquant/platform-api-service test`: PASS, 44 files / 153 tests.
- `pnpm --filter @stockquant/platform-api-service build`: PASS.
- `pnpm verify:stage -- --stage V1.4 --suite code`: PASS, exit 0 after the sequential drawdown correction; workspace baseline, typecheck, build and all unit suites passed (Platform API: 44 files / 153 tests).
- `pnpm test:integration:v14-backtest`: PASS, exit 0 after the correction. The final script built and ran uniquely named Compose project `sq-v14-backtest-67280fa219a7af82c5b4` with its own PostgreSQL volume and loopback-only API port. It exercised the Web API and CLI scenarios, an actual Chromium page, then confirmed project containers, volume, network and generated images were removed. Final Docker inspection showed no `sq-v14-backtest-*` containers or images, while all pre-existing `stockquant-v12-*` containers remained running.
  - API-created normal TestRun `cca8143b-530a-4e63-8689-b32b778be752`: persisted GET and CLI `--check-only` PASS.
  - Browser-created normal TestRun `fca91ddc-0b3d-44f2-92ed-66a0dbece151`: Chromium assertions PASS and the E2E test ran CLI `--check-only` against this exact ID, PASS.
  - CLI rejection TestRun `4a1d06f2-94c9-4dc4-a3b1-196c409363ef`: PASS.
  - CLI recovery TestRun `7ca7581b-8003-4e9d-af2e-a62e7eb211a1`: PASS; cancellation reported `CANCELLED`, no report, and no publication; subsequent full report matched an independent rerun across NAV, trades, metrics and signals.
- Frozen Fixture SHA-256 in all runs: `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`.

## Scope limits

This is still a small synthetic acceptance Fixture, not market data or a complete backtest service. Costs are a fixed fee; slippage, settlement, corporate-action accounting and Qlib-vs-trading comparison remain incomplete. V1.4 remains `PARTIALLY_IMPLEMENTED`; historic user acceptance is preserved but does not cover this new scope. The isolated test did not touch the active V2 containers or their database. No data source, broker or Paper flow was used.
