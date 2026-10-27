# V2.1 C2-C Market Monitor persistence/API increment

Date: 2026-10-19  
Scope: persist scoped quote-quality projections and expose them through Platform and the V2.1 acceptance page. This is an implementation increment, not C2-C or V2.1 acceptance.

## Delivered

- Added Monitor FastAPI service routes: authenticated `POST /v1/quote-quality/evaluations`, `GET /v1/quote-quality/latest`, authenticated `/ready`, and process `/live`.
- Added an independent Monitor migration ledger and PostgreSQL-owned `market_monitor_quote_quality_snapshots` table. Scope is keyed by market/owner/account/namespace/TestRun. Exact scope+task replay returns the original result; changed input under the same key returns `409 QUALITY_TASK_INPUT_CONFLICT`.
- Persisted deterministic coverage/freshness metrics and anomaly codes alongside quote references (snapshot/security/source IDs, data mode, source/availability time, age and state). Raw quote prices are not stored.
- Platform reads the latest Market Data task in the requested scope, requires a completed task, checks returned scope, and then invokes Monitor with the generated service client. The V2.1 Web page can evaluate and read back the scoped result.
- Added a separate Compose service, database role/database, an idempotent one-shot provisioner that supports already initialized PostgreSQL volumes, a per-service Platform-to-Monitor bearer token, Python dependency lock and hash-locked image requirements.
- Strategy and order execution remain outside the Monitor route and are not triggered by these operations.

## Verification

The `001_quote_quality_snapshots.sql` migration is loaded from the service migration directory in both local and container execution. The final Linux ARM64 image build includes this directory.

| Check | Result |
|---|---|
| `UV_CACHE_DIR=/private/tmp/stockquant-market-monitor-uv-cache uv run --directory services/market-monitor-service --frozen pytest tests/unit -q` | PASS, 7 tests |
| `node scripts/run-isolated-postgres-command.mjs --url-env MARKET_MONITOR_TEST_DATABASE_URL:market_monitor_test:market_monitor_test -- env PYTHONPATH=services/market-monitor-service/src UV_CACHE_DIR=/private/tmp/stockquant-market-monitor-uv-cache uv run --directory services/market-monitor-service --frozen pytest tests/integration -q` | PASS, 1 test; v1 migration idempotency, replay idempotency, changed-input conflict, independent-repository readback and TestRun isolation. Temporary PostgreSQL container/network removed and verified. |
| `pnpm --filter @stockquant/platform-api-service typecheck` | PASS |
| `pnpm --filter @stockquant/web typecheck` | PASS |
| `pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts --reporter=line` | PASS, 1/1. Browser test mocks Platform routes; PostgreSQL path is independently covered above. |
| `pnpm contracts:check` | PASS, generated Monitor client, 220 schemas, 112 consumer compatibility rules, all registered generators |
| `docker build --pull=false -f services/market-monitor-service/Dockerfile -t stockquant-market-monitor:c2-c-20261019 .` | PASS, Linux ARM64 image built from pinned Python base and installed hash-verified runtime dependencies |
| `docker compose -f infra/compose/docker-compose.yml config --quiet` with required isolated tokens | PASS |
| Temporary Postgres provisioner smoke: apply `postgres-init-market-monitor.sql` twice and query role/database | PASS, idempotent; temporary container removed |
| Python bytecode compilation with `PYTHONPYCACHEPREFIX=/private/tmp/stockquant-pycache` | PASS |

Documentation links and Compose configuration were rechecked after the audit, migration and provisioner updates; all checks passed. No external market source was called (`externalRequests=0` in this workflow); REAL source authorization remains governed by OD-008 and was not changed.

## Remaining

- Automatic `ON_QUOTE_AVAILABLE` scheduling/dispatch remains `NOT_CONFIGURED`; this increment is an explicit evaluation endpoint after a completed Market Data task.
- No strategy evaluation or order execution is connected or enabled.
- REAL source evidence, complete C2-C acceptance, full C2 same-TestRun CLI/export checks and user acceptance remain NOT_RUN/incomplete.
