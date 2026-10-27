# V2.1 C2-B snapshot Provider port increment

Date: 2026-10-19  
Scope: shared sampling Provider port, Tencent adapter, Worker gate/handoff, REAL result persistence.  
Status: **PASS for the local Provider boundary and persistence slice; C2-B/C2 remain IN_PROGRESS.**

## Implementation

- Added an application Provider port shared by the durable snapshot Worker and source adapters. The Tencent adapter supplies quote rows; a source registry keeps adapter selection tied to the task's explicit `sourceId`.
- The worker rechecks the exact QUOTE authorization after claiming a REAL task. A separate `STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED=true` runtime opt-in is also required; it remains unset. The request handler only enqueues work, and returns `SAMPLING_EXECUTOR_NOT_CONFIGURED` when an authorized source is presented without the separate opt-in.
- Result normalization rejects wrong-source, incomplete, duplicate/out-of-scope and invalid-price/timestamp batches. Missing source time is retained as `UNKNOWN`; timestamps, ingest/availability time, age and freshness are persisted with the source ID.
- PostgreSQL schema v14 adds the `COMPLETED_REAL` task status. REAL result commit is idempotent and rejects a source mismatch. Provider failures use the existing bounded retry and terminal failure record.
- Sina remains accepted as a task source ID, but no Sina sampling adapter is registered yet. Authorized Sina execution therefore fails closed as `SNAPSHOT_PROVIDER_NOT_CONFIGURED`.

## Checks

- Market Data and Platform typechecks — PASS.
- `pnpm --filter @stockquant/market-data-service exec vitest run tests/unit/public-source-http-adapter.spec.ts tests/unit/snapshot-sampling-provider.spec.ts tests/unit/sampling-task-worker.spec.ts` — 3 files, 20 tests PASS.
- `pnpm --filter @stockquant/market-data-service test:schema-migrations` — PASS; v1–v14 upgrade, repeat/concurrent startup, REAL result persistence/idempotency/source-conflict rejection, legacy row preservation. Disposable PostgreSQL container/network removed and verified.
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` — PASS; Fixture worker recovery remains intact, unauthorized REAL task is blocked with zero external requests. Disposable PostgreSQL container/network removed and verified.
- `pnpm contracts:generate` and `pnpm contracts:check` — PASS; `COMPLETED_REAL` is included in the shared result schemas and generated service types are current.
- `git diff --check` — PASS.

The first migration run found that the legacy-schema reconstruction portion of the test retained a new `COMPLETED_REAL` row, which is invalid in the reconstructed pre-v14 schema. The fixed input now removes that v14-only row before rebuilding the old schema; the rerun passed. The first quote-age assertion also omitted the two-second ingest delay; the expected age was corrected to use the injected execution time.

No real source request was made: OD-008 is NONE and the separate runtime opt-in is unset. The Tencent adapter has only been exercised through a stubbed response; this does not verify source availability, terms, rate limits or live quote quality. No strategy, order or model execution is enabled.

## Remaining C2-B work

Implement/register Sina if it remains in the approved candidate set; connect source health/failure records and the independent monitor, daily-bar, strategy and order-window consumers. Full Web/Platform/PostgreSQL same-TestRun verification and any live-source validation remain open.
