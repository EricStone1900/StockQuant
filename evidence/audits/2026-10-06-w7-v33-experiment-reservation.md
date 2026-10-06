# W7 V3.3 TestRun-bound Fixture Experiment reservation (2026-10-06)

## Change

Platform now exposes an owner-scoped, explicitly confirmed Experiment reservation step for V3.3 `normal` and `recovery` runs. It requires a prior immutable TestRun cap, transitions the StageRun from WAITING to RUNNING before the upstream operation, and uses a stable TestRun/scenario idempotency key so an HTTP retry safely replays the same Experiment. Platform creates the frozen Fixture Experiment (two rounds, USD 80 cents, FIXTURE model profile, RESEARCH/FAKE modes), strictly validates the returned identity and RESERVED budget, then persists `EXPERIMENT_RESERVED` and returns the run to WAITING. This step creates no Runner Job and calls no model.

The Web exposes this as a separate explicit-confirmation button. CLI supports `--reserve-experiment`; `--check-only` remains read-only. Readiness cancellation now rejects a TestRun after an Experiment reservation so it cannot orphan a held budget.

## Verification

- Platform V3.3 controller and readiness-cancellation unit tests — 24/24 PASS.
- V3.3 scenario CLI — 1/1 PASS, including normal/rejection/recovery caps, explicit Experiment reservation, same TestRun readback, and check-only.
- Platform and Web typechecks — PASS.
- V3.3 Web E2E — 3/3 PASS, including the explicit two-round Experiment reservation and unchanged zero-Runner state.
- OpenAPI validation — PASS; platform V3.3 contract has 24 operations. `pnpm contracts:check` — PASS (165 schemas, 41 fixtures).
- Full `pnpm verify:stage -- --stage V3.3 --suite code` — PASS: Research Automation 217 unit/30 isolated PostgreSQL tests, Platform 191 unit/8 PostgreSQL tests, Web E2E 3/3, 66,100-row budget pagination probe and isolated two-round Runner recovery. Summary remains `businessWorkflow=NOT_IMPLEMENTED`, `workflowProgress=TEST_RUN_BUDGET_AND_EXPERIMENT_RESERVATION`, `businessValidation=NOT_RUN`, `humanAcceptance=NOT_RUN`. See [successful full-suite log](2026-10-06-w7-v33-experiment-reservation-code-suite-rerun.log).

The first full-suite attempt failed one Platform cancellation integration fixture because it predated the `workflowStep=TEST_RUN_BUDGET_BOUND` readiness contract. The fixture was corrected; the focused Platform PostgreSQL integration passed 8/8 and the complete suite passed on rerun. Both suite logs are retained: [initial run](2026-10-06-w7-v33-experiment-reservation-code-suite.log) and [successful rerun](2026-10-06-w7-v33-experiment-reservation-code-suite-rerun.log).

## Remaining scope

This completes only TestRun cap binding and Experiment reservation. The `rejection` workflow with existing settled/reserved commitments, Experiment-over-cap no-mutation assertion, Runner Job creation and two-round Fixture dispatch/settlement, checkpoint recovery under the same TestRun, independent Web/CLI assertion recomputation and result export, measured Paper continuity, real provider cost reconciliation, Ubuntu observations, and human acceptance remain incomplete or NOT_RUN. V3.3 remains unaccepted.

Source and evidence SHA-256 values are listed in [the manifest](2026-10-06-w7-v33-experiment-reservation.sha256).
