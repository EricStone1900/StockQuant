# V2.1 C2-B Sina quote adapter candidate

Date: 2026-10-19  
Scope: parse Sina's documented-shaped quote response through the shared snapshot Provider port and register the candidate behind existing authorization/runtime gates.  
Status: **PASS for fixed-response adapter behavior and registration; Sina source capability and authorization remain UNVERIFIED.**

## Implementation

- Added a Sina quote payload parser for six-digit CN securities. It decodes GB18030-compatible response bytes, validates the requested `hq_str_{exchange}{code}` record, positive current price and exact calendar/time fields, and converts source time to `Asia/Shanghai` (`+08:00`). Missing or invalid timestamp remains `MISSING_TIMESTAMP`; malformed or zero price is not emitted as a live quote.
- Added `sinaQuotePreview()` to the injected HTTP adapter with a bounded timeout and deterministic response handling, plus a Sina snapshot Provider implementing the same source-matched result contract as Tencent.
- Registered Sina with the durable Worker. REAL tasks still require the precise QUOTE source authorization and the independent `STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED=true` runtime opt-in. Both remain unset, so the adapter was not called.
- Fixed-response tests cover valid field mapping, source time, impossible dates, malformed prices, invalid securities, incomplete batches and injected worker clock. No external host or real quote was contacted.

## Checks

- Market Data typecheck — PASS.
- Focused adapter/Provider tests — 20 tests PASS.
- Full `pnpm --filter @stockquant/market-data-service test` — 24 files, 118 tests PASS.
- `pnpm --filter @stockquant/market-data-service build` — PASS.
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` — PASS; authorization is still checked before Provider dispatch, Fixture recovery works, source health persists, and `externalRequests=0`. Temporary PostgreSQL container/network removed and verified.
- `git diff --check` and `pnpm docs:check` — PASS; 13,996 Markdown links checked, no broken links or duplicate section IDs.

## Capability boundary

This code establishes parser and application-port behavior only. It does not verify live Sina endpoint availability, response encoding/content stability, licensing, rate limits or suitability for persistent sampling. Existing OD-008 review records restrictions and remains OPEN with no source authorization. Sina must stay disabled until the owner supplies source-specific permission and the authorized validation procedure is executed. Monitor, daily-bar, strategy and order schedule consumers remain separate unfinished C2-B work.
