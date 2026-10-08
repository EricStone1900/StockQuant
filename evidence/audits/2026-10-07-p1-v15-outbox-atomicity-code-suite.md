# P1 V1.5 durable TestRun and Outbox atomicity audit

Date: 2026-10-07 (Asia/Shanghai)
Git HEAD at execution: `c0f6745fa4a8615bfc4913431e73ce3b8b01fab8` (working tree changes are represented by the adjacent SHA-256 manifest).

## Result

`pnpm verify:stage -- --stage V1.5 --suite code` exited 0 after adding a real PostgreSQL TestRun/Outbox integration check to the shared V1.5 code suite. The suite ran the common baseline, workspace build, lint, typecheck, unit tests, Portfolio/Trade/Market Data database and HTTP checks, contract checks, Python adapter checks, ops checks, and the new Platform Outbox transaction test. Platform unit tests reported 59 files and 261 tests; the new isolated Platform PostgreSQL test reported 2/2 tests.

The new integration test proves that a valid V1.5 normal TestRun and its stable Outbox event commit together. It injects an Outbox insert constraint failure after the TestRun insert and confirms PostgreSQL contains neither row after rollback. Its one-shot PostgreSQL container and network were removed and verified. Active services were not connected. LIVE remained disabled and broker mode remained FakeBroker.

## Limits

This closes the current V1.5 normal-path TestRun/Outbox transaction proof and makes the V1.5 `--suite code` run the real shared quality and component checks. It does not complete V1 business workflows, all-stage Artifact lifecycle/fencing, active storage cutover, historical missing-run recovery, Ubuntu acceptance or human acceptance. Human acceptance remains NOT_RUN.

The first integration attempt failed during test setup because its injected constraint also matched the preceding successful test row; no business assertion ran in that attempt. The correction and evidence are recorded in [the first-attempt note](./2026-10-07-p1-v15-outbox-atomicity-first-attempt-failure.md).

Full terminal output: [V1.5 code suite log](./2026-10-07-p1-v15-atomic-outbox-code-suite.log).
