# V1 Artifact publication boundary audit (A01)

Date: 2026-10-09

## Result

The targeted Platform API checks passed. The V1.2 lifecycle suite passed 3/3 tests and the V1.4 report publication fencing suite passed 2/2 tests against disposable PostgreSQL databases. Direct unit checks for V1.2 acceptance cancellation, Qlib Artifact content storage, and V1.4 report Artifact references passed 14/14 tests. The integration commands built the service first and exited 0; the harness reported `activeServices: NOT_CONNECTED` and verified removal of each temporary container and network.

Commands:

```sh
node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:v12-run-lifecycle
node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:v14-report-publication-fencing
pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v12-acceptance.spec.ts tests/unit/qlib-artifact-content-store.spec.ts tests/unit/v14-report-artifact-ref.spec.ts
```

## Scope verified

- V1.2 lifecycle tests cover cancellation before the publishing phase, cancellation after the publishing fence, and immutable Artifact/hash ownership across TestRuns with idempotent retry and scoped reads.
- V1.4 report tests cover cancellation winning the publication lock and completion winning the fence, including controlled report retrieval.
- Existing implementation reads Artifact by TestRun, Artifact ID, and owner, accepts only published/retained states, and rechecks content hashes.

## Limits

This is focused boundary evidence, not a complete producer/consumer matrix, active-storage migration, business-ledger recovery, or approval for physical Artifact cleanup. Human acceptance remains separate. No active services or storage were connected.

The V1.4 integration test exercises each terminal transition order sequentially; it checks the database row-lock guards and rejects the losing later transition, but does not stress two requests scheduled simultaneously. Treat it as fencing-order evidence, not a concurrency-load test.
