# P5.5 V2.4 read-only Paper readiness

Date: 2026-09-27  
Scope: local Trade Execution source and isolated `trade_execution_test`; no active service deployment, no user TestRun, no order path.

## Result

Added `GET /internal/v1/v24/paper-readiness?market=CN_A|US_EQUITY`. Access requires both `x-stockquant-service-id: platform-api-service` and the distinct Platform API Bearer token. Replay, missing credentials, forged service identity, and write verbs are denied. The endpoint reads the checked-in policy and Mandate preparation contracts and uses the existing domain gates.

CN_A returns `BLOCKED` because strategy, Mandate, quote-deviation, risk and fee policy are still unset. US_EQUITY returns `REJECTED` because no independent US policy/Mandate is defined. Both explicitly report risk evaluation and resource reservation as `NOT_RUN`; `orderSubmissionEnabled` and `liveTradingEnabled` remain false. Neither response allows order creation.

## Verification

- `pnpm --filter @stockquant/trade-execution-service test`: 8 files, 45 tests passed.
- `pnpm contracts:check`: 131 JSON files, 78 schemas, 34 fixtures, 65 compatibility rules, and all 13 OpenAPI groups passed.
- `node --test scripts/code-suite-plan.test.mjs`: 4 tests passed; V2.4 includes this HTTP smoke.
- `pnpm --filter @stockquant/trade-execution-service test:v24-readiness`: passed against isolated local PostgreSQL and a temporary loopback HTTP service. Missing token/wrong Bearer/forged identity/write verb returned 403; CN_A returned 200/BLOCKED; US_EQUITY returned 200/REJECTED; invalid market returned 400. FakeBroker order/fill/event/outbox row counts remained 0 before and after.
- Final `pnpm verify:stage -- --stage V2.4 --suite code` exited 0 after integration; this includes all workspace build/lint/typecheck/unit checks, V2.4 Web/API/CLI same-run WAITING smoke, Trade Execution/Portfolio and Market Data isolated persistence/HTTP checks, and the new readiness smoke.
- Initial ordinary sandbox run could not bind loopback (`EPERM`); the same smoke completed in its authorized isolated environment. An initial smoke assertion exposed a test-helper default-parameter mistake; after correcting the missing-token input, the full smoke passed.

## Limits

This is a local read-only readiness slice. It does not evaluate order-specific snapshot risk, reserve resources, accept a SNAPSHOT order, update Portfolio, connect sampling to FakeBroker, deploy the service, start the 20-real-trading-day observation, or satisfy V2.4 Web/CLI business acceptance. OD-007 remains open and exact strategy/Mandate/risk/fee values remain unset. P5.5 and V2.4 remain incomplete; no human acceptance is recorded.

## Platform and Web follow-up

The session-protected Platform route `GET /api/v1/acceptance/v2/v2.4/paper-readiness?market=CN_A|US_EQUITY` now proxies the internal endpoint using Platform API's distinct service Bearer and renders status, policy/Mandate gates, risk/reservation state, and disabled-order flags on `/acceptance/v2/v2.4`. Contracts checker now verifies this fourth V2.4 observation API operation.

The isolated HTTP smoke passed: anonymous proxy access returned 401; an authenticated session caused exactly one Trade Execution call with `x-stockquant-service-id: platform-api-service` and the Platform Bearer; the response stayed BLOCKED and order submission disabled. Existing normal/rejection/recovery Web/API/CLI runs remained WAITING, and Chromium read the same browser-created TestRun through CLI check-only. The readiness panel was exercised in Chromium with a fixed response stub. Initially the live Platform→Trade Execution request was tested separately; the follow-up below now covers the actual HTTP hop in this same isolated harness. This is interface readiness evidence only and does not upgrade business acceptance.

## Container runtime verification

Added `pnpm --filter @stockquant/trade-execution-service test:v24-readiness:container` and registered it in the V2.4 code suite. It builds the production Dockerfile, runs a temporary internal-only PostgreSQL and the actual Trade Execution image with a read-only root, dropped capabilities, `no-new-privileges`, and PID limit, then sends real HTTP requests from an isolated probe. Both ARM64 native and AMD64 emulation passed. ARM64 image ID: `sha256:a62eee9c7b68baf36aa06766cdc38bad2bef326d7595c72284be1833dfae3231`; AMD64 image ID: `sha256:e0d6902fa358745c090c2d2304ecfd8e713d083a85aebcd23afb6bcaf2fc3462`. The readiness policy and Mandate fixtures were present in the runtime image; `/ready` returned 200; wrong/missing credentials and wrong route scope returned 403; CN_A was 200/BLOCKED and US_EQUITY 200/REJECTED. FakeBroker order/fill/event/outbox row counts all stayed zero. Containers, internal networks, and tagged images were removed by the smoke script. AMD64 evidence is Docker Desktop emulation on Apple Silicon, not native Ubuntu evidence.

