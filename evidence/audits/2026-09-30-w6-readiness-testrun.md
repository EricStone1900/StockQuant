# W6 V3.2 Readiness TestRun Foundation

Date: 2026-09-30

This increment adds owner-scoped, persisted `READINESS_ONLY` TestRun metadata for V3.2. The formal page can create one of the normal, rejection, or recovery preparation records and read the same ID. The CLI provides the same create/read behavior and a same-ID `--run ... --check-only` path. Each record remains `WAITING`; business assertions and human acceptance remain `NOT_RUN`. Candidate execution and Registry mutation are explicitly not performed.

The API validates scenario, seed, request properties, identity, optional V3.1 TestRun ownership, and same-owner reads. OpenAPI request/result schemas and the operation contract are checked. PostgreSQL persistence was exercised against the dedicated `platform_api_test` database; the integration test verified persistence, owner isolation, and idempotent save. The Web browser test uses mocked APIs and therefore is not a backend acceptance test.

Verification on this date:

- `pnpm --filter @stockquant/platform-api-service typecheck` and unit tests: PASS, 25 files / 90 tests.
- `PLATFORM_API_TEST_DATABASE_URL=postgresql://platform_api_test@127.0.0.1:5433/platform_api_test pnpm --filter @stockquant/platform-api-service test:integration`: PASS, 3 files / 3 tests, including V3.2 persistence and a mounted Nest HTTP test of POST/GET, anonymous rejection, invalid payload, and owner/cross-stage scope.
- The mounted HTTP test also supplies a synthetic exact owner-accepted V3.1 gate and verifies it only changes the V3.1 prerequisite blocker to `VERIFIED`; the V3.2 TestRun remains `WAITING`, all V3.2 assertions remain `NOT_RUN`, and human acceptance remains `NOT_RUN`.
- `node --test scripts/v32-readiness-cli.test.mjs`: PASS; normal/rejection/recovery create and read the same ID, with same-ID check-only and no external API calls.
- `pnpm --filter @stockquant/web typecheck`, build, and unit tests: PASS.
- `pnpm test:e2e -- --stage V3.2`: PASS, 5 Chromium tests using mocked APIs.
- `pnpm --filter @stockquant/research-automation-service v32:promotion-prepare-http-smoke`: PASS after binding the experiment to the same TestRun at creation; random isolated PostgreSQL database and temporary artifact directory were used and cleaned by the script.
- `pnpm verify:stage -- --stage V3.2 --suite code`: PASS after forwarding the dedicated database URL; all three Platform integration files / 3 tests ran and passed, including the HTTP integration test and synthetic accepted-gate case. This code-suite result is still an engineering check, not business acceptance.
- `pnpm --filter @stockquant/platform-api-service typecheck`: PASS.
- `pnpm docs:check`, `pnpm contracts:check`, and `git diff --check`: PASS.

The first full suite run exposed stale preparation-test assumptions and a promotion smoke that created its Experiment without the TestRun binding required by dispatch. Both were corrected and the full suite rerun. A mounted Nest HTTP test now covers the readiness route beyond controller unit tests and repository persistence. This evidence does not claim the formal V3.2 business workflow, true candidate execution, Registry mutation, promotion, or human acceptance.

## Runtime container extension (2026-09-30)

Added reproducible `pnpm verify:w8:v32-readiness` (`scripts/v32-readiness-container-smoke.mjs`) and included it in the V3.2 `--suite code` path. It builds the current Platform API for `linux/amd64`, starts it read-only/non-root in a random Docker `--internal` network, and starts a digest-pinned PostgreSQL 16.9 instance with SCRAM auth and tmpfs-only storage. Observed PASS: Platform `/live` 200; `/ready` 503 without Portfolio/Execution/Replay (fail-closed); readiness TestRun POST 202 with `WAITING`, `READINESS_ONLY`, `businessValidation=NOT_RUN`, `registryMutation=NOT_PERFORMED`, `paperCalls=0`; same-owner GET 200; anonymous GET 401; cross-owner GET 403; after Platform container restart, the same TestRun remained readable from PostgreSQL. The runner removes its temporary containers/network/image. It did not contact active services, mutate a Registry, execute candidate code or submit Paper orders.

The standalone runtime smoke passed with TestRun `67d64393-0142-4f1c-adcd-331529471761`; the full `pnpm verify:stage -- --stage V3.2 --suite code` then passed, including a second smoke run with TestRun `0b347ef0-4509-404a-8970-b2782cf99806`. The V3.2 result remains engineering evidence only: business validation and human acceptance are `NOT_RUN`.

After a logging-only change to silence expected connection-refused retries during startup, `pnpm verify:w8:v32-readiness` passed again with TestRun `b9677ff4-b078-4432-84e1-3f55e1e7225f`; API and persistence assertions were unchanged.

Cleanup hardening: the runner now unconditionally attempts to remove its UUID-scoped Platform/DB container names, internal network, and image in `finally`, including partial-start and failed-restart paths. The hardened standalone `pnpm verify:w8:v32-readiness` passed with TestRun `96ca46a3-9deb-44a0-8c57-14221163ad26`; a follow-up Docker inventory found no `sq-v32` container/network or `stockquant-v32-readiness-smoke` image.

After the cleanup hardening, the full `pnpm verify:stage -- --stage V3.2 --suite code` was rerun and passed on the final implementation; its integrated runtime smoke used TestRun `3cfea7c5-1da0-4b7c-98c0-f8f3f642e401`. A second post-suite inventory again found no temporary container, network or image. The result still records V3.2 business validation and human acceptance as `NOT_RUN`.

An earlier failed development iteration left one exited, randomly named smoke container and its uniquely tagged temporary image. Both exact resources were inspected and removed; follow-up Docker inventory showed no remaining `sq-v32` containers/networks or `stockquant-v32-readiness-smoke` images. The successful suite run's cleanup completed normally.
