# V3.2 PromotionRequest guarded submit client

Date: 2026-09-27 (Asia/Shanghai)

## Change

Added an application submission coordinator and a bounded Quant HTTP adapter in `research-automation-service`. The coordinator requires an authoritative V3.1 gate record for the exact TestRun, with `stageStatus=PASS`, `humanAcceptance=ACCEPTED`, and a SHA-256 evidence reference before it invokes the Quant submit port. Missing or incomplete acceptance returns `WAITING` without a Quant call. A mismatched TestRun is rejected. The HTTP adapter sends only the immutable request to `POST /v1/promotions` with the dedicated Bearer token, refuses redirects, bounds timeout/response size, validates the result schema and state, and represents timeout/transport/ambiguous responses as `UNKNOWN` for exact idempotency-key reconciliation; it does not blindly retry. A PostgreSQL journal now reserves the idempotency key before network submission and stores `SUBMITTING`/`SUBMITTED`/`UNKNOWN`, exact request fingerprint and response. It also binds each journal row to the V3.1 acceptance evidence hash. After a crash or timeout, repeat preparation becomes reconcile-only; concurrent callers cannot both POST. The journal is exposed as an application port with the PostgreSQL implementation in the adapter layer. The random isolated PG/HTTP preparation smoke now tests the journal across adapter recreation, including successful replay and persisted UNKNOWN, without contacting Quant.

## Verification

- `pnpm --filter @stockquant/research-automation-service build` — PASS.
- `pnpm --filter @stockquant/research-automation-service test` — PASS, 23 files / 135 tests after this turn's gate-negative coverage.
- `pnpm verify:stage -- --stage V3.2 --suite code` — PASS after the change; suite scope includes the guarded submit client. Quant 25 TypeScript + 3 Python tests, candidate/promotion isolated PG/HTTP smokes, Research Automation 131 unit tests/build and persisted preparation+journal PG/HTTP smoke, contracts/Fixtures, and Web typecheck/test all passed.
- Integration spec itself is conditional and skipped when `RESEARCH_AUTOMATION_DATABASE_URL` is unset; equivalent journal crash/replay properties were run in the suite's random temporary PostgreSQL database by the preparation HTTP smoke.
- Covered absent V3.1 record, missing/rejected human acceptance, failed stage, wrong TestRun, malformed evidence hash, exact successful gate, ambiguous submission, immutable request/auth headers, unexpected response, credential-bearing URL, and weak token rejection. All rejected gates leave the journal unopened and Quant untouched.
- `pnpm docs:check` and `git diff --check` are run with the current plan update.

## Boundary

This is a fail-closed application/client slice only. Inspection confirms platform `acceptance_records` references legacy V1.1 `test_runs`; no V3.1 experiment TestRun acceptance write/read API exists, and the fixed Pipeline route is not a human sign-off record. Quant submit credentials/URL are not configured, and this coordinator is not wired to an HTTP route. The durable journal is available but has no production submission entry point. Therefore no Quant request was sent. V3.1/V3.2 business validation and human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`. This evidence is not a V3.1 acceptance record and cannot itself open the gate.

## 2026-09-27 follow-up

Extended the submission unit coverage for failed stage, rejected human decision, invalid SHA-256, and gate record/TestRun mismatch. The three incomplete/negative gate cases return `WAITING` before journal reservation; the mismatched run throws before journal reservation. `pnpm --filter @stockquant/research-automation-service test` passed 23 files / 135 tests. The missing authoritative V3.1 sign-off source remains the deliberate integration blocker; no gate was synthesized and no Quant request was sent.

The complete `pnpm verify:stage -- --stage V3.2 --suite code` was rerun and exited 0. Its report says code suite `PASS`, business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, and human acceptance `NOT_RUN`; it includes contracts/fixtures, Quant 25 TypeScript + 3 Python tests and random isolated PostgreSQL HTTP smokes, Research Automation build/135 tests and its random-PostgreSQL preparation+journal HTTP smoke, and Web typecheck/test. The first sandboxed attempt failed only because the worker test could not bind a random localhost port (`EPERM`); rerunning with localhost test permission passed. Both attempts are retained as verification history.
