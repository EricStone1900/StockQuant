# C5 Local P4 progress audit — 2026-10-29

## Result

P4 passed for the approved `C5_LOCAL_ENGINEERING_V1` scope. The frozen synthetic input supplied two warmup sessions and five consecutive evaluation sessions. The isolated run completed BUY → SELL → HOLD/HOLD/HOLD, next-session sell-proceeds settlement, exact reconciliation, rejection gates and existing recovery assertions. A real 30-minute local process observation completed with the Web browser process closed, one controlled Platform process interruption and restart, same-Run CLI verification and unchanged business facts.

This is a local FIXTURE/PAPER/FAKE engineering result. The timed observation held the completed C5 TestRun while local services remained up; it is not a claim of 30 minutes of active strategy evaluation, a real-market observation day, or approval of a live source, scheduler, strategy or broker. P5 Web/CLI/manual handoff and P6 owner acceptance remain outstanding; C5 remains `PENDING`.

## Evidence

- Command: `V24_C5_P4_TIMED_RUN=true node scripts/run-isolated-postgres-command.mjs --timeout-ms 2400000 --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke`.
- Exit code: `0`; the isolated wrapper verified removal of its temporary PostgreSQL container and network. The smoke report confirms export of all five database snapshots and removal of the temporary Web container and image; `activeServicesTouched=false`.
- Machine report: [2026-10-29 V2.4 smoke](./2026-10-29-v24-paper-smoke-e40e870322ae446ba4b9ed6a875e5647.json), SHA-256 `b628ec52f65db1455257ec3a266cd768efdce0b6db530d012c0e11ee41f1999d`.
- C5 TestRun: `d80d4536-6149-4742-994b-30cf05a5f817`; all six C5 assertions passed and same-Run CLI `--check-only` exited `0`.
- Frozen input: `v24-c5-local-engineering-1`, two warmup plus five evaluation sessions; input SHA-256 `96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea`.
- Actual timed interval: `2026-10-29T04:26:07.077Z`–`2026-10-29T04:56:08.143Z`, `1,800,927 ms` against a required `1,800,000 ms`.
- The browser acceptance process exited `0` before timing began. At `2026-10-29T04:41:07.840Z`, Platform PID `14110` received the single planned `SIGKILL`; PID `14450` was ready at `2026-10-29T04:41:08.372Z`. The same TestRun remained `COMPLETED`, and its read-only CLI check exited `0` after restart.
- Before/after business facts matched exactly: 41 ledger entries, 17 Portfolio fills, 14 positions, 19 reservations, 17 FakeBroker orders, 17 broker fills, 34 broker order events and 17 Outbox events. Market-data requests were `0`; live trading was `false`.

## Runner correction and failed attempt history

The first timed attempt reached the P4 wait but was stopped by the isolated PostgreSQL runner's previous fixed 240,000 ms child timeout. It did not reach the planned process interruption or write a timed result. The failure and exact temporary Web cleanup are retained in [the initial attempt record](./2026-10-29-c5-p4-initial-attempt-failed.md). The runner now accepts an explicit timeout bounded to 1,000–3,600,000 ms while retaining its 240,000 ms default; this successful P4 command used 2,400,000 ms.
