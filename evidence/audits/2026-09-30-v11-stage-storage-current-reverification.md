# V1.1 isolated stage-storage current-worktree reverification

Date: 2026-09-30. The first escalated Docker run reached the disposable Compose stack but PostgreSQL exited because the test Compose omitted nine variables required by the shared `postgres-init.sql`. That failure is retained. The test harness now generates nine independent random 32-byte role passwords per isolated project, passes them only to its disposable PostgreSQL, and removes/checks the exact project’s containers, volume, network, and two app image tags.

Two complete reruns passed. Each performed the V1.1 full code suite and Chromium normal/rejection/recovery 3/3; each browser TestRun was checked through CLI `--check-only` using the same ID. Recovery verified the exact isolated Portfolio container before restarting it. Final project: `sq-v11-stage-016bd4e4b840102e4092`. All of its exact temporary resources were removed and checked. The preceding successful run’s two unique app tags were also removed after inspection.

No active Compose project, service, shared volume, market source, broker, order, or active API was touched. This proves isolated stage-mode storage and recovery only; active API cutover/rollback and new-scope user acceptance remain NOT_RUN.
