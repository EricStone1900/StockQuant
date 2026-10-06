# O1/O2 and W8 read-only refresh (2026-10-06 16:45 Asia/Shanghai)

O1 observation evidence was recomputed from the archived subscription files without contacting a market-data source. It remains `WAITING`: 7 complete days + 1 recovered day = 8/20, 12 qualifying days remain, and the latest counted day is 2026-09-30. This refresh does not count a new observation day.

O1 health was read through the existing GET-only health report. The default restricted shell first returned `fetch failed`; the controlled local retry succeeded with an `UNHEALTHY` report at 2026-10-06T08:44:46.950Z. The market calendar was CLOSED, enabled subscriptions were 0, authorization was UNKNOWN, scheduler/executor were enabled but `nextExecutionAt=null` and `lastSubmitted=0`; recorded gaps and pending outbox were both 0. This is consistent with the owner's NO_TRADE/no-source-authorization instruction. No source probe, collection, subscription change, scheduler tick, order, Paper run, or service restart was requested.

The read-only `verify:w8:ubuntu-host` preflight exited 2/`BLOCKED`: the current host is macOS/aarch64, the local container runtime was unavailable to this invocation, Ubuntu x86_64 target authorization is unconfirmed, and resource thresholds are undefined. It performed no network access, credential read, deployment, or migration.

Snapshots: [observation summary](2026-10-06-o1-observation-summary-0845z.json), [GET-only health report](2026-10-06-o1-health-snapshot-0845z.json), and [Ubuntu host preflight](2026-10-06-w8-ubuntu-host-preflight-0845z.json). These confirm waiting/blocking states; they do not satisfy the outstanding observation or Ubuntu acceptance gates.
