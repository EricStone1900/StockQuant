# V1.2 dual-market research Fixture — 2026-10-06

Status: frozen data bundle and independent structural/window validator PASS; P2 remains incomplete because Platform→Market Data→Quant/Qlib strategy-output wiring is not yet implemented.

## Dataset

New immutable version: `v1.2-market-data-3`, path `fixtures/v1/v1.2/v1.2-market-data-3/`. It contains 10 synthetic CN_A and 3 synthetic US_EQUITY securities, 60 synthetic weekday sessions from 2024-01-02 through 2024-03-25, and 774 raw daily bars. Per-row currency, IANA timezone, and post-close `available_at` are explicit. A missing CN bar, one security delisted after session 55, a separate split action over raw prices, and a future PIT-only probe are included. The fixture claims no exchange holidays, real prices, provider provenance, or profitability.

The first authoring candidate, `v1.2-market-data-2`, missed its intended missing-bar row because of a ticker mismatch. Its failure is preserved in the [validation log](2026-10-06-v1-p2-fixture-v2-validation-failure.log); the version is marked `RETIRED`, its data files remain unchanged, and the correction uses a new version.

## Validation

`pnpm fixtures:check` passes and checks fixture manifest hashes. The new independent validator `scripts/verify-v12-research-fixture.mjs` verifies the 10/3 market counts, 60 dates, 774 raw bars, uniqueness and OHLCV bounds, currencies/availability fields, the missing bar, delisting, separate corporate action and future PIT exclusion. It independently computes 20-session momentum/volume features and next-session-return labels. The time barriers produce 180 train rows, 142 validation rows and 138 test rows; all required labels are available strictly before the following validation/test window begins.

The `fixture-manifest.schema.json` now permits a bounded `semantics` block so this evidence dataset records exact session, market, currency, timezone, price-adjustment, quality-case and calendar-limit semantics.

## Limitations

The weekday calendar is synthetic and is not CN/US exchange calendar evidence. The frozen input has not yet been loaded by the V1.2 Market Data API; the V1.2 factor endpoint remains `NOT_RUN`, normal acceptance remains `WAITING`, and Qlib model fitting on this dataset has not been executed. Those are the next P2 tasks. No external data or model calls occurred.
