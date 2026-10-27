# V2.1 C2-B persisted quote source health

Date: 2026-10-19  
Scope: derive quote-source health and error facts from durable REAL sampling task execution; expose them through the existing source inventory.  
Status: **PASS for persisted health derivation and read API; C2-B/C2 remain IN_PROGRESS.**

## Implementation

- Added `sourceHealth()` to the PostgreSQL snapshot sampling repository. It derives latest state, attempt time, success time, failure time and a stable error code from REAL sampling tasks joined to their durable worker lifecycle records. It performs no provider request and introduces no duplicate health ledger.
- `/v2/sources` now includes `samplingHealth` for quote sources. `NEVER_RUN` and `UNAVAILABLE` are explicit; news sources return `null` because this sampling path does not measure news health.
- Kept the manual in-memory circuit field separate from provider execution health. The inventory response states that the endpoint does not probe providers.
- Extended the source inventory JSON Schema and regenerated service contract types.
- Added PostgreSQL assertions for healthy and never-run sources, a failed Sina run with a stable provider error code, and a later successful run that restores current health while preserving the last failure timestamp/code. Added HTTP restart smoke assertions for persisted authorization-block facts, error redaction, and circuit separation.

## Checks

- Market Data typecheck/build — PASS.
- Market Data unit suite — 24 files, 113 tests PASS.
- `pnpm contracts:check` — PASS; 211 shared schemas and all generated clients checked.
- `pnpm --filter @stockquant/market-data-service test:schema-migrations` — PASS; isolated PostgreSQL migration and source health success/failure/recovery/never-run assertions passed; temporary container and network removed and verified.
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` — PASS; after process restart the source inventory reports the persisted Tencent authorization block and stable error code, keeps the manual circuit `HEALTHY`, and makes zero external requests. Temporary PostgreSQL container/network removed and verified.

No live source request was made. OD-008 remains NONE and `STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED` remains unset. The smoke proves durable local facts and read behavior only; it does not establish current Tencent/Sina availability, terms, rate limits or quote quality.

While extending the migration test, its legacy-schema reconstruction initially retained the added Sina REAL rows, which correctly violated the simulated pre-v14 status constraint. The test now removes those v14-only rows before reconstructing the older schema; the full rerun passed.

## Remaining C2-B work

Sina adapter capability and the independent monitor/daily-bar/strategy/order consumers remain open. The consumer schedules stay disabled and no strategy or order execution is enabled. C2-E same-TestRun Web/CLI acceptance and C2-F authorized live-source verification remain open.
