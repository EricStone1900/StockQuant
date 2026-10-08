# V1.5 code suite after PostgreSQL session recovery work

Date: 2026-10-07 (Asia/Shanghai). `pnpm verify:stage -- --stage V1.5 --suite code` exited 0 on the current worktree. Platform passed 55 files/241 tests and Python Worker passed 14/14; the required contract, fixture, build, type and service checks also passed. Full log: [here](./2026-10-07-v15-database-recovery-code-suite.log), SHA-256 `d5128e8601587bf4aa28a96325a4ac413e08ba355c9fc229c0cddbb6cf4c7220`.

The suite validates code after the Platform PostgreSQL idle-client handling and dispatch-retry changes. The separate [PostgreSQL backend-session recovery E2E](./2026-10-07-v15-database-connection-drop-e2e.md) terminated three Platform sessions and verified same-Run recovery; a full PostgreSQL server outage, multiworker, trading/day-end, backup/restore, Ubuntu and human acceptance remain open. Machine details and source hashes: [JSON](./2026-10-07-v15-database-recovery-code-suite.json).
