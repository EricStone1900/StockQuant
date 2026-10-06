# W6 V3.2 preparation code suite

Recorded 2026-10-03 08:21:44 UTC.

Command: `node scripts/run-isolated-postgres-command.mjs --url-env PLATFORM_API_TEST_DATABASE_URL:platform_api_test:platform_api_test -- pnpm verify:stage -- --stage V3.2 --suite code`. The complete suite exited 0. Platform API integration used a disposable PostgreSQL container; its DB, container and no-masquerade network were removed and verified. Quant Research's candidate registration and PromotionRequest smokes used their documented dedicated local Postgres test admin endpoint, each with fresh random test database names and cleanup; no shared ledgers were reset.

The V3.2 independent recomputation path passed 70 decision checks against a separate Python standard-library evaluator in a network-none, read-only Linux/amd64 container (emulated on Apple Silicon); trade results matched and returns remained within absolute tolerance `0.000001`. Candidate code execution was limited to the frozen synthetic Fixture and isolated candidate/evaluator containers; no live model, market-data, or broker call was made. Active Registry mutation was not performed.

The readiness HTTP smoke persisted recovery TestRun `f6239ede-cc29-41cb-ae81-3545506e38a8` as `WAITING` / `READINESS_ONLY`; same-owner read 200, anonymous 401 and foreign-owner 403. It recorded `businessValidation=NOT_RUN`, `registryMutation=NOT_PERFORMED`, `paperCalls=0`, `humanAcceptance=NOT_RUN`; restart read and internal-only readiness passed. Web typecheck/build and its unit test passed. Final harness output was `activeServices=NOT_CONNECTED` and cleanup PASS.

This closes only the offline, synthetic preparation code suite. A candidate built from an accepted real V3.1 experiment, independent business validation of that real candidate, exact-version human approval/consumption, downstream Paper, Ubuntu, and V3.2 acceptance remain incomplete. V3.2 stays `NOT_RUN`/readiness-only.
