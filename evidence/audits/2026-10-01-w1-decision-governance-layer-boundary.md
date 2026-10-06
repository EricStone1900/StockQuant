# W1 Decision Governance service layer boundary

Date: 2026-10-01 (Asia/Shanghai)

Decision Governance now follows the repository's `domain/application/ports/adapters/bootstrap` structure. The existing authorization-policy, fixture-grant and candidate-binding rules remain in `domain/`. A new application API coordinates those rules and authorization routes through `ExecutionAuthorizationRepository` and `ApprovedRegistryClient` ports. PostgreSQL schema/repository code and the generated Quant Registry client adapter live in `adapters/`; HTTP composition and process startup live in `bootstrap/`. The existing `src/main.ts` package entrypoint and `src/service-auth.ts` import path remain stable.

The root baseline now scans Decision Governance for required layers and forbidden domain/application dependencies. Unit coverage includes the layer guard, forged-identity rejection before persistence, BACKTEST/FAKE-only authorization, and distinct first-consumption versus idempotent replay results.

Verification on the final source:

- `pnpm --filter @stockquant/decision-governance-service build`: PASS.
- `pnpm --filter @stockquant/decision-governance-service test`: PASS, 6 files / 22 tests.
- `pnpm service:layers -- --service decision-governance-service`: PASS, all five layers and no violations.
- `pnpm baseline:check`: PASS, including contract/Fixture generators, all current service-layer scans and 17 version/layer guard tests.
- `pnpm verify:stage -- --stage V1.1 --suite code`: exit 0 on the final source; full workspace build/lint/typecheck/unit, service PostgreSQL integrations, contracts, Python adapter, Ops and Market Data auth/integration checks passed.
- `pnpm test:service-auth:http`: exit 0 against a randomly named temporary PostgreSQL database. Governance/Replay/Quant identity checks passed; 14 unauthorized route probes were denied, authorized replay single-use was consumed once under concurrent validation, namespace renewal rotated the authorization ID, and expired authorization was rejected. The smoke removed its temporary database.

This closes only Decision Governance's internal service-layer increment. Historical Replay still lacks the four non-domain layers, Quant Research still requires its own architecture/layer assessment. It does not complete all V1.1 cross-service clients or release automation, change active services/databases, alter paper authorization, or satisfy stage/version human acceptance. No external source, model Provider or broker was called.
