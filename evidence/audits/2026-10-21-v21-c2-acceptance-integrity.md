# V2.1 C2 acceptance-integrity regression

Date: 2026-10-21. Scope: Fixture-only C2 acceptance correctness. Real quote/news providers remained disabled; no broker operations were available.

## Repairs verified

- The Fixture worker now derives `ingestedAt` and `availableAt` deterministically from the frozen scheduled instant (+10 minutes). Worker wall time remains for leases and retries only. A normal Fixture run requires two fresh observations, full coverage, `READY`, and no quality anomalies.
- The C2 interval matrix uses `acceptanceIntervalMinutes` as a TestRun-scoped Fixture input. It does not mutate the persisted production sampling configuration.
- A C2 scenario exception now writes the TestRun as terminal `FAILED`, with `V2.1-RUN-EXECUTION-001` and a bounded failure record, instead of leaving a durable `WAITING` record.
- News verification now checks the frozen stable IDs, revision 1→2 supersession, known/unknown publication-time handling, and linked/ambiguous entity projections.

## Commands and results

| Check | Result |
|---|---|
| `pnpm contracts:generate && pnpm contracts:check` | PASS |
| `pnpm --filter market-data-service test -- tests/unit/v21-snapshot-sampling-fixture.spec.ts` | PASS, 126 unit tests |
| Platform API and Market Data `typecheck` | PASS |
| `pnpm --filter market-data-service sampling:http-restart-smoke` | PASS; isolated PostgreSQL removed and verified |
| Isolated Web/service stack API run | normal `7b3233fd-cb51-489a-a085-c8a6d062deb2` 7/7 PASS; rejection `912fbb58-5144-4d5b-ad50-7f2c2d0e084a` 2/2 PASS; recovery `cb6f506e-efb8-4d5e-8dfe-ea077b84945f` 2/2 PASS |
| same-run `pnpm verify:stage -- --stage V2.1 --run 7b3233fd-cb51-489a-a085-c8a6d062deb2 --check-only` | PASS |
| `pnpm evidence:export -- --stage V2.1 --run 7b3233fd-cb51-489a-a085-c8a6d062deb2` | PASS; evidence SHA-256 `4b0d8b4d8fd8dc11e8b8175aaa054a89a7ef5863d8bf8fd8dc05415663d02720` |

The browser automation client blocked the loopback URL before a browser screenshot could be taken. This did not affect the containerized API/TestRun, CLI check-only, or export evidence. It remains a local browser-tool limitation, not a passing Web-manual record.

## Remaining C2 work

This regression does not close OD-008: documented rights/capability validation and actual article acquisition for one quote source plus two news sources remain required. The C2 Fixture recovery scenario proves idempotent daily-task replay, not a deliberately injected worker failure and restart. Strategy and order execution remain later C5/OD-007 scope.
