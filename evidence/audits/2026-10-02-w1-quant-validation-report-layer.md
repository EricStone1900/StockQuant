# W1 Quant validation-report application boundary

Date: 2026-10-02.

Validation input lookup, immutable report submission and report read now go through `ValidationReportService`. The service validates request IDs, submission schema and route/report binding, fingerprints the exact submission, and projects the existing HTTP statuses and response payloads. `ValidationReportRepository` is the persistence boundary; `PostgresValidationReportRepository` owns parent-row locking, request/source binding, immutable insert/replay/conflict behavior, row mapping and transaction lifecycle. This removes those PostgreSQL calls from the HTTP composition root without changing the schema or the V3.2 API contract.

Validation: Quant build/lint and 13 unit files/62 TypeScript tests pass; Python Worker suite passes 13 tests. Complete `pnpm verify:stage -- --stage V3.2 --suite code` exited 0 after the change. The suite includes random disposable PostgreSQL/HTTP concurrency and conflict cases, isolated Fixture candidate execution and independent recomputation, owner-scoped READINESS_ONLY HTTP TestRun restart/read checks, and Web typecheck/build/unit. The suite explicitly leaves V3.2 `businessValidation=NOT_RUN` and `humanAcceptance=NOT_RUN`; active Registry/Mandate mutation and external market/provider calls remain zero.

Promotion decision transaction, Registry lookup and aggregated promotion detail still contain direct SQL in bootstrap. The Quant service has not yet passed a whole-service boundary scanner. This increment is code-suite evidence, not stage acceptance.
