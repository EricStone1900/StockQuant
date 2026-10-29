# C5 P4 initial timed-run attempt — 2026-10-29

## Result

`FAIL / INCOMPLETE`; this attempt does not count toward the required P4 30-minute local run. The isolated smoke reached the timed phase after its fixture and browser checks, but the outer isolated-PostgreSQL runner terminated its child with `SIGTERM` at its fixed 240,000 ms timeout. The planned midpoint Platform interruption/restart had not yet occurred, and no timed-run result was written.

## Run facts

- C5 TestRun: `fa7852f9-d9a5-4946-b66d-bc20129d3257`.
- Timed phase began at `2026-10-29T04:20:47.522Z` with Platform PID `13615`.
- The wrapper reported `command failed with signal "SIGTERM"`; its isolated PostgreSQL admin client then reported a terminated connection.
- The wrapper's `finally` path removed its disposable PostgreSQL container and network. The smoke's own `finally` did not run, leaving its uniquely named Web container `sq-v24-w1-web-b63149de88204a6f883d37f649225f2a` and image `stockquant-v24-w1-web:b63149de88204a6f883d37f649225f2a`.
- Those exact temporary Web artifacts were inspected (container only published `127.0.0.1:54416`) and removed. Other running containers were left untouched.

## Corrective action

The isolated runner now accepts a bounded `--timeout-ms` from 1,000 through 3,600,000 ms, retaining 240,000 ms as its default. The P4 rerun uses an explicit 2,400,000 ms ceiling for the 30-minute timer plus setup and final evidence export. The second attempt must still complete the full elapsed time, one controlled process interruption/restart, same-Run read-only CLI check, unchanged business facts and temporary-resource cleanup before P4 can pass.
