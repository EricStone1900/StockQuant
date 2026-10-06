# O1/O2 read-only refresh

Date: 2026-10-06 14:40 Asia/Shanghai

## Observed state

The local health collector made only authenticated GET requests to the existing Market Data service; its JSON was written to a new temporary path and copied here without overwriting operational evidence. The service reports A-share calendar `CLOSED`, scheduler `ENABLED`, and a fresh successful tick at `2026-10-06T06:39:54Z`, but `nextExecutionAt=null` and `lastSubmitted=0`. The configured subscription is `dc08a-20260917-20-v1`; enabled subscriptions are 0 (expected 1). Source authorization is `UNKNOWN`; source readiness and collection quality are currently true, with open gaps=0 and pending Outbox=0. Overall health is `UNHEALTHY` because the subscription, authorization, and next-trigger checks fail.

The regenerated local observation summary is `WAITING`: 7 complete + 1 recovered = 8/20 effective days, 12 remaining, latest valid date 2026-09-30; malformed and invalid-timestamp evidence counts are zero. The summary command exited 2 as expected for an unmet gate. The current read-only Docker inventory contains the same 13 project containers; major APIs/workers are healthy, and this check changed no container.

No source, collection, Paper, order, Provider, or model endpoint was called. NO_TRADE and source authorization NONE/UNKNOWN remain in force. A closed-market status is not an observation day.

## Evidence

- [Health snapshot](./2026-10-06-o1-health-snapshot-0640z.json)
- [Observation summary](./2026-10-06-o1-observation-summary-0640z.json)
- [Container inventory](./2026-10-06-o1-active-containers-0640z.txt)

Health snapshot was captured at `2026-10-06T06:40:37.859Z`; summary was derived from the existing archived observations. No existing snapshot was overwritten.
