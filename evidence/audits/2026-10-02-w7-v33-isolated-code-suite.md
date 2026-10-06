# W7 / V3.3 isolated full code suite

Date: 2026-10-02 (Asia/Shanghai)

## Result

The complete command `pnpm verify:stage -- --stage V3.3 --suite code` exited 0 on the second run, using a disposable PostgreSQL container with a random loopback-only port. The container was removed by the wrapper on exit. The suite exercised:

- Baseline and contract checks: 2,344 local Markdown links, 211 JSON files, 146 schemas, 36 fixtures, generated-client drift checks and architectural/version-gate tests passed.
- Research Automation lint; 34 unit files / 191 tests; 4 PostgreSQL integration files / 27 tests; experiment binding, owner-scoped queue/budget HTTP smokes and readiness CLI tests passed.
- Budget-summary capacity probe passed using 66,100 synthetic Experiments and up to 50,000 rows per TestRun. It is a hot-cache engineering probe, not production capacity evidence.
- Two-round deterministic Runner recovery passed after simulated Host `SIGKILL`, expired-lease takeover, fence increment to 2, old container removal, resource metric collection and stale publish HTTP 409. The Fixture had 1,000 rows, no model call, and used isolated runner limits of 500m CPU, 512 MiB and 32 PIDs.
- Platform typecheck; 45 unit files / 156 tests; 4 PostgreSQL integration files / 5 tests; Web typecheck; Playwright 3/3 passed.
- External market-data, model-provider, Paper and broker calls: 0. Active services and the shared 5433 PostgreSQL instance were not used.

## Retained first attempt and repair

The first full run failed in Platform integration setup: two files concurrently called `PostgresStageRunRepository.migrate()`, and PostgreSQL reported a duplicate implicit row-type name for `acceptance_stage_runs`. The disposable database was discarded. The migration now runs transactionally under a transaction-scoped PostgreSQL advisory lock, serializing first creation of the shared stage tables. The complete suite was rerun from a fresh disposable database and passed, including the same parallel integration suite (4 files / 5 tests).

The lock addresses concurrent initialization of shared tables; it does not change business data or modify the active database. No production or persistent database migration was applied in this run.

## Limits

This result does not implement the V3.3 TestRun-level research workflow, prove real RD-Agent/provider billing, verify Paper continuity under research load, provide Ubuntu evidence, or constitute stage/business/human acceptance. `businessWorkflow=NOT_IMPLEMENTED`, `businessValidation=NOT_RUN`, `paperContinuity=NOT_CHECKED`, and `humanAcceptance=NOT_RUN`; V3.3 remains `NOT_RUN`.
