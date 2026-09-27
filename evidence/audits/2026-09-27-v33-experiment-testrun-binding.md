# V3.3 Experiment–TestRun binding audit (2026-09-27)

## Change

Research Automation now accepts an optional UUID `testRunId` on experiment creation so legacy model-only experiments remain valid. The value is persisted in `research_experiments.test_run_id` (additive startup migration and initial SQL schema), participates in idempotency comparisons, and is included in the generated experiment request contract. Existing rows remain unbound (`NULL`).

Before accepting a Runner Job, the service now requires UUID `testRunId` and `experimentId`, an existing experiment whose durable binding exactly matches the Job, and a budget allocation in `RESERVED` state. Missing/legacy bindings, cross-TestRun dispatch, unknown experiments and non-reserved budgets are rejected before `runnerJobs.submit`; this prevents queue insertion for these invalid cases. The V3.1 fixed-pipeline smoke now creates the experiment with the same UUID TestRun it dispatches.

## Verification

- Research Automation unit suite: 26 files, 150 tests passed.
- Research Automation TypeScript build and lint/typecheck passed.
- Contracts: 126 JSON files, 74 schemas, 34 Fixtures; generated types, 61 compatibility consumer rules and 12 OpenAPI contracts passed.
- `git diff --check` passed.
- PostgreSQL integration command discovered 4 files / 19 tests but skipped all because `RESEARCH_AUTOMATION_DATABASE_URL` is unset. The HTTP/Docker fixed-pipeline smoke was not run because Docker daemon access is denied in this environment; dispatch guard behavior is covered by unit tests.

## Limits and status

This is a binding and dispatch safety prerequisite, not the V3.3 workflow completion. Platform must continue validating session ownership and stage before creating a bound experiment; Research Automation cannot establish Platform ownership from a UUID alone. It does not implement V3.3 stage-wide budget aggregation/control, checkpoints, round aggregation, cancellation/recovery orchestration or proven Paper continuity. No Docker Runner, active service, real model or external data source was invoked. V3.1/V3.2 prerequisites and V3.3 business/human acceptance remain NOT_RUN.
