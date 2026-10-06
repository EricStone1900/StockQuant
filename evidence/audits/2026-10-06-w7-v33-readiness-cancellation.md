# W7 / V3.3 Readiness-only Run cancellation

Date: 2026-10-06 (Asia/Shanghai)

## Change

Added an owner-session `POST /api/v1/acceptance/v3/v3.3/runs/{testRunId}/cancel` command with an exact confirmation token. It only transitions a V3.3 `WAITING` preparation record when the persisted evidence still says `runnerDispatch=NOT_PERFORMED` and `runnerJobsCreated=0`. The transition uses `StageRunRepository.transitionV33Workflow`, preserving append-only state history. Exact retries of a previously cancelled readiness record are idempotent. Started dispatches, non-WAITING records, other stages, and missing/incorrect confirmation are rejected. No Runner job is cancelled and no model, budget, Paper, or market-data operation is issued.

The V3.3 page now offers the cancellation action only for a visible WAITING readiness run, then reloads the exact TestRun and verifies its persisted CANCELLED state. OpenAPI and command/result schemas describe the endpoint; generated contract types were refreshed.

## Verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v33-readiness-cancellation.spec.ts`: PASS, 6 tests.
- `pnpm --filter @stockquant/platform-api-service lint`: PASS.
- `pnpm contracts:generate`: PASS; 160 schemas generated to all service type bindings.
- `pnpm contracts:check`: PASS; 231 JSON files, 161 schemas, 39 fixtures, compatibility matrix and OpenAPI checks passed.
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v33-research-queue.spec.ts --workers=1`: PASS, 3/3 after fixing a handler initially placed in the V3.2 component. The initial browser failure is retained in Playwright's `test-results` output.
- `node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm --filter @stockquant/platform-api-service test:integration`: PASS, 4 files / 8 tests; includes real mounted HTTP route and PostgreSQL persistence. The runner confirms `activeServices=NOT_CONNECTED` and removes/verifies the temporary container and network. The initial 1-failed/7-passed attempt was a reused terminal TestRun fixture ID; the correction and retained result are documented in [the initial HTTP fixture failure record](./2026-10-06-w7-v33-readiness-cancellation-initial-http-fixture-failure.md).
- `pnpm verify:stage -- --stage V3.3 --suite code`: PASS after all audit links existed; the complete output is retained in [the final suite log](./2026-10-06-w7-v33-readiness-cancellation-suite.log). It included baseline, Research Automation 216/216 unit and 29/29 PostgreSQL integration tests, Platform 186/186 unit and 8/8 PostgreSQL integration tests, Web typecheck, and Playwright 3/3. Final scope remained `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, `humanAcceptance=NOT_RUN`; this change does not close V3.3.

The first targeted Playwright run caught a handler initially placed in the V3.2 component scope; that browser failure was fixed before the passing 3/3 run. The first suite-log capture stopped at the documentation-link check because this audit and its hash manifest had not yet been created. That exact output is retained in [the initial baseline-link failure log](./2026-10-06-w7-v33-readiness-cancellation-initial-baseline-link-failure.log); the final complete run passed after the links were materialized.

No active services were restarted or modified. No external Provider, market-data source, Paper, or Broker calls were made. This is an isolated readiness cancellation feature only; formal V3.3 dispatch, real research, Paper continuity, Ubuntu acceptance, observation and human sign-off remain outstanding.
