# V3.1 persisted exact-run acceptance gate

Date: 2026-09-27 (Asia/Shanghai)

## Implemented boundary

Platform API now stores a separate immutable `v31_acceptance_records` row bound to one completed V3.1 TestRun, its owner, and a canonical SHA-256 of the exact run identity and evidence. The user write route requires the authenticated local user to submit the explicit `ACCEPT_EXACT_V31_RUN` confirmation with a note. It does not create an acceptance unless the exact normal run is complete, all assertions pass (including `V3.1-REAL-MODEL-001` and `V3.1-RUNNER-001`), environment is `RESEARCH` with broker `FAKE`, model evidence says `LIVE` with response hash and actual cost, and the completed Runner evidence contains a published output hash. Identical retries are idempotent; differing confirmation content conflicts.

Research Automation reads the status from `GET /internal/v1/acceptance/v3/v3.1/gate/{testRunId}`. The route requires the independent `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION` Bearer token and matching `x-stockquant-service-id`; the Platform token cannot substitute. Compose gives that token to Platform for validation. The new request/response schemas and OpenAPI contract describe both the user write and service read boundaries.

## Verification

- Final `pnpm verify:stage -- --stage V3.1 --suite code` exited 0 after registering both the gate and owner-session proxy behavior in the required HTTP smoke. It included contract validation (109 JSON files, 59 schemas, 34 fixtures, 46 compatibility rules, 10 OpenAPI groups), Research Automation 138 unit tests and 17 PostgreSQL integration tests, Platform API 58 unit tests, the V3.1/V3.2-proxy HTTP smoke, and Web typecheck.
- The HTTP smoke ran against dedicated local test databases and temporary service processes. It verified missing service identity 401, wrong bearer 403, pre-acceptance human status `NOT_RUN`, anonymous user write 401, explicit test-user write 201, identical replay, changed note 409, and subsequent `ACCEPTED` gate read. Its model/Runner facts were synthetic contract fixtures; the smoke removed its exact temporary acceptance/run/artifact/job rows and did not touch active services.
- The same smoke verifies the owner-session Platform V3.2 submit proxy returns `WAITING` when the associated experiment is absent and returns `humanAcceptance=NOT_CHANGED`.
- The V3.1 Web screen now reads the owner-scoped gate and only displays the exact-run acceptance action when it says `stageStatus=PASS` and `humanAcceptance=NOT_RUN`. The acceptance write is bound to the currently displayed TestRun and then refreshes the gate.
- Six focused V3.1/V3.2 Playwright tests passed, including the gated V3.1 acceptance interaction and V3.2 explicit submission UI, all with synthetic intercepted API responses.
- Final `pnpm baseline:check` passed (797 Markdown links, 109 JSON files, 59 schemas, 34 fixtures, 46 compatibility rules and 10 OpenAPI groups). `git diff --check` and `docker compose -f infra/compose/docker-compose.yml config --quiet` passed.
- The six focused Playwright tests used mocked API responses. An earlier broad invocation reached a configured V3.1 service via the legacy page test and received `422 stage budget exhausted`; whether the budget state predated that test is unknown. The potentially shared persistence was left untouched and unqueried; the page test now uses API mocks.

## Status and limits

No V3.1 acceptance record was written to production or active persistence. This audit is implementation and synthetic integration evidence only. The earlier page test's exact effect on potentially shared run/budget state is unverified. The existing V3.1 Fixture run cannot satisfy the LIVE-model gate. Actual model call, completed experiment evidence, a user's acceptance of the exact qualifying run, and Research Automation consumption of this gate before V3.2 submission remain unverified. V3.1 and V3.2 business acceptance remain `NOT_RUN`.
