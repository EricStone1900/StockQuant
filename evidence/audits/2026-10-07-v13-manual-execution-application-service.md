# V1.3 MANUAL_APPROVAL application service verification

Date: 2026-10-07 (Asia/Shanghai)

## Result

The approved MANUAL_APPROVAL execution endpoint now delegates TestRun, owner/Proposal, PAPER/FAKE account, and stable clientOrderId checks plus the Trade command to `services/platform-api-service/src/application/v13-manual-execution.ts`. The application service passes the injected TestRun clock and leaves execution authorization, reservations, FakeBroker orders/fills, and Portfolio ledger facts to their owning services. Five focused unit tests cover valid command construction, owner/Run isolation, account scope, status handling, bounded idempotency key, and missing clock rejection.

## Verification

- Focused Vitest: 5/5 passed; Platform typecheck exit 0.
- `pnpm verify:stage -- --stage V1.3 --suite code`: exit 0. Platform 57 files / 251 tests; Research Automation 38 files / 218 tests; Quant Python Worker 14 tests.
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`: exit 0; Playwright 21/21. The matrix included normal CN MANUAL approval and FakeBroker order, independent US MANUAL approval and order, rejection, idempotent reads, T+1 rejection/next-session sale, AUTO_POLICY boundaries, L06 UNKNOWN recovery, L07 sequence/restart recovery, and L08 fee Outbox retry.
- Representative TestRuns: CN manual normal `8dd89ce2-0cfa-40ea-84c2-12a873d54762`; US manual normal `6ea221bf-02af-421c-a0ed-889d433b356c`; AUTO_POLICY normal `419819c7-9fb7-4344-bba7-5c5f8a2de5d3`.
- Harness confirmed exact isolated project resources removed; real broker and external-source calls were zero. Human conclusions remain `NOT_RUN`.

## Preserved environment attempt

The first code-suite attempt in the restricted shell exited 2 when the Python Worker test could not access the local Docker daemon. A read-only image inspection through the approved local-daemon path confirmed the exact locked `python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e` image was already present as linux/arm64; no image was fetched or rebuilt. The same code suite then passed with controlled local Docker access.

## Scope boundary

This extracts approved MANUAL proposal dispatch and verifies its current CN/US Web path. Proposal creation/revision/approval coordination and sequenced-fill/cancellation operations remain separate controller methods, so the P3 requirement to extract all business coordination is still open. This engineering audit is not user acceptance; V1 remains INCOMPLETE.
