# W1 Quant Research five-layer boundary

Date: 2026-10-02.

The Quant Research HTTP composition root now contains no direct PostgreSQL calls. Candidate registration, PromotionRequest submit/read, validation-input and report submit/read, exact Registry and promotion-detail reads, and exact-version decisions use application services and repository/transaction ports backed by PostgreSQL adapters. The decision adapter owns the PostgreSQL transaction and row locks; the application validates immutable request/report binding, approval eligibility, exact fingerprints, idempotent replay and disabled Registry projection. Schema initialization is also owned by the adapter. `src/main.ts` remains the stable process entrypoint.

The baseline now runs the Quant layer scanner. It verifies all five directories, standard forbidden cross-layer imports, and specifically rejects `pool.query`, `pool.connect` or `client.query` in Quant bootstrap. Regression tests assert the current Quant service passes and a direct SQL call fails. Scanner PASS.

Validation after the decision/read/report extraction: Quant build/lint, 15 TypeScript unit files/67 tests, and 13 Python Worker tests pass. Full `pnpm verify:stage -- --stage V3.2 --suite code` exits 0, including the baseline/Quant scanner, contract and fixture checks, random isolated PostgreSQL/HTTP validation and decision lifecycle, restricted Fixture executor/evaluator containers, readiness TestRun recovery, and Web typecheck/build/unit. The suite explicitly reports `businessValidation=NOT_RUN`, `humanAcceptance=NOT_RUN`, active Registry mutation NOT_PERFORMED, and no external market/provider calls.

This closes the Quant service layering item within W1. It does not close W1's other cross-service/client-release, shared Artifact rollout, activity cutover/rollback or new human acceptance items, nor V3.2 formal business acceptance, O1/O2, Ubuntu or the overall delivery plan.
