# W7 V3.3 per-TestRun budget cap binding (2026-10-06)

## Change

Research Automation now supports binding a stricter immutable budget cap to one TestRun in both its in-memory and PostgreSQL budget ledgers. The requested cap must be a positive integer no greater than the service-wide hard cap. Reapplying the same value is idempotent; attempting to change it conflicts. Binding is refused if existing RESERVED/UNKNOWN commitments or settled actual spend exceed the proposed cap. Experiment reservations and cap binding serialize through the PostgreSQL stage advisory lock, so an over-cap reservation creates no allocation row and cannot race a cap update.

PostgreSQL adds `research_budget_test_run_limits` without changing or deleting existing budget records. The integration test uses a random stage ID and TestRun UUID and removes only its own limit/allocation rows in `afterAll`.

## Verification

- `pnpm --filter @stockquant/research-automation-service lint` — PASS.
- `pnpm --filter @stockquant/research-automation-service exec vitest run tests/unit/v31-runtime-guards.spec.ts` — 11/11 PASS.
- `env RESEARCH_AUTOMATION_DATABASE_URL=postgresql://research_automation@127.0.0.1:5433/research_automation_test pnpm --filter @stockquant/research-automation-service exec vitest run tests/integration/pg-budget-ledger.spec.ts` — 8/8 PASS against the dedicated test database.
- After the change, the full `pnpm verify:stage -- --stage V3.3 --suite code` — PASS; Research Automation 217 unit tests/30 isolated PostgreSQL integration tests, Platform 186 unit tests/8 integration tests, and Web E2E 3/3. See [full V3.3 code-suite log](2026-10-06-w7-v33-testrun-cap-binding-code-suite.log).
- The Platform-only `POST /v1/runner/budgets/test-run/limit` HTTP/PG path is included in the budget-summary smoke: anonymous 401, Runner 403, same-value replay 200, changed value 409, over-cap Experiment 422 with no Experiment or allocation row, and rejected lower-cap update 409 with the prior reservation unchanged. The cap-binding contract/client drift check also passes. The latest full suite is [here](2026-10-06-w7-v33-test-run-cap-api-code-suite.log).

An initial integration command omitted the required environment variable and Vitest skipped all 8 tests. That result was not counted as a pass; the explicit test-database rerun above executed and passed all 8.

## Scope boundary

This implements the budget primitive and Platform-only service API required by the frozen V3.3 scenario plan, including per-TestRun cap binding. The higher-level Platform V3.3 workflow does not yet invoke the API; the frozen normal/rejection/recovery scenarios, Web/CLI same-TestRun assertions, and V3.3 acceptance remain incomplete. No external Provider, market-data, Paper, or Broker call was made; the separate fixed model response used in the existing round-settlement smoke is explicitly Fixture-only.

The plan, service architecture and README describe this addition. Current source SHA-256 values are in [the file manifest](2026-10-06-w7-v33-testrun-cap-binding.sha256).
