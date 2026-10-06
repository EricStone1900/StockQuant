# O1/O2 read-only refresh (2026-10-06 13:40 Asia/Shanghai)

This check queried only the existing local Market Data read endpoints for readiness, scheduler status, source configuration, collection quality, the A-share calendar, and enabled schedules. It did not call provider, collection, repair, scheduler-trigger, Paper-write, or order APIs. The observation summary was recomputed from local archived evidence. The container inventory used read-only `docker ps`; no service was started, stopped, or reconfigured.

## Results

- Market Data health is `UNHEALTHY`. The local service is ready with PostgreSQL persistence and scheduler/executor marked enabled, but source authorization is `UNKNOWN`, no schedule is enabled (0/1), and `nextExecutionAt` is null. The current local calendar reports `CLOSED`; collection quality remains zero open gaps and zero pending outbox items.
- The archive remains 8/20 counted observation days (7 complete plus 1 recovered), with 12 remaining. The latest finalized eligible day is 2026-09-30. This refresh adds no observation day.
- The existing 13 StockQuant containers remain running. Their status and published local ports are preserved in the container inventory file.
- `NO_TRADE` and source authorization `NONE` remain in force. O1 stays paused and O2 has not started.

## Evidence

- [Machine report](2026-10-06-o1-o2-readonly-refresh.json)
- [Health GET result](2026-10-06-o1-o2-health-1339z.json)
- [Recomputed archived observation summary](2026-10-06-o1-o2-observation-summary-1339z.json)
- [Read-only container inventory](2026-10-06-o1-o2-docker-containers.txt)
- [SHA-256 manifest](2026-10-06-o1-o2-readonly-refresh.sha256)
