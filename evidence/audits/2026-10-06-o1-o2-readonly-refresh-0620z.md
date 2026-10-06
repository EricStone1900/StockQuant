# O1/O2 read-only refresh

Date: 2026-10-06 14:20 Asia/Shanghai

## Observed state

The authorized controlled local health check used GET requests only. The A-share calendar returned `CLOSED`; the service was ready, but source authorization was `UNKNOWN`, enabled subscription count was 0 (expected 1), and `nextExecutionAt` was null. `lastSubmitted=0`, open gaps=0 and pending Outbox=0. Health correctly reported `UNHEALTHY`; it did not trigger collection or record an observation day.

The local observation summary remains 8/20 days (7 complete and 1 recovered), 12 effective days remaining, latest valid date 2026-09-30. The summary command exited 2 with `WAITING`, which is the unmet observation gate. The initial health-report call in the default sandbox exited 1 (`fetch failed`); the same read-only request succeeded with controlled local access. No source/provider, collection, Paper, order, or model endpoint was called.

The read-only Docker inventory contains the same 13 `stockquant-v12-*` container names as the previous recorded inventory; a direct name-set comparison matched all 13. This refresh did not start, stop, or replace containers. The new inventory records current full IDs, images and status in [the inventory](./2026-10-06-o1-active-containers-0620z.txt); the prior names/status/ports are retained [here](./2026-10-06-o1-o2-docker-containers.txt).

## Snapshot evidence

- [Health snapshot](./2026-10-06-o1-health-snapshot-0620z.json)
- [Observation summary snapshot](./2026-10-06-o1-observation-summary-0620z.json)
- [Docker inventory](./2026-10-06-o1-active-containers-0620z.txt)

This is a status refresh only: it adds no O1 observation days and does not start O2. The source authorization decision remains NONE/UNKNOWN and NO_TRADE remains active.
