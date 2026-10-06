# W1 Artifact producer inventory

Date: 2026-10-03 (Asia/Shanghai)

## Scope and findings

This is a source-only inventory of persistent Artifact producers and adjacent data paths. It did not call providers, start or stop services, inspect or modify active database rows, or change storage configuration.

| Producer/path | Current representation | W1 shared content-store status | Decision/evidence boundary |
| --- | --- | --- | --- |
| Research Automation V3.1 Runner outputs | Immutable content-addressed files plus owner/TestRun ArtifactRef metadata | Migrated to `@stockquant/artifact-content-store`; legacy read compatibility remains | Shared bytes are in scope; expiry/retention and safe orphan cleanup remain open. |
| Platform Qlib Fixture model/prediction output | Canonical JSON bytes in shared content store; owner/TestRun/hash metadata in Platform PostgreSQL | Migrated; legacy JSONB reads remain | Shared bytes are in scope; Compose validation is not active deployment. |
| Market Data collection Artifact delivery | Project/DataVersion-scoped JSONB rows in `market_data_artifact_rows`, paged by row number and authorized by project | Not migrated | This is Market Data's domain-owned, queryable row store, not an opaque downloadable byte object. Migration would change pagination, project authorization, and DataVersion behavior; keep it separate unless a reviewed domain contract defines a shared byte export. |
| Market Data minute Parquet upload | Bounded temporary source file under OS temp directory; streamed through adapter, then removed in `finally` | Not a persistent Artifact producer | The preview retains the input hash and parsed preview, not the uploaded Parquet bytes. Do not register temporary inputs as durable artifacts. |
| Historical Replay Worker | No persistent Artifact byte producer found in its service source | No migration target identified | Replay evidence is assembled by Platform/TestRun paths; verify again when Replay introduces durable output. |
| Trade Execution | No persistent Artifact byte producer found in its service source | No migration target identified | Orders, fills, reservations, and outbox records are domain facts, not Artifact payloads. |
| Research independent validation / candidate handoff | Restricted temporary candidate input and result paths; durable candidate/report refs are owned by Quant/Research service contracts | Not a separate shared-store producer in the scanned service source | Preserve isolated execution boundary; durable publication remains through the existing Research Artifact pipeline. |

## Source locations inspected

- `services/research-automation-service/src/adapters/file-artifact-content-store.ts`
- `services/platform-api-service/src/adapters/qlib-artifact-content-store.ts`
- `services/market-data-service/src/adapters/postgres-artifact-delivery-repository.ts`
- `services/market-data-service/src/adapters/postgres-collection-run-repository.ts`
- `services/market-data-service/src/application/collection-executor.ts`
- `services/market-data-service/src/application/minute-parquet-import.ts`
- `services/historical-replay-worker/src/`
- `services/trade-execution-service/src/`
- `services/quant-research-service/scripts/v32-independent-validation-worker.mjs`

The remaining W1 shared-store work is therefore lifecycle/retention policy approval and scheduling, cross-reference-aware cleanup, any future durable producer migration, and authorized deployment cutover/rollback plus human acceptance. This inventory does not mark W1 complete.
