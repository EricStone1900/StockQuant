# V3.3 budget control boundary clarification

Date: 2026-09-30

## Verified implementation

`services/research-automation-service/src/bootstrap/main.ts` creates `PgBudgetLedger` with the configured stage aggregate limit and injects it into `ExperimentService`. `ExperimentService.create` reserves the budget before saving an experiment and rejects the reservation if experiment persistence fails. `/v1/runner/jobs` checks the experiment's exact TestRun binding and requires the same experiment's reservation to remain `RESERVED` before queue insertion. `PgBudgetLedger.reserve` holds a stage-row lock and counts RESERVED/UNKNOWN reservations in full and SETTLED verified cost against the aggregate stage cap. Cancelling a not-yet-executed experiment settles known-unused reserved funds at zero; UNKNOWN remains reserved.

## Boundary

This is an implemented V3.1 experiment reservation and aggregate-stage limit. It does not complete V3.3's budget control plane: experiment/round/retry allocation tied to an accepted V3.3 TestRun, cross-round recovery limits, all-attempt accounting and stage-wide budget view are not implemented. Production Provider billing reconciliation also remains unverified; the live model path stays BLOCKED. The V3.3 suite output correctly remains `stageBudgetControl=NOT_IMPLEMENTED`.

## Verification

- `pnpm --filter @stockquant/research-automation-service test`: exit 0, 26 files / 154 tests passed.
- `RESEARCH_AUTOMATION_DATABASE_URL=postgresql://research_automation@127.0.0.1:5433/research_automation_test pnpm --filter @stockquant/research-automation-service test:integration`: exit 0, 4 files / 19 PostgreSQL tests passed against the isolated test database.
- `pnpm docs:check`: exit 0, 1,060 local Markdown links checked, no failures.

The Research Automation README and V3.3 stage notes were corrected to distinguish this existing V3.1 limit from the missing V3.3 lifecycle. No service was deployed or changed, no model/Provider call was made, and no stage acceptance status was changed.
