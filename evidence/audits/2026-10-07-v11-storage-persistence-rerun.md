# V1.1 isolated TestRun storage persistence rerun

Date: 2026-10-07 (Asia/Shanghai)

Command: `node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:integration:persistence`.

The final rerun passed against a random disposable PostgreSQL container and network. The suite built Platform API, checked cross-stage persistence and 11 conflict cases, verified preservation of assertion/acceptance history, exercised idempotent legacy shadow migration and conflict rollback, and verified stage-first owner-scoped reads, status/assertion dual writes, full-precision timestamps, missing-target fail-closed behavior, and atomic rollback after a partial dual-write failure. Its HTTP smoke started Platform in stage mode, read the same completed TestRun and evidence (200), rejected a foreign owner (403), and reported startup parity PASS. The harness confirmed active services were not connected and removed the exact container and network.

Two earlier attempts in this turn exposed test-harness configuration drift and were retained in the execution record: Platform now requires a configured service bearer token at construction, and the old fake session cookie is rejected by persistent session middleware. The smoke now injects a short-lived random service token and uses the explicit test-only identity header. No production token, active session, or active database was used.

The complete passing command output is in the adjacent log. SHA-256: `8624e7415908cfac77e657559a1e37c9f4a8671b11bb1a971738b496b4eac5c0`. At audit capture, HEAD was `c0f6745fa4a8615bfc4913431e73ce3b8b01fab8`; the tracked worktree patch SHA-256 is in the adjacent manifest.

This proves isolated migration and store fallback prerequisites only. The live database snapshot must be refreshed, the paired backup and restore must be verified, any nonterminal legacy runs must be explicitly resolved, and a maintenance window plus rollback owner must be authorized before active cutover. The active API was not switched or restarted.
