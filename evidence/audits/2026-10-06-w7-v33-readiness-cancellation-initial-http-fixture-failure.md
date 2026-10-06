# Initial V3.3 cancellation HTTP fixture failure

Date: 2026-10-06 (Asia/Shanghai)

Command:

```text
node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:integration
```

Result: 1 failed, 7 passed. The new HTTP cancellation test attempted to initialize a WAITING TestRun using the same UUID that the preceding repository test had already transitioned to terminal `CANCELLED`. `PostgresStageRunRepository.save` correctly rejected the conflicting terminal identity with `ConflictException: stage run identity or terminal evidence conflicts with the stored run`.

Correction: assign the HTTP route test its own random TestRun UUID and clean its row/history independently. The same isolated PostgreSQL/HTTP integration command then passed: 4 test files, 8 tests. The disposable container and network were removed and verified; `activeServices=NOT_CONNECTED`.
