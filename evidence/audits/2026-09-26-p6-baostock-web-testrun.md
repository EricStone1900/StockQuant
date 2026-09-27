# P6 Frozen BaoStock sample through Web, Platform API and same TestRun

Date: 2026-09-26 (Asia/Shanghai)

## Reproducible command

Requires the local dedicated PostgreSQL endpoint `127.0.0.1:5433` and the repository's installed Chromium runtime:

```bash
pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke
```

The smoke creates random platform and Market Data databases, starts the actual compiled services plus Vite and headless Chromium on loopback ports, then drops those exact databases in `finally`.

## Result

Exit code 0. The browser read three source files (`sh.600000`, `sh.600004`, `sh.600006`) from the frozen 500-security BaoStock archive only after checking each file SHA-256 and row count against its frozen Manifest. The deterministic combined upload contained 8,640 source rows, was 768,637 bytes, and had SHA-256 `ab9b0822e27a40155522e2936a516addb36d9f6d4a6e2e9f8e280c3376f950a2`.

Through the logged-in V2.2 page, the smoke mapped `code` and compact `time`, selected `5m` and `BAR_END`, uploaded through two 512 KiB chunks, previewed all 8,640 rows with zero errors, then finalized. PostgreSQL independently matched the upload owner and COMPLETED state, PUBLISHED import, accepted row count, source SHA, 5m/BAR_END mapping and `researchUseAllowed=false`. The license checkbox was explicitly left unchecked and the source statement remains unconfirmed.

The browser created TestRun `08c014c9-824b-4af4-a7e8-35a087776b3d`, bound to that exact upload ID, SHA and row count. The V2.2 assertion `V2.2-CSV-UPLOAD-001` passed, and CLI `--run <same TestRun> --check-only` exited 0 without mutation. A different owner received HTTP 403 for the upload. The final smoke also queried `pg_database` after cleanup and asserted both random databases were absent. Existing synthetic CSV and mapped Parquet browser flows also passed in the same smoke. After the streaming parser memory optimization and bounded preview sample change, this same real-browser smoke was repeated successfully with TestRun `08c014c9-824b-4af4-a7e8-35a087776b3d`; it verifies 100 returned Bar samples with `barsTruncated=true`. Trading mode remained FAKE; there were no broker or model calls.

The test now waits for the exact upload ID in the newly created TestRun before inspecting it. This prevents an earlier passing `uploaded-csv` TestRun from satisfying the browser wait prematurely.

## Scope limits

This verifies a deterministic 3-file sample taken from the immutable 500-security archive through the complete Web→Platform API→Market Data→PostgreSQL path and same-run CLI check. It does not import all 500 files through the browser, prove a full-archive chunk upload, settle BaoStock license terms, or establish concurrency, Ubuntu, production capacity, backup recovery or human acceptance. The full archive remains separately verified over the Market Data HTTP import route in [the archive HTTP audit](./2026-09-26-p6-baostock-archive-import.md).
