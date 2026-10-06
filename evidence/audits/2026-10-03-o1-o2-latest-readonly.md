# O1/O2 latest read-only refresh

Captured 2026-10-03 13:29 Asia/Shanghai (05:29 UTC). This check only queried the local Market Data active-subscription count and health endpoints, then recomputed the observation summary from archived evidence. It did not request market data, activate a schedule, write business state, or call Paper, Broker, or model providers.

- Enabled collection schedules: 0.
- Calendar: CLOSED; scheduler has no next execution time. The health command correctly returned UNHEALTHY because `nextTriggerRecorded=false`; readiness and the most recent scheduler tick were healthy.
- Quality: 0 open gaps and 0 pending outbox deliveries.
- DC-08A: 8/20 days (7 complete, 1 recovered), 12 remaining; latest counted date 2026-09-30. Summary command returned WAITING (exit 2); no day was added.
- Authorization and trading mode remain NONE / NO_TRADE. O2 has not started because no qualified W3 deployment or data authorization exists.

Point-in-time report hashes:

- `evidence/dc08a/health-report.json`: `a8f1708d3c277cb61498a0960c036adf30f2f5032cae3c9d66c10b6743e0c0ac`
- `evidence/dc08a/observation-summary.json`: `7a91e45f4c888e5e4b6a7d3a910d11af0830db90cfd2a2a94df456765e9b87b6`

Commands: `pnpm dc08a:active-subscription -- --field enabled-count` (exit 0, output 0), `pnpm dc08a:health-report` (exit 1, UNHEALTHY), and `pnpm dc08a:observation-summary` (exit 2, WAITING).
