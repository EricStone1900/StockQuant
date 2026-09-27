# V3.2 independent validation report persistence

Date: 2026-09-27 (Asia/Shanghai)

## Result

Added immutable persistence for an evidence-bearing independent-validation report, separately from PromotionRequest intake. The `quant-validation-worker` identity has a distinct Bearer token scoped to POST `/v1/promotions/{promotionRequestId}/validation-report`; platform identity can read the result, while research and worker identities cannot. The service validates the report shape, all five check IDs/statuses, canonical evidence hashes and Registry disposition, then binds PromotionRequest ID, TestRun ID, and source mode to the locked parent request. A transaction inserts the report and evidence. Identical replay is idempotent; changed content conflicts. The parent request status is not changed, and Registry mutation remains forbidden.

## Verification

- Quant Research TypeScript tests: 37/37 PASS; Python worker boundary tests: 6/6 PASS.
- Quant Research build and frozen reference recomputation: PASS (fixture mode; candidate source not executed; Qlib API execution NOT_RUN).
- Quant isolated PostgreSQL/HTTP integration: PASS. Covered worker write-only/platform read-only scopes, forged identity denial, hash tampering (422), altered immutable replay (409), wrong TestRun binding (422), unknown parent (404), parent status unchanged, and Registry untouched.
- Full `pnpm verify:stage -- --stage V3.2 --suite code`: exit 0. Contracts, Fixtures, quant and research-automation tests/smokes, Web typecheck/test all passed.

## Limits

This verifies report storage and service identity using fixed synthetic evidence. The report is not produced by the isolated Qlib worker; the current deterministic reference evaluator does not execute candidate source. It does not constitute business validation, a V3.1 prerequisite pass, a Web/CLI TestRun, human approval, or strategy promotion. V3.2 stage/business/human acceptance remains `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`.
