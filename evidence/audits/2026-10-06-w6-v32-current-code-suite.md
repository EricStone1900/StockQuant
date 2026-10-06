# W6 V3.2 current-worktree code suite

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V3.2 --suite code` passed on the current worktree. The isolated suite covered baseline and contract/Fixture checks; 70 synthetic candidate decisions independently recomputed in a restricted container; Governance/Quant candidate and exact-version paths; Research Automation 218 unit tests and preparation HTTP smoke; Platform 198 unit tests and 8 PostgreSQL integration tests; disposable PostgreSQL-backed readiness HTTP, restart persistence and owner isolation; Web typecheck/build/unit test; and the `linux/amd64` readiness container smoke.

The container smoke created readiness-only TestRun `13bb668c-5742-430f-bd00-4d1c5f6c0410`; it remained `WAITING`, `businessValidation=NOT_RUN`, `registryMutation=NOT_PERFORMED`, and `paperCalls=0`. Only the disposable synthetic validation test database recorded its expected test mutation. No active services, external model/data providers, or brokers were called. Human acceptance remains `NOT_RUN`; V3.2 remains formally incomplete.

The first sandbox attempt failed when its loopback HTTP smoke received `EPERM`; this environment failure was retained in the execution history. The same suite passed with controlled local loopback permissions. The full passing transcript is [here](./2026-10-06-w6-v32-current-code-suite.log). The passing final stage JSON is at the end of that transcript.
