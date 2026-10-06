# W9 legacy PostgreSQL volume search

Date: 2026-10-06 (Asia/Shanghai)

## Result

Inspected the unattached Docker volume `stock-analysis-infra_postgres-data` (created 2026-08-28, Compose project `stock-analysis-infra`) as a possible source for the 13 V1/V2 TestRun UUIDs still missing structured exports. The source was mounted read-only into a utility container and copied to `/private/tmp/stockquant-stock-analysis-postgres-copy-20261006`. The 2.1 GB copy was started as an isolated PostgreSQL 17.11 server with `--network none`, TCP listening disabled, and Unix-socket-only access.

The copy contains 13 application databases. A read-only catalog query in each database found zero tables whose names match `%testrun%`, `%test_run%`, or `%acceptance%`. This volume is not a recoverable source for the missing acceptance runs. No TestRun payload or user records were queried.

An initial attempt to inspect all Docker volume metadata in one CLI request returned `404 page not found`; a smaller batch of the first ten volumes succeeded. At that point the full inventory was still outstanding. The follow-up below completed the metadata inventory and exact UUID search across every anonymous PostgreSQL volume found.

Follow-up completed the metadata inventory for all 51 local volumes using xargs batches. It identified 39 anonymous volumes: 38 PostgreSQL 16 clusters and one non-PostgreSQL volume. The 38 clusters were mounted read-only into a network-disabled PostgreSQL utility container; `pg_controldata` recorded each cluster's system ID and last control-file update. Each cluster was then copied to the utility container's temporary filesystem and queried on a private Unix socket with TCP disabled. Across 114 non-template databases, none had any of the application tables used for run recovery (`public.acceptance_stage_runs`, `public.test_runs`, or `public.acceptance_records`), and none of the 13 missing UUIDs matched. No user assertions, notes, account facts, or unrelated rows were selected. The first pass produced an empty output because it did not emit per-cluster no-match summaries; that inadequate output is retained and the scan was rerun with explicit counts.

Current version gates after the search (2026-10-06): V1 `INCOMPLETE` / exit 2, 7 missing structured exports among 10 audited IDs; V2 `INCOMPLETE` / exit 2, 6 missing among 11; V3 `INCOMPLETE` / exit 2, with zero formal TestRun IDs. Evidence-reference and stage-document audits pass for all three versions. The full `pnpm baseline:check` also exits 0. Raw gates are retained as `version-v1.log`, `version-v2.log`, and `version-v3.log`.

A repository-wide search that includes ignored and untracked files (excluding `.git` and `node_modules`) found no database dump or backup archive. Matches were SQL source/migration files, two prior read-only audit queries, and a third-party sample ZIP under `.uv-cache`; no extra TestRun export archive was identified. Exact output is retained in `project-backup-file-search.txt`.

The first attempt to start the copy with PostgreSQL 16.9 failed because its files are PostgreSQL 17 format. This failure did not touch the source volume. The correct PostgreSQL 17.11 image then started successfully; both outcomes are retained in `postgres17-log.txt` and `initial-pg16-failure.txt`.

## Isolation and cleanup

- Source volume was never attached to a PostgreSQL process; it was mounted read-only only for copying.
- The temporary copy was the only database directory started, with no network and no TCP listener.
- The temporary container and copy directory were removed after the catalog queries.
- The active V1.2 service set was not restarted or changed. `attached-containers.txt` confirms the source volume had no container attached when inspected.
- The V1.1 historical volume and the current V1.2 Postgres volume were not queried or modified during this audit.

## Evidence files

- `volume-inspect.json`: source volume identity and creation metadata.
- `attached-containers.txt`: containers attached to the source volume.
- `databases.txt`: database names in the isolated copy.
- `relevant-table-counts.txt`: matching catalog-table count per database (all zero).
- `postgres17-log.txt`: isolated PostgreSQL 17.11 startup log.
- `initial-pg16-failure.txt`: retained version-mismatch failure.
- `volume-inventory-batch-failure.txt`: retained Docker metadata batch failure and its zsh argument-splitting cause; the later xargs inventory succeeded.
- `volume-inventory/`: complete 51-volume metadata inventory, container mount inventory, anonymous-volume type/control metadata, exact UUID scanner and its 38-cluster result.
- `volume-inventory/exact-testrun-scan-empty-attempt.tsv`: retained initial inadequate empty scan output.
- `exact-run-scan-empty-attempt.txt`: explains why that first output was insufficient and how the corrected run records every cluster.
- `manifest-refresh-failure.txt`: retained checksum failure caused by changing the plan before refreshing dependent manifests.
- `gate-output-extraction-failure.txt`: retained a post-command JSON extraction failure; the gate logs themselves contain the full results and were parsed successfully in a separate pass.

This narrows one local archive lead but does not resolve any missing TestRun export or change V1/V2 acceptance status.
