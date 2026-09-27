# P6 minute CSV parser peak-memory regression and fix

Date: 2026-09-26 (Asia/Shanghai)

## Finding and change

A new streaming parser stress smoke ran the 100,000-row maximum twice in fresh Node processes: once with every input row conflicting on the same key, and once with 100,000 distinct keys whose OHLC values are invalid. Before the fix, macOS `ru_maxrss` reached 3,536,688 KiB (duplicate case) and 3,501,696 KiB (unique invalid case); each took about 9.3 seconds. Inspection found that both CSV timestamp validation and per-bar trading-session validation constructed a new `Intl.DateTimeFormat` for every row.

Both time-zone formatters are now module-scoped singletons reused for each row. The streaming parser behavior, error detail shape, frequency/session rules and row cap did not change.

## Reproducible verification

```bash
pnpm --filter @stockquant/market-data-service minute-csv:error-capacity-smoke
pnpm --filter @stockquant/market-data-service test
pnpm --filter @stockquant/market-data-service typecheck
MARKET_DATA_DATABASE_URL=postgresql://market_data_test@127.0.0.1:5433/market_data_test pnpm --filter @stockquant/market-data-service test:integration
pnpm --filter @stockquant/market-data-service minute-archive:http-smoke
```

Results: capacity smoke PASS, Market Data unit tests 51/51, typecheck PASS, dedicated PostgreSQL integration 22/22. After the fix, duplicate stress peaked at 116,512 KiB and took 768 ms; unique invalid-row stress peaked at 166,864 KiB and took 851 ms. Both cases reported exactly 100,000 errors, zero accepted rows and zero retained bars. The smoke fails if either process exceeds 512 MiB RSS, making the regression check enforceable. The unique-invalid case is the higher-memory path because it retains 100,000 unique keys in addition to invalid-row and error bookkeeping.

The full frozen archive then passed through the real Market Data HTTP service and an isolated random PostgreSQL database: 500 files, 1,440,000 rows, 500 PUBLISHED versions, 60 daily partitions, per-file Manifest SHA/count verification, exact first-source OHLCV, and verified random database deletion. Runtime was 80,722 ms (17,839 rows/s), compared with the prior 199,629 ms (7,213 rows/s), about 2.47× throughput on this host. Database size was 961,524,195 bytes. Source license remains `UNCONFIRMED`, research use remains false, and external/broker calls were zero.

## Limits

RSS values are single-process macOS measurements for the streaming parser with `retainBars=false` and a no-op batch consumer; they are not container limits, HTTP/PostgreSQL combined peak memory, or concurrent upload results. The archive throughput comparison is host-specific, not a production capacity promise. Error objects and duplicate bookkeeping still scale with the configured 100,000-row maximum; concurrent request limits, Linux/Ubuntu and database-side failure pressure remain separate work.


## Cross-stage regression after parser change

The V2.2 real Web upload smoke was rerun after this change and passed: frozen 8,640-row BaoStock sample, exact owner-scoped upload/TestRun, CLI check-only, license remains unconfirmed, and cleanup assertion. The full `pnpm verify:stage -- --stage V2.2 --suite code` then returned exit 0 with build/lint/typecheck, contract and fixture checks, workspace unit suites, FakeBroker/Portfolio integrations, Python Adapter 58/58, ops 94/94 and Market Data PostgreSQL integration 22/22. This is code validation only; the V2.2 human acceptance and wider deployment limits remain open.


## Full upload and PostgreSQL pressure cases (2026-09-26)

Added `pnpm --filter @stockquant/market-data-service minute-upload:error-capacity-http-smoke`. Each case runs a real Market Data service child against its own random PostgreSQL database, uploads a 5.0–5.4 MB/10–11 chunk synthetic CSV, calls both resumable-upload Preview and Finalize, then queries persisted state. Cases: 100,000 duplicate keys and 100,000 unique invalid OHLC rows. Both return exactly 100,000 errors, persist a REJECTED import and COMPLETED upload, publish zero bars, stay below the enforced 768 MiB service RSS ceiling, and verify the random database is gone. Final run: duplicate service peak 480,064 KiB (Preview 359,536; Finalize 480,064); unique-invalid peak 479,328 KiB (Preview 368,400; Finalize 479,328). No broker or external calls.

The pressure run showed the resumable Preview retained all valid Bar objects although the Web page needs only a compact sample. Chunked CSV/Parquet previews now return at most 100 valid Bars and set `barsTruncated` when accepted rows exceed the sample. Finalize only stages rows known to be valid and not yet known to conflict; any later duplicate/quality error still rejects and rolls back the entire transaction. An added unit test asserts that invalid rows and duplicate occurrences do not enter persistence batches. Market Data tests are 53/53 and typecheck passes; the three-security BaoStock browser→Platform→Market Data→PostgreSQL→same-TestRun/CLI smoke was rerun after the preview-contract adjustment and passed with TestRun `08c014c9-824b-4af4-a7e8-35a087776b3d`, including 100 sample Bars and `barsTruncated=true`. The complete V2.2 code suite also returned exit 0 afterward.

