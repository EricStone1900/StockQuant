# V2.1 C2 sampling, time and news engineering evidence

Date: 2026-10-17 (Asia/Shanghai)

## Implemented local behavior

- Sampling interval defaults to 30 minutes, accepts 20/30, persists the configuration version in PostgreSQL, and reports `UNAVAILABLE`/503 when persistence is absent. A run-clock tick uses the persisted interval and the pinned 2026 A-share calendar to distinguish `ELIGIBLE`, off-cycle, closed/lunch and unknown dates. Eligible ticks create a durable task with idempotency key `settingsVersion:UTCInstant`; task status is `BLOCKED_SOURCE_AUTHORIZATION` while OD-008 is NONE. Retry is idempotent and the latest task survives Market Data process restart. This slice records scheduler decisions; it does not execute quote collection, monitoring, daily-bar completion, strategy evaluation or orders.
- Quote previews retain source and ingestion timestamps and return age/freshness. Missing/future observation times and ages beyond the configured interval are stale. This display rule does not establish provider timestamp precision.
- A frozen synthetic news Fixture [`v2.1-news-revisions-1`](../../fixtures/v2/v2.1-news-revisions/manifest.json) contains stable source/item IDs, two revisions of one item, a cross-source copy, separate publication/observation/ingestion/availability times, and linked/ambiguous entity examples. SHA-256: `5feb697b6d517aeae2ff7de85b324c97b95d153a7cb60cf08cfb516748f7d05b`.
- Authenticated Market Data routes explicitly ingest that Fixture into `market_data_news_revisions` and read the persisted history. Platform exposes both routes to the V2.1 Web page; the page shows source/item ID, revision, all four time fields, entity status and whether a revision has a stable ID. Repeated Fixture ingestion creates no duplicate revisions. The live homepage-title adapter still has no stable article ID or article URL, so live items remain `UNVERIFIED_NO_STABLE_SOURCE_ID` and never enter this ledger.
- Market Data schema migration is now v5: v3 sampling configuration, v4 news revision ledger, v5 durable sampling task records. Existing migration paths v1-v4 advance idempotently.
- External quote/news routes remain denied by the OD-008 gate. No provider calls were made; live quote/news returned 403 and the smoke recorded `externalRequests=0`.

## Verification

| Check | Result |
|---|---|
| Market Data unit suite | PASS, 21 files / 94 tests |
| Market Data, Platform and Web typecheck | PASS |
| `pnpm --filter @stockquant/web build` | PASS; Vite reports the existing single JavaScript bundle at 502.28 kB minified |
| Fixture hash check | PASS, 50 files / 0 failures; new news Fixture included |
| `pnpm contracts:check` | PASS; OpenAPI client generator drift check reports 24 Market Data operations |
| `pnpm --filter @stockquant/market-data-service test:schema-migrations` | PASS; migrations v1-v5, old row preservation, task idempotency/restart, news revision 1→2/supersedes/idempotency/history recovery; isolated PostgreSQL container and network removed |
| `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` | PASS; configured 20 minutes, invalid 25 rejected 422, eligible tick persisted once and recovered after restart, Fixture news appended/replayed idempotently, real quote/news 403, external requests 0; isolated container and network removed |
| `pnpm test:e2e -- --stage V2.1` | PASS, 2/2; C2 Web interaction uses mocked Platform responses, plus existing 101-security rejection test |
| `pnpm docs:check`, `pnpm fixtures:check`, `git diff --check` | PASS |

The fixed time unit scenarios cover both 20/30 minute boundaries, morning/afternoon windows, lunch, holiday, and dates outside calendar coverage. News unit tests cover deduplication, source failure, unknown publication time, and entity ambiguity. The browser test confirms the presented fields and actions; the PostgreSQL HTTP test verifies the durable backend behavior. The browser mock is not a live multi-container Web→Platform→Market Data integration run.

## Remaining gates

C2 and V2.1 remain **IN_PROGRESS / PARTIALLY_IMPLEMENTED**. The local Fixture-backed persistence, Web display and sampling task recovery slice is implemented and automatically verified. Required D1 validation remains blocked by OD-008 authorization `NONE`: at least one actual quote source and two actual news sources, their permitted uses/terms, coverage and capabilities have not been verified. Homepage-title news parsing still lacks stable IDs and timestamps. The sampling task deliberately remains blocked and has no quote executor. Monitoring cadence, completed daily-bar processing, strategy cadence and execution windows remain separate work; this slice does not claim those schedulers are implemented. Full stage manual, same-TestRun CLI check-only/export and new-range human acceptance are also not complete. These gates are not replaced by the synthetic Fixture.
