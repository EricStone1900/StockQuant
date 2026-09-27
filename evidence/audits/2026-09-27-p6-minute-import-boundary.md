# P6 minute import resource and network boundary recheck

Date: 2026-09-27 (Asia/Shanghai)

## Verified

- `PostgresAdvisorySingleFlightGate` uses a PostgreSQL session advisory lock and pins the owning client until unlock; contention fails with HTTP 429 and an unavailable lock database fails closed with HTTP 503.
- CSV preview/import and resumable CSV/Parquet preview/finalize are the only production routes covered by the memory-heavy import gate. A two-process/two-container shared-PostgreSQL contention smoke is already recorded in the P6 execution history; this review did not rerun that smoke.
- Docker Compose publishes Market Data only as `127.0.0.1:3002:3002`; application services share the Compose `internal` network. Source review confirmed that CSV preview/import and all resumable upload proxy routes call the platform `identity(...)` guard before proxying.
- Follow-up implementation closed the direct-service trust gap: Market Data now requires a configured Platform API Bearer identity on minute import/upload routes before lock acquisition; missing/invalid credentials return 401. The Platform API forwards its identity after the user-session check.
- Market Data build and unit suite rerun on this worktree: 15 files, 62 tests passed. An isolated HTTP smoke verified missing=401, forged=401, wrong identity=401, valid platform token reaches the route (503 for intentionally absent persistence), and unrelated Calendar remains 200. Platform API typecheck passed.
- Full `pnpm verify:stage -- --stage V2.2 --suite code` rerun in the approved local test environment exited 0, including workspace build/lint/typecheck, contracts/fixtures, Market Data PostgreSQL integration (22/22), and the required shared code suite. The sandbox-only attempt stopped at Qlib Worker loopback bind with EPERM before running that test.
- The authenticated `minute-upload:http-restart-smoke` passed against a randomly named isolated PostgreSQL database: 848,055 bytes / 16,000 rows across two chunks, restart/resume, preview/finalize, exact rows in the authoritative daily partition table, wrong-owner denial, duplicate-chunk idempotency, malformed-file rollback, cancellation/quota release. The script drops its test database in `finally`. The first run reached publication but failed its stale assertion against the legacy unpartitioned table; that assertion and the rollback count were updated to query `market_data_minute_import_bars_by_day`, then the rerun passed.
- The complete V2.2 browser/API path then passed via `pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke` using a randomly generated per-run Platform Bearer and two random PostgreSQL databases. Real Chromium→Vite→Platform API→Market Data completed 16,000-row chunked CSV preview/finalize, mapped Parquet preview/finalize (2 rows), and frozen three-security 5m `BAR_END` CSV import (8,640 rows). The same browser recorded `uploaded-csv` TestRun `d88bea90-3bf9-4111-a5bf-f92bded724fd`; `pnpm verify:stage -- --stage V2.2 --run <same-id> --check-only` exited 0 without creating a TestRun. Foreign-owner reads of all three uploads returned 403. Data remained FAKE and the temporary dual databases were removed by the script. Initial run exposed a missing Bearer on the Platform API's internal TestRun upload-progress lookup; after fixing it, the full rerun exited 0.
- `git diff --check` passed for the reviewed files.

## Limits

This does not establish production shared-PostgreSQL headroom, multi-host load behavior, native Ubuntu capacity, secret rotation, deployment, or full ingress hardening. The browser acceptance path is proven in an isolated local stack only; stage-wide human acceptance and existing historical sign-off remain unchanged.
