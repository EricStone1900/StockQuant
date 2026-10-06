# W1 Platform API layer-boundary increment

Date: 2026-10-01 (Asia/Shanghai)

Platform API application code previously imported concrete Postgres repositories for stage runs, V1.1 TestRuns, and V2.4 observations. Added repository ports for those three capabilities and moved observation types out of the Postgres adapter. The Postgres repositories implement the ports and remain injected by the existing bootstrap composition root. The layer check now includes Platform API in `baseline:check`, and accepts service or worker names as scan targets.

Validation: `pnpm service:layers -- --service platform-api-service` PASS; `pnpm --filter @stockquant/platform-api-service typecheck` PASS; Platform API unit tests PASS (139 tests); layer rule tests PASS (3 tests). The full `pnpm verify:stage -- --stage V1.1 --suite code` completed with exit 0, including the isolated Qlib worker loopback test under authorized local access. This is a code-suite result only and does not imply Web/browser, PostgreSQL integration, live Paper, source authorization, human acceptance, or migration-runner completion.

Scope remains incremental: baseline layering currently scans Portfolio Risk and Platform API; other service boundaries and the formal migration runner remain open. No active services, market providers, model providers, or broker endpoints were called.
