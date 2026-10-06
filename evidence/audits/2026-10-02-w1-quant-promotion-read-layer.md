# W1 Quant Promotion read boundary

Date: 2026-10-02.

Exact Registry version reads and aggregated PromotionRequest lifecycle detail reads now delegate from HTTP bootstrap to `PromotionReadService`, backed by `PromotionReadRepository` and `PostgresPromotionReadRepository`. Fingerprint/UUID validation and response projection live in application; SQL joins and row mapping live in the adapter. The Registry read remains immutable and returns the same `CANDIDATE_APPROVED` / `DISABLED_UNTIL_MANDATE` state. Lifecycle status still derives from request/report/decision/Registry facts in one query.

Validation: Quant build/lint and 14 TypeScript unit files/64 tests pass. Full `pnpm verify:stage -- --stage V3.2 --suite code` exited 0, including the isolated PostgreSQL/HTTP V3.2 lifecycle, exact Registry lookup, Governance binding, owner-scoped readiness TestRun and Web checks. The run explicitly reports business validation and human acceptance NOT_RUN; no active Registry mutation, market data, external Provider or active service was touched.

Promotion decision transaction is the remaining direct PostgreSQL workflow in `bootstrap/main.ts`; broader stage and plan gates remain open. No whole-Quant layer scan is claimed until the decision persistence boundary is extracted and a meaningful enforcement rule is added.
