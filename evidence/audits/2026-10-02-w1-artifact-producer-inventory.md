# W1 Artifact producer and ownership inventory

Date: 2026-10-02 (Asia/Shanghai)
Scope: source-level inventory of concrete durable Artifact owners and reference-only consumers found in service adapters and lifecycle paths. This is not proof that every runtime artifact has been enumerated.

| Producer or consumer | Durable bytes | Metadata/reference owner | Current lifecycle and cleanup boundary |
|---|---|---|---|
| Research Automation V3.1 Runner INPUT/OUTPUT | Shared `research-artifacts-v1` content-addressed filesystem; legacy Research paths remain read-compatible | `research_artifact_refs` and Runner Job output refs in Research Automation PostgreSQL | Ref statuses include PENDING/PUBLISHED/RETAINED/EXPIRED; expiry is immutable; orphan inspection is check-only and explicit quarantine is separate. No approved expiry policy/scheduler. Failed-publish rollback now removes only new shared bytes. |
| Platform Qlib Fixture | New payloads in the shared content-addressed filesystem; older rows may retain JSONB payload | `qlib_fixture_artifacts` in Platform PostgreSQL, bound to TestRun and owner | PUBLISHED/RETAINED/EXPIRED and optional expiry; legacy JSONB backfill exists. No shared scheduler or physical expiry cleanup. |
| Market Data collection datasets | Structured row payloads in `market_data_artifact_rows`; run-level digest/count in PostgreSQL | `market_data_collection_artifacts`, `market_data_collection_runs` and project-scoped row table in Market Data PostgreSQL | Dataset version and project scope are enforced. This is a paginated relational dataset, not a file in the common blob store; no shared blob migration is indicated without changing its delivery contract. Retention/deletion policy remains unspecified. |
| Platform TestRun / Evidence Export | References/projections and user-selected exported bundle bytes; it does not own Research bytes | Platform TestRun metadata; export Manifest binds exact bytes and TestRun | Owner checks and PUBLISHED-only reads apply. Local export output is caller-owned; repeat export will not overwrite. |
| Quant Research, Decision Governance and Replay | Candidate/promotion/mandate/replay records carry Artifact identity and hashes; source scan found no separate common content store owner in these services | Service-owned candidate, promotion, Registry, mandate or replay metadata | These are reference consumers or evidence producers; exact retention follows owning service/acceptance evidence rules. No byte-deletion authority was found in these consumers. |

## Implications

A single physical content backend now serves Research Automation and new Qlib payloads, but metadata remains owned by each producer. Safe cleanup therefore needs producer-specific eligibility and live-reference checks before physical removal, plus a shared audit trail and serialization for references that can point to the same content address. Market Data's structured rows should remain under its project/data-version access contract unless a separately tested export/blob design replaces that contract.

The owner has not yet supplied a generated-Artifact retention period. No period or deletion scheduler is inferred from the separate accepted backup retention policy. The implementation remains dry-run/no-cleanup until the Artifact retention decision and cross-owner reference protocol are approved and tested.
