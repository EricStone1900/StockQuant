# P5.5 portfolio service identity boundary

Date: 2026-09-25 (Asia/Shanghai). The service identity choice was confirmed by the project owner: one independent Bearer token per calling service.

## Implemented boundary

`portfolio-risk-service` now authenticates internal callers with constant-time token comparison and authorizes by both caller identity and route scope. Configured callers are `platform-api-service`, `trade-execution-service`, and `historical-replay-worker`; the `test-harness` identity is limited to the fault injection route in test mode. Unconfigured credentials fail readiness closed. Missing or invalid credentials return 401, and an authenticated identity outside its scope returns 403.

The platform account initialization and account snapshot calls, trade fill submission, historical replay initialization/snapshot calls, and the test-only fault injection call now send the matching Bearer token. The old `service-id` header is no longer used to establish identity at this boundary. Compose maps the distinct environment variables to each service. `.env.local` is ignored and mode 0600; token values are not included here.

Resource reservation routes are not exposed by this change. The reservation repository remains an isolated persistence primitive and is not yet connected to Mandate approval, stale snapshot rejection, risk evaluation, or execution. This audit therefore does not mark P5.5 complete.

## Verification evidence

- TypeScript build for `portfolio-risk-service`: exit 0.
- `pnpm verify:stage -- --stage V2.4 --suite code`: exit 0. Portfolio-risk unit 4/4, portfolio isolated PostgreSQL integration 2/2, trade execution unit 27/27 and isolated PostgreSQL suite passed; platform API unit 37/37; market-data service integration 17/17; Python adapter 55/55; operations 82/82; contract validation 28 schemas, 16 fixtures and 17 compatibility rules. Other included typecheck, lint and workspace checks passed.
- `PORTFOLIO_RISK_TEST_DATABASE_URL=postgresql://portfolio_risk@127.0.0.1:5433/portfolio_risk_test pnpm --filter @stockquant/portfolio-risk-service service-auth:http-smoke`: exit 0, `testRunId=b4c81050-0cfc-4357-b53e-1b0a3ab498d9`. Missing Bearer 401; wrong Bearer 401; wrong route scope 403; own-account snapshot 200; foreign owner 403; platform fill submission 403. The smoke removed its exact temporary account records.
- `docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet`: exit 0; no services were started or restarted.
- `pnpm docs:check`: 521 local Markdown links passed; `git diff --check` passed.

The new portfolio authentication code has not been deployed to the active service container. Existing Paper and collection processes were left running. No real broker was contacted and no order was placed. Human acceptance remains pending.

## Remaining P5.5 gates

OD-007 exact strategy, account/market scope and limits remain UNSET. Implementing reservation HTTP commands requires the mandate and risk contracts to be finalized, then wiring concurrency-safe reserve/release and UNKNOWN handling into FakeBroker execution and independent ledgers. Complete normal, rejection, duplicate/idempotency and recovery scenarios through Web and CLI with the same TestRun before claiming the stage. Deployment, full observation and user acceptance are also outstanding.

## 2026-09-25 implementation update

The earlier statement that resource reservation routes were not exposed is superseded. The trade-execution caller can now use authenticated reserve and resolve endpoints; portfolio contract/OpenAPI validation includes both operations. A dedicated HTTP+PostgreSQL smoke passed authentication, caller/account-scope rejection, idempotency, insufficient-budget rejection, UNKNOWN retention, invalid-outcome rejection and evidence-backed cancellation release. The full V2.4 code suite passed after the change. The new routes remain disconnected from Mandate/risk evaluation and order placement; OD-007 is unset, new service code is not deployed, and the remaining P5.5 gates above still apply.
