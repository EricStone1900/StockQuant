# P6 persistent V2.2 minute Fixture import follow-up

Date: 2026-09-25 (Asia/Shanghai). This implementation closes the process-memory gap in the market-data service's existing fixed-Fixture minute import endpoint. It is not the full V2.2 CSV/Parquet upload feature.

## Implementation

`MinuteImportRepository` stores content-addressed import metadata and accepted minute rows in PostgreSQL. A transaction-scoped advisory lock makes concurrent imports of the same source SHA idempotent. Accepted rows are published atomically with metadata under an immutable import version and indexed by version/security/time; rejected imports persist their error metadata without persisting invalid rows. The service exposes import lookup and bounded cursor pages with optional security filtering. The platform acceptance API proxies both lookup and bar-page reads.

The import HTTP endpoint still accepts only the checked-in `normal` and `bad` Fixtures. It does not accept user-supplied CSV/Parquet content, perform column mapping, stream large uploads, or implement physical date partitions. The historical V2.2 human sign-off is unchanged and remains limited to its recorded acceptance scope.

## Verification

- `pnpm --filter @stockquant/market-data-service build`: exit 0.
- `pnpm --filter @stockquant/platform-api-service build`: exit 0.
- `pnpm --filter @stockquant/market-data-service test`: 35/35 unit tests passed.
- `MARKET_DATA_DATABASE_URL=postgresql://market_data_test@127.0.0.1:5433/market_data_test pnpm --filter @stockquant/market-data-service test:integration`: 18/18 PostgreSQL integration tests passed, including concurrent identical import requests, persistence through a new repository instance, cursor paging, invalid paging and security filtering.
- `pnpm --filter @stockquant/market-data-service minute-import:http-restart-smoke`: exit 0. A temporary real service process imported six valid bars and durably rejected the bad Fixture, exited, restarted, then read the published metadata and all six bars in three pages; the rejected result remained idempotent. Both Fixture hashes were absent before the run and both exact metadata rows and cascading bar rows were removed afterward. No formal database or active market-data container was used.
- `PORTFOLIO_RISK_TEST_DATABASE_URL=... TRADE_EXECUTION_TEST_DATABASE_URL=... pnpm verify:stage -- --stage V2.4 --suite code`: exit 0 after the change; full workspace build, lint, typecheck, contracts/fixtures, unit tests, FakeBroker integration, Portfolio integration, Python adapter tests 55/55, operations tests 82/82 and Market Data PostgreSQL integration 18/18 passed.
- `git diff --check`: exit 0; `pnpm docs:check`: exit 0, 530 local Markdown links passed before the full suite and 532 passed inside its baseline check.

This proves the current service code's fixed-Fixture PostgreSQL import, process restart, query and pagination path. It does not prove the Web upload flow, arbitrary customer files, full-size streaming or production deployment; those remain open in P6/V2.2.
