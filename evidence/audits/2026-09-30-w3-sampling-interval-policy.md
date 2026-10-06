# W3 sampling interval policy implementation

Date: 2026-09-30 (Asia/Shanghai)

## Change

The V2.4 scheduler now derives its sampling slots from the configured 20- or 30-minute interval. `STOCKQUANT_V24_SAMPLING_INTERVAL_MINUTES` defaults to 30 and accepts only `20` or `30`; a stopped scheduler applies the configured value, while a running scheduler retains its persisted interval for reproducible recovery. The same-day observation quality calculation reads `samplingIntervalMinutes` from sample events, rejects a mixed policy, and requires 14 complete windows for 20-minute sampling or 10 complete windows for 30-minute sampling. Both policies retain the ±60-second scheduling tolerance and existing per-security quote provenance/freshness checks. Older records lacking this field are interpreted as 30-minute only when every sample carries the former `samplingEvery30Minutes=true` marker.

The policy is recorded in observation evidence. This does not add a user-facing configuration control, connect a source, enable scheduler operation, change prior finalizations, deploy the new code, or add observation days. The owner-confirmed `NO_TRADE`/no-source-authorization boundary remains active.

## Verification

- `pnpm --filter @stockquant/platform-api-service typecheck`: PASS.
- `pnpm --filter @stockquant/platform-api-service test`: PASS, 27 files / 99 tests.
- `pnpm verify:stage -- --stage V2.4 --suite code`: PASS, exit 0 on final-code rerun with permission to bind a temporary loopback port required by the isolated Qlib worker test. Baseline, all workspace build/lint/typecheck/unit checks, Market Data integration (22 tests), isolated V2.4 normal/rejection/recovery Web/API/CLI same-run checks, and ARM64 Trade Execution readiness container smoke passed. The Paper smoke reported `activeServicesTouched=false`; Trade Execution smoke reported `activeServices=NOT_CONNECTED`, `liveTradingEnabled=false`, and zero orders/fills/events/outbox.
- The first sandboxed full-suite attempt was blocked only at the Qlib worker's local socket bind (`EPERM`). No external source or active Paper service was contacted by the successful verification run.

## Remaining W3 gates

No real-source authorization, strategy/Mandate or Paper activation is present. Full snapshot-to-FakeBroker continuous workflow, collection/strategy/execution orchestration, end-of-day alert/recovery lifecycle, deployment/backup/migration, 20 actual trading days and current-scope human acceptance remain incomplete. V2.4 remains `PARTIALLY_IMPLEMENTED`; this audit is engineering evidence only.
