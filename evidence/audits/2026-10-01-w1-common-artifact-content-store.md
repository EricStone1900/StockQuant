# W1 Shared Artifact content backend increment

Date: 2026-10-01 (Asia/Shanghai)

## Change

Added `packages/artifact-content-store` as the common immutable filesystem content layer. It addresses bytes by namespace, SHA-256, and artifact ID; verifies hashes on publish/read/size; refuses unsafe path segments and symlinked namespace components. Research Automation's FileArtifactStore now delegates byte operations to this package and retains checksum-verified reads of the pre-migration file layout without moving data during reads.

Platform API's Qlib producer now writes canonical model/prediction JSON bytes to the same content layer and leaves owner, TestRun, media type, hash, and lifecycle metadata in its PostgreSQL-owned table. The legacy `payload` column is nullable for new rows; existing JSONB rows remain readable and hash-checked. The source Compose file mounts the existing `research-artifacts-v1` named volume in both Platform API and Research Automation. The Runner does not receive the volume. No active Compose service was restarted or redeployed.

The storage migration is backward-readable: existing Research files are served from the previous path until later migration/retention work is authorized; existing Qlib rows with inline JSONB continue using their previous read path. It does not assign expiry to legacy artifacts or change their status.

## Verification

- `pnpm --filter @stockquant/artifact-content-store test`: exit 0, 2/2. Covers immutable idempotent publish, read tampering detection, path traversal rejection, symlinked-directory rejection.
- `pnpm --filter @stockquant/research-automation-service build`: exit 0.
- `pnpm --filter @stockquant/research-automation-service test`: exit 0, 32 files / 179 tests.
- `pnpm --filter @stockquant/platform-api-service build`: exit 0.
- `pnpm --filter @stockquant/platform-api-service typecheck`: exit 0.
- `pnpm --filter @stockquant/platform-api-service test`: exit 0, 43 files / 145 tests. New adapter tests prove that Qlib bytes are outside PostgreSQL, shared-store tampering is rejected, and legacy JSONB rows remain readable.
- `node --check services/platform-api-service/scripts/v23-qlib-fixture-testrun-http-smoke.mjs`: exit 0.
- `docker compose -f infra/compose/docker-compose.yml config -q`: exit 0.
- `pnpm --filter @stockquant/platform-api-service v23:qlib-fixture-testrun-smoke`: exit 0. Platform -> Quant Research -> pinned Qlib 0.9.6 Linux/amd64 worker -> PostgreSQL + content-file path -> Web -> same-run CLI check-only -> evidence export all passed. TestRun: `5c6a6f4b-e582-428e-abfa-28f13b740eab`; exported two-entry Manifest SHA-256: `33da5aaa713eac6d129f18d0867ca5f0a704d28d5b09fda0c8f7615afbfa091e`. The content bytes were verified before and after read-only CLI/export. Owner read returned 200; foreign-owner read returned 403. Source mode was FIXTURE, FakeBroker was selected, and external source calls were 0.
- PostgreSQL was a random container on a dedicated bridge with outbound NAT disabled, fixed image `postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7`, tmpfs data, and loopback-only ephemeral port. Two uniquely named databases, the Qlib worker/image/container, network, and content directory were removed. A read-only postcheck found no `sq-v23-qlib-*` resources; the pre-existing `stockquant-v12-postgres-1` remained healthy and untouched.
- `pnpm baseline:check`: exit 0 after implementation and final plan/stage/architecture documentation updates; local Markdown links 1910/1910, JSON/Schema/Fixture validation, generated contracts/compatibility/OpenAPI checks, the new package's 2 tests, five service layer scans, and six layer-rule tests passed. V1/V2/V3 evidence-reference checks also exited 0: 35/140/122 references, 3/20/22 manifests and 4/21/23 entries; no missing evidence or hash failures.

An initial adapter unit run exposed a test helper still pointing at the old file path after the namespace layout change; the helper was corrected and the final Research suite passed. An initial PostgreSQL attempt on a Docker `--internal` network could not map a port to the host; it failed before starting application services and cleaned its temporary resources. The successful rerun used the dedicated bridge with NAT disabled. Neither failed attempt touched active services or persistent volumes.

## Limits

This verifies the new shared content path for Platform's Qlib producer and the common package through Research unit tests; it does not exercise both producers concurrently against a newly deployed Compose volume. Compose configuration was validated, but no service/image was deployed. Shared lifecycle policy, retention approval/scheduling, orphan-byte reconciliation, physical expiry cleanup, all other Artifact consumer migration, active mount/API cutover and rollback, Ubuntu validation, and human acceptance remain open. The synthetic Qlib run is not evidence of licensed market data, independent model validation, or profitability.
