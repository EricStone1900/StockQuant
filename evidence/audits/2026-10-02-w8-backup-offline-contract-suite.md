# W8 offline paired-backup contract suite

Date: 2026-10-02 (Asia/Shanghai)

Ran four repository backup suites without Docker capture, stopping writers, touching the active database, or modifying a backup root:

- `pnpm test:paired-backup`: 5/5 passed, including paired database/Artifact manifest commit ordering, mandatory restore evidence, fail-closed partial capture, source shape and backup-root checks.
- `pnpm test:cluster-paired-backup`: 5/5 passed, including database/role inventory drift, credential-field rejection and isolated-restore evidence validation.
- `pnpm test:backup-retention`: 3/3 passed, including preview-first verified archive pruning and unsafe-root refusal.
- `pnpm test:backup-scheduled`: 8/8 passed, including exact-pair quiescence/resume hooks, secure lock/hook permissions, failed-quiesce cleanup and SIGTERM recovery.

All 21 tests passed. These are local contract tests. They do not prove that the systemd unit works on Ubuntu, that hooks safely control the actual deployment, or that a real backup can be restored. No backup was produced, no timer was installed/enabled, no writer was stopped, and no active service or volume was changed. The production backup CLI remains intentionally gated on explicit quiescence of the exact database and Artifact volume.

W8/V3.4 and the Ubuntu acceptance remain NOT_RUN. Continue with target-host unit verification, controlled production-pair backup, isolated restore, RPO/RTO measurement and the required Ubuntu observation only on the actual authorized Ubuntu host and maintenance window.
