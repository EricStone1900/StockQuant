# C5 Local P3 progress audit — 2026-10-29

## Result

P3 engineering checks passed in the isolated C5 run. This closes P3 only; P4 (the bounded 30-minute run), P5 (C5 Web/manual verification) and P6 (owner acceptance) remain outstanding. `C5_LOCAL_ENGINEERING_V1` and V2.4 remain pending, and no live source, active scheduler or broker was used.

## Evidence

- Full command: `node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke`
- Exit code: `0`; machine report: [2026-10-29 V2.4 smoke](./2026-10-29-v24-paper-smoke-69351f6b926a42baab7d739f3da314ad.json), status `PASS`.
- Report SHA-256: `335c1daa924638590291e578a3036fa5d2a582a216f8579674ac704554cae7e4`.
- C5 P3 TestRun: `478d5a87-a97d-4c7d-9118-ce5890316e8f`; same-run CLI `--check-only` exited `0`. The overall smoke also ran the existing formal Web acceptance scenarios; C5-specific Web flow and executable manual remain P5 work. The report confirms disposable PostgreSQL cleanup; `activeServicesTouched=false`.
- One Trade Execution response was dropped after FakeBroker committed. Retry found the same order by `clientOrderId`, verified the exact normalized Fill facts, captured Portfolio reservation and delivered Outbox, then completed without another order or Fill. Portfolio Risk now permits Trade Execution's owner-scoped, read-only account snapshot route for this recovery check.
- A simulated external-only `UNKNOWN` order produced a daily close `DISCREPANCY` and an `OPEN` Incident. Repeated close processing reused the same Incident. After removing the exact injected test order, a matching close resolved that same Incident. The injection was deleted before the temporary databases were destroyed.
- Five evaluation sessions produced BUY, SELL, HOLD, HOLD, HOLD; independent FakeBroker/Portfolio reconciliation matched two orders and two fills. Persistent risk ended at turnover `0.0000`, exposure `0.0000`, cumulative loss `35.0000`; the two distinct reconciled Fill IDs are retained in `riskAppliedFillIds` evidence across daily risk-state rollovers.
- The retry also confirmed paused Mandates reject reauthorization. Existing stale/unknown snapshot and closed-window candidate gates remain fail-closed in the report.

## Changes made

- Trade retries distinguish an ambiguous transport failure from ordinary application failures. Only an ambiguous lost execution response takes the persisted Target/Intent recovery path; ordinary failures still re-evaluate and remain fail-closed.
- Recovery compares persisted money values at the account's four-decimal precision, verifies the original scoped reservation and Outbox, and never blindly resubmits.
- Portfolio Risk authorization now allows Trade Execution to read the account snapshot, limited to the existing internal snapshot path and independent Trade bearer.
- P3 risk assertions now preserve the set of Fill IDs applied across daily state rollovers instead of incorrectly expecting a session-local idempotency set to remain populated after a new session.
- The older Outbox restart regression now supports either `PENDING` or the bounded `COMPENSATION_REQUIRED` state and explicitly requeues the same event after restart when needed, then verifies ledger idempotency.

## Focused checks

- Platform API typecheck and 440 unit tests passed after the recovery/error assertions were updated.
- Trade Execution typecheck and C5 local execution unit tests: 6/6 passed.
- Portfolio Risk service-auth tests: 4/4 passed; its typecheck passed.
- The disposable five-service HTTP/Web/CLI smoke passed and its temporary PostgreSQL container/network were removed and verified by the wrapper.

## Remaining C5 work

P4 must still perform the planned 30-minute bounded local process run with a controlled interruption and recovery. P5 must execute the C5-specific formal Web scenarios, refresh/reopen and executable handoff instructions against the same Run. P6 requires the owner's explicit acceptance. This audit does not count actual-market observation days and does not approve strategy activation or live trading.
