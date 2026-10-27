# V1.2 current-tree stage rerun A02 — 2026-10-12

## Result

- `pnpm test:e2e -- --stage V1.2`: exit 0. The isolated browser/API/CLI scenario matrix passed 1/1 and produced four TestRuns: normal `d9ee2c8b-356e-41f9-a53b-70c291c10623`, rejection `1bd3e48a-b73f-41d2-950f-ee5e14d92720`, recovery-probe `f378bbf0-0fe5-48d3-bfc9-6167456a6744`, and Platform restart recovery `b6e4ec6e-3dce-4d52-90c8-54b90f9aa412`.
- `pnpm verify:stage -- --stage V1.2 --suite code`: exit 0 on the same worktree. This full suite included baseline/doc/crosswalk/contract/fixture checks, service and isolated PostgreSQL checks, locked Qlib 0.9.6 CPU fit smoke, and the isolated V1.2 Web/API/CLI matrix.
- Normal Run produced CN_A 85 and US_EQUITY 27 held-out predictions; both TOPK and NO_TRADE strategy snapshots were received by Governance. The Run completed four independent assertions and same-Run CLI check. The other three scenarios and recovery outcomes passed their expected assertions.
- Acceptance API boundary check rejected anonymous and forged-owner access on all 11 routes; all four client-supplied environment/broker mode combinations were rejected without creating a TestRun.
- Randomly named Compose projects, PostgreSQL and Artifact volumes, and networks were removed and verified by the harness. No external market-source or broker calls were made. No LIVE execution occurred.

## Machine evidence

- The isolated E2E harness wrote the normal/rejection/recovery-probe report and its input/source hashes to [machine report](2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-57d76cad84e64562fbf3.json) and [manifest](2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-57d76cad84e64562fbf3.sha256).
- The full code-suite command returned exit 0 in the controlled execution. Its console transcript was not captured to a separate raw log in this run; the report here records the observed command and outcome, and does not claim to be a raw transcript.
- A first E2E invocation in the restricted shell could not reach Docker and exited before tests began. The same command was then run with controlled Docker access; its isolated harness completed and cleaned its own project successfully.

## Acceptance boundary

These are current-tree automated results only. Human acceptance remains `NOT_RUN`; the V1.2 historical TestRun `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4` still lacks its original structured export. This does not establish model independent validity, real exchange calendars, Ubuntu execution, active storage recovery, or V1 completion.
