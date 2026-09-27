# P6 CSV import identity and mapping isolation

Date: 2026-09-25 (Asia/Shanghai). This closes an idempotency correctness gap in the constrained V2.2 CSV import slice. It does not implement streaming, resumable or full-size import.

Previously, the persistent import repository used raw CSV SHA-256 as its primary key. Identical bytes interpreted with different explicit column mappings could therefore return the first import and its rows, even though the second preview described different securities or timestamps.

CSV identity now combines the raw content SHA-256 with the ordered canonical field-to-header mapping and the fixed semantics tuple (CN_A, 1m, RAW, Asia/Shanghai, BAR_START, SHARES, CNY). Field order in the caller's JSON does not affect identity. The raw content checksum remains separately recorded as provenance. The repository migration adds `import_key_sha256` with a format check, backfills existing rows with their raw checksum to preserve their current identity/version, and changes the primary key to the new import identity. Legacy Fixture imports that do not supply an interpretation key continue to use their content checksum.

Verification passed:

- `pnpm --filter @stockquant/market-data-service build`
- `pnpm --filter @stockquant/market-data-service test`: 10 files, 41 tests.
- `MARKET_DATA_DATABASE_URL=postgresql://market_data_test@127.0.0.1:5433/market_data_test pnpm --filter @stockquant/market-data-service test:integration`: 19/19 PostgreSQL integration tests passed on the existing dedicated database. The suite ran the in-place upgrade from the earlier source-hash primary key, retained prior fixture imports, verified concurrent same-identity retry and pagination, and confirmed two distinct import identities for the same source checksum do not alias rows.
- `MARKET_DATA_DATABASE_URL=postgresql://market_data_test@127.0.0.1:5433/market_data_test pnpm --filter @stockquant/market-data-service minute-csv-identity:http-restart-smoke`: PASS using a temporary real service process. Both mappings previewed and published with HTTP 201; each same-mapping retry returned HTTP 200 and its own version; the service was restarted and each version still returned the correct security (`600000.SH` versus `000001.SZ`). The smoke uses a per-run random source value, checks both exact import keys are absent beforehand, and deletes only those exact keys after the run, verifying zero residual rows.
- `pnpm --filter @stockquant/market-data-service test` and `git diff --check` passed after the final changes.
- `pnpm baseline:check`: 571 local Markdown links, 33 schemas, 20 fixtures, generated types, 22 compatibility rules, OpenAPI checks and 13 fixture files passed.

Remaining P6 gaps include streaming/chunked uploads, resumable transfers, Parquet, quotas/cancellation, physical date partitions, full browser-to-platform-to-service same-TestRun acceptance and large-file capacity evidence. The 20-day observation and existing human sign-off are unchanged.

## Provenance and license follow-up (2026-09-25)

The CSV import request and persisted manifest now require source name, optional source reference, license statement, acquisition time, and an explicit `OPERATOR_CONFIRMED` or `UNCONFIRMED` license declaration. The declaration controls `researchUseAllowed`; it records the operator's assertion and does not perform independent legal verification. All fields participate in import identity so metadata changes cannot alias an earlier import. Legacy records migrate with null provenance and research use disabled. The V2.2 page invalidates preview when provenance changes and shows the use restriction.

Verification: market-data build and unit tests pass (41/41); dedicated `market_data_test` PostgreSQL integration passes (20/20), including legacy backfill; a real HTTP/restart smoke verified same-content imports with changed mappings or license declarations remain distinct, metadata survives restart, and confirmed/unconfirmed use flags are correct. Web typecheck passes and the single V2.2 CSV Playwright scenario passes (1/1) using a temporary local Vite server. `pnpm baseline:check` passes: 573 links, 34 schemas, 23 contract fixtures, 23 compatibility rules, and 13 data fixtures; `git diff --check` passes. This does not establish legal rights or close the remaining P6 ingestion and end-to-end gaps.
# Import mapping manifest follow-up (2026-09-25)

CSV import identity already bound the raw-byte SHA-256 to the canonical column mapping and fixed semantics, but the persisted record exposed only the raw hash. Added `import_manifest` JSONB with the sorted mapping and market/frequency/adjustment/timezone/timestamp/volume/amount semantics; legacy rows migrate with an explicit empty manifest. The normal Fixture import also returns an empty manifest because it has no user-supplied CSV mapping.

Verification: market-data build and unit tests pass (41/41); dedicated `market_data_test` PostgreSQL integration passes (19/19). The HTTP restart smoke imports the same bytes under two mappings, verifies distinct securities, fetches both manifests after service restart, and confirms mapping/semantics match; it exits 0 and removes the exact test identities. This adds reproducibility metadata, not streaming/Parquet, source provenance/license, large-file quotas, or full Web-to-domain same-run acceptance. P6 remains open.

The public import response now has `minute-import-record-v1`, a fixed contract fixture, generated types, a compatibility entry, and OpenAPI response references. `pnpm baseline:check` passes with 34 schemas, 21 contract fixtures, 23 compatibility rules, and 13 fixture files.

CSV syntax hardening: reject any non-delimiter character after a quoted field closes (for example, `"600000"x`). Market-data build and unit suite pass (41/41); the new malformed-quote case is included. Baseline contract/link/fixture checks and `git diff --check` pass.
