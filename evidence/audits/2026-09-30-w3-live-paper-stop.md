# W3 active V2.4 sampling stop and legacy evidence qualification

Date: 2026-09-30 (Asia/Shanghai)

## Decision and action

The project owner confirmed the W3 baseline is `NO_TRADE` and there is no source-use authorization. This applies to any new V2.4 source reads, active strategy, simulated orders, or O2 observation. The existing DC-08A collector is independent and was not changed.

## Active runtime evidence

Read-only Docker inspection found `stockquant-v12-platform-api-service-1` (container `2d3b6d1c18fd`) still running the older Platform image/configuration with `STOCKQUANT_V24_AUTO_START=true`; the source-approval environment variable was absent. The authenticated V2.4 scheduler status endpoint reported `RUNNING`, tickCount 231, last tick `2026-09-30T06:29:59.947Z`, and next tick `2026-09-30T07:00:00Z`.

To enforce the owner’s no-trade/no-source boundary, the V2.4 scheduler stop API was invoked. It returned `STOPPED`, `nextSampleAt=null`, tickCount 231. A follow-up status read also returned `STOPPED`. A subsequent container inspection confirmed the services remained running; no service restart, image change, database mutation, Market Data quote request, Paper account activation, or order was performed. DC-08A remained untouched.

The active old container still has `AUTO_START=true` and a restart policy. A future container restart could restart the old sampler. Workspace Compose now defaults AUTO_START and source approval to false, with authorization reference and data version empty, but this configuration is not deployed. Do not restart or replace the active Platform before W8 backup, maintenance-window, image/digest and rollback prerequisites are met.

## Legacy observation records

Read-only summary found ten V2.4 records marked `observationCounted=true` for 2026-09-15–18, 21–24, 28–29, and two false dates, 2026-09-19 and 25. The ten marked dates had no per-security source evidence: `sourceAvailable`, `lastSnapshotAt`, and `dataAgeSeconds` were null, and `sourceProbe` was absent. Later summaries reported ten sampling events but did not preserve the per-security quote evidence required for qualification. These records remain unchanged in the database, but they do not meet the new qualification and do not count toward O2. Current strict V2.4 progress is 0/20, with ten historical marks awaiting evidence.

This does not change the separate archived DC-08A result, 7/20 (six continuously complete days plus one recovered day). The DC-08A health report at 06:17Z and its run counts are historical snapshots, not a current live probe.

## Code and configuration safeguards

The workspace source gate requires the approval boolean, a non-empty authorization evidence reference, and a non-empty data version. The observation-summary calculation preserves historical flags but counts only final EOD/trading-day records with PASS reconciliation, no errors, source-use provenance, ten distinct valid sample windows, an execution window, and complete quality evidence. The Web acceptance page displays qualified days separately from legacy marks.

Compose configuration parsed successfully and reported `STOCKQUANT_V24_AUTO_START=false`, `STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED=false`, and empty authorization reference/data-version fields. Focused Web E2E passed 2/2. `pnpm verify:stage -- --stage V2.4 --suite code` passed with exit 0, including the isolated Paper normal/rejection/recovery API, Web and CLI checks; its smoke report records `activeServicesTouched=false`. These are workspace/isolated checks; they do not prove the new configuration is deployed to the active environment.

Remaining gates: source permission and a precise authorized operating scope, verified W8 backup/migration/rollback, safe deployment of the new defaults, separately qualified SystemClock O2 evidence, and human acceptance. No progress toward these gates is inferred from legacy counters.
