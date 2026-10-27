# V1.1-S2-L14 incremental semantic review A45 — Replay→Portfolio timeouts

Date: 2026-10-12. Scope: the two V1 Historical Replay→Portfolio generated-client methods with production call sites. This review verifies only the per-operation timeout budget; L14/P1 remains open.

## Finding

The Replay worker calls `initializeAccount` and owner-bound `getAccountSnapshot`. Existing direct tests asserted the Replay service identity, request body, encoded path and owner header, but not the bounded timeout across both operations.

Added `uses the declared bounded timeout for both V1 Replay→Portfolio operations`. It calls both production methods, asserts two requests and confirms both request signals use `AbortSignal.timeout(5000)`. No production code or API contract changed.

## Verification

- `pnpm --filter @stockquant/historical-replay-worker exec vitest run tests/unit/portfolio-account-client.spec.ts`: 3/3 passed.
- `pnpm --filter @stockquant/historical-replay-worker typecheck`: exit 0.
- Raw logs and exit files: [client tests](./2026-10-12-v1-replay-portfolio-timeouts-a01.log) and [typecheck](./2026-10-12-v1-replay-portfolio-timeouts-typecheck-a01.log).
- Test source SHA-256: `489160fd36e5e065db38c1635b9f53827b65c0f544e9bd64d718b8f6c6d3a08f`.

## Remaining boundary

Together with the Platform→Portfolio and Trade→Portfolio per-operation tests, this closes the direct timeout-budget assertion for the three current V1 Portfolio Account callers. It does not complete route/auth/response/side-effect coverage, release compatibility, migration, active rollout/rollback, paired restore or human acceptance. Keep `V1.1-S2-L14` and P1 `OPEN`.
