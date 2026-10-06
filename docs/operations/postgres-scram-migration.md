# PostgreSQL SCRAM migration runbook

Status: **PREPARED / NOT EXECUTED**. This runbook describes the current local Compose installation. It is not permission to restart services or modify a database. Run it only in a reviewed maintenance window after a paired PostgreSQL/Artifact backup has been restored and verified in an isolated stack.

## Current installation recorded on 2026-09-30

The active database container is `stockquant-v12-postgres-1`, running `postgres:16.9-alpine` image ID `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`, with named volume `stockquant-v12_postgres-v11` mounted at `/var/lib/postgresql/data`. Read-only inspection confirmed broad host `trust` rules and `UNSET` passwords for all eight application roles and `trade_execution_test`. PostgreSQL was healthy. Do not delete or recreate this volume.

At the same inspection, the old Platform container was running image ID `sha256:2d3b6d1c18fd2b190adbad5491ca00e8c09fdc0a87f682f5e96857ef3ad05709` but unhealthy; its health check returned 503 `required dependency is unavailable`. PostgreSQL `SELECT 1` and Portfolio, Trade Execution, and Historical Replay `/ready` checks succeeded. The active Platform container lacked a configured 32-character platform service Bearer token. Do not restart it as a shortcut: current Compose defaults and token configuration are not deployed there.

## Preconditions

1. Name the exact Compose project, PostgreSQL container, volume, application containers, and Artifact volume. Compare them with the recorded inventory above; stop if identity differs.
2. Resolve the unhealthy Platform service and record authenticated scheduler status as `STOPPED`. Verify no UNKNOWN order, unsettled fill, active writer, Artifact publisher, or Runner task remains. Do not infer safety from `/ready` alone.
3. Prepare an ignored `.env.local` containing distinct 32-byte hex values for `STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD` and each `STOCKQUANT_DATABASE_PASSWORD_*` role in `.env.example`. Also resolve every service Bearer required by OD-004; the current Platform container is missing its platform service token, so fill the matching caller/verifier references and prove readiness before host-auth cutover. Never put values in shell history, Git, screenshots, logs, or evidence. Keep a recovery copy in the approved secret store.
4. Pause all database writers, scheduled collection, Paper, experiment publication, and Runner publication. Create a cluster.v2 paired backup with `pnpm backup:create` and verify its manifest. Its restore verifier must use the tool-managed disposable PostgreSQL container (`network=none`, no ports, no Compose labels/volumes, tmpfs only), then compare the complete DB/role inventory and every ArtifactRef/file hash. Do not restore into any Compose project or the active cluster. The synthetic isolated E2E passed; no active-cluster backup or restore has been performed yet.
5. Freeze the exact Postgres/container versions, schema state, current `pg_hba.conf` copy/hash, app image IDs, secret references, expected service list, maintenance start/end, and rollback owner in the change record.

## Migration sequence

1. Keep the existing database and volume. Do not run `down -v`, remove a volume, or let init SQL recreate databases.
2. Use the local socket as the current `postgres` administrator. For each existing role (`platform_api`, `portfolio_risk`, `trade_execution`, `trade_execution_test`, `historical_replay`, `decision_governance`, `quant_research`, `research_automation`, `market_data`), set the matching unique password from the approved secret store using interactive `psql \password role_name`. This avoids putting secrets in SQL history. Verify only the stored password classification (`SCRAM-SHA-256`), never the hash itself.
3. Update the Compose environment from the new `.env.local`; first recreate the named application containers while the old host `trust` rule is still in place. This lets each application open a fresh connection using its new password without changing the database access policy yet. Keep Paper auto-start and all collection source gates disabled. Check `/ready` for every service and verify Platform's scheduler remains stopped.
4. Replace broad host `trust` rules in `pg_hba.conf` with a first-match `host all all all scram-sha-256` rule. Retain the required local-socket administrator rule and any explicitly approved replication rule using SCRAM; remove earlier IPv4/IPv6 loopback `trust` rules so they cannot shadow the SCRAM rule. Preserve the original file and its ownership/mode. Reload PostgreSQL, then establish fresh TCP connections with each application identity and confirm all succeed; separately prove a missing and an incorrect password fail. Confirm effective `pg_hba_file_rules` order and that all nine passwords classify as SCRAM.
5. Resume the writer set one service at a time. Reconcile orders, fills, Portfolio reservations/ledger, collection leases/outbox, and Artifact references against the pre-change snapshot. Capture health, resource, error, and completion evidence.

## Stop and rollback

Stop immediately on a failed backup/hash, unexpected active work, identity mismatch, DB/Artifact divergence, service readiness failure, wrong `pg_hba` match order, failed SCRAM probe, or reconciliation mismatch. Keep writers paused. Restore the saved `pg_hba.conf` and reload PostgreSQL to return host access to the prior policy; the new role passwords may remain and the updated DSNs continue to work under `trust`. If data changed or consistency cannot be established, restore the paired DB/Artifact backup into a separate isolated volume first; never overwrite the only source volume to make a test green. Record the rollback and retain all failed evidence.

Do not count the current `trust` volume as migrated. Only a successful maintenance execution plus isolated paired restore, live SCRAM proof, service recovery, and RPO/RTO measurements can close the existing-volume portion of W8.
