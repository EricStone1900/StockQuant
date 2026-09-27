# P4 post-change read-only supervision check

Time: 2026-09-25 12:35 Asia/Shanghai. Command: `pnpm dc08a:supervise -- --check-only` (exit 0).

Result: `state=HEALTHY`; market-data `/ready` returned HTTP 200, reported PostgreSQL collection persistence, scheduler worker ENABLED and executor ENABLED, and exposed the expected 20-security collection universe. `actions=[]`; the command made no repair or restart. This confirms the observation service was healthy after P5.5/P7.2 engineering and integration tests; it does not add an observation day or assert that the collected day's market windows have completed.

## Read-only refresh (2026-09-27 23:17 UTC)

`pnpm dc08a:supervise -- --check-only` returned HEALTHY, HTTP 200, PostgreSQL persistence, scheduler worker/executor ENABLED, 20 expected securities, `actions=[]`, exit 0. `pnpm dc08a:verify-automation` returned PASS and made no automation change. Authenticated read-only health queries to the existing loopback service confirm exactly one active subscription (`dc08a-20260917-20-v1`), scheduler lease/tick healthy at `2026-09-26T23:17:25Z`, next execution `2026-09-28T01:37:00Z`, market calendar CLOSED (Sunday), zero open gaps and zero pending outbox; Sina and BaoStock circuits were CLOSED with successful-source timestamps. The observation summary was recomputed from existing records to `/tmp/stockquant-observation-summary-current.json`: WAITING, 4 completed + 1 recovered = 5/20, 15 remaining, latest 2026-09-25, no malformed evidence, 185 unrelated subscription files excluded. No observation was created, counted, repaired or overwritten; no service, timer, subscription or database state was changed.
