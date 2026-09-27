# V3.2 report evidence contract alignment

Date: 2026-09-27 (Asia/Shanghai)

## Finding and correction

The base validation-report schema allowed `evidenceSha256: null` for failed or not-run checks, while the evidence submission schema and persistence endpoint require a content-hashed explanation for all five checks. That let a report validate against the shared contract but fail when submitted for immutable storage.

The report schema now requires a lowercase SHA-256 for every check status. The report builder applies the same rule, generated TypeScript/Python contracts were refreshed, and unit cases keep failed/not-run statuses auditable with hashes. A not-run check must carry hashed explanatory evidence; its status remains `NOT_RUN` and is not promoted to PASS.

## Verification

- `pnpm contracts:generate`: PASS (49 schemas regenerated).
- `pnpm baseline:check`: PASS (95 JSON, 50 schemas, 34 contract fixtures, 37 compatibility rules, six OpenAPI groups, 18 frozen fixture files).
- Quant Research unit tests: 37/37 PASS; worker boundary suite passed inside full stage verification.
- `pnpm verify:stage -- --stage V3.2 --suite code`: exit 0. Stage remains business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, human acceptance `NOT_RUN`.

## Limit

This is contract/runtime consistency work. It does not create missing validation evidence, call Qlib, approve a candidate, or change any acceptance status.
