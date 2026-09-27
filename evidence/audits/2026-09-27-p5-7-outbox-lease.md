# P5.7 FakeBroker Outbox claim lease and recovery

Date: 2026-09-27 (Asia/Shanghai)

## Change

FakeBroker PostgreSQL Outbox now atomically claims an event as `DELIVERING` with a random fencing token and bounded lease. A pending or expired delivery can be claimed by exactly one worker through a conditional PostgreSQL update; acknowledgement and failure transition require the current token. Expired claims can be taken over, while stale workers cannot mark delivery complete, increment retry attempts, or revert a delivered order to `LEDGER_PENDING`. Failure transition and order-state repair now share a transaction. Portfolio HTTP delivery has a five-second timeout under the default 60-second lease. The in-process retry poll is single-flight and catches poll errors for the next scheduled attempt. Failed deliveries return to `PENDING` until the existing three-attempt compensation threshold; successful retries remain protected by Portfolio fill idempotency.

## Verification

- Trade Execution build and unit tests: PASS, 42 tests.
- `pnpm --filter @stockquant/trade-execution-service test:p5-7`: PASS against the dedicated `trade_execution_test` and `portfolio_risk_test` databases with temporary loopback services; the rerun verified both stale-ack and stale-failure fencing.
- `pnpm verify:stage -- --stage V2.4 --suite code`: PASS after the change. Full workspace build/lint/typecheck and unit suites passed; Trade Execution persistence/auth/Outbox and Portfolio HTTP/PG integration passed; 58 Python Adapter and 94 ops tests passed; Market Data PostgreSQL 22/22 passed. Stage tool output does not change observation or human acceptance.
- Two independent repository instances raced for the same event: exactly one claim succeeded.
- Expired lease takeover returned a new claim token; stale acknowledgement was rejected.
- Existing real HTTP fault injection then dropped the Portfolio response after its commit, restarted Trade Execution and recovered the Outbox. Final Outbox was `DELIVERED`, one Portfolio fill and two ledger entries were recorded, cash was exactly `8997.9990`, and the unknown reservation remainder remained held.
- Temporary random account/order and both services were cleaned by the existing smoke; no live brokerage or production Paper service was used.

## Boundary

This improves durable cross-instance Outbox delivery only. It does not supply the missing approved Paper Mandate, configured risk/fee policy, governance-approved snapshot-to-FakeBroker command, complete Paper Web/CLI workflow, active deployment, observation days, or human acceptance. P5 remains incomplete and no LIVE broker is involved.
