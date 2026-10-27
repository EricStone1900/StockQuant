# V2.1 C2-A source identity validation

Date: 2026-10-19  
Scope: REAL snapshot `sourceId` contract, PostgreSQL schema v13 and source-scoped task identity.  
Status: **PASS for the implemented source-identity increment; C2/V2.1 remains IN_PROGRESS.**

## Verified behavior

- REAL sampling accepts only `tencent-quote` and `sina-quote`; an unregistered ID returns HTTP 422 `INVALID_QUOTE_SOURCE_ID`.
- Repeating the same source, scheduled instant and task input returns the existing task (`created=false`). Selecting the other supported source at the same instant creates a distinct task ID and retains its own `sourceId`.
- With OD-008 unset, the worker persists `BLOCKED_SOURCE_AUTHORIZATION`; the provider request count remains zero.
- Schema v13 upgrades and repeat-starts cleanly. Existing REAL rows without source provenance remain `legacy:unspecified`; identifiable Fixture rows receive `fixture:<fixtureVersion>`. Existing observations and task data are preserved.
- Contract schemas, OpenAPI and generated Market Data client are consistent.

## Checks

- `pnpm --filter @stockquant/market-data-service typecheck` — PASS.
- `pnpm --filter @stockquant/platform-api-service typecheck` — PASS.
- `pnpm --filter @stockquant/market-data-service test:schema-migrations` — PASS; v1–v13 migration ledger, concurrent and repeated startup, old-row backfill and preservation, unknown future version rejection. Disposable PostgreSQL container/network were removed and verified.
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` — PASS; source-specific idempotency and task separation, invalid source rejection, worker authorization block, external requests 0, Fixture completion and process restart recovery. Disposable PostgreSQL container/network were removed and verified.
- `pnpm contracts:check` — PASS; 338 JSON files, 218 schemas, 72 fixtures; 14 contract tests and 2 generator-registration checks passed; generated client drift absent.
- `git diff --check` — PASS.

The first smoke run exposed legacy test requests that omitted the now-required `sourceId`; those requests were corrected before the passing rerun. No live source was configured or contacted. No order or model call was made.

## Remaining scope

This closes the C2-A implementation-check item only. It does not validate quote-provider capability, licensing, live data quality, or source authorization. C2-B still needs the provider port/worker handoff and remaining independent schedule consumers. Full C2 normal/rejection/recovery in one Web `testRunId`, read-only CLI verification, executable runbook and current-scope human acceptance remain open.
