# O1/O2 read-only refresh — 2026-10-03 07:44 Asia/Shanghai

Five authenticated/local status GETs were made to the running Market Data service for readiness, scheduler, source metadata, quality and A-share calendar. No market-data source endpoint was called; collection and business writes were not triggered. Calendar is CLOSED. Service persistence and scheduler process report ready/enabled, last successful tick is fresh, but `nextExecutionAt=null`/no next trigger makes aggregate health UNHEALTHY. Gaps and pending Outbox are both zero. Configured source metadata is not authorization; market-source authorization remains NONE.

The archived DC-08A observation total remains 8/20 (7 complete, 1 recovered), with 12 valid days remaining and latest valid date 2026-09-30. This read-only health refresh is not an observation day. O1a/O1b are not closed. O2 remains NOT_STARTED under NO_TRADE and absent qualifying W3 deployment; Ubuntu observation remains NOT_RUN.

Sanitized machine snapshot: [2026-10-03-o1-o2-readonly-refresh-2344z.json](./2026-10-03-o1-o2-readonly-refresh-2344z.json). No credentials or raw service payloads are archived.
