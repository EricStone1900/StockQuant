# W8 isolated cluster paired-backup recovery rerun — 2026-10-02

## Scope and isolation

Re-ran the cluster paired-backup producer against a disposable Compose project with a random project name, database volume and Artifact volume. The source PostgreSQL service ran with `network_mode: none`; the restore verifier used the tool-managed, uniquely named PostgreSQL container with `network=none`, no Compose labels, no named volumes or ports, and tmpfs-only storage. The test did not target the active Compose project or its volumes.

## Results

- Docker Engine: 28.0.4. Existing local images were resolved to immutable IDs before the run: PostgreSQL `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2` and Node helper `sha256:ce165dcca6608664c518ae71c86ed3fce33da1d1e88b5dee2504fc0cbff55beb`.
- `pnpm test:cluster-paired-backup`: PASS, 5/5.
- `pnpm test:paired-backup`: PASS, 5/5, including fail-closed confirmation/root preflights.
- `node services/research-automation-service/scripts/paired-backup-producer-smoke.mjs`: PASS. Restored 3 databases and 1 role; validated 5 published/retained Research and Platform/Qlib Artifact references against the paired volume file inventory and SHA-256 values. The manifest recorded `ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256` and `productionResourcesTouched=false`.
- The exact random Compose project and Artifact volume were checked after teardown; no matching containers or volume remained.
- `git diff --check`: PASS.

## Limits

This is a synthetic isolated integration run. It does not prove the active 48-database cluster has been backed up, offsite copies exist, RPO/RTO targets pass, or a maintenance migration is approved/executed. No active service, database, subscription, order or Artifact volume was changed. W8 remains open for those operational gates and the actual Ubuntu deployment/observation requirements.
