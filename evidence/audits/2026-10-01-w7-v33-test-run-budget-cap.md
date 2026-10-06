# W7 V3.3 cumulative TestRun budget cap

Date: 2026-10-01 (Asia/Shanghai)

## Change

Research Automation now enforces `STOCKQUANT_RESEARCH_MAX_TEST_RUN_BUDGET_CENTS` as a cumulative hard cap for experiments bound to one TestRun. `PgBudgetLedger.reserve` evaluates the existing TestRun allocation total inside the same serialized stage-lock transaction used for the global limit. RESERVED and UNKNOWN allocations count at their full reservation; SETTLED allocations count verified actual spend; rejected allocations count zero. An over-cap request fails before `research_experiments` is written or a Runner job can be queued. The in-memory ledger mirrors the rule. Reusing an experiment reservation with a different TestRun is rejected.

The database migration adds nullable `test_run_id` to existing allocations and backfills it from `research_experiments` when that table exists. Persisted stage limits now include the configured TestRun ceiling and startup rejects drift. Compose passes the explicit configuration; default is 1000 cents and it may not exceed the configured stage total. No active service or database was changed.

The owner-scoped TestRun summary reports `TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED`. Separate per-round allocation and round/recovery shared caps remain open, as do the full V3.3 business workflow, checkpoint recovery, Paper continuity and human acceptance.

## Verification

- `pnpm --filter @stockquant/research-automation-service lint`: exit 0.
- Research Automation unit suite: 170/170 pass.
- Research Automation isolated PostgreSQL integration suite: 22/22 pass, including cumulative TestRun cap, UNKNOWN hold, SETTLED actual charge, independent TestRun accounting, concurrent same-TestRun reservations and TestRun budget-summary accounting.
- `v33:test-run-budget-summary-http-smoke`: PASS; two bound experiments totaling 200 cents; an additional 801-cent request was rejected at the 1000-cent run cap before persistence; UNKNOWN retry remained 15 cents; anonymous/runner-host access rejected; external model and Paper calls 0.
- `v33:runner-host-rounds-recovery-http-smoke`: PASS; two deterministic Fixture rounds, host termination and fenced lease takeover, no provider call.
- Full `pnpm verify:stage -- --stage V3.3 --suite code`: exit 0. Includes baseline/contracts/fixtures, 170 Research unit tests, 22 PostgreSQL integration tests, queue/budget HTTP checks, 50k synthetic pagination probe, two-round isolated Runner recovery, readiness CLI, Platform 116 unit tests/3 integration tests, Web typecheck and 3/3 Playwright checks.
- TestRun business workflow remains `NOT_IMPLEMENTED`; business validation and human acceptance remain `NOT_RUN`. No market data collection, Paper order, or real provider call occurred.

The full stage suite still reports V3.3 `NOT_RUN`; this engineering code suite does not satisfy its normal/rejection/recovery business scenarios or user acceptance.
