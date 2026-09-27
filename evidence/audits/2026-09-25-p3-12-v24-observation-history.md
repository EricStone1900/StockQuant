# P3.12 V2.4 observation history

Date: 2026-09-25

## Delivered

- Added owner-scoped observation listing and a `GET /api/v1/acceptance/v2/v2.4/runs/{testRunId}/revisions` endpoint. The controller first resolves the TestRun for the session owner and only serves V2.4 `observation` runs; unknown, other-owner and other-scenario runs are not exposed.
- Added JSON Schemas, generated TypeScript/Python contract types, compatibility-matrix rules and the `v24-observation.v1` OpenAPI operation.
- Added a V2.4 Web history list and a revision view that displays the preserved prior status, assertions and evidence.
- Updated the V2.4 stage notes and platform API architecture notes. This change does not change market observation counts or human acceptance.

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @stockquant/platform-api-service typecheck` | PASS |
| `pnpm --filter @stockquant/platform-api-service test` | PASS, 37 tests across 11 files |
| `pnpm test:integration:platform` against isolated `platform_api_test` | PASS; owner-scoped revision read, hidden from a different owner, invalidation snapshot appended once, identical completion retry idempotent, conflicting terminal rewrite returns 409 |
| `pnpm --filter @stockquant/web typecheck` | PASS |
| `pnpm --filter @stockquant/web build` | PASS |
| `pnpm contracts:check` | PASS; 31 JSON files, 18 schemas, 8 fixtures, 17 generated schemas, compatibility and both OpenAPI documents |
| `node scripts/check-openapi-contract.mjs` | PASS |
| Targeted Playwright V2.4 history test | PASS, 1 browser test; mocked session and V2.4 observation/revision endpoints, rendered prior `COMPLETED` state and preserved evidence marker |
| `docker compose -f infra/compose/docker-compose.yml build platform-api-service web` | PASS; API image `sha256:0e55409098354987b7fe6d7b41516511d1c586f923a2d2b80483cc747a622bc8`, Web image `sha256:af081c98a0b870bcef46f2946fd328c9abaa06f2fe141e25efccb83600873f37`. Web container build initially exposed missing shared generated contracts in the build context; `apps/web/Dockerfile` now copies them. |
| `docker compose ... up -d --no-deps platform-api-service web` | PASS; both containers healthy/started, API `/ready` reports `ready`/`FAKE`; scheduler reports `PAPER`/`FAKE`. |
| Live API and observation state | PASS; owner-scoped observation list returns 200, a different owner returns 403, the revisions route returns 200. The checked production TestRun currently has no revision rows, so the live route correctly returns an empty list. Observation remains `WAITING`, 8/20, 12 remaining; scheduler returned to `RUNNING` at 30-minute sampling and the 2026-09-25 calendar is `CLOSED`. |
| Containerized Web history test (`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080`) | PASS, 1 browser test against the deployed Web container; session and revision responses are mocked to exercise rendering. |

## Remaining

The containerized UI test uses mocked API evidence; an actual production TestRun with a revision row is not available to verify end-to-end display of a live historical revision. Continue V2.4 Web/CLI same-TestRun verification when there is a suitable owner-owned run. Actual 20-trading-day observation remains on its existing schedule; this engineering slice does not claim V2.4 stage acceptance or human sign-off.

## Isolated real Web → API → PostgreSQL → CLI follow-up (2026-09-25)

Added `pnpm --filter @stockquant/platform-api-service v24:revision-web-http-smoke`. The harness uses only dedicated `platform_api_test`, creates a random synthetic V2.4 observation TestRun plus a delayed quality-error day, runs the existing PostgreSQL invalidation migration to preserve one revision, starts a temporary platform API process and Vite Web process, and uses Playwright through the actual `/api` proxy. The page lists that owner-scoped TestRun, the revision button uses the exact observation date, and the rendered revision shows `OBSERVATION_EVENT_ERRORS` plus the preserved same-run marker. It then runs V2.4 `--check-only` for that exact TestRun through the temporary API; exit 1 is expected because the retained original run is FAILED after invalidation, and the response includes the same ID/status. Exact revision, observation-day and TestRun rows are removed in `finally`; active services and the formal observation database are untouched.

PASS: TestRun `cb370aaa-0b30-4ce1-ba0b-54c07a04a107`, observation date `2098-03-24`, one persisted revision, browser/API/database flow and same-run CLI check. Platform persistence integration passed (11 cross-stage persistence checks plus V2.4 revision/idempotency suite); platform unit tests 40/40 and Web typecheck passed. The end-to-end used temporary local API/Web processes rather than containerized Web/API images. It does not use or modify any real production observation row, and it does not add an observation day or human acceptance.

The test exposed a timezone conversion defect: PostgreSQL `DATE` became a JavaScript `Date`, then `.toISOString().slice(0,10)` shifted the displayed observation date by one day. Observation list/finalization queries now project a `YYYY-MM-DD` string directly, and the isolated PostgreSQL integration test asserts the exact date. The full local-process browser/API/database/CLI chain passes; containerized same-run verification and access to a naturally occurring production revision remain pending.

## Containerized same-run follow-up (2026-09-25)

Added `pnpm --filter @stockquant/platform-api-service v24:revision-container-smoke`. The smoke seeds one synthetic V2.4 observation and persisted revision in the dedicated `platform_api_test` database, builds temporary API and Web images from the current worktree, and starts them on a random isolated Docker network. The API container connects to the dedicated host test database through Docker Desktop's host gateway; the Web container reaches the API only through its `/api` proxy. Playwright opens the containerized Web and verifies the exact observation date and preserved error marker. The V2.4 `--check-only` CLI then queries that same run through the containerized API; exit 1 is expected because the retained run is FAILED after its delayed quality error.

PASS: TestRun `57076a25-ccbf-4dae-ac95-9c71b61e9357`, synthetic observation date `2098-12-12`, one persisted revision; containerized Web→API→`platform_api_test`→same-run CLI all passed. The smoke reported `activeServicesTouched=false`. After completion, exact-name Docker inspection found no `sq-p3-v24-*` containers, network or tagged images; exact TestRun/revision/day rows were removed by the harness. The production V2.4 observation count and user acceptance were not changed.

Containerized same-run re-verification (2026-09-25): Re-ran `pnpm --filter @stockquant/platform-api-service v24:revision-container-smoke` against the current working tree. PASS: TestRun `72dc7006-e8bd-4d26-bc6e-3252d1c0ee2f`, synthetic observation date `2098-04-09`, one persisted revision, containerized Web→API→dedicated database→same-run CLI verified; `activeServicesTouched=false`. The run queried the actual same TestRun via CLI and observed the expected failed assertion state (exit 1); only the enclosing smoke returned 0. Its cleanup path removed the random test rows, temporary containers, network and images. This still does not increase the real observation count or establish a natural production revision/human acceptance.

Post-run resource inventory for the `sq-p3-v24-` prefix returned no containers, networks or images. This confirms the temporary Docker resources are absent after the re-verification.
