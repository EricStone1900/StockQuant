# V2.4 persistent WAITING HTTP smoke (2026-09-27)

## Scope

Added `services/platform-api-service/scripts/v24-waiting-http-smoke.mjs` and `pnpm --filter @stockquant/platform-api-service v24:waiting-http-smoke`; the V2.4-only code-suite plan invokes it after the shared checks. The script starts a temporary Platform API against the dedicated `platform_api_test` database, with automatic Paper scheduling disabled and downstream dependencies pointed at a temporary request-counting canary. It never connects to the active API or active Paper account.

## Result

The HTTP smoke exited 0. All three scenarios created and owner-read durable rows:

| Scenario | TestRun ID | Create/read | State |
| --- | --- | --- | --- |
| normal | `3b1ee18f-e08b-4b58-a882-1ae7b70576d5` | 202/200 | WAITING |
| rejection | `25753174-1f1c-4756-ad42-83af4a408985` | 202/200 | WAITING |
| recovery | `766d4014-7e26-40c8-9d8c-b6cf3073549a` | 202/200 | WAITING |

The three persisted TestRuns show `PAPER`/`FAKE`, `executionGate=BLOCKED`, Mandate `PREPARATION_ONLY`, source and reconciliation `NOT_RUN`, no orders or fills, and only WAITING assertions. Anonymous create returned 401; foreign-session create and read returned 403. The downstream canary observed zero requests. The script deleted the exact randomized stage-run IDs and verified none remained; `activeServicesTouched=false`.

The first attempt expected foreign read to return 404. The real session middleware rejects the foreign owner before the repository lookup, returning 403. The test expectation was corrected to the observed and intended authorization contract; the failed attempt is retained in the development log and was not counted as passing.

## Full V2.4 code-suite recheck

After wiring the HTTP smoke, `pnpm verify:stage -- --stage V2.4 --suite code` exited 0 in the approved isolated local test environment. Baseline at that run: 869 Markdown links; 126 JSON, 74 schemas, 34 Fixtures, 61 compatibility rules and 12 OpenAPI groups. Workspace build/lint/typecheck and tests passed, including Platform API 21 files/74 tests, Trade Execution 7 files/42 tests, Research Automation 26 files/150 tests, Qlib Worker 12 tests, operations 120/120, Python adapters 58/58, Market Data PostgreSQL 22/22, the FakeBroker/Portfolio recovery integration, and the new V2.4 HTTP smoke. The smoke output is above.

After the full-suite run, the cleanup path was tightened to use one checked-out PostgreSQL client for its explicit delete/verify transaction. The focused smoke was rerun against the final script and exited 0 with three more randomized WAITING runs (`dc16faf6-eaa2-42b2-afb6-2893717b32ac`, `0a96adde-4098-4053-89c6-8fa69d0f30c6`, `60d95f9a-b95e-458e-83b9-98d46a98479a`); all three rows were verified absent after cleanup.

The complete V2.4 code suite was then rerun against the final script and documentation state and exited 0. Baseline reported 871 Markdown links with zero failures, 126 JSON, 74 schemas, 34 Fixtures, 61 compatibility rules and 12 OpenAPI groups. It again passed build/lint/typecheck, all workspace tests, 120/120 operations tests, Python adapters 58/58, Market Data PostgreSQL 22/22, and the final HTTP smoke (TestRuns `ac895c89-c69f-4fea-8442-229e4b515639`, `769f0157-a35c-45e3-8e3e-26e24b6afd2e`, `3a45916b-c603-4e12-9cf2-8b6a36d4f779`; all removed and verified absent).

An earlier exact suite invocation in the ordinary sandbox stopped when the Qlib Python test could not bind its ephemeral loopback port (`EPERM`). It was retained; the same complete command passed under the approved local test environment without skipped tests.

## Limits

This proves API persistence and fail-closed readiness only. It does not connect market snapshots, Governance/Mandate, risk evaluation, resource reservation, FakeBroker placement, Portfolio accounting, or reconciliation. No Web/CLI same-run acceptance, 20-day observation, active deployment, or new human acceptance is claimed. V2.4 remains `PARTIALLY_IMPLEMENTED`.
