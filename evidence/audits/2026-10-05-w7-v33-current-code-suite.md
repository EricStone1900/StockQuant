# W7 / V3.3 current code suite (2026-10-05)

Command: `pnpm verify:stage -- --stage V3.3 --suite code`  
Result: PASS, exit 0. The first sandboxed attempt is retained in the task output as an environment failure: five loopback-only tests failed because binding `127.0.0.1` returned `EPERM`. The same suite was rerun with local loopback access and passed. The complete successful stdout/stderr is [the raw log](./2026-10-05-w7-v33-current-code-suite.log).

Research Automation passed lint/build, 216 unit tests and 29 isolated PostgreSQL integration tests. Platform passed typecheck, 180 unit tests and 6 PostgreSQL integration tests. Web typecheck and Chromium 3/3 passed. A 1,000-row deterministic Runner Fixture ran two rounds; after host `SIGKILL`, lease fencing token 2 recovered checkpoint sequence 1 and persisted sequence 2; stale publication returned HTTP 409. Runner limits were 500m CPU, 512 MiB and 32 PIDs; sampled peak memory was 45,141,197 bytes.

The 66,100-row budget pagination probe measured a 50,000-row deepest offset page at P95 806.332 ms and keyset pagination at P95 5.689 ms. This was an isolated hot-cache PostgreSQL microbenchmark, not production capacity evidence.

The final scope report remains explicit: `businessWorkflow=NOT_IMPLEMENTED`, `dispatch=ISOLATED_FIXTURE_RUNNER_SMOKE_ONLY`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`; external model calls were zero. This closes only the current code-suite regression check. It does not close V3.3 business workflow, Paper coexistence, provider billing reconciliation, Ubuntu, stage acceptance, or user sign-off. No real model, provider, market-data, Paper, or broker calls were made, and no active service was modified.
