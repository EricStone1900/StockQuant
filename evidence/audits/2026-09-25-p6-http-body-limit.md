# P6 bounded request-body validation

Date: 2026-09-25 (Asia/Shanghai)

The market-data HTTP server now counts request-body bytes rather than JavaScript string characters. It stops retaining chunks once the 1,000,000-byte transport limit is crossed, drains the request, and returns HTTP 413 with `REQUEST_BODY_TOO_LARGE`. This closes an encoding-dependent limit gap on the small CSV JSON route and makes the transport rejection distinguishable from an internal error.

Verification:

- `pnpm --filter @stockquant/market-data-service test`: 44/44 unit tests pass, including exact UTF-8 boundary, multibyte over-limit rejection, and oversized-body discard.
- `pnpm --filter @stockquant/market-data-service typecheck`: pass.
- `pnpm --filter @stockquant/market-data-service http-body-limit:http-smoke`: pass; isolated service process returned 413 for a request larger than 1,000,000 bytes.
- `git diff --check`: pass.

This is transport-limit verification, not large-file support. The CSV contract remains capped at 700 KB and 10,000 rows; browser uploads still use JSON and materialize the entire small file in memory. Streaming, resumable upload, cancellation, quotas, Parquet, and physical date partitioning remain open P6 work.
