# O1/O2 and Ubuntu read-only refresh (2026-10-06 15:43 Asia/Shanghai)

The local Market Data health command performed only readiness, scheduler, source-configuration, quality, calendar, and schedule GET requests. A normal sandbox attempt failed with `fetch failed`; the controlled local read-only retry returned exit 1/`UNHEALTHY`. At `2026-10-06T07:43:02.500Z`, the calendar was CLOSED; service readiness, scheduler and executor were ENABLED; the scheduler tick was fresh; `nextExecutionAt` was null; `lastSubmitted` was 0; enabled subscriptions were 0/1; source authorization was UNKNOWN; open gaps and pending outbox were both 0. A source shown as enabled in configuration is not evidence of authorization or an active schedule.

The local archived observation summary exited 2/`WAITING`: 7 complete days plus 1 recovered day, 8/20 total, 12 valid days remaining, latest qualifying date 2026-09-30. This refresh does not count an observation day. Source authorization remains NONE and the operating mode remains NO_TRADE. No quote/news endpoint, collection command, schedule mutation, Paper order, Broker, or external model Provider was called.

`pnpm verify:w8:ubuntu-host` exited 2/`BLOCKED`: current host is macOS/aarch64, the container runtime was unavailable in this command context, target Ubuntu x86_64 is unmet, resource thresholds are undefined, and target-host authorization is unconfirmed. The command reports that no deployment/migration or external network/credential access occurred.

Machine snapshots: [health](./2026-10-06-o1-health-snapshot-0743z.json) and [observation summary](./2026-10-06-o1-observation-summary-0743z.json). The host preflight output is captured in the dated plan entry; no Ubuntu deployment was attempted.
