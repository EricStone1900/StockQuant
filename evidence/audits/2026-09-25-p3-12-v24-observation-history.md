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
