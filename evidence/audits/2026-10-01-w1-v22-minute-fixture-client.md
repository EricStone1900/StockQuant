# W1 V2.2 frozen minute Fixture client audit

Date: 2026-10-01 (Asia/Shanghai)

## Change

The Platform V2.2 fixture preview (`GET /v2/minute/preview`) and fixture import (`POST /v2/minute/import`) now use `GeneratedMarketDataMinuteClient`. The uploaded-csv scenario also reads the owner-scoped upload progress via the same generated client rather than hand-written fetch. The existing Market Data minute OpenAPI contract now includes the fixture operations, preview response schema and import request schema; upload progress already had its schema and operation. Import responses with HTTP 422 remain available as rejected business records to preserve the acceptance flow; infrastructure/authentication errors retain their status and body. Preview backend errors continue mapping to Platform service unavailable, and absent/foreign upload IDs remain NOT_FOUND at the Platform boundary.

The client contract and generation checks cover 10 minute import/upload/read operations. The Platform route still validates the local session and forwards the Platform service identity. This change operates on the already frozen V2.2 Fixture only; it neither imports real data nor changes collection or active services.

## Verification

- `pnpm --filter @stockquant/platform-api-service lint`: PASS.
- `pnpm --filter @stockquant/platform-api-service test`: PASS, 38 files / 130 tests.
- `pnpm contracts:check`: PASS, including JSON Schema validation, generated-client drift, compatibility and OpenAPI checks.
- `pnpm docs:check`: PASS, 1,633 local Markdown links.
- `git diff --check`: PASS.

The first unit run after client migration failed because the existing session-proxy test asserted the exact pre-client fetch options and did not allow the generated client's method and timeout signal. The assertion now verifies GET, Platform identity and timeout; the full Platform suite then passed. The failed run is retained as regression history.

## Limits

The isolated end-to-end evidence proves actual Platform→Market Data→PostgreSQL behavior for the frozen Fixture APIs and upload lifecycle, plus Chromium normal/uploaded-csv and same-TestRun CLI checks. It does not prove real-data suitability, Parquet and scale requirements beyond existing evidence, active deployment, full V2.2 acceptance, or human re-acceptance.

## Isolated end-to-end follow-up

After the client boundary passed its unit and contract checks, the isolated V2.2 suite was run with `pnpm verify:stage -- --stage V2.2 --suite code` and exited 0. This includes repository baseline/build/lint/typecheck/unit checks, Platform/Market Data auth and database integration, Python Adapter and Ops checks. The first sandbox attempt stopped when a test bound a random loopback port; the same command passed under the already authorized restricted loopback test permission.

`pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke` passed using separately generated Platform and Market Data test databases plus local Chromium. It verified anonymous preview 401, logged-in Platform preview 200 with six frozen rows, normal import `PUBLISHED`, repeat import `idempotent=true` at the same version, and bad Fixture `REJECTED` with zero accepted rows. The same smoke completed browser normal/uploaded-csv flows, where the new generated progress read validated the owner-scoped completed import, and same-TestRun CLI `--check-only` read. The latest repeat run IDs are normal `91954424-c695-4312-b20b-955b6939c9ee` and uploaded CSV `96d9cd7d-9e74-4546-a148-4d5767689204`; an earlier passing run is retained as historical evidence above. Its `finally` block removed the random databases and child services; exit 0 confirms cleanup assertions.

The initial end-to-end attempt had an incorrect assertion expecting HTTP 200 for Nest's default POST success response; observed status was 201. The assertion was corrected to the actual route contract and the full smoke passed. Both failed attempts and the successful rerun are retained here for transparent history.

Subsequent verification: `pnpm baseline:check` passed after the evidence/documentation updates. `pnpm verify:version:evidence -- --version V2` passed with 127 local evidence references and 15 linked manifests; this checks reference integrity, not version acceptance. The final owner-progress change passed Platform lint/typecheck, full V2.2 code suite and isolated Chromium smoke.
