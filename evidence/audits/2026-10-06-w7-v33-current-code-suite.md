# W7 V3.3 current-worktree code suite (2026-10-06)

The exact current worktree passed `pnpm verify:stage -- --stage V3.3 --suite code` in the controlled isolated local environment. The default sandbox attempt is retained in the execution history: five unit tests in `restricted-egress-proxy.spec.ts` and `restricted-provider-fetch.spec.ts` failed to bind `127.0.0.1` with `EPERM`; no test assertion failed. Re-running the same suite through the controlled local loopback path passed.

The successful suite covered baseline/contracts/fixtures, Research Automation lint and 216 unit tests, 29 isolated PostgreSQL integration tests, experiment/TestRun and round-budget HTTP checks, the 66,100-row isolated hot-cache budget-summary pagination probe, two-round Fixture Runner checkpoint recovery after Host SIGKILL, Platform typecheck/186 unit tests/8 integration tests, Web typecheck and Playwright 3/3. The runner smoke recovered checkpoint sequence 1 under fencing token 2, committed sequence 2, and rejected stale publish with HTTP 409. The probe's deepest 50,000-row page reported offset P95 896.405 ms and keyset P95 19.924 ms; this is only an isolated hot-cache database comparison, not a production capacity claim.

No external model, Provider, market-data, Paper, or Broker calls occurred. The suite's own final status correctly remains `businessWorkflow=NOT_IMPLEMENTED`, `readinessTestRunCreation=PERSISTED_WAITING_ONLY`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`. This is code/Fixture evidence, not V3.3 acceptance and not evidence that V3.1/V3.2 prerequisites have passed.

Full output: [raw suite log](2026-10-06-w7-v33-current-code-suite.log). SHA-256: [suite manifest](2026-10-06-w7-v33-current-code-suite.sha256).
