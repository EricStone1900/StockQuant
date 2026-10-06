# W7 Runner Job clock injection

Date: 2026-10-02 (Asia/Shanghai)

## Change

`RunnerJobCoordinator` now accepts a `RunnerClock` port (with an explicit `SystemRunnerClock` production adapter) and uses it for persisted submit/start/complete/retry timestamps plus claim/heartbeat/complete/cancel lease times. Explicit timestamps remain injectable for deterministic fencing/recovery tests. The Research Automation bootstrap provides the clock adapter, and claim no longer constructs a wall-clock `Date` at the HTTP route boundary. Invalid clock values fail closed; `claim` retains its stable invalid-parameter error.

This closes the coordinator's direct system-clock reads and supports deterministic queue recovery behavior. It does not implement the missing experiment-to-round workflow, Stage/TestRun budget orchestration, real RD-Agent dispatch, or Paper continuity listed in W7.

## Verification

- Research Automation build: PASS.
- Research Automation lint: PASS.
- Research Automation unit suite: 34 files / 190 tests PASS, including the fixed-clock transitions, lease expiration/fencing, cancellation, retry history, and the existing loopback-only proxy suite.
- PostgreSQL integration suite: 4 files / 26 tests PASS against a newly created `research_automation_test` PostgreSQL in a separate temporary Docker Compose project. A fresh random password and loopback-only host port were used; the exact project, container, network, and temporary data volume were removed. Post-run Docker label queries found no remaining container or network for that project.

## Retained non-passing attempts and limits

- A first ordinary-sandbox unit attempt was blocked by loopback `listen EPERM`; it also exposed an error-message compatibility assertion, which was corrected before the passing rerun.
- An integration invocation without `RESEARCH_AUTOMATION_DATABASE_URL` skipped the 26 tests; it is not counted as PASS.
- The first temporary PostgreSQL harness used an internal-only bridge whose published host port was unreachable from host Vitest (`ECONNREFUSED`); no assertions ran. The harness was corrected to use a dedicated project bridge and loopback-only published port, after which all 26 integration tests passed. Both temporary projects were cleaned.

No external Provider or market endpoint was contacted; no active database/service was used or restarted. W7 remains incomplete pending real business workflow, budget/round orchestration, runner recovery and supplier-cost reconciliation, plus the broader isolation/capacity and Web acceptance work.
