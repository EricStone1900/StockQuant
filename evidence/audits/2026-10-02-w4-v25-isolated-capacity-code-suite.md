# W4 / V2.5 isolated code suite and Parquet capacity probe

Date: 2026-10-02 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V2.5 --suite code` exited 0 after running all database-backed suites against a new disposable PostgreSQL container on a random loopback port. The container used an immutable PostgreSQL image reference, random credentials, read-only root, tmpfs data, CPU/memory/PID limits, and was removed by the wrapper. The suite passed baseline/contracts/fixtures, full monorepo build/lint/typecheck/unit tests, Trade Execution persistence/auth/readiness/P5.7 recovery, Portfolio integration/auth, 69 Market Data Adapter tests, Ops tests, and Market Data integration/project-delivery checks.

The final V2.5 Linux/arm64 container capacity smoke passed with its own disposable PostgreSQL, app/peer containers, network, and image. It imported, persisted, and paged through 100,000 synthetic five-minute bars across 500 securities and five trading days; verified 100 pages of 1,000 rows, 100,000 unique results, filtered queries, idempotent retry, cross-instance exclusion, corrupt Parquet rejection/cancellation, and no partial publication. Fixture bytes were 289,616 (zstd); database size was 72,561,123 bytes; peak service RSS was 197,636 KiB. External source, model, and broker calls were all zero. The observed runtime was Docker Linux/arm64, with 2 GiB memory and 2 CPUs; this is Mac-hosted container evidence, not Ubuntu-host evidence.

## Isolated database boundary fix

The first full-suite attempt stopped before readiness assertions because the existing HTTP smoke only accepted port 5433, despite the suite being pointed at a disposable database on a random loopback port. That failure is preserved. The readiness smoke now accepts a non-5433 port only when Docker inspection confirms the explicitly named `sq-test-postgres-<16 hex>` container is running, uses a digest-addressed image, has a read-only root and tmpfs PostgreSQL data, resource limits, and binds the exact port only to `127.0.0.1`. Four tests cover valid and unsafe target cases. The full suite then passed; the disposable PostgreSQL container and Parquet smoke container/network/image were confirmed absent afterward.

This is an engineering/capacity result only. It does not establish real market data, source permission, all required V2.5 capacity tiers, 60-day backup-source coverage, long trading-session stability, genuine PIT history, Paper observation, Ubuntu acceptance, or human sign-off. V2.5 remains PARTIALLY_IMPLEMENTED.
