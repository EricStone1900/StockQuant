# O1/O2 read-only health and observation refresh

Observed 2026-10-06 17:52 Asia/Shanghai. The default sandbox GET report failed with `fetch failed`; the same GET-only command succeeded under controlled local permissions. Health result: `UNHEALTHY` because the market calendar is CLOSED, zero of one expected collection schedules are enabled, source authorization is `UNKNOWN`, and `nextExecutionAt` is null. The worker is enabled and recently ticked; there are no open gaps or pending outbox items. Configured source adapters do not prove authorization.

The local observation summary remains WAITING at 8/20 valid days (7 complete, 1 recovered), with 12 remaining and latest finalized date 2026-09-30. It reports no malformed or invalid-timestamp files and 185 observations ignored because they do not belong to this subscription. This health poll adds no observation day.

Only readiness, scheduler status, source configuration, collection health, calendar, and schedule inventory GETs ran. No quote/minute/news source was requested; no collection, Paper, broker, subscription, service, or business-data mutation occurred. `NO_TRADE` and source authorization NONE remain unchanged. See the archived [health snapshot](./2026-10-06-o1-health-snapshot-0952z.json) and [observation summary](./2026-10-06-o1-observation-summary-0952z.json).
