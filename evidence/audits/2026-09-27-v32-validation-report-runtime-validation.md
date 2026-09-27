# V3.2 validation report runtime checks

Date: 2026-09-27 (Asia/Shanghai)

## Change

Hardened `buildIndependentValidationReport` against untrusted runtime values. Every validation status must be one of `PASS`, `FAIL`, or `NOT_RUN`; every non-null evidence reference must be a lowercase 64-character SHA-256; and a `PASS` requires such a hash. This aligns the application gate with the report JSON Schema instead of relying on TypeScript types at a JSON boundary.

## Verification

- Quant Research unit tests: 26/26 PASS.
- Quant Worker boundary tests: 3/3 PASS (local loopback test permission required; an initial sandbox run was denied with `EPERM`).
- Quant Research build: PASS.
- Full `pnpm verify:stage -- --stage V3.2 --suite code`: exit 0. Contracts (88 JSON/46 schemas/33 fixtures/33 compatibility rules), Quant unit/worker/integration smokes, Research Automation build/135 tests + isolated PG/HTTP preparation-journal smoke, and Web typecheck/test passed. The suite result remains business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, human acceptance `NOT_RUN`.

## Boundary

This validates report construction only. It does not load candidate artifacts or datasets, recompute a model, produce evidence-bearing gate results, persist a report, authorize a person, or mutate Registry. Independent validation and V3.2 business/human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`.
