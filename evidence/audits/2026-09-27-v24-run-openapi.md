# V2.4 TestRun create/read OpenAPI and generated client audit

Date: 2026-09-27 (Asia/Shanghai)

## Change

Added strict JSON Schemas for the V2.4 readiness-run request, accepted response, and persisted run response. The OpenAPI document now describes the existing owner-scoped POST and GET routes and their authentication/error responses. The compatibility matrix tracks all three schemas. The Web calls POST and GET using generated request/response types.

The contract intentionally models only the currently implemented behavior: `WAITING`, `PAPER`/`FAKE`, `NOT_CONNECTED`, `PREPARATION_ONLY`, zero observation days, no orders/fills, and `NOT_RUN` source/reconciliation. It does not claim that the SNAPSHOT→Mandate/risk/reservation/FakeBroker chain is implemented.

## Verification

- `pnpm contracts:check`: PASS; 129 JSON files, 77 schemas, 34 fixtures; 64 compatibility rules; V2.4 OpenAPI has 3 operations.
- `pnpm --filter @stockquant/web typecheck`: PASS.
- `node --test scripts/code-suite-plan.test.mjs`: 4/4 PASS.
- Ordinary sandbox `pnpm verify:stage -- --stage V2.4 --suite code`: stopped when the Qlib Worker unit test could not bind its temporary loopback socket (`EPERM`). This failure is retained.
- The same full stage command in the authorized isolated local test environment: PASS after CLI and Chromium same-run additions. Includes workspace build/lint/typecheck/unit; 120 Ops tests; Python Adapter 58; Platform API 74; Trade Execution 42; Research Automation 150; Qlib Worker 12; Market Data PostgreSQL integration 22/22; FakeBroker/Portfolio isolated integrations; and `v24:waiting-http-smoke`.
- HTTP smoke created and read normal/rejection/recovery TestRuns in isolated `platform_api_test`: each POST 202, GET 200, persisted `WAITING`; anonymous 401; foreign owner 403; downstream request canary 0. It invoked CLI `--run <same UUID> --check-only` for each API-created run; CLI returned exit 2 (correctly preserving WAITING) with the identical UUID/status. A real local Vite + Chromium run created a fourth persisted WAITING TestRun through the Web page, then CLI read that same UUID with exit 2. Latest full-suite direct HTTP IDs: `a2590016-3fbe-4919-8df9-4fd0fb5f8d73`, `84958ab2-c21e-45e3-af5b-87d5c507308a`, `fcbf888a-dc59-4af0-bede-a511e45c73cd`; browser-created same-run ID: `95a568fa-06a7-41a4-ba41-2be6bbe2d379`. The smoke deleted all four exact random rows and verified absence.
- Final `pnpm baseline:check`: PASS; 878 Markdown links, 129 JSON files, 77 schemas, 34 fixtures, 64 compatibility rules, and 12 OpenAPI groups. `git diff --check`: PASS after the same-run CLI smoke and acceptance-table updates.

## Limits

This verifies contracts, typed Web calls, the persistent Web→API→PostgreSQL→CLI same-run readiness-state path, and isolation only. It does not run a Paper scenario, access live market data, call downstream trading services, change active services, count an observation day, or constitute user acceptance. Activity sessions/deployment and 20 trading-day observation remain separate gates.
