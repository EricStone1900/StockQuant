# V1.5 code suite after PostgreSQL process recovery changes

`pnpm verify:stage -- --stage V1.5 --suite code` exited 0 on the current worktree. Platform passed 55 files/241 tests and the Python Worker passed 14/14. Documentation links (5,094), contract/fixture checks, builds, type checks and the required service tests passed.

The suite includes the PostgreSQL pool error handlers and bounded NO_TRADE Activity retry. The actual process stop/restart behavior is independently recorded in [the PostgreSQL outage E2E](./2026-10-07-v15-database-outage-e2e.md). This code suite does not close trading/day-end, UNKNOWN, backup/restore, target Ubuntu or user acceptance. Full log: [log](./2026-10-07-v15-postgres-process-recovery-code-suite.log); machine report and source hashes: [JSON](./2026-10-07-v15-postgres-process-recovery-code-suite.json).