The measured single-request service peak remains about 469 MiB and error objects are still retained/persisted in full. Process-local admission control, container/Linux/Ubuntu bounds and database memory accounting remain open areas; this result does not establish multi-replica/global backpressure.

### Process-local admission control follow-up (2026-09-26)

Added a fail-fast single-flight gate around the memory-heavy CSV preview/import and resumable CSV/Parquet preview/finalize routes. A second overlapping request receives HTTP 429 `MINUTE_IMPORT_BUSY` with `Retry-After: 1`; the gate is held through response drain so a large response cannot overlap the next admitted parse. The HTTP/PostgreSQL capacity smoke now overlaps previews and finalizations, verifies one admitted/one rejected request, retries the durable rejected finalize idempotently, and verifies 100,000 persisted row errors with zero published bars. Both duplicate and unique-invalid cases passed, with measured service RSS peaks 449,664 KiB and 498,208 KiB respectively. Each case used and dropped its own random PostgreSQL database, with zero broker/external calls. This is per process only: replicas do not coordinate and a queue/retry policy, container/Ubuntu measurements, and database-side memory accounting remain open.

## Cross-process coordination follow-up (2026-09-26)

Replaced the process-only production gate with a PostgreSQL session advisory lock held by a pinned pool connection through response drain. When persistence is configured but a lock cannot be obtained, the route fails closed with 503; concurrent work receives the existing 429/`Retry-After: 1`. The memory-only fallback remains for deployments without persistence. A test-only hold route is available solely when both `NODE_ENV=test` and `STOCKQUANT_MINUTE_GATE_TEST_ENABLED=true` are set.

`pnpm --filter @stockquant/market-data-service minute-import:cross-process-gate-smoke` started two actual Market Data service processes against a random temporary PostgreSQL database. The first held the lock; the second got 429, then succeeded after response completion. A client-aborted request also released its lock and allowed the other process through. The script dropped the database and stopped both test processes. Market Data build and unit suite (57/57) pass. This verifies coordination across local processes sharing PostgreSQL; it does not prove multi-host failure-mode behavior, DB memory headroom, container/Ubuntu capacity, or production observation continuity.

Final regression: `pnpm verify:stage -- --stage V2.2 --suite code` exited 0. Contracts/Fixtures passed (76 JSON, 41 schemas, 27 contract fixtures, 30 compatibility rules, 15 frozen Fixture hashes); all workspace build/lint/typecheck and configured unit/integration suites passed, including Market Data unit 57/57, PostgreSQL integration 22/22, Python Adapter 58 tests, FakeBroker/Portfolio recovery and 94 ops tests. No formal observation data or active service was changed.

## Docker Desktop ARM64 recheck (2026-09-26)

Built the current Market Data Dockerfile for `linux/arm64`; image ID `sha256:8009ad45542e67438d9cdbf19ba1d847b01d4b35d0875b1191a27cfd42a193c9`. Two temporary service containers, each limited to 2 GiB RAM / 2 CPUs / 128 PIDs, shared a uniquely named temporary database on the existing PostgreSQL server. The first request held the session lock; the second container received 429 plus `Retry-After: 1`; after release its retry succeeded. No collection scheduler/executor was enabled in these containers. The smoke removed both exact containers and dropped its exact database; a subsequent read-only Docker/PG check showed only the pre-existing application containers running and no database matching the temporary name prefix. The active Market Data container was not restarted or modified.

This verifies the new source build and advisory-lock coordination in Linux/arm64 containers under Docker Desktop; it is not native Ubuntu, multi-host outage, shared database headroom, or production load evidence. External market, model, and broker calls were not made.

### Bounded Linux-container HTTP rejection capacity (2026-09-26)

Ran the full 100,000-row resumable HTTP upload/preview/finalize rejection smoke inside one disposable `linux/arm64` service image container capped at 2 GiB RAM, 2 CPUs and 128 PIDs. The harness now accepts an explicitly supplied local test-admin PostgreSQL URL, samples Linux service RSS from `/proc`, and records the cgroup-v2 `memory.peak`; the default host test endpoint remains unchanged. Each case used its own random PostgreSQL database and asserted it was dropped by the harness.

Duplicate-key case: 100,000 persisted `DUPLICATE_CONFLICT` errors, 0 accepted rows/bars; service RSS peak 330,584 KiB. Unique-invalid OHLC case: 100,000 persisted `OHLC_INVALID` errors, 0 accepted rows/bars; service RSS peak 339,960 KiB. Across both cases, whole-container cgroup peak was 461,256 KiB (about 451 MiB), well below the 2 GiB container limit. Concurrent preview/finalize requests still assert one admitted request and one 429 with `Retry-After: 1`; rejected finalize retry remains idempotent. Both cases passed; no external or broker calls. Exact test container removed, no matching random databases remained, and the active application Market Data container stayed healthy without restart.

This closes the bounded Docker Desktop ARM64 HTTP/parser container measurement for these synthetic rejection paths. It does not establish native Ubuntu behavior, shared PostgreSQL headroom under production traffic, sustained or multi-host load, or the 20-day real-data observation gate.
