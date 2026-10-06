# V3.3 two-round budget HTTP smoke: retained failed attempts

Date: 2026-10-06 (Asia/Shanghai)

The following failures occurred while implementing the isolated HTTP/PostgreSQL smoke. They are retained as diagnostic history; the final passing run is separate evidence.

1. The default sandbox denied access to the Docker socket (`operation not permitted`) before the disposable PostgreSQL container was created. The same test command was rerun under controlled local permissions.
2. The first controlled launch failed Research Automation TypeScript build because the shared contract generator emitted references to `Normal`, `Rejection`, and `Recovery` without emitting local `$defs` aliases. The scenario validation schema was moved to `fixtures/manifests/`, where it remains strictly validated but does not generate service DTOs; contract types were regenerated and the build passed.
3. The next smoke reached the test but its legacy two-experiment assertion counted the new independent TestRun experiment. The test now tracks cleanup IDs separately from the original summary TestRun and removes all exact rows.
4. The next run expected `actualCostCents`; the current Fixture gateway response contract reports `settledCostCents`. The assertion now uses the contract field.

No failed attempt reached an external provider, market-data source, Paper service, or broker. Disposable database and network cleanup was handled by the isolated runner. The final passing HTTP/PostgreSQL run and full V3.3 suite are recorded in [`2026-10-06-w7-v33-round-budget-http-smoke.md`](./2026-10-06-w7-v33-round-budget-http-smoke.md).
