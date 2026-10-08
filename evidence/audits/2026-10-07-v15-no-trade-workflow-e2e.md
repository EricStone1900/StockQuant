# V1.5 NO_TRADE Temporal Web/API/CLI E2E

Date: 2026-10-07. Isolated project: `sq-v15-e2e-c6da10b7e980bc5a5834`.

`pnpm test:e2e -- --stage V1.5` exited 0. Playwright passed 1/1 in 3.1 seconds after the isolated stack was ready. The normal TestRun `9e08dadd-c56f-422b-b7e6-aa3250b2d065` completed the Temporal workflow, checked 60 frozen local sessions for each market, and produced 120 authoritative Portfolio/FakeBroker observations. `V1.5-HOLD-002` passed; automatic trading remained `WAITING`. Same-run `--check-only` returned the expected exit 2/WAITING and evidence export exited 0.

Separate rejection and recovery TestRuns (`b0e2f24e-1977-42c1-8d15-3fc381aa2eed`, `37619e69-5c30-4571-8ba9-8ea4f8c5ead1`) correctly remained `NOT_CONNECTED`/`NOT_RUN`; each same-run CLI check returned 2/WAITING and export returned 0. They are harness/API/CLI/export checks, not business rejection or recovery acceptance.

The first attempts timed out because the test tried to read a TestRun element before any run existed. The test now checks the element count before reading it. It also bounds status fetch, CLI and export operations. Read-only date checks run in batches of at most eight; the 120-date assertions are unchanged. The containerized Web Dockerfile now uses the repository's existing BuildKit pnpm store cache to avoid repeatedly fetching the same locked dependency set.

The harness confirmed zero external-source and real-broker calls and removed all containers, volumes, network and project images. Per-run exported files were written under the harness's temporary output root and removed during cleanup; the durable run facts and outputs are summarized in the adjacent JSON record. The raw sanitized harness log is in the adjacent `.txt` file. Manual acceptance remains `NOT_RUN`.

## Verification

- `pnpm --filter @stockquant/platform-api-service typecheck`: exit 0.
- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v15-orchestration.spec.ts`: 7/7 passed.
- `pnpm --filter @stockquant/web typecheck`: exit 0.
- `pnpm fixtures:check`: 33 fixture files, 0 failures.
- `pnpm test:e2e -- --stage V1.5`: exit 0; isolated Web/API/CLI/export E2E 1/1.
- `pnpm verify:stage -- --stage V1.5 --suite code`: exit 0 on the current code tree.
- `pnpm docs:check`: 4,974 Markdown links, 0 failures.

This does not close V1.5 or V1. It does not verify rejection/recovery business paths, NATS-driven dispatch, double-worker behavior, restart recovery, UNKNOWN order handling, backup restore, Ubuntu operation, the outstanding historical TestRun exports, or human sign-off.

The same-tree V1 version gate exited 2/`INCOMPLETE`; its current result is summarized in [`V1 gate after NO_TRADE`](./2026-10-07-v1-plan-gate-after-v15-hold.json). Stage-document and active evidence Hash audits passed, while the seven historical structured exports and other version gates remain open.
