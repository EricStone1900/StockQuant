# V1.1-S2-L14 incremental semantic review A44 — Trade→Portfolio timeouts

Date: 2026-10-12. Scope: five V1 Trade Execution→Portfolio generated-client operations actually called by production code. This review closes only the missing per-operation timeout assertion and keeps L14/P1 open.

## Finding

Production Trade Execution call sites use Portfolio reservation, Fill delivery, fee correction, receivable settlement, and reservation resolution. Direct tests covered routes, identities, payloads, denials, and a 5-second timeout for settlement, but did not assert the timeout budget on every call.

Added `uses the declared bounded timeout for every V1 Trade→Portfolio operation`. It invokes those five methods, asserts five requests, and checks that each creates `AbortSignal.timeout(5000)`. It does not include generated-client methods with no Trade production call site. No production behavior or API contract changed.

## Verification

- `pnpm --filter @stockquant/trade-execution-service exec vitest run tests/unit/portfolio-account-client.spec.ts`: 6/6 passed.
- `pnpm --filter @stockquant/trade-execution-service typecheck`: exit 0.
- Raw logs and exit files: [client tests](./2026-10-12-v1-trade-portfolio-timeouts-a01.log) and [typecheck](./2026-10-12-v1-trade-portfolio-timeouts-typecheck-a01.log).
- Test source SHA-256: `94d9e8b4deefeaa6c6c3bb74e214503038238a0ce0f8ff6a5bb501bdba8fa197`.

## Remaining boundary

This verifies one bounded-timeout property for five Trade→Portfolio calls. It does not establish all V1 caller/route/side-effect behavior, release compatibility, migration, active rollout/rollback, paired restore, human acceptance, or the V1 gate. Keep `V1.1-S2-L14` and P1 `OPEN`.
