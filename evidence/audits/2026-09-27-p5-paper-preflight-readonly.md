# V2.4 Paper preflight read-only refresh

Captured 2026-09-27T03:13:40Z (11:13 Asia/Shanghai) with `pnpm v24:preflight`, exit 0. This command only probes readiness, scheduler configuration, calendar and the quote preview endpoint; it does not tick or start the scheduler, create orders, or write observations.

- Platform is ready in `FAKE`; Market Data is ready with PostgreSQL persistence, scheduler worker and executor enabled, and 20 configured collection securities.
- V2.4 scheduler is `RUNNING`, `PAPER + FAKE`, sampling every 30 minutes; last sample `2026-09-25T07:10:00.007Z`, next sample `2026-09-28T01:30:00Z` (09:30 Asia/Shanghai), cumulative tick count 194.
- A-share calendar for 2026-09-27 is `CLOSED` (`sse-cn-a-share-2026-1`). The quote preview returns three `LIVE_SOURCE` securities, but their `observedAt` values are all 2026-09-24; `ingestedAt` is current. The preflight passes because freshness is deferred while the market is closed. This is stale weekend display data, not proof of fresh quotes or a new Paper observation.

No order, Fill, reconciliation, account, Mandate, schedule or observation record was changed. The existing V2.4 observation count remains governed by its archived records; this preflight does not add a day or prove Monday's first fresh sampling window.
