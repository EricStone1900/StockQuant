# W2/V2.4 current-worktree full regression — 2026-10-03

`pnpm verify:stage -- --stage V2.4 --suite code` exited 0 on the current worktree. The full repository baseline/build/lint/typecheck/unit/contract, isolated PostgreSQL/HTTP, Python adapter and operations checks passed. The V2.4 Paper suite passed all four API Fixture scenarios (`normal`, `rejection`, `recovery`, `external-reconciliation`) and their same-TestRun CLI checks; the four Web TestRuns also exited 0. The injected lost-accept response was recovered by querying the original order. P-F05 event-order/fill/cancel paths remained covered by isolated tests.

Readiness ran in an internal-only linux/arm64 container and remained fail-closed: LIVE trading and order submission disabled, FakeBroker orders/fills/events/outbox all zero. The 13 pre-existing active services remained untouched; post-run inventory found no temporary V2.4 container. No real broker or market-data Provider was called.

This confirms current-source engineering/Fixture regression only. It does not constitute source authorization, continuous Paper observation, V2.4 user acceptance, Ubuntu validation, or human sign-off.

- Full output: [2026-10-03-w2-v24-current-worktree-rerun.log](./2026-10-03-w2-v24-current-worktree-rerun.log), SHA-256 `3c6f9f594e4b9edac8f379d8dd8661fbf31e9cf137fcebfa197574e353bf5963`.
- Machine summary: [2026-10-03-w2-v24-current-worktree-rerun.json](./2026-10-03-w2-v24-current-worktree-rerun.json).
- Current source hashes: [2026-10-03-w2-v24-current-worktree-rerun.sources.sha256](./2026-10-03-w2-v24-current-worktree-rerun.sources.sha256).
- Detailed isolated scenario report: [2026-10-02-v24-paper-smoke-cb44b288483b470f81f49b2a30c8c649.json](./2026-10-02-v24-paper-smoke-cb44b288483b470f81f49b2a30c8c649.json).
