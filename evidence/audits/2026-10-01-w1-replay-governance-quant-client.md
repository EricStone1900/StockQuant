# W1: Replay Governance and Quant Research client migration

Date: 2026-10-01 (Asia/Shanghai)

## Change

Added `replay-governance-quant.v1` with generated schemas/types/clients for three Replay execution dependencies: Replay Worker requests exact BACKTEST/FAKE grants from Decision Governance, Trade Execution validates those grants with its own identity, and Replay Worker submits Fixture-only multi-bar summaries to Quant Research. Both single-bar and multi-bar replay flows use the generated authorization/research client; UNKNOWN recovery reads the original order by ID through the generated Trade Execution client. The calls keep each calling service's Bearer identity. HTTP errors retain status and response body.

The schema constrains mode to BACKTEST/FAKE, binds the account and namespace, requires at least one timestamped bar, and models the observed summary and order-state fields. The endpoints remain protected by the existing service-auth middleware. No provider, RD-Agent, real broker, or active service was called by this change.

## Validation

- `pnpm contracts:check`: PASS; 140 schemas, 36 fixtures, compatibility matrix 98 consumer rules, OpenAPI validation passed.
- `pnpm docs:check`: PASS; 1666 local Markdown links.
- Replay Worker typecheck and unit suite: PASS, 8 files / 23 tests. Trade Execution typecheck and unit suite: PASS, 12 files / 55 tests.
- `pnpm verify:stage -- --stage V2.3 --suite code`: PASS, exit 0 after running with loopback permission because the ordinary sandbox denied the isolated Qlib Worker socket with EPERM. The full suite passed all repository build/lint/typecheck/unit, service-auth and disposable-PostgreSQL checks, locked Qlib 0.9.6 Fixture Fit, and persisted owner-scoped Fixture TestRun. The Qlib synthetic run reported 24 predictions, deterministic model/prediction hashes, invalid split HTTP 422, temporal validation PASS; no external source and no broker were used.
- The final V2.3 TestRun was `dc912670-38dd-4e79-9c55-b5a99f6449e0`; its isolated evidence export manifest SHA-256 was `7915baabcc4ac8850dd8a61cbf224ea687554efda15eb50aea898dda44152889`.

## Remaining boundary

No direct Replay Worker or Trade Execution business HTTP call remains for Governance grants, grant validation, Quant summaries, historical order execution, and UNKNOWN original-order lookup. No live deployment or user acceptance was performed. Real market-data authorization remains unset; the active project baseline remains NO_TRADE.
