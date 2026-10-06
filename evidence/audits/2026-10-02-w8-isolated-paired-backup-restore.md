# W8 isolated paired backup and restore smoke

Date: 2026-10-02 (Asia/Shanghai)

Ran `pnpm --dir services/research-automation-service backup:paired-smoke` (exit 0). The repository harness created the random Compose project `sq-backup-smoke-112b627636a2` and Artifact volume `sq-backup-smoke-artifacts-112b627636a243d5ab85239e4660c0f4`; its PostgreSQL container used `network_mode: none`, had no published ports, and mounted only those temporary volumes. Required images were already local. No active service volume was mounted.

The producer created a paired dump/archive and isolated-restored three databases, one role, and five fixture ArtifactRefs, verifying fixture artifact SHA-256 values. Restore method was `ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256`. The script's temp workspace, test containers, network context, and two random named volumes were cleaned. A read-only post-check showed the same active service containers still running and the active `stockquant-v12_research-artifacts-v1` volume still present; no `sq-backup-smoke-*` resource remained.

This is stronger than contract-only verification but uses synthetic data in isolated local Docker resources. It does not prove backup/restore of the production database or Artifact volume, the Ubuntu timer, production quiescence, RPO/RTO, or the required Ubuntu observation. V3.4 remains `NOT_RUN`.

Evidence hygiene checks: this audit's SHA-256 manifest validated all three entries; `pnpm docs:check` passed with 2,722 local links, and `pnpm verify:version:evidence -- --version V3` passed (181 references, 38 manifests, 45 manifest entries).
