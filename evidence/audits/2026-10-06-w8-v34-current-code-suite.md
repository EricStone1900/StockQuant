# W8 V3.4 current-worktree code preflight

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V3.4 --suite code` passed with wrapper exit code 0. The full transcript is [the suite log](./2026-10-06-w8-v34-current-code-suite.log), which records stage `status=PASS`. The suite ran the repository baseline, build, lint, typecheck and unit tests, including the V3.4 preparation checks and four Ubuntu-host-preflight rule tests.

The result explicitly reports `ubuntuHostValidation=NOT_RUN`, `ubuntuValidation=NOT_RUN`, `fullStageE2E=NOT_IMPLEMENTED`, `v34BusinessWorkflow=NOT_IMPLEMENTED`, `paperObservation=NOT_RUN` and `humanAcceptance=NOT_RUN`. The test that macOS/emulated targets remain blocked is a rule test, not a measurement from an Ubuntu target machine. No migration or active-service change occurred.

The initial ordinary-sandbox attempt was stopped by loopback `EPERM` in the Qlib Worker test. The same complete code suite passed with controlled loopback permissions; that failure remains part of the execution history.
