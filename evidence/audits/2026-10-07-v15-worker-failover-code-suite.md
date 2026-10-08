# V1.5 code suite after single-worker failover E2E

Date: 2026-10-07. `pnpm verify:stage -- --stage V1.5 --suite code` exited **0**. Platform API passed 55 test files / 241 tests; the locked Python Worker suite passed 14 tests. The complete captured output is [the raw log](./2026-10-07-v15-worker-failover-code-suite.log); the machine record lists source hashes and the log SHA-256.

This validates the code-suite gate after adding the isolated single-worker failover scenario. It does not close V1.5 business Workflow, UNKNOWN, trading/day-end, full-V1 backup, Ubuntu or human-acceptance requirements.

[Machine record](./2026-10-07-v15-worker-failover-code-suite.json).
