# P6 constrained CSV minute import slice

Date: 2026-09-25 (Asia/Shanghai)

## Delivered

- Added CSV parsing with quoted cells, escaped quotes, CRLF/LF support, unique-header and row-width checks, NUL rejection, and a 10,000-row limit. Row-addressed quality errors use a linear pass, and every row participating in a duplicate key is rejected.
- Added explicit column mapping for security, local timestamp, OHLC, volume and amount. Semantics are deliberately fixed to CN_A / 1m / RAW / Asia/Shanghai / BAR_START / shares / CNY. Invalid numbers, timestamps, securities, OHLC, duplicate keys and non-trading session bars produce row-addressed errors.
- Added preview and confirm-import routes to market-data-service, owner-session checks and proxies in platform-api-service, and an upload/mapping/preview/confirm section on the V2.2 page. Upload size is capped at 700 KB; platform JSON parsing is explicitly capped at 1 MiB. Imports use the original content SHA-256 and existing transactional PostgreSQL repository for idempotency and persistence.
- Added `minute-csv-import-request-v1.schema.json`, consumer compatibility rule, and two local-session-secured OpenAPI operations.
- Froze separate deterministic valid/invalid smoke inputs under `fixtures/v2/v2.2-csv-smoke/`; both include SHA-256, provenance and simulation-only eligibility in a manifest.

## Verification

| Check | Result |
|---|---|
| Market data unit suite | PASS, 40 tests across 10 files; includes CSV quotes, exact timezone conversion, row-numbered invalid date/number rejection, explicit semantics, duplicate mapping/key rejection, malformed quoting and byte-size limit |
| Market data build/typecheck | PASS |
| Platform API build/typecheck | PASS |
| Platform API authenticated body-size HTTP smoke | PASS against `platform_api_test` and a temporary local mock: anonymous request returned 401 before forwarding; a 120,284-byte authenticated JSON preview request returned 200 and arrived intact at `/v2/minute/csv/preview` |
| Web build/typecheck | PASS |
| Contract and Fixture validation | PASS, 56 JSON files / 31 schemas / 19 fixtures / 20 compatibility rules; OpenAPI checker covers both CSV operations; `pnpm fixtures:check` verifies 13 files |
| Mocked Playwright page flow | PASS, 1 browser test: the form remains unavailable until a file is selected, mapping/semantics are sent to preview, and import is enabled only after an error-free preview |
| Temporary HTTP + PostgreSQL restart smoke | PASS against dedicated `market_data_test`; previewed/imported 2 rows, exact content SHA-256 `86a4fcbb29d97f27925753c132c8d95ee1971c5f1c7583da6be2278be1c747d8`, identical retry was idempotent, both rows survived service restart and retained `2026-09-24T01:30:00.000Z` barStart; frozen bad-file row 2 returned `OHLC_INVALID` and `NON_TRADING_SESSION`, rejection persisted after restart with no Bar rows |
| Cleanup | Four exact synthetic/smoke hashes were checked; all were absent before and after the run. No active database/service was touched. |

## Remaining

This is an engineering slice only. Parquet, chunked streaming, resume/checkpoint, physical date partitions, project-level quotas, and browser-to-platform-to-market-data same-TestRun evidence remain incomplete. The browser test mocks API responses and is not evidence of the live service chain. It does not change the historical V2.2 user acceptance dated 2026-09-09 and does not pass any stage or version gate.
