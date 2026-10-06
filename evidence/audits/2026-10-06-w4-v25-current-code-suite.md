# W4 V2.5 current-worktree code and capacity regression

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V2.5 --suite code` passed with wrapper exit code 0 on the current worktree. The suite passed the baseline and service test sets: Market Data 71, Research Automation 218, Platform API 198, Trade Execution 67, Quant Research 91, Historical Replay 25, Governance 22 and Portfolio Risk 5 unit tests, plus applicable contract, build and integration checks.

The isolated Linux/arm64 Parquet HTTP/PostgreSQL capacity smoke used a 100,000-row synthetic Fixture (500 securities × 200 bars over five days; provenance `synthetic; UNCONFIRMED; researchUseAllowed=false`). It imported and published all 100,000 rows, read them back over 100 pages with 100,000 unique bars, returned the filtered 40-row query, and passed idempotency, cross-instance busy locking and corrupt-upload cancellation checks. Peak service RSS was 188,352 KiB; the isolated database used 72,610,275 bytes. External/provider, model and broker calls were all zero; temporary container/network/image cleanup passed.

## Limits

This synthetic Mac-hosted Linux/arm64 slice does not establish full-market minute capacity, licensed real-source coverage, long-running trading-session stability, a second free minute source with 60-day coverage, real PIT/model research, Ubuntu x86_64 acceptance or the V2.4 observation gate. It does not change V2.5 stage or V2 version acceptance.

The complete command transcript is [here](./2026-10-06-w4-v25-current-code-suite.log). Input script/source hashes are a **historical execution snapshot** binding this run’s inputs, not the current worktree ([manifest](./2026-10-06-w4-v25-current-code-suite.sources.sha256)).
