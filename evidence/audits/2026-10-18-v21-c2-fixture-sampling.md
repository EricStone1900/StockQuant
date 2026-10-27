# V2.1 C2 synthetic snapshot sampling increment

Date: 2026-10-18  
Scope: C2 local deterministic Fixture sampling execution only.  
Status: engineering evidence PASS for the Fixture path; C2/V2.1 remains IN_PROGRESS.

## Change

- Froze `v2.1-snapshot-sampling-1` at `fixtures/v2/v2.1-snapshot-sampling/manifest.json`.
- Input file SHA-256: `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`.
- Added authenticated `POST /v2/sampling/tasks/tick-fixture`, Platform forwarding, OpenAPI and generated client support.
- Added an explicit V2.1 acceptance-page action and result display for the synthetic sampling Fixture; the normal authorization-blocked tick remains a separate action.
- The Fixture endpoint validates the manifest identity and file bytes before persisting a `COMPLETED_FIXTURE` task with the fixture version, hash and two observations. Replay of the same settings version and scheduled instant returns the original task.
- Schema v6 adds durable Fixture result metadata and observations. The regular `/tick` path remains authorization-blocked under OD-008 NONE and records no provider request.
- The sampling configuration now reports monitor, daily-strategy and order schedules as `NOT_CONFIGURED`; the earlier `INDEPENDENT_POLICY` labels could be mistaken for implemented schedules.

## Verification

- `pnpm --filter @stockquant/market-data-service test`: 21 files, 94 tests PASS.
- Market Data and Platform typecheck: PASS.
- `pnpm contracts:check`: PASS; 338 JSON files, 218 schemas, 72 fixture descriptors checked.
- `pnpm fixtures:check`: PASS; 51 fixture files checked.
- `pnpm docs:check`: PASS; 13,936 local links checked.
- `pnpm --filter @stockquant/market-data-service test:schema-migrations`: PASS; migrations v1–v6, repeated/concurrent start, blocked and Fixture task idempotency, repository restart recovery, legacy data preserved, unknown future schema rejected. Isolated PostgreSQL container/network removed and verified.
- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`: PASS; blocked provider tick plus explicit Fixture tick, two observations persisted, retry idempotent, process restart recovers Fixture version/hash/results, news and quote providers remain HTTP 403, external requests 0. Isolated PostgreSQL container/network removed and verified.
- `pnpm --filter @stockquant/web typecheck`: PASS.
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts`: 1/1 PASS; mocked Web route verifies both blocked and Fixture result presentation. This is a Web test, not full browser-to-PostgreSQL evidence.
- An initial Playwright invocation accidentally selected the repository-wide 85-test suite. It was interrupted after the V2.1 C2 case passed; unrelated existing V1.1/DC-06/V2.4 cases failed because their isolated harness/session/token environment was not configured. The V2.1 test was then run alone and passed; no conclusions about those other stages are drawn here.
- `pnpm stack:up -- --stage V2.1`: PASS, emitted `READY_FOR_MANUAL_ACCEPTANCE`; dynamic Web `http://127.0.0.1:63174/acceptance/v2/v2.1`, Platform API `http://127.0.0.1:63171`, Market Data `http://127.0.0.1:63159`; Web route and both `/live` endpoints returned HTTP 200. Source authorization was disabled, broker mode FAKE, LIVE false.
- `pnpm stack:down -- --project sq-v21-stack-49532e849282d9296c7e`: PASS, emitted `STOPPED_AND_PURGED`; script verified that project containers, volumes, networks, project images and temporary credential files were removed. No unrelated project was targeted.
- A subsequent `curl` inspection of the Web session-proxy route did not return within the bounded tool window and was stopped. This is not counted as an API session-path pass; full Web session/manual scenario and same-TestRun CLI checks remain open.

## Remaining C2/V2.1 gates

This Fixture does not validate real quote collection, freshness against a live provider, source license or provider capability. OD-008 remains NONE. The live news adapter still lacks a stable source item ID. Independent monitor, daily-bar, strategy-evaluation and order-execution schedules remain unimplemented. Stage runbook completion, same-TestRun Web/CLI evidence and human acceptance remain outstanding. No user acceptance was signed by this change.
