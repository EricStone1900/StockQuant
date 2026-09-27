# P0.2 V3.1 Runner dispatch contract audit

Date: 2026-09-27 (Asia/Shanghai)

## Change

Added OpenAPI and versioned schemas for Platform-consumed Research Automation Experiment creation/cancellation, budget read/settlement, Runner dispatch/read/cancel, Artifact publish/read, and test-only Fixture model call. The V3.1 paths share a generated client with the three V3.3 queue/ledger reads. The separate guarded V3.2 Promotion submit API also has a generated Platform client. `contracts:check` verifies these clients are current and validates the security, schema references and documented responses. Runner cancellation already had a Platform-only Bearer route and persisted state transition; it now has a typed OpenAPI/client entry but still has no product caller or accepted recovery workflow.

V3.1 normal, rejection, recovery and fixed-pipeline paths now create Experiments through the generated client and persist the exact owning TestRun. Platform uses generated methods for all V3.1 Research Automation operations consumed by these flows; only `/ready` health probing remains a direct untyped read. Runner dispatch uses the Platform service Bearer identity and a 10 second timeout. Clients retain downstream HTTP status and error detail. A successful dispatch `202` is checked for `jobId`; it records an accepted queue item and does not start a Runner itself.

## Failure found and corrected

The first isolated browser smoke received Research Automation `409`: the V3.1 Experiment had no durable TestRun binding. Earlier queue-only tests did not exercise the full fixed pipeline. Platform now includes the exact generated V3.1 `testRunId` when it creates an Experiment; Research Automation continues to fail closed for missing/mismatched TestRun bindings and non-`RESERVED` budgets. Preserving downstream error detail confirmed the mismatch guard was the failing condition. The incomplete run did not create a Runner job. The smoke diagnostic now includes the visible page error and isolated service logs to make future failures actionable.

## Verification

- `pnpm contracts:check`: PASS; 99 schema files validated, 34 fixtures, 87 compatibility consumer rules; 98 shared TypeScript/Python schema types and generated clients current.
- `pnpm --filter @stockquant/platform-api-service build`: PASS.
- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/research-queue-client.spec.ts tests/unit/research-promotion-client.spec.ts`: PASS, 8 tests across the two generated clients, including encoded job cancellation and bodyless POST.
- `pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`: PASS. Latest TestRun `0912efd2-23f4-4097-bee6-33fca459e2cd`; Experiment `2adde96e-f8d1-4ce9-bedd-2722952be6df`; isolated Browser → Platform → Research Automation → Runner Host path completed. Model source `FIXTURE`, external model calls 0, actual model cost 23 cents, Runner `COMPLETED`, output SHA-256 `4de9e83ae7f378e53240aceae825fe961c3a97ebb3aeaef3b7a12ce4ef1aaedf`, metrics asserted for six bars, foreign-owner access 403 and production-mode fixed route 403. The smoke uses a dedicated temporary PostgreSQL pair, temporary local services and the explicitly isolated fixed Runner container; it does not touch active services.
- `pnpm verify:stage -- --stage V3.1 --suite code`: PASS (exit 0) in the authorized local-PostgreSQL validation environment; Research Automation 150 unit + 19 PostgreSQL integration tests, Platform 83 unit tests and typecheck/build, artifact/gate HTTP smoke and Web typecheck passed.
- `pnpm verify:stage -- --stage V3.3 --suite code`: PASS (exit 0); includes contract drift validation and all three V3.3 Playwright tests. V3.3 business workflow remains `NOT_IMPLEMENTED`, stage budget control `NOT_IMPLEMENTED`, Paper continuity `NOT_CHECKED`, and business/human acceptance `NOT_RUN`.

The suite and smoke are code/Fixture evidence. They do not establish real RD-Agent generation, external model use, sustained observations, Ubuntu acceptance, exact-run user acceptance or human sign-off. Those remain `NOT_RUN`.
