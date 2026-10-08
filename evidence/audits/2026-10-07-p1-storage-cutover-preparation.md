# P1 active storage cutover preparation

Date: 2026-10-07 (Asia/Shanghai)
Status: `DRAFT_NOT_EXECUTABLE` — preparation record only; this document does not authorize or perform active service/database changes.

## Evidence already available

- Isolated PostgreSQL migration, legacy/stage dual-write, conflict rollback, owner-scoped reads, HTTP evidence access and failure atomicity passed. See [V1.1 storage persistence rerun](2026-10-07-v11-storage-persistence-rerun.md) and [full command log](2026-10-07-v11-storage-persistence-rerun.log).
- The harness reported `activeServices=NOT_CONNECTED` and removed only its random test container/network. This is isolated test evidence; no activity database snapshot or production-like restore was used.
- The V1.5 paired-volume restore covered its PostgreSQL, NATS and Temporal volumes; it did not cover V1.1 legacy/stage storage migration or the Artifact volume. See [paired restore audit](2026-10-07-v15-paired-backup-restore-e2e.md).

## Required inputs before an executable maintenance runbook can be issued

| Required input | Current value | Required proof |
|---|---|---|
| Exact active database/service project and volume identities | `UNSET` | Read-only inventory; owner confirms identifiers |
| Fresh, paired backup covering DB and Artifact bytes | `NOT_RUN` | Backup manifest, restore validation, file inventory and SHA-256 |
| Isolated restore of that exact backup, followed by legacy-to-stage migration and rollback rehearsal | `NOT_RUN` | Before/after row counts, sampled business identities, owner/run visibility, constraints, hashes and rollback parity |
| Maintenance window and outage budget | `UNSET` | Explicit owner decision and scheduled interval |
| Writer pause/drain and resume operators | `UNSET` | Named responsible people and independently checked stop/start signals |
| Old `RUNNING`/`WAITING` Run disposition | `NOT_RUN` | Enumerated exact TestRun IDs with resume, cancel or hold decision; no implicit reset |
| Rollback owner, trigger and maximum decision time | `UNSET` | Named owner and objective rollback criteria |
| Post-cutover verification owner | `UNSET` | Same-Run reads, new-write smoke, cross-owner rejection, Artifact read and ledger reconciliation |

Any `UNSET` or `NOT_RUN` item blocks the activity switch. In particular, a successful isolated migration test is not an activity data restore rehearsal.

## Safe execution sequence after prerequisites are supplied

1. Capture read-only inventory of the exact active services, database, Artifact store, current schema revision, nonterminal TestRuns and active writer count. Save command output and hashes.
2. Pause new work through the approved application control, drain or explicitly disposition each existing nonterminal Run, then prove writer count is zero. Do not stop arbitrary containers or edit volumes by guessed names.
3. Create a paired DB+Artifact backup with the documented cluster backup command and explicit writer-quiesced confirmation for the exact cluster and Artifact volume. Verify the manifest and hashes before proceeding.
4. Restore that backup into a newly named isolated project with no production network/ports. Verify TestRun ownership and statuses, domain ledger invariants, all referenced Artifact bytes and hashes.
5. On the restored copy only, rehearse migration/cutover and rollback. Compare row counts and fixed owner/Run/business IDs before and after both paths. Preserve all failures.
6. Review the rehearsal evidence and complete every table input above. Then issue a separate, exact maintenance procedure with identifiers, timeouts, expected output and recovery steps.
7. Execute only within the approved window and exact scope. Stop on any failed invariant; rollback only under the named owner's pre-approved trigger. Reconcile same TestRun IDs, domain ledgers and Artifact hashes before reopening writers.

## Current decision

No active writer pause, service restart, data copy, migration, storage switch or volume mutation was performed. This preparation cannot become `VERIFIED_EXECUTABLE` until the exact activity backup has been restored and rehearsed and all owner-dependent inputs are set. The plan remains blocked at this prerequisite; independent P3–P6 work can proceed only where it does not depend on the activity cutover.
