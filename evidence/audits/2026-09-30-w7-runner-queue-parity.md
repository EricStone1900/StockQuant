# W7 Runner Queue Adapter Parity — 2026-09-30

## Change

The in-memory `RunnerJobStore` now follows the production PostgreSQL queue's frozen capacity of one active lease across TestRuns and orders eligible claims by `submittedAt, jobId`. `RunnerJobCoordinator.claim` now rejects blank workers, invalid dates, and non-positive/non-integer lease durations before either adapter is called.

This prevents unit-level queue tests from claiming support for parallel execution that the production adapter does not provide, and keeps expired-lease recovery subject to the same capacity and ordering rules.

## Verification

- `pnpm --filter @stockquant/research-automation-service test -- tests/unit/v31-runner-jobs.spec.ts` — 26 files, 154 tests passed (the package script runs the full unit suite).
- `pnpm --filter @stockquant/research-automation-service lint` — passed.
- `pnpm --filter @stockquant/research-automation-service build` — passed.
- `git diff --check` on the changed source/tests — passed.

New tests verify single-lease capacity across worker IDs, FIFO ordering with a stable tie-break, release of capacity after completion, and invalid claim arguments.

## Scope

This is an adapter-parity fix only. It does not implement V3.3 experiment dispatch, checkpoints, round summaries, a full budget control plane, research/Paper coexistence tests, or real model/provider calls. V3.1/V3.2 prerequisites and V3.3 acceptance remain open; no activity was dispatched and no active service was changed.
