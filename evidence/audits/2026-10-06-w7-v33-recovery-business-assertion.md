# W7/V3.3 same-TestRun checkpoint recovery business assertion

Date: 2026-10-06 (Asia/Shanghai)

## Result

The recovery scenario now persists an owner-scoped business assertion on the original Platform StageRun. A versioned `POST .../runs/{testRunId}/verify-recovery` command is available through the Web acceptance page and `pnpm verify:stage -- --stage V3.3 --run RUN_ID --verify-recovery`. It is accepted only for an owned V3.3 `recovery` TestRun after both rounds have reconciled and the Experiment ledger has settled.

Platform fetches the durable checkpoint history from Research Automation for the exact TestRun, Experiment, and round 1. It requires exactly sequences 1 and 2, cursor states 1 and 2, recomputes each canonical-state SHA-256, and independently checks the round-1 published output metrics report resuming from sequence 1 and completing at sequence 2/cursor 2. The assertion and returned checkpoint/output facts are stored on the original StageRun. Repeating a successful call returns the saved assertion without another Research request. Human acceptance remains `NOT_RUN`.

Research Automation exposes this history only through a versioned service-authenticated read endpoint. Platform Bearer is allowed; Runner Host is forbidden. Invalid identities, TestRun/Experiment mismatch, missing durable storage, incomplete histories, bad state hashes, or mismatched output do not pass.

## Verification

The final `pnpm verify:stage -- --stage V3.3 --suite code` exited 0. The recorded rerun includes baseline, contracts, Fixtures, Research Automation 218/218 unit and 32/32 PostgreSQL integration tests, Runner Host SIGKILL/lease takeover/checkpoint recovery, 66,100-row hot-cache pagination probe, CLI same-TestRun verification, Platform 197/197 unit and 8/8 PostgreSQL integration tests, the isolated Platform/Research HTTP+PostgreSQL cross-service smoke, Web typecheck, and Web E2E 4/4. Full logs are retained in [the final suite rerun](2026-10-06-w7-v33-recovery-business-assertion-full-suite-rerun.log).

The cross-service smoke verifies recovery on TestRun `0f6cbdf8-4c76-4d1c-9966-d75b859b6877`: checkpoint 1 was committed before Host SIGKILL; the durable lease expired; Host fence 2 resumed from the exact checkpoint SHA; checkpoint 2 was committed; stale-fence publication returned HTTP 409; both rounds completed; the owner-scoped assertion persisted `PASS`. The same suite also verified the normal two-round run and the 50-cent-cap rejection with zero Experiment/Allocation/model-call/Runner-job side effects. No external Provider, market data, Paper, or Broker calls were made; active services were not connected and temporary databases, network, Runner containers, and artifact directories were cleaned.

The first full rerun after adding independent checkpoint SHA recomputation failed because its unit fixture reused one SHA for two distinct checkpoint states. The production check correctly returned `FAIL`; the test fixture was corrected to hash each state, the Platform test file passed 23/23, and the complete suite then passed. The failure remains preserved in [the initial full-suite log](2026-10-06-w7-v33-recovery-business-assertion-full-suite.log).

Machine-readable evidence: [summary](2026-10-06-w7-v33-recovery-business-assertion.json). The active file-integrity manifest is [SHA-256](2026-10-06-w7-v33-recovery-business-assertion.sha256).

## Remaining scope

This closes the V3.3 recovery business-assertion subtask only. The normal-scenario business assertion, formal same-TestRun evidence export/independent recomputation, applicable prerequisite stage acceptances, Paper continuity, real-provider invoice reconciliation, real Ubuntu acceptance, V3.3 human sign-off, O1/O2 observation, and final V1/V2/V3 acceptance remain open. Market-data authorization is still absent and the user-confirmed boundary remains `NO_TRADE`; no real collection or Paper activity was started.
