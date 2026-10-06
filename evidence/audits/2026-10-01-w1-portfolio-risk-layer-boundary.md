# W1 Portfolio Risk layering boundary

## Change

`AccountService` now depends on the `AccountRepository` port in `services/portfolio-risk-service/src/ports/account-repository.ts`. `PortfolioContainer` still constructs `PostgresAccountRepository` and injects it at the bootstrap boundary. The persistence implementation and route behavior were not changed.

Added `pnpm service:layers -- --service portfolio-risk-service`, which checks the required `domain/application/ports/adapters/bootstrap` layout and rejects imports from adapters/bootstrap or PostgreSQL/web frameworks into domain/application/ports. The check is intentionally scoped to the selected service; it does not claim that other services comply or that database migrations are centrally managed.

## Verification

- `pnpm --filter @stockquant/portfolio-risk-service typecheck`: PASS.
- Portfolio Risk unit tests after adding the port-focused delegation test: 3 files, 5 tests PASS.
- `pnpm service:layers -- --service portfolio-risk-service`: PASS, five required layers present, zero violations.
- `node --test scripts/check-service-layers.test.mjs`: 3/3 PASS, including rejection of forbidden adapter/framework imports and missing-layer reporting.
- `pnpm baseline:check`: PASS; docs links 1,775, JSON/schema/Fixture validation 211/146/36, authorization contract tests 8/8, 19 fixture files hash-checked, service layer gate PASS.
- `pnpm verify:stage -- --stage V1.1 --suite code`: PASS/exit 0 after the application port refactor. It runs baseline, build, typecheck and repository unit suites. It does not run V1.1 browser E2E, active API migration/cutover, or user acceptance.
- No market-data, model-provider, or broker call was made; no activity service was deployed or restarted.

This closes one service's application-to-adapter dependency violation and establishes an executable rule. Broader V1.1 client release coverage, migration framework/version management, common Artifact lifecycle, active API cutover/rollback, other service layering, and human acceptance remain open.
