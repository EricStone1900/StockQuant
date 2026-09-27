# V2.4 observation window and security freshness quality

Date: 2026-09-26 (Asia/Shanghai)

## Change

Daily observation quality previously counted sampling and execution event rows. Repeated events could therefore satisfy the minimum count without covering distinct scheduled windows, and the observation summary used the newest security timestamp rather than proving every requested security was fresh.

The current source now:

- Requires all ten frozen A-share sampling slots: 09:30, 10:00, 10:30, 11:00, 11:30, 13:00, 13:30, 14:00, 14:30, and 15:00 Asia/Shanghai. It counts a scheduled slot once; missing slots, duplicates, unexpected slots, and schedule delays over 60 seconds fail the day.
- Requires exactly one 09:31 execution-window event.
- Carries the Market Data `requestedSymbols` universe in quote-preview evidence and validates every requested security for unique coverage, `LIVE_SOURCE`, and an `observedAt` timestamp from 0 through 1,800 seconds old relative to the injected observation clock. Missing, duplicate, extra, stale, future-dated, or malformed quotes fail the affected sampling/execution event.
- Requires the execution-window quote evidence to pass the same per-security checks. A day also requires successful end-of-day reconciliation and no collected event or quality errors.

The new calculator does not migrate, rewrite, or re-count existing finalizations. Existing observation records without the auditable request-universe/window fields are not upgraded or backfilled. The source change is not deployed to the active observation service; the stored 8/20 count, active subscription, and ongoing observation process are unchanged. This is engineering evidence only and does not satisfy the 20 trading-day or human-acceptance gates.

## Verification

- `pnpm --filter @stockquant/platform-api-service test`: PASS, 47 unit tests including distinct-window, duplicate, missing-window, per-security stale/missing quote, quote aggregation, and unverifiable-evidence cases.
- `pnpm --filter @stockquant/platform-api-service build`: PASS.
- `pnpm --filter @stockquant/platform-api-service test:integration:persistence`: PASS against the dedicated `platform_api_test` database. The persistence smoke inserted ten distinct sampling windows plus one execution window for two securities, then verified 22/22 fresh security samples and idempotent TestRun completion; legacy-run migration checks also passed. Test rows were cleaned by the script.
- `pnpm --filter @stockquant/market-data-service typecheck`: PASS after adding `requestedSymbols` to the quote-preview response.
- `pnpm verify:stage -- --stage V2.4 --suite code`: PASS, exit 0; full workspace build/lint/typecheck/unit checks, Portfolio/FakeBroker isolated integration, Market Data PostgreSQL integration 22/22, Python Adapter 58/58, operations 94/94, and contract/Fixture checks.
- `pnpm test:e2e -- --stage V2.4`: after making the observation progress assertion depend on the actual 20-day summary (instead of a stale hard-coded 6/20), 2 browser cases passed and the isolated-DB revision case was intentionally skipped without its harness. `pnpm --filter @stockquant/platform-api-service v24:revision-web-http-smoke` then passed with TestRun `c82cff87-5acc-43c6-812d-17f171968042`, date `2098-03-13`, owner-scoped same-run Web/API/DB/CLI evidence, and exact test-row cleanup; no active service was touched.

The full V2.4 code suite is recorded separately in the execution-plan entry after completion.
