# V1.4 fee-model audit count correction

Date: 2026-10-02 (Asia/Shanghai)

The isolated V1.4 fee-model audit `2026-10-02-w1-v14-quant-configurable-web-eb9f94dfcd44198ba613` was produced by the Harness after adding one browser-created fee-schedule run. Its generated Markdown still contains inherited wording that says eight Quant runs and four browser-created runs. The machine JSON and live Harness result are authoritative: there were nine Quant result/Manifest pairs (`9:9:9`), nine Platform V1.4 TestRuns, and five browser-created TestRuns checked by CLI. The fifth browser run is `c314edfb-a904-4371-a11d-78864b2b4955` and includes assertion `V1.4-BT-CN-A-FEE-BREAKDOWN-010=PASS`.

The Harness assertions were corrected to expect five browser IDs and nine database rows; rerunning `pnpm test:integration:v14-backtest` exited 0. Its exact output is preserved in the linked JSON report. The earlier generated Markdown/JSON files remain unchanged as point-in-time audit artifacts; this note corrects the stale human-readable count and does not alter the verification result.
