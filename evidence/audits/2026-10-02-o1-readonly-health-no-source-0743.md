# O1 read-only health and observation follow-up

Date: 2026-10-02 07:43 Asia/Shanghai (2026-10-01 23:43 UTC)

Read-only check against the current local Market Data service. The health report queried readiness, scheduler status, source inventory, collection quality and A-share calendar; a separate GET read the enabled schedule count. The report and recomputed observation summary were written to `/tmp` first and copied into new evidence files, preserving earlier snapshots. No quote/bar endpoint was requested, no collection was triggered, no subscription or service state was changed, and no Paper/order operation occurred.

The service reported `ready`, PostgreSQL persistence and enabled scheduler/executor. Calendar status was `CLOSED`; `nextExecutionAt=null`, `lastSubmitted=0`, enabled schedules `0`, open gaps `0`, and pending outbox `0`. Aggregate health is `UNHEALTHY` because there is no next scheduled execution. This is the intended no-source gate; configured adapters are not evidence of authorization or a data request.

The archive still contains 7 complete days and 1 recovered day (8/20); 12 valid observation days remain. The latest valid observation is 2026-09-30. This refresh did not produce or count a new observation day. No market-source authorization is present and NO_TRADE remains in force.

Evidence: [health JSON](./2026-10-02-o1-readonly-health-no-source-0743.json) and [observation summary](./2026-10-02-o1-readonly-observation-summary-no-source-0743.json). This is a read-only point-in-time check, not an O1/O2 acceptance or source authorization.
