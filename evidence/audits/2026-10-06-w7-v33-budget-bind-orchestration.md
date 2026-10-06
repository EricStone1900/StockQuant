# W7 V3.3 frozen-scenario TestRun budget binding orchestration (2026-10-06)

## Change

When Platform creates a V3.3 scenario TestRun, it first calls the Research Automation Platform-only cap endpoint with the frozen scenario budget: normal 100 cents, rejection 50 cents, recovery 100 cents. Platform validates the response schema, exact TestRun UUID, exact cap and `CONFIGURED` status before persisting the WAITING TestRun. The immutable binding response is saved in the same TestRun evidence as `workflowStep=TEST_RUN_BUDGET_BOUND`. An upstream error or mismatched response fails the request before Platform writes the StageRun.

This is one real orchestration step, not completion of the V3.3 business workflow. No Experiment or Runner Job is created; no Provider, market-data, Paper or Broker call occurs. The three scenario records remain WAITING and their business assertions remain NOT_RUN.

## Verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v33-runner-queue.spec.ts` — 15/15 PASS, including all three frozen caps and fail-closed persistence behavior.
- `node --test scripts/v33-readiness-cli.test.mjs` — 1/1 PASS; normal, rejection and recovery retain the cap in their created TestRun, and `--check-only` reads the same TestRun without mutation.
- `pnpm --filter @stockquant/platform-api-service typecheck` — PASS.
- `pnpm test:e2e -- --stage V3.3` — 3/3 PASS; the recovery scenario page presents the persisted same-TestRun budget cap while remaining readiness-only.
- `pnpm verify:stage -- --stage V3.3 --suite code` — PASS. Baseline/contracts passed (236 JSON files, 163 schemas, 41 fixtures; 4,052 local Markdown links, zero failures); Research Automation 217 unit and 30 isolated PostgreSQL tests passed; Platform 188 unit and 8 PostgreSQL tests passed; Web E2E 3/3 passed; 66,100-row budget pagination probe and isolated two-round Runner checkpoint takeover passed. Raw output: [full code-suite log](2026-10-06-w7-v33-budget-bind-orchestration-code-suite.log).

The first CLI test attempt in the default sandbox failed because loopback bind returned `EPERM`; that failure is present in the session output and was not counted. The isolated test was rerun with local loopback permission and passed. No active application service was modified.

## Remaining scope

`businessWorkflow` remains `NOT_IMPLEMENTED`; this change only initializes the immutable TestRun cap. Experiment creation, round dispatch/settlement, the persisted over-cap rejection scenario, end-to-end recovery assertions, independent Web/CLI recomputation/export, concurrent Paper continuity, provider invoice reconciliation, Ubuntu observations, stage acceptance and human acceptance remain incomplete or NOT_RUN. No delivery checkbox or acceptance signature is changed by this audit.

Source and evidence SHA-256 values are in [the manifest](2026-10-06-w7-v33-budget-bind-orchestration.sha256).
