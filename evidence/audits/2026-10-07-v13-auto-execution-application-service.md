# V1.3 AUTO_POLICY application service verification

Date: 2026-10-07 (Asia/Shanghai)

## Result

The V1.3 AUTO_POLICY HTTP path now delegates run/proposal/account scope checks and execution coordination to `services/platform-api-service/src/application/v13-auto-execution.ts`. The application service receives explicit ports, validates the exact V1.3 TestRun, owner-scoped pending AUTO_POLICY Proposal, mandate identity/version, PAPER/FAKE account namespace, and stable client order ID, then calls the existing Trade Execution command with the TestRun-scoped clock. Five focused unit tests cover valid command construction, cross-owner rejection, account/scope rejection, business versus infrastructure failures, and malformed mandate inputs.

## Verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v13-auto-execution.spec.ts`: 5/5 passed.
- `pnpm --filter @stockquant/platform-api-service typecheck`: exit 0.
- `pnpm verify:stage -- --stage V1.3 --suite code`: exit 0; Platform 56 files / 246 tests, including the new application-service tests.
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`: exit 0; isolated Playwright matrix 21/21 passed.
- The matrix verified CN and US Fixture loops, owner/run and risk rejections, the AUTO_POLICY normal/HOLD/order-cap/paused paths, L08 fee correction and one-time Outbox retry, L07 partial-fill/cancel recovery, L06 UNKNOWN original-order lookup and Trade restart recovery, session invalidation, and persisted T+1 session advancement. The main AUTO_POLICY TestRun was `feaa6ca0-12d2-4901-881a-51d179a85280`; L06 query/recovery TestRun was `52462eb5-515d-4d6c-b724-3dd9f09d7056`; Trade-restart recovery TestRun was `7eb7b96e-2891-457a-8803-e6a4cccb6c54`.
- The E2E harness reported exact isolated containers, volume, network, and project resources removed. Real-broker and external-source calls were both zero. All generated TestRun human conclusions remain `NOT_RUN`; this audit is engineering evidence, not user acceptance.

## Preserved first attempt

An earlier full-matrix invocation omitted the dedicated `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true` input required by the L08 injected Outbox retry case. That run failed its expected retry-attempt assertion; it did not establish a product regression. The corrected invocation above supplied the declared failure input and passed 21/21. The failure was not overwritten or represented as a passing run; the successful raw terminal log is retained alongside this audit.

## Scope boundary

This extracts AUTO_POLICY coordination from the HTTP controller and verifies its current Web/API/CLI execution path. Other V1.3 coordination remains in HTTP controllers; this does not complete the broader P3 application-service extraction, all-market rule coverage, stage handoff instructions, or human acceptance. V1 remains INCOMPLETE.
