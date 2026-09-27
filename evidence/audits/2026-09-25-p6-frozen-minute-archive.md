# P6 frozen minute archive current-worktree verification

Date: 2026-09-25 (Asia/Shanghai). This is offline verification of the already frozen BaoStock Fixture archive; it did not contact the source or change the data.

## Results

- `pnpm v25:validate-baostock-minute`: exit 0, status `PASS`; 20 securities × 60 trading sessions × 48 bars = 57,600 rows. All securities completed, rows/day and OHLCV checks passed, no duplicate date-time keys, every artifact SHA-256 matched the manifest.
- `pnpm v25:replay-baostock-minute`: exit 0, status `PASS`; actual archive rows were fed to the V2.3 replay engine for all 20 securities, 57,600 total rows, 60 sessions per security.
- Both reports identify the same source manifest SHA-256: `729793b462b25951bae2f032ea2eefc3c1ef86689a1c7882b908a24b68417c5f`.
- Coverage report: `evidence/dc08a/historical-coverage-2026-09-25T06-59-39-575Z.json`.
- Replay report: `evidence/dc08a/historical-replay-2026-09-25T06-59-43-166Z.json`.

This confirms reproducible small-archive integrity and replay against the current worktree. It does not prove 100/500-security capacity, multi-year daily scale, real-time rate limits, second-source 60-day coverage, PIT revision history, full durable import/resume through the product UI, or strategy profitability. Those gates remain separate; no live order or real broker was used.
