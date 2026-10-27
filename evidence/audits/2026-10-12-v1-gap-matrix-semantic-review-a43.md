# V1.1-S2-L14 incremental semantic review A43 — Platform→Portfolio timeouts

Date: 2026-10-12. Scope: the six V1 Platform→Portfolio generated-client operations. This review closes only the missing per-operation timeout assertion and keeps L14/P1 open.

## Finding

The Platform Portfolio client already had direct route, identity, body, error, and owner-header assertions across its six V1 account operations. Its generated implementation uses a common 5-second `AbortSignal.timeout`, but the Platform tests did not lock that budget for each operation.

Added `uses the declared bounded timeout for every V1 account operation`. It invokes account initialization, owner-scoped snapshot read, resource reservation, Fill recording, fee correction, and reservation resolution; it asserts six fetches and six 5,000 ms timeout requests. No production behavior or API contract changed.

## Verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/portfolio-account-client.spec.ts`: 4/4 passed.
- `pnpm --filter @stockquant/platform-api-service typecheck`: exit 0.
- Raw logs and exit files: [client tests](./2026-10-12-v1-platform-portfolio-account-timeouts-a01.log) and [typecheck](./2026-10-12-v1-platform-portfolio-account-timeouts-typecheck-a01.log).
- Test source SHA-256: `7fbdca5adc9c79c0f4888e9f4b474132584b4035213a5c774e206dfdbaaa5720`.

## Remaining boundary

This verifies one timeout property of the six Platform→Portfolio operations. It does not establish complete V1 caller/route/side-effect coverage, released-version compatibility, migration, active rollout/rollback, paired restore, human acceptance, or the V1 gate. Keep `V1.1-S2-L14` and P1 `OPEN`.
