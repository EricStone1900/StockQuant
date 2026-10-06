# W7 / V3.3 normal same-TestRun business assertion

Date: 2026-10-06 (Asia/Shanghai)

## Result

The owner-scoped normal scenario assertion is implemented across Platform, contracts, Web, and CLI. After the same TestRun has completed both Runner rounds and Fixture ledger settlement, Platform rereads the exact two queued jobs, reads each output Artifact's bytes, independently recomputes SHA-256, validates the frozen Qlib Fixture metrics, rereads the complete TestRun budget summary, and persists `V3.3_NORMAL_RESULTS_001` on the original StageRun. Artifact service read failures return 503 and do not create an assertion. Successful replay is idempotent.

The isolated Platform/Research HTTP plus two-PostgreSQL smoke passed. Normal TestRun `2ba531af-da7b-4a13-905a-e55c3125e91f`, Experiment `1919741a-39ae-4936-902d-fafe03b361da`: both outputs matched Fixture `v3.1-research-small-sample-1` (6 bars, Qlib 0.9.6.99, return 0.12), the authoritative ledger settled 46 cents of 80, and the owner-scoped assertion persisted as PASS. The same cross-service smoke also passed recovery checkpoint recovery and rejection/no-side-effects assertions. External provider calls were 0; isolated PostgreSQL/container/network cleanup was confirmed.

`pnpm verify:stage -- --stage V3.3 --suite code` exited 0. Research Automation: 218/218 unit and 32/32 integration tests. Platform: 198/198 unit and 8/8 integration tests. CLI same-run test passed. Web Playwright: 5/5. Contracts, OpenAPI, generated-client checks, baseline, 66,100-row isolated budget pagination probe, Runner SIGKILL/lease takeover/checkpoint fencing, and the cross-service smoke passed. Full suite transcript: [log](2026-10-06-w7-v33-normal-business-assertion-full-suite.log).

## Scope limits and remaining work

This is an engineering/code-suite result only. Provider invoice reconciliation, formal V3.3 acceptance, structured evidence export and independent export verification, Paper continuity, other V3 prerequisites, Ubuntu migration/observation, O1/O2 collection observation, and human acceptance remain incomplete or not run. `NO_TRADE` and no source authorization remain in force; no market data, external model provider, Paper, or Broker requests were made. Do not infer a version PASS or human sign-off from this evidence.
