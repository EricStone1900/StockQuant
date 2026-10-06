# W1 Market Data layer-boundary increment

Date: 2026-10-01 (Asia/Shanghai)

Completed the Market Data TypeScript service's five-layer structure. Moved all PostgreSQL-backed collection, schedule, coverage, artifact-delivery, project-access, alert-outbox, minute-import and minute-upload repositories, plus the advisory-lock gate, to `src/adapters/`. Moved stable business types and errors to `src/domain/`, added repository/gate contracts under `src/ports/`, and separated project-token parsing into application code. The HTTP server composition root now lives at `src/bootstrap/main.ts`; `src/main.ts` remains as the stable package entrypoint. Existing import behavior and runtime API are unchanged.

Validation on the final code: `pnpm service:layers -- --service market-data-service` PASS with no missing layers or violations; Market Data typecheck PASS; 15 unit files / 63 tests PASS; isolated PostgreSQL integration PASS (23 tests); partition backfill smoke PASS; Market Data and Platform builds PASS; Platform-to-Market-Data project-token HTTP/PostgreSQL smoke PASS (200/401/403); full `pnpm verify:stage -- --stage V2.2 --suite code` exit 0; `pnpm baseline:check` PASS, including four layer-check tests. Markdown links and generated contract checks also PASS.

Scope limits: this closes the Market Data service-layer boundary only. Other services remain subject to separate scans and migration work. This does not change the V2.2 human sign-off history, authorize real data, activate sources, deploy active services, or establish Ubuntu and capacity acceptance.
