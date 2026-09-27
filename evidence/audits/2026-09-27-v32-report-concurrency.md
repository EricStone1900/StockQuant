# V3.2 validation report concurrent replay

Date: 2026-09-27 (Asia/Shanghai)

The isolated Quant Research PostgreSQL/HTTP smoke now sends four identical validation-report POSTs concurrently against one PromotionRequest. It asserts exactly one 201 create, three 200 idempotent replays, one shared report fingerprint and one persisted immutable row. The smoke also retains changed-content conflict, wrong-TestRun rejection, identity scopes, parent-state invariance and Registry non-mutation checks.

Verification: `pnpm --filter @stockquant/quant-research-service test:integration` passed against a random isolated database. The full `pnpm verify:stage -- --stage V3.2 --suite code` then exited 0, including contracts, Fixtures, Quant unit/worker tests and integration, Research Automation preparation-journal smoke, and Web checks.

This proves concurrent report persistence/idempotency only. Independent Qlib execution, V3.1 prerequisite, V3.2 Web/CLI business TestRun, human acceptance and Registry promotion remain `NOT_RUN`/`NOT_PERFORMED`.
