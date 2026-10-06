# W8 active-cluster backup safety gap

Date: 2026-09-30 (Asia/Shanghai)

## Initial finding

The active PostgreSQL cluster was previously inventoried read-only and contains 48 databases: nine service databases, five service test databases, and 34 isolated or historical databases. All remain in scope for preservation until an owner-approved retention decision says otherwise.

At initial inspection, `scripts/create-paired-backup.mjs` required one `STOCKQUANT_BACKUP_DATABASE` and ran `pg_dump` for only that database. A backup selecting `postgres` therefore omitted the other 47 databases and cluster-wide roles. Its restore verifier wrote to the active Compose PostgreSQL service. Those behaviors were unsafe for the formal cluster backup.

The old single-database command has since been reduced to a fail-closed stub and `pnpm backup:create` now routes to the cluster.v2 producer. Historical single-database backup evidence remains valid only for its stated test database; it does not prove full-cluster protection or safe restore isolation.

## Required implementation before W8 backup acceptance

1. Add a versioned cluster backup format that captures every database and required global role definitions, while excluding password hashes/secrets from the exported role data. Record and compare the complete database-name inventory around capture; any drift or mismatch fails closed.
2. Preserve a separate Artifact volume snapshot with a complete file inventory, byte lengths and SHA-256 values.
3. Restore only into a disposable PostgreSQL container with a dedicated temporary data directory, no published ports, `--network none`, no active Compose project or production volume, and a temporary bootstrap identity. Mount backup inputs read-only; confine extracted artifacts to a fresh temporary directory.
4. Verify every database can be restored and queried, the restored database-name set matches the manifest, global role names/attributes are present without password material, every Artifact file matches its hash, and all published ArtifactRefs in `research_automation` resolve to matching files/hashes.
5. Add failure-path tests proving the verifier cannot target the configured active Compose project/volume and cleans only its exact disposable resources. Exercise the implementation with synthetic isolated data before any production backup.
6. Only after the isolated end-to-end test passes, schedule a separately authorized maintenance window, quiesce all writers/publishers, capture and independently copy the backup, perform restore/RPO/RTO evidence, and resume the exact prior services.

## Evidence and boundary

The implementation was inspected read-only. This audit did not invoke the backup CLI, create a restore database, stop a writer, access secret values, alter a container, or touch any volume. Active services and their data remain unchanged. The maintenance package and W8 plan now explicitly block use of the existing single-database tool for formal maintenance.

Verification after the documentation correction: `pnpm docs:check` passed (1,006 local Markdown links, zero failures); `git diff --check` passed; `pnpm test:paired-backup` passed 5/5, `pnpm test:backup-retention` passed 3/3, and `pnpm test:backup-scheduled` passed 8/8. These tests cover the existing single-database manifest/retention/scheduler contracts. They do not prove full-cluster coverage or isolated restore, which is why the W8 backup checkbox remains open.

Follow-up implementation and isolated test (2026-09-30 09:24Z): the v2 producer now captures `pg_dumpall --no-role-passwords`, checks all non-template DB names and global role attributes before/after capture, pairs the artifact volume snapshot, and performs restore only in a uniquely named PostgreSQL container. A real E2E smoke used a separate random Compose project with two synthetic databases (`postgres`, `research_automation`), one synthetic `PUBLISHED` ArtifactRef and one matching file. Restore checked both database names, ran read-only identity queries in each database, verified global role attributes and zero role password hashes, the file SHA-256, and the ArtifactRef hash; result PASS. The restore container used `NetworkMode=none`, no Compose labels, no Docker volume mounts or published ports, and only three tmpfs paths. The unique source project and its two volumes were removed by its exact project-scoped cleanup; a subsequent read-only Docker inventory found no `sq-cluster-restore-*` or `sq-backup-smoke-*` containers/volumes. The active 48-database deployment was not connected to or changed. Full details and output are in [the isolated cluster backup smoke audit](./2026-09-30-w8-cluster-backup-smoke.md).

Content hashes for this audit and the updated W8 plan/maintenance package are recorded in [the content manifest](./2026-09-30-w8-backup-safety-gap-content-manifest.sha256).

Sources: [W8 maintenance package](../../docs/operations/2026-09-30-w8-maintenance-package.md), `scripts/create-paired-backup.mjs`, `scripts/paired-backup.mjs`, active read-only DB inventory from the 2026-09-30 maintenance review, and [PostgreSQL 16 pg_dumpall documentation](https://www.postgresql.org/docs/16/app-pg-dumpall.html).
