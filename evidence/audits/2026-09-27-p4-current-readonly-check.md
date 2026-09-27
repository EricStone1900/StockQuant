# P4 read-only collection and observation refresh

Date: 2026-09-27 Asia/Shanghai. No collection, repair, or evidence-writing job was run against the active service.

## Runtime checks

- `pnpm dc08a:supervise -- --check-only`: exit 0, `HEALTHY`, HTTP 200, PostgreSQL persistence, scheduler worker/executor `ENABLED`, all 20 expected securities present, and `actions=[]`.
- `pnpm dc08a:verify-automation`: exit 0, `PASS`; existing heartbeat, collection and TDX automations remain in their prior ACTIVE/PAUSED states; no automation was changed.
- Authenticated read-only API observations captured at `2026-09-27T03:10:51Z`: exactly one enabled subscription, `dc08a-20260917-20-v1`; scheduler `ENABLED`, last successful tick `2026-09-27T03:10:27.563Z`, next execution `2026-09-28T01:37:00Z` (09:37 Asia/Shanghai), mode `PERSISTENT_SOURCE_EXECUTION`; open gaps 0, pending outbox 0; A-share calendar `CLOSED`, version `sse-cn-a-share-2026-1`.

## Observation archive

The repository observation summarizer was run in-memory against existing archive files only; it wrote no output. Result: `WAITING`, 4 completed + 1 recovered = 5/20, 15 remaining, no malformed files or invalid timestamps, 185 observations from other subscription IDs excluded. The newest archived record is 2026-09-25 and is finalized but incomplete (zero collection runs); it does not count as a day. Sunday 2026-09-27 adds no observation day.

This is a service-health and archive-integrity refresh only. It does not establish daily collection completeness, satisfy the two-day short-term market requirement, change the 20-day count, or constitute user acceptance.

## Later read-only refresh (2026-09-27 13:16 Asia/Shanghai)

Re-ran `pnpm dc08a:supervise -- --check-only` with local loopback access: exit 0, `HEALTHY`, no repair actions. The endpoint returned the exact 20-security universe, persistent PostgreSQL, scheduler and executor enabled. `pnpm dc08a:active-subscription -- --check-only` returned the existing `dc08a-20260917-20-v1`; its independent `--field count` read returned 20. An authenticated health report was written to `/tmp/stockquant-dc08a-current-health.json`, not over repository evidence: captured `2026-09-27T05:16:21.036Z`, exactly one scheduled subscription, scheduler enabled, tick age 52.485 seconds, next execution `2026-09-28T01:37:00Z`, calendar CLOSED, `openGaps=0`, `pendingOutbox=0`, all health checks true. Sources were Baostock and Sina enabled with circuit CLOSED and zero current failures; Eastmoney remained disabled.

The archive was independently re-summarized to `/tmp/stockquant-dc08a-observation-summary.json` from existing files: still 4 completed + 1 recovered = 5/20, 15 remaining; 185 other-subscription entries excluded; latest eligible archive remains 2026-09-25 and incomplete with zero runs. Sunday adds no observation. No active service, subscription, collection record or repository evidence file was changed by these commands.

## Latest read-only refresh (2026-09-27 15:30 Asia/Shanghai)

Ran `pnpm dc08a:supervise -- --check-only` and `pnpm dc08a:verify-automation`: both exited 0 (`HEALTHY`, `actions=[]`; automation `PASS`, no state changed). The independent health snapshot at `/tmp/stockquant-p4-health-current.json` records one active subscription `dc08a-20260917-20-v1`, exact 20-security universe, PostgreSQL persistence, scheduler/executor enabled, last successful tick `2026-09-27T07:30:29.549Z`, next execution `2026-09-28T01:37:00Z` (09:37 Shanghai), 0 open gaps and 0 pending outbox; A-share calendar is closed and both Baostock/Sina circuits are closed with no current failures.

The archive was independently re-summarized to `/tmp/stockquant-p4-observation-current.json`: `WAITING`, 4 completed + 1 recovered = 5/20, 15 remaining; no malformed files or invalid timestamps, and 185 other-subscription observations excluded. Latest eligible observation remains the finalized but incomplete 2026-09-25 record with zero runs. No new observation day is credited on Sunday. No active service, subscription, timer, database, or repository observation evidence was modified.
