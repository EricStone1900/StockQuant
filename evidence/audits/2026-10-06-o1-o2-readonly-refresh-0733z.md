# O1/O2 read-only refresh (2026-10-06 15:33 Asia/Shanghai)

The default sandbox attempt of `pnpm dc08a:health-report` failed with `fetch failed`; no data-source endpoint is used by that script. The same repository command was then run through the controlled local path. Source inspection confirms the script makes only GET requests to `/ready`, scheduler status, minute-source configuration, collection health, the CN A-share calendar, and schedule inventory. It does not request quote/news data or trigger collection.

The returned health report is `UNHEALTHY`: calendar `CLOSED`, scheduler/executor workers `ENABLED`, latest successful tick 47.8 seconds old, `nextExecutionAt=null`, `lastSubmitted=0`, enabled schedules `0/1`, source authorization `UNKNOWN`, and open gaps/outbox both 0. Baostock/Sina are listed as configured/enabled sources, but that is not authorization and no source data was requested. The result does not count as an observation day.

`pnpm dc08a:observation-summary` exited 2 / `WAITING`: 7 complete days plus 1 recovered day = 8/20; 12 valid days remain; latest qualifying day is 2026-09-30. No date was added. NO_TRADE and source authorization `NONE` remain in force. No subscriptions, schedules, containers, database rows, orders, Paper runs, or model calls were changed.

Snapshots: [health](./2026-10-06-o1-health-snapshot-0733z.json), [observation summary](./2026-10-06-o1-observation-summary-0733z.json), and [SHA-256 manifest](./2026-10-06-o1-o2-readonly-refresh-0733z.sha256).
