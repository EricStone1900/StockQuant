# W3 persisted execution-gate regression

Date: 2026-10-03 (Asia/Shanghai)

The V2.4 execution-window observation now persists a `PAUSED` gate and its reason in the owner-scoped observation evidence. Same-day end-of-day updates preserve that gate. This regression is covered at three levels:

- PostgreSQL persistence: `test:v24-observation-persistence` migrates the isolated platform test database, writes the execution-window gate, applies the later end-of-day update, and reads the merged evidence back for the same owner. Result: `persistedThroughEndOfDayMerge=true`, `status=PAUSED`, `reason=QUOTE_SOURCE_NOT_AUTHORIZED`.
- V2.4 full code suite: `pnpm verify:stage -- --stage V2.4 --suite code` exited 0, including contracts, workspace build/lint/typecheck/unit checks, isolated service/PostgreSQL tests, the normal/rejection/recovery Paper HTTP and Web/CLI checks, and the Linux/ARM64 readiness boundary.
- P5.7 startup correction: repeated full-suite runs showed that a Unix-socket SQL probe could connect to the official PostgreSQL image's temporary initialization server, which exits before `createdb`. The isolated smoke now waits for a real `SELECT 1` over container TCP `127.0.0.1:5432`, and creates roles/databases through the same final TCP listener. A standalone run and the full V2.4 suite both passed after this correction.

All test databases, containers and networks were disposable and verified removed. Active Compose services were not connected. No market-data source, external Provider, LIVE broker or order request was made. The gate remains `PAUSED`: no source authorization, active Paper account or approved mandate. This is an engineering regression result; it does not count toward O1/O2 observation days or stage/user acceptance.
