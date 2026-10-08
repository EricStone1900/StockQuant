# V1.5 JetStream poison-envelope handling unit evidence

Date: 2026-10-07. Platform API TypeScript typecheck: PASS. Platform API unit suite: PASS, 55 files / 241 tests.

The consumer terminates malformed JSON and permanently invalid envelope/TestRun identity or scope errors with JetStream `term`. Database and Temporal exceptions continue through delayed NAK retry. The added unit cases cover accepted normal identity, malformed envelopes, event identity mismatch and out-of-scope scenarios.

This is code and unit evidence only. No JetStream poison message, duplicate redelivery or concurrent-worker E2E was performed; those cases remain NOT_RUN.

Source SHA-256: `eae7bd8ace9a0fac5e2540bd0e1fce78c10c3f76b87b7713b1b2d5e1fcab933a` (`src/integration/v15-nats-dispatch.ts`). Test SHA-256: `2c47eaa18d1a165f3f2f52b6a407b045d2949d498f5c8932b3c599497c750f97` (`tests/unit/v15-nats-dispatch.spec.ts`).

Commands: `pnpm --filter @stockquant/platform-api-service typecheck`; `pnpm --filter @stockquant/platform-api-service test`.
