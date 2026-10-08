# V1.2 strategy-output correction and stage verification — 2026-10-06

Status: fail-closed correction and automated stage verification PASS; P2 feature completion is still pending.

## Finding and correction

The Quant Research `/v1/factors/preview` route had returned two fixed ranking rows, and the Platform TestRun asserted only that the array contained two rows. That did not demonstrate a computation from the frozen daily-bar fixture. The route now returns `NOT_RUN` with no ranking until the strategy path is wired to the versioned data and Qlib worker. The V1.2 normal TestRun persists `WAITING` and a `NOT_RUN` factor assertion; the Web UI names the action as a status check, and same-run CLI correctly returns exit 2 for that run. Contract schema, generated TS/Python types and OpenAPI client were regenerated.

## Verification

- `pnpm contracts:generate` completed; `pnpm contracts:check` passed (182 schemas, 25 client generators, 110 consumer rules).
- Platform API typecheck and all 212 unit tests passed; Quant Research typecheck passed.
- First full suite attempt failed in an existing Market Data PostgreSQL test because it referenced `cancelledOrCompleted` without destructuring the first `Promise.all` result. No factor/E2E assertion failed in that attempt. The test now captures both operation results.
- Rerun: `pnpm verify:stage -- --stage V1.2 --suite code`, exit 0. This exercised baseline checks, full build/lint/typecheck/unit suites, isolated PostgreSQL integrations, service-auth HTTP, Python adapter checks, Market Data task restart smoke, real Qlib worker fit smoke, and V1.2 Chromium browser flow.
- The Web harness created normal `a899ddf7-e7cb-4913-a10d-44f158870c61`, rejection `2bebb8ce-f8d9-419e-ba93-eb341c2ebc6f`, and recovery `859a6aa5-c115-40d0-b174-7d278c029224`; the test read each exact UUID via check-only CLI. Normal correctly stayed `WAITING` (CLI exit 2); rejection/recovery passed their applicable automated checks.
- Harness URL was `http://127.0.0.1:54839/`. Isolated Compose project `sq-v12-e2e-b604934f959b86ee3c0e` was cleaned with its containers, volume and network.
- Fixture checks covered 21 files with no hash failures. Qlib 0.9.6 fit smoke used the frozen small model-fit fixture in its isolated worker; this does not provide V1.2 securities ranking or validate strategy effectiveness.

## Remaining work and limits

V1.2 remains incomplete. `fixtures/v1/v1.2/cn_daily.csv` contains only two CN securities and six daily bars; there is no US dataset, PIT-complete history, delisted/corporate-action coverage, or strategy output from the frozen market-data fixture. P2 must add a new fixture version, wire a real Qlib factor/strategy run to its persisted inputs and artifacts, independently recompute numerical expectations, and cover the Web task lifecycle. This correction does not edit old TestRun exports or historical signatures. No external provider, model API, real broker, active database, or active volume was used. Human acceptance remains `NOT_RUN`.

## Logs

- Initial failing attempt: [log](2026-10-06-v1-p2-v12-suite-initial-failure.log), SHA-256: `1ad5818cc6237dd89dbe29f3f18543852a4e9cc86256dce27ace02a0d8f7f2e1`
- Passing full rerun: [log](2026-10-06-v1-p2-v12-suite-pass.log), SHA-256: `492d3f48fdfe60a7370b741b2e416af23f9791fbf4f01819e930c857a350a1a8`