After registering the container smoke and generator regression test, the complete `pnpm verify:stage -- --stage V2.4 --suite code` exited 0. It exercised the integrated HTTP readiness smoke, Platform session-proxy plus Chromium UI and Web/API/CLI same-run checks, then built/ran the ARM64 service container within the same run. The code-suite baseline saw 889 Markdown links, all contracts/fixtures valid, and its Ops tests reported 121/121. A separate final `pnpm baseline:check` also passed (889 Markdown links, 131 JSON files, 78 schemas, 34 fixtures, 65 compatibility rules, 13 OpenAPI documents).

The V2.4 response schema's nested `oneOf` variants were initially generated as `unknown` in TypeScript, which forced an unnecessary Web cast. The schema generator now emits `oneOf`/`anyOf` unions and `allOf` intersections; generated TS consumers now retain the BLOCKED/REJECTED discriminants. A generator regression test passes, all workspace TypeScript projects typecheck, and `pnpm contracts:check` confirms generated outputs are synchronized. The Web no longer casts the policy or Mandate readiness gate.

## Real Platform-to-Trade Execution HTTP follow-up

Updated `v24:waiting-http-smoke` to build and launch the actual Trade Execution source process against its own isolated `trade_execution_test` database, while Platform API uses `platform_api_test`. The session-authenticated Platform proxy reached that process over HTTP with the Platform-only bearer and returned the real CN_A `BLOCKED` and US_EQUITY `REJECTED` results. Both responses keep risk/reservation `NOT_RUN` and order submission disabled. A forged bearer was rejected with 403. Four FakeBroker ledger counts (orders, fills, events, outbox) remained zero; the unrelated downstream canary received no requests. The same run retained anonymous/session/owner checks, the three WAITING scenarios, CLI `--check-only` exit 2, and Chromium same-TestRun check. Exact per-owner TestRun cleanup completed. Targeted command `pnpm --filter @stockquant/platform-api-service v24:waiting-http-smoke` exited 0. The browser panel continues to use a fixed response for display coverage, so the actual HTTP proof is the server-side proxy request in this harness, not a browser-to-live-service acceptance claim.

After this integration follow-up, `pnpm verify:stage -- --stage V2.4 --suite code` exited 0, including the updated two-database/real-process smoke, workspace checks, service integrations, 58 Python adapter tests, and ARM64 Trade Execution container smoke. The suite's baseline reported 892 Markdown links, 131 JSON, 78 schemas, 34 fixtures, 65 compatibility rules, and 13 OpenAPI groups. Human acceptance and live 20-day observation remain pending.

## Standalone V2.4 E2E command repair

The first standalone `pnpm test:e2e -- --stage V2.4` run exited 1: two legacy/history UI tests passed, one was skipped by its condition, and the same-TestRun browser test failed immediately because the public command had not supplied its expected `STOCKQUANT_LOCAL_DEVELOPMENT_USER` or `STOCKQUANT_PLATFORM_API_URL` and had no temporary API/database setup. The failure was preserved. Updated `scripts/test-e2e-stage.mjs` so V2.4 invokes the self-contained HTTP/browser smoke rather than an under-provisioned Playwright filter, with two Ops regression tests proving V2.4 routing and preserving other stages' Web tests. Rerunning the exact command exited 0 against isolated `platform_api_test`/`trade_execution_test`; Chromium same-run and CLI read-through passed, every scenario remained WAITING, the real readiness proxy reached Trade Execution, forged bearer returned 403, and all FakeBroker tables remained empty. The same real proxy smoke now checks both market responses: CN_A `BLOCKED`, US_EQUITY `REJECTED`, risk/reservation still `NOT_RUN`, and orders disabled in both markets. The V2.4 stage instructions now describe this setup and distinguish the mocked browser card from the real server-side HTTP hop. Full V2.4 code suite exited 0 after the cross-market assertions; full Ops suite, `baseline:check`, and `git diff --check` passed after the command repair.

The read-only data observation was also refreshed at 19:16 Asia/Shanghai; details and snapshot hashes are in [the P4 live check](2026-09-27-p4-live-readonly-check-1916.md). Runtime health is not counted as an observation day. After all current documentation edits, the final `pnpm baseline:check` passed with 893 Markdown links, 131 JSON files, 78 schemas, 34 fixtures, 65 compatibility rules, and 13 OpenAPI groups; `git diff --check` also passed.
