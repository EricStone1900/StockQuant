# W8 backup verification for retained shared Artifacts

Date: 2026-10-01 (Asia/Shanghai). Result: PASS for the isolated synthetic recovery regression.

## Change

A source audit found that the cluster restore verifier checked only `PUBLISHED` Research ArtifactRefs. The Artifact lifecycle supports `RETAINED` as a readable, preserved state, so a backup could previously pass while failing to assert a retained Research blob. The Qlib external-content query likewise did not explicitly scope the states that require bytes.

The verifier now checks `PUBLISHED` and `RETAINED` rows for both Research and externally stored Qlib content. It intentionally does not require `EXPIRED` bytes: EXPIRED is terminal and unreadable, and future approved physical-expiry cleanup may remove those bytes while preserving reference metadata. No cleanup policy or schedule was introduced.

The random Compose E2E now seeds five external-content references: content-addressed Research PUBLISHED, legacy-layout Research PUBLISHED, content-addressed Research RETAINED, Qlib PUBLISHED, and Qlib RETAINED with `payload IS NULL`. It creates three isolated databases, captures the cluster plus entire content volume, restores them in the verifier's separate networkless PostgreSQL container, and verifies all five refs against file inventory and exact SHA-256.

## Verification

- `node --check scripts/create-cluster-paired-backup.mjs`: PASS.
- `node --check services/research-automation-service/scripts/paired-backup-producer-smoke.mjs`: PASS.
- `pnpm test:cluster-paired-backup`: PASS, 5/5.
- First sandboxed Docker attempt was denied access to the Docker daemon. A read-only elevated inventory found no resources for that exact random project. The controlled rerun used project `sq-backup-smoke-80cdcb98b116`, network mode `none`, and exited 0.
- E2E backup ID: `cluster-paired-2026-10-01T12-43-10-467Z-38ab92dd`. It restored `platform_api`, `postgres`, and `research_automation`; verified 5 refs; restore method `ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256`. The exact random project and both volumes were absent from a read-only post-run Docker inventory.
- SHA-256 values: Research PUBLISHED `edafdfd64a9bf8cf0ad674b701830109bf787111b60efe545c5ca18426682103`; legacy Research PUBLISHED `06331f280818cbe0283c1ee9f4cf737c172b23e2b1d702c0a2b82611bff1ad77`; Research RETAINED `6dbf7ec464639f791a24114a220853ca945170d143b07e9b0e6dc08e2fee050d`; Qlib PUBLISHED `6557c3e8a1a53643d1afe7f6cb18c4f4f809f7eae9a1d4fa8689d0b887f00049`; Qlib RETAINED `a0770a08714c8d19eaaf58198411ea49ee708253d24642211a3bce8d8bf59ada`.
- `productionResourcesTouched=false`. No active service or persistent volume was changed.

## Limits

This closes the retained-reference assertion gap for the tested formats and synthetic databases only. It does not run a production backup, validate all 48 active databases, authorize a maintenance window, prove off-host retention or RPO/RTO, migrate mounts, deploy a service, or satisfy Ubuntu/observation/human acceptance gates.
