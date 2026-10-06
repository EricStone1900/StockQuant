# W1 Quant PromotionRequest layering increment

Date: 2026-10-02.

`POST /v1/promotions` and the plain `GET /v1/promotions/{id}` projection now delegate to `PromotionRequestService`. The application service owns schema parsing, canonical fingerprinting, create/replay/conflict decisions, UUID validation and result projection. `PromotionRequestRepository` defines the persistence port; `PostgresPromotionRequestRepository` owns the SQL and row mapping. Existing route paths, response schemas/status behavior, request immutability and idempotency semantics are preserved. Previous increments moved Qlib calls and schema initialization out of route code.

Validation: Quant build, lint and 12 TypeScript unit files/60 tests PASS. Full `pnpm verify:stage -- --stage V3.2 --suite code` exited 0, including contract/Fixture checks, all repository unit suites, isolated random PostgreSQL/HTTP PromotionRequest and validation/decision integration, two restricted ARM64 fixture containers, owner-scoped readiness TestRun HTTP, and Web typecheck/build/unit. Active Registry/Mandate were not mutated; model/provider and market-data calls were zero. The Qlib model fit remains the explicitly locked synthetic Fixture check from the immediately preceding increment.

This is code-suite evidence, not formal V3.2 business validation: the suite explicitly reports `businessValidation=NOT_RUN` and `humanAcceptance=NOT_RUN`. Real V3.1 authoritative prerequisite, business TestRun, user approval of any exact version, Ubuntu and the overall plan remain open. Promotion report, decision and detail SQL remain in bootstrap; no whole-Quant layer scan is claimed.
