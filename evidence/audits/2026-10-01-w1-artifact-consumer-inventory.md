# W1 Artifact consumer and storage inventory

Date: 2026-10-01 (Asia/Shanghai). Scope: static source/configuration audit of Artifact-like payload paths; no runtime access or migration performed.

## Shared immutable content volume

- Research Automation owns ArtifactRef metadata in its `research_automation` database and stores V3.1 INPUT/OUTPUT bytes through `FileArtifactStore` and `@stockquant/artifact-content-store` under `research-artifacts-v1`. New files use namespace/SHA-256/artifactId; reads retain checksum-verified compatibility with the prior namespace/artifactId layout.
- Platform API's Qlib Fixture producer writes content-addressed model/prediction JSON bytes through `QlibArtifactContentStore` to the same named volume. `platform_api.qlib_fixture_artifacts` owns Qlib identity, TestRun, owner and lifecycle metadata; new records have `payload IS NULL`, while existing JSONB payloads retain their old read path.
- Platform V3.1 owner-scoped read routes proxy exact TestRun/RunnerJob ArtifactRefs to Research Automation. The Web evidence exporter reads both the Platform Qlib route and Research Automation's owner-scoped route and rechecks identity and SHA-256. Runner Host publishes/reads via authenticated Research Automation APIs and does not mount the shared volume directly.
- Cluster paired backup snapshots the complete `research-artifacts-v1` volume and now verifies external bytes for Research and Qlib `PUBLISHED`/`RETAINED` references after isolated restore. Expired bytes are not required by that reference assertion because EXPIRED content is unreadable and a future approved cleanup may remove bytes; currently no physical expiry cleanup is scheduled or performed.

## Separate domain-owned payloads and metadata

- Market Data collection artifacts are domain records in `market_data_collection_artifacts`; project delivery rows are JSONB in `market_data_artifact_rows`. Minute uploads use PostgreSQL upload/chunk tables, while Parquet preview uses a bounded temporary file that is removed after conversion; finalized minute bars and their versioned import metadata are stored in Market Data's own partitioned PostgreSQL tables. These are not current consumers of `research-artifacts-v1` and should not be moved into the Research/Qlib store by name matching alone.
- Quant Research stores candidate/promotion fingerprints and ArtifactRef identity in its own registry tables; candidate bytes are fetched through Research Automation's scoped API. Hash/metadata references do not make Quant an independent byte-store consumer.
- Historical Replay checkpoints/manifests and TestRun evidence are currently service-owned replay/platform persistence; static search found no direct mount or use of `research-artifacts-v1` in Replay Worker.

## Migration order and gates

1. Keep Research Automation and Platform API as the only shared-volume writers/readers until a canonical ArtifactContentStore/lifecycle policy is approved. Do not broaden the volume mount to Runner, Web, Quant, Market Data or Replay.
2. Before active cutover, inventory existing `research_artifact_refs`, Qlib rows with inline JSONB, old-layout files and content-addressed files against a read-only byte/hash report. Define expiry/retention behavior and orphan policy, including whether EXPIRED bytes are preserved or removed and how a metadata-only expiry affects backup completeness.
3. Add a migration rehearsal using copies of both legacy Research files and Qlib inline-payload rows; prove old readers and new readers agree byte-for-byte before any production rewrite. Preserve the original volume and databases for rollback.
4. For any later Market Data object-store change, specify the Market Data manifest/DataVersion contract, access controls, chunk/finalize/recovery behavior and offline export independently; do not route normalized bars or project rows through research namespace rules.
5. Require writer quiescence, paired backup plus isolated restore, mount comparison, API smoke, exact consumer-read assertions, explicit rollback criteria and a bounded maintenance window before changing active Compose. These are not authorized or executed by this audit.

Static sources inspected include `infra/compose/docker-compose.yml`, Research Automation's Artifact domain/ports/adapters and reconcile/backup scripts, Platform Qlib repository/content adapter and Artifact routes/exporter, Market Data collection/import/upload/artifact-delivery adapters, and Quant/Replay ArtifactRef/checkpoint references. Source inventory is evidence for migration planning, not proof of active runtime mounts or row counts.
