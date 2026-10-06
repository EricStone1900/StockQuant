# W1 V2.3 Qlib legacy JSONB backfill preparation

Date: 2026-10-01 (Asia/Shanghai)

## Result

Implemented a bounded, idempotent backfill method in the Platform Qlib repository and a guarded operator entry point. The default invocation is dry-run. Apply mode requires `PLATFORM_API_QLIB_BACKFILL_DATABASE_URL` naming exactly `platform_api_test` and an explicit `PLATFORM_API_QLIB_BACKFILL_CONTENT_ROOT` directly under the system temp directory with the dedicated `stockquant-qlib-backfill-*` prefix; batches are limited to 1–1000 PUBLISHED/RETAINED rows. A CLI guard smoke with a shared-volume-like path failed before constructing a database pool.

Each row's canonical JSON bytes must match both `sha256` and `artifact_id`. Apply mode publishes bytes to the immutable shared store and reads them back for byte equality before issuing a compare-and-set update conditioned on TestRun, artifact ID, hash, old JSONB payload, and active lifecycle status. Publish/integrity failures leave the legacy JSONB untouched. Concurrent row changes are counted as conflicts and remain eligible for a later pass. EXPIRED rows are excluded.

## Verification

- Platform TypeScript build: PASS.
- Full Platform unit suite: 44 files, 152 tests PASS.
- Focused Qlib content-store and backfill unit tests: 2 files, 9 tests PASS. Coverage includes dry-run, publish/verify/CAS, rerun idempotence, corrupt source/store failure-closed behavior, concurrent CAS conflict, batch bounds, and rejection of active database/shared-volume targets.
- Dedicated `platform_api_test` lifecycle integration: 2/2 PASS. The new case inserted a legacy JSONB row under a random TestRun/owner, verified dry-run, applied migration, confirmed JSONB became NULL, confirmed reads still return the exact payload from shared storage, and reran idempotently. Cleanup is scoped to those generated IDs.
- `pnpm verify:stage -- --stage V2.3 --suite code`: PASS, exit 0. The suite ran locked Qlib 0.9.6/LightGBM 4.7.0 Fit/Predict over 120 synthetic rows, 24 test predictions, Web→Platform→Quant Worker→shared store/PostgreSQL path, same-run CLI check-only, and evidence export. It reported `independentValidation=NOT_RUN`, `dataMode=FIXTURE`, `externalSources=0`, `brokerMode=FAKE`; temporary databases, network, worker container/image, and shared-content test directory were removed. TestRun `6c4a751f-4c58-41e0-9a2f-25cae4a3615c`; export manifest hash `f7ac7bde2c85f3141af513418b084a0ff8ca878dfee27188393a9b46ee7eb066`.
- `pnpm baseline:check`: PASS; 1946 Markdown links, 211 JSON files, 146 schemas, 36 fixtures, generated contracts, compatibility/OpenAPI, shared store tests and service-layer gates passed.
- `git diff --check`: PASS.
- No active business database, active application container, or active shared runtime volume was read or changed. The PostgreSQL integration target was the dedicated `platform_api_test` database. This evidence does not authorize or claim production migration.

## Source hashes

See the adjacent SHA-256 manifest. The hashes cover source, unit/integration tests, operator/stage/test/acceptance documentation, service architecture, and the exported Qlib TestRun evidence and Artifact attachment.

2026-10-01 follow-up after a later Historical Replay layer refactor: the shared V2.3 stage page received a dated note that links the new refactor audit and explicitly keeps business stage/user acceptance incomplete. This changes only the documentation member of the linked source set; all Qlib source, lifecycle behavior and original TestRun evidence remain unchanged. The adjacent file manifest records the refreshed stage-page and audit hashes so version evidence verification remains exact.

2026-10-02 follow-up: V2 acceptance documentation now also records the Market Data provider HTTP adapter engineering slice while retaining `PARTIALLY_IMPLEMENTED` and the no-source-authorization boundary. No Qlib source, lifecycle behavior or original TestRun evidence changed. The adjacent source manifest refreshes the exact V2 acceptance-page and audit-note hashes only.

2026-10-02 follow-up: V2.3 stage/acceptance pages now also link the isolated Qlib Fixture TestRun `41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe` and its rerun audit; historical TestRun and source evidence above remains unchanged. The adjacent source manifest refreshes the stage/acceptance/audit note hashes and includes the new synthetic TestRun, Artifact and rerun audit.

2026-10-02 follow-up: V2.5 acceptance now records the isolated V2.5 code-suite and synthetic 100k Parquet capacity result while retaining long-observation/PIT/source limitations. The adjacent manifest refreshes the acceptance-page and audit-note hashes; no prior Qlib source or TestRun bytes were changed.
